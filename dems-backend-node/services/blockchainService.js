const { ethers } = require('ethers');
const { evidenceRegistryAbi } = require('../abis/EvidenceRegistryAbi');

let cachedProvider = null;
let cachedContract = null;

function getContractConfig() {
    const contractAddress = process.env.EVIDENCE_CONTRACT_ADDRESS;
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';

    if (!contractAddress) {
        throw new Error('EVIDENCE_CONTRACT_ADDRESS is not configured on the server.');
    }

    return { contractAddress, rpcUrl };
}

function getEvidenceContract() {
    const { contractAddress, rpcUrl } = getContractConfig();

    if (!cachedProvider || !cachedContract) {
        cachedProvider = new ethers.JsonRpcProvider(rpcUrl);
        cachedContract = new ethers.Contract(contractAddress, evidenceRegistryAbi, cachedProvider);
    }

    return cachedContract;
}

/**
 * Reads on-chain evidence metadata via verifyEvidence view call.
 * @param {string} evidenceId
 * @returns {Promise<object>}
 */
async function getOnChainEvidence(evidenceId) {
    const contract = getEvidenceContract();
    const exists = await contract.evidenceExists(evidenceId);

    if (!exists) {
        const error = new Error('Evidence record not found on blockchain.');
        error.code = 'EVIDENCE_NOT_ON_CHAIN';
        throw error;
    }

    const result = await contract.verifyEvidence(evidenceId);

    const storedEvidenceId = result[0] ?? result.storedEvidenceId;
    const fileHash = result[1] ?? result.fileHash;
    const ipfsCID = result[2] ?? result.ipfsCID;
    const aiScore = result[3] ?? result.aiScore;
    const timestamp = result[4] ?? result.timestamp;
    const uploaderWallet = result[5] ?? result.uploaderWallet;

    return {
        evidenceId: storedEvidenceId,
        fileHash,
        ipfsCID,
        aiScore: Number(aiScore),
        uploadedAt: new Date(Number(timestamp) * 1000).toISOString(),
        uploadedBy: String(uploaderWallet).toLowerCase()
    };
}

module.exports = {
    getOnChainEvidence
};
