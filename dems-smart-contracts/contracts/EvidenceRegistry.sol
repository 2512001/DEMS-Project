// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EvidenceRegistry
 * @notice Immutable on-chain integrity proofs for the DEMS evidence pipeline.
 * @dev Stores ONLY: evidenceId, fileHash, ipfsCID, aiScore, timestamp, uploaderWallet.
 *      GPS, device metadata, AI reports, and encrypted blobs remain off-chain (MongoDB / IPFS).
 */
contract EvidenceRegistry is AccessControl {
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");

    /// @dev aiScore is stored as score * 100 (e.g. 98.5 -> 9850) for sub-percent precision without floats.
    struct Evidence {
        string evidenceId;
        string fileHash;
        string ipfsCID;
        uint256 aiScore;
        uint256 timestamp;
        address uploaderWallet;
        bool exists;
    }

    struct CustodyEvent {
        address actor;
        uint256 timestamp;
        string action;
    }

    mapping(bytes32 idHash => Evidence evidence) private _evidenceById;
    mapping(bytes32 idHash => bool exists) private _evidenceIdExists;
    mapping(bytes32 hashKey => bool exists) private _fileHashExists;
    mapping(address uploader => uint256 count) private _uploaderEvidenceCount;
    mapping(bytes32 idHash => CustodyEvent[] history) private _custodyHistory;

    event EvidenceAdded(
        string indexed evidenceId,
        string fileHash,
        string ipfsCID,
        uint256 aiScore,
        uint256 timestamp,
        address indexed uploaderWallet
    );

    event EvidenceVerified(
        string indexed evidenceId,
        string fileHash,
        address indexed verifier,
        uint256 timestamp
    );

    event CustodyEventAdded(
        string indexed evidenceId,
        address indexed actor,
        uint256 timestamp,
        string action
    );

    event OfficerGranted(address indexed officer, address indexed grantedBy, uint256 timestamp);
    event OfficerRevoked(address indexed officer, address indexed revokedBy, uint256 timestamp);

    error Unauthorized();
    error EvidenceAlreadyExists();
    error FileHashAlreadyExists();
    error EvidenceNotFound();
    error InvalidInput();
    error UploaderMismatch();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidInput();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Register immutable evidence proof on-chain.
     * @param uploaderWallet Must equal msg.sender — prevents wallet spoofing while keeping frontend ABI stable.
     */
    function addEvidence(
        string calldata evidenceId,
        string calldata fileHash,
        string calldata ipfsCID,
        uint256 aiScore,
        address uploaderWallet
    ) external onlyRole(OFFICER_ROLE) {
        _validateEvidenceInputs(evidenceId, fileHash, ipfsCID);
        if (uploaderWallet != msg.sender) revert UploaderMismatch();

        bytes32 idHash = keccak256(bytes(evidenceId));
        if (_evidenceIdExists[idHash]) revert EvidenceAlreadyExists();

        bytes32 hashKey = keccak256(bytes(fileHash));
        if (_fileHashExists[hashKey]) revert FileHashAlreadyExists();

        _evidenceIdExists[idHash] = true;
        _fileHashExists[hashKey] = true;
        unchecked {
            _uploaderEvidenceCount[msg.sender]++;
        }

        Evidence storage record = _evidenceById[idHash];
        record.evidenceId = evidenceId;
        record.fileHash = fileHash;
        record.ipfsCID = ipfsCID;
        record.aiScore = aiScore;
        record.timestamp = block.timestamp;
        record.uploaderWallet = msg.sender;
        record.exists = true;

        emit EvidenceAdded(evidenceId, fileHash, ipfsCID, aiScore, block.timestamp, msg.sender);
        _appendCustodyEvent(idHash, evidenceId, msg.sender, "UPLOAD");
    }

    function getEvidence(
        string calldata evidenceId
    )
        external
        view
        returns (
            string memory storedEvidenceId,
            string memory fileHash,
            string memory ipfsCID,
            uint256 aiScore,
            uint256 timestamp,
            address uploaderWallet
        )
    {
        return _getEvidenceData(evidenceId);
    }

    /**
     * @notice Returns on-chain integrity data for off-chain SHA-256 comparison.
     * @dev Hash verification is performed off-chain by the backend; the chain stores the canonical proof.
     */
    function verifyEvidence(
        string calldata evidenceId
    )
        external
        view
        returns (
            string memory storedEvidenceId,
            string memory fileHash,
            string memory ipfsCID,
            uint256 aiScore,
            uint256 timestamp,
            address uploaderWallet
        )
    {
        return _getEvidenceData(evidenceId);
    }

    function evidenceExists(string calldata evidenceId) external view returns (bool) {
        return _evidenceIdExists[keccak256(bytes(evidenceId))];
    }

    function getUploaderEvidenceCount(address wallet) external view returns (uint256) {
        return _uploaderEvidenceCount[wallet];
    }

    function addCustodyEvent(string calldata evidenceId, string calldata action) external onlyRole(OFFICER_ROLE) {
        if (bytes(action).length == 0) revert InvalidInput();

        bytes32 idHash = keccak256(bytes(evidenceId));
        if (!_evidenceIdExists[idHash]) revert EvidenceNotFound();

        _appendCustodyEvent(idHash, evidenceId, msg.sender, action);

        if (keccak256(bytes(action)) == keccak256(bytes("VERIFIED"))) {
            Evidence storage record = _evidenceById[idHash];
            emit EvidenceVerified(evidenceId, record.fileHash, msg.sender, block.timestamp);
        }
    }

    function getCustodyHistory(string calldata evidenceId) external view returns (CustodyEvent[] memory) {
        bytes32 idHash = keccak256(bytes(evidenceId));
        if (!_evidenceIdExists[idHash]) revert EvidenceNotFound();
        return _custodyHistory[idHash];
    }

    function grantOfficer(address officer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (officer == address(0)) revert InvalidInput();
        _grantRole(OFFICER_ROLE, officer);
        emit OfficerGranted(officer, msg.sender, block.timestamp);
    }

    function revokeOfficer(address officer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (officer == address(0)) revert InvalidInput();
        _revokeRole(OFFICER_ROLE, officer);
        emit OfficerRevoked(officer, msg.sender, block.timestamp);
    }

    function hasOfficerRole(address account) external view returns (bool) {
        return hasRole(OFFICER_ROLE, account);
    }

    function _validateEvidenceInputs(
        string calldata evidenceId,
        string calldata fileHash,
        string calldata ipfsCID
    ) private pure {
        if (bytes(evidenceId).length == 0 || bytes(fileHash).length == 0 || bytes(ipfsCID).length == 0) {
            revert InvalidInput();
        }
    }

    function _requireEvidence(string calldata evidenceId) private view returns (Evidence storage) {
        bytes32 idHash = keccak256(bytes(evidenceId));
        if (!_evidenceIdExists[idHash]) revert EvidenceNotFound();
        return _evidenceById[idHash];
    }

    function _getEvidenceData(
        string calldata evidenceId
    )
        private
        view
        returns (
            string memory storedEvidenceId,
            string memory fileHash,
            string memory ipfsCID,
            uint256 aiScore,
            uint256 timestamp,
            address uploaderWallet
        )
    {
        Evidence storage record = _requireEvidence(evidenceId);
        return (
            record.evidenceId,
            record.fileHash,
            record.ipfsCID,
            record.aiScore,
            record.timestamp,
            record.uploaderWallet
        );
    }

    function _appendCustodyEvent(bytes32 idHash, string calldata evidenceId, address actor, string memory action) private {
        _custodyHistory[idHash].push(
            CustodyEvent({actor: actor, timestamp: block.timestamp, action: action})
        );
        emit CustodyEventAdded(evidenceId, actor, block.timestamp, action);
    }
}
