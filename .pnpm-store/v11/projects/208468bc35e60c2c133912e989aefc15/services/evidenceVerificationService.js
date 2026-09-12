const EvidenceModel = require('../model/evidenceModel');
const { getOnChainEvidence } = require('./blockchainService');
const { decryptFile, computeSha256 } = require('./cryptoService');
const { fetchEncryptedBlobFromIpfs } = require('./ipfsService');
const { canVerifyEvidence } = require('./accessControl');
const { writeAuditLog } = require('./auditService');

function normalizeHash(value) {
    return String(value || '').trim().toLowerCase().replace(/^0x/, '');
}

function normalizeWallet(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeId(value) {
    return String(value || '').trim().toLowerCase();
}

function cidEquals(left, right) {
    return String(left || '').trim() === String(right || '').trim();
}

function buildMismatch(field, expected, actual) {
    return { field, expected, actual };
}

function buildCheck({ field, label, mongodb = null, ipfs = null, blockchain = null, matched }) {
    return {
        field,
        label,
        mongodb,
        ipfs,
        blockchain,
        matched: Boolean(matched),
        status: matched ? 'MATCH' : 'MISMATCH'
    };
}

function assertCanVerify(evidence, requester) {
    if (!requester) {
        const error = new Error('Authentication is required to verify evidence.');
        error.statusCode = 401;
        throw error;
    }

    if (!canVerifyEvidence(requester, evidence)) {
        const error = new Error('You are not authorized to verify this evidence.');
        error.statusCode = 403;
        throw error;
    }
}

async function verifyEvidenceIntegrity(evidenceId, requester) {
    const evidence = await EvidenceModel.findById(evidenceId).select(
        '_id user organizationId fileHash ipfsCID UploaderWallet blockchainTxHash encryption createdAt status blockchainStatus'
    );

    if (!evidence) {
        const error = new Error('Evidence not found.');
        error.statusCode = 404;
        throw error;
    }

    assertCanVerify(evidence, requester);

    if (!evidence.ipfsCID) {
        const error = new Error('Evidence does not have an IPFS CID.');
        error.statusCode = 422;
        throw error;
    }

    if (!evidence.encryption?.iv || !evidence.encryption?.authTag) {
        const error = new Error('Evidence encryption metadata is missing.');
        error.statusCode = 422;
        throw error;
    }

    const encryptedBuffer = await fetchEncryptedBlobFromIpfs(evidence.ipfsCID);

    let generatedHash = null;
    try {
        const decryptedBuffer = decryptFile(encryptedBuffer, evidence.encryption);
        generatedHash = computeSha256(decryptedBuffer);
    } catch {
        generatedHash = null;
    }

    const onChain = await getOnChainEvidence(evidence._id.toString());

    const mongoFileHash = normalizeHash(evidence.fileHash);
    const mongoIpfsCID = String(evidence.ipfsCID || '').trim();
    const mongoUploader = normalizeWallet(evidence.UploaderWallet);
    const mongoEvidenceId = normalizeId(evidence._id);
    const chainFileHash = normalizeHash(onChain.fileHash);
    const chainIpfsCID = String(onChain.ipfsCID || '').trim();
    const chainUploader = normalizeWallet(onChain.uploadedBy);
    const chainEvidenceId = normalizeId(onChain.evidenceId);
    const ipfsContentHash = normalizeHash(generatedHash);

    const mongoEqualsIpfs = Boolean(mongoFileHash && ipfsContentHash && mongoFileHash === ipfsContentHash);
    const mongoEqualsChain = Boolean(mongoFileHash && chainFileHash && mongoFileHash === chainFileHash);
    const ipfsEqualsChain = Boolean(ipfsContentHash && chainFileHash && ipfsContentHash === chainFileHash);
    const hashesAligned = mongoEqualsIpfs && mongoEqualsChain && ipfsEqualsChain;
    const cidMatched = cidEquals(mongoIpfsCID, chainIpfsCID);
    const uploaderMatched = Boolean(mongoUploader && chainUploader && mongoUploader === chainUploader);
    const evidenceIdMatched = Boolean(mongoEvidenceId && chainEvidenceId && mongoEvidenceId === chainEvidenceId);

    const checks = [
        buildCheck({
            field: 'mongoFileHash',
            label: 'MongoDB Hash',
            mongodb: evidence.fileHash,
            ipfs: generatedHash,
            blockchain: onChain.fileHash,
            matched: hashesAligned
        }),
        buildCheck({
            field: 'ipfsContentHash',
            label: 'IPFS Content Hash',
            mongodb: evidence.fileHash,
            ipfs: generatedHash,
            blockchain: onChain.fileHash,
            matched: hashesAligned
        }),
        buildCheck({
            field: 'blockchainHash',
            label: 'Blockchain Hash',
            mongodb: evidence.fileHash,
            ipfs: generatedHash,
            blockchain: onChain.fileHash,
            matched: hashesAligned
        }),
        buildCheck({
            field: 'ipfsCID',
            label: 'IPFS CID',
            mongodb: evidence.ipfsCID,
            ipfs: evidence.ipfsCID,
            blockchain: onChain.ipfsCID,
            matched: cidMatched
        }),
        buildCheck({
            field: 'uploadedBy',
            label: 'Uploader',
            mongodb: evidence.UploaderWallet,
            blockchain: onChain.uploadedBy,
            matched: uploaderMatched
        }),
        buildCheck({
            field: 'evidenceId',
            label: 'Evidence ID',
            mongodb: evidence._id.toString(),
            blockchain: onChain.evidenceId,
            matched: evidenceIdMatched
        })
    ];

    const comparisons = {
        hashMatched: mongoEqualsChain,
        cidMatched,
        generatedHashMatched: ipfsEqualsChain,
        uploaderMatched,
        evidenceIdMatched,
        mongoHashMatched: mongoEqualsIpfs,
        hashesAligned,
        proofPresent: Boolean(evidence.blockchainTxHash) || Boolean(onChain.uploadedAt)
    };

    const mismatches = checks
        .filter((check) => !check.matched)
        .map((check) => buildMismatch(
            check.field,
            check.blockchain,
            check.mongodb ?? check.ipfs
        ));

    const allChecksPassed = hashesAligned && cidMatched && uploaderMatched && evidenceIdMatched;
    const verificationStatus = allChecksPassed ? 'VERIFIED' : 'TAMPERED';

    const blockchainData = {
        evidenceId: onChain.evidenceId,
        fileHash: onChain.fileHash,
        ipfsCID: onChain.ipfsCID,
        uploadedAt: onChain.uploadedAt,
        uploadedBy: onChain.uploadedBy,
        aiScore: onChain.aiScore,
        transactionHash: evidence.blockchainTxHash || null
    };

    await writeAuditLog({
        actor: requester,
        organizationId: evidence.organizationId,
        action: 'integrity_verification',
        targetType: 'evidence',
        targetId: evidence._id,
        result: allChecksPassed ? 'success' : 'mismatch',
        metadata: { verificationStatus }
    });

    return {
        verificationStatus,
        verifiedAt: new Date().toISOString(),
        blockchainData,
        sources: {
            mongodb: {
                evidenceId: evidence._id.toString(),
                fileHash: evidence.fileHash,
                ipfsCID: evidence.ipfsCID,
                uploadedBy: evidence.UploaderWallet,
                createdAt: evidence.createdAt,
                transactionHash: evidence.blockchainTxHash || null
            },
            ipfs: {
                cid: evidence.ipfsCID,
                recoveredFileHash: generatedHash
            },
            blockchain: blockchainData
        },
        checks,
        comparisons,
        mismatches,
        message: allChecksPassed
            ? 'INTEGRITY VERIFIED. MongoDB metadata, recovered IPFS content, and the blockchain proof match. No tampering detected.'
            : 'INTEGRITY FAILURE. Possible evidence mismatch detected.'
    };
}

module.exports = {
    verifyEvidenceIntegrity
};
