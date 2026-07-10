const crypto = require('crypto');
const { PinataSDK } = require('pinata');
const EvidenceModel = require('../model/evidenceModel');
const { getOnChainEvidence } = require('./blockchainService');

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.GATEWAY_URL
});

function getEncryptionKey() {
    const configuredKey = process.env.EVIDENCE_AES_KEY;

    if (configuredKey) {
        const key = Buffer.from(configuredKey, 'hex');
        if (key.length !== 32) {
            throw new Error('EVIDENCE_AES_KEY must be a 32-byte hex encoded key.');
        }
        return key;
    }

    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dems-development-key').digest();
}

function decryptFile(encryptedBuffer, encryptionObj) {
    const decipher = crypto.createDecipheriv(
        encryptionObj.algorithm,
        getEncryptionKey(),
        Buffer.from(encryptionObj.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptionObj.authTag, 'hex'));

    return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
    ]);
}

function computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

async function fetchEncryptedBlobFromIpfs(ipfsCID) {
    const response = await pinata.gateways.public.get(ipfsCID);
    const encryptedBlob = response.data;
    return Buffer.from(await encryptedBlob.arrayBuffer());
}

function buildMismatch(field, expected, actual) {
    return { field, expected, actual };
}

/**
 * Verifies evidence integrity across MongoDB, IPFS, and blockchain.
 * @param {string} evidenceId
 * @returns {Promise<object>}
 */
async function verifyEvidenceIntegrity(evidenceId) {
    const evidence = await EvidenceModel.findById(evidenceId).select(
        '_id fileHash ipfsCID UploaderWallet blockchainTxHash encryption createdAt status'
    );

    if (!evidence) {
        const error = new Error('Evidence not found.');
        error.statusCode = 404;
        throw error;
    }

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
    const decryptedBuffer = decryptFile(encryptedBuffer, evidence.encryption);
    const generatedHash = computeSha256(decryptedBuffer);

    const onChain = await getOnChainEvidence(evidence._id.toString());

    const mongoFileHash = normalize(evidence.fileHash);
    const mongoIpfsCID = normalize(evidence.ipfsCID);
    const mongoUploader = normalize(evidence.UploaderWallet);
    const chainFileHash = normalize(onChain.fileHash);
    const chainIpfsCID = normalize(onChain.ipfsCID);
    const chainUploader = normalize(onChain.uploadedBy);
    const generatedHashNormalized = normalize(generatedHash);

    const hashMatched = mongoFileHash === chainFileHash;
    const cidMatched = mongoIpfsCID === chainIpfsCID;
    const generatedHashMatched = generatedHashNormalized === chainFileHash;
    const uploaderMatched = mongoUploader === chainUploader;

    const comparisons = {
        hashMatched,
        cidMatched,
        generatedHashMatched,
        uploaderMatched
    };

    const mismatches = [];

    if (!hashMatched) {
        mismatches.push(buildMismatch('fileHash', onChain.fileHash, evidence.fileHash));
    }

    if (!cidMatched) {
        mismatches.push(buildMismatch('ipfsCID', onChain.ipfsCID, evidence.ipfsCID));
    }

    if (!generatedHashMatched) {
        mismatches.push(buildMismatch('generatedHash', onChain.fileHash, generatedHash));
    }

    if (!uploaderMatched) {
        mismatches.push(buildMismatch('uploadedBy', onChain.uploadedBy, evidence.UploaderWallet));
    }

    const allChecksPassed = hashMatched && cidMatched && generatedHashMatched && uploaderMatched;
    const verificationStatus = allChecksPassed ? 'VERIFIED' : 'TAMPERED';

    const blockchainData = {
        evidenceId: onChain.evidenceId,
        fileHash: onChain.fileHash,
        ipfsCID: onChain.ipfsCID,
        uploadedAt: onChain.uploadedAt,
        uploadedBy: onChain.uploadedBy,
        transactionHash: evidence.blockchainTxHash || null
    };

    const message = allChecksPassed
        ? 'Evidence integrity verified successfully. The evidence metadata, IPFS record, and blockchain record match. No tampering detected.'
        : 'Evidence verification failed. One or more blockchain integrity checks failed.';

    return {
        verificationStatus,
        verifiedAt: new Date().toISOString(),
        blockchainData,
        comparisons,
        mismatches,
        message
    };
}

module.exports = {
    verifyEvidenceIntegrity
};
