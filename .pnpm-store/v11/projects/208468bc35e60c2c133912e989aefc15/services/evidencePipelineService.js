const EvidenceModel = require('../model/evidenceModel');
const QuarantineEvidence = require('../model/quarantineEvidenceModel');
const { analyzeEvidence, isSuspicious, notRequestedAnalysis } = require('./aiService');
const { encryptBuffer, computeSha256 } = require('./cryptoService');
const { uploadEncryptedBlobToPinata } = require('./ipfsService');
const { storeQuarantineFile } = require('./quarantineStorage');
const { writeAuditLog } = require('./auditService');
const { isEmployee, isNormalUser, httpError } = require('./accessControl');
const { getOrganizationPolicy } = require('./organizationService');

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function parseCaptureMetadata(rawMetadata) {
    if (!rawMetadata) {
        throw httpError(400, 'captureMetadata is required.');
    }

    const metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
    const latitude = Number(metadata?.gpsLocation?.latitude);
    const longitude = Number(metadata?.gpsLocation?.longitude);
    const capturedAt = new Date(metadata?.capturedAt);

    if (!metadata.deviceInfo || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(capturedAt.getTime())) {
        throw httpError(400, 'captureMetadata must include deviceInfo, gpsLocation.latitude, gpsLocation.longitude, and capturedAt.');
    }

    return {
        deviceInfo: String(metadata.deviceInfo).slice(0, 300),
        gpsLocation: { latitude, longitude },
        capturedAt
    };
}

function sanitizeFileName(name) {
    return String(name || 'evidence').replace(/[\\/]/g, '_').slice(0, 180);
}

async function assertUniqueHash(fileHash) {
    const existingEvidence = await EvidenceModel.findOne({ fileHash }).select('_id');
    if (existingEvidence) {
        throw httpError(409, 'Duplicate file detected. This evidence already exists in DEMS.');
    }

    const existingQuarantine = await QuarantineEvidence.findOne({
        originalFileHash: fileHash,
        reviewStatus: { $in: ['pending_review', 'approved'] }
    }).select('_id');

    if (existingQuarantine) {
        throw httpError(409, 'This file is already pending organization review or was previously approved.');
    }
}

function resolveUploadOptions(user, body, policy) {
    let requestAI = parseBoolean(body.requestAI);
    let requestBlockchain = parseBoolean(body.requestBlockchain);
    const confirmStoreDespiteAi = parseBoolean(body.confirmStoreDespiteAi);

    if (isEmployee(user)) {
        if (policy.requireAIForEmployees) requestAI = true;
        if (policy.requireBlockchainForEmployees) requestBlockchain = true;
    }

    return { requestAI, requestBlockchain, confirmStoreDespiteAi };
}

function publicEvidence(evidence, extras = {}) {
    return {
        evidenceId: evidence._id,
        _id: evidence._id,
        fileName: evidence.fileName,
        fileHash: evidence.fileHash,
        ipfsCID: evidence.ipfsCID,
        status: evidence.status,
        statusMessage: evidence.statusMessage,
        processingStatus: evidence.processingStatus,
        reviewStatus: evidence.reviewStatus,
        storageStatus: evidence.storageStatus,
        blockchainStatus: evidence.blockchainStatus,
        blockchainRequested: evidence.blockchainRequested,
        blockchainTxHash: evidence.blockchainTxHash || null,
        aiAnalysis: evidence.aiAnalysis,
        organizationId: evidence.organizationId || null,
        caseId: evidence.caseId,
        ...extras
    };
}

function blockchainPayload(evidence) {
    const aiRequested = Boolean(evidence.aiAnalysis?.requested);
    return {
        evidenceId: evidence._id.toString(),
        fileHash: evidence.fileHash,
        ipfsCID: evidence.ipfsCID,
        aiScore: aiRequested ? Number(evidence.aiAnalysis.authenticityScore ?? evidence.aiAnalysis.score ?? 0) : 0,
        aiRequested,
        uploaderWallet: evidence.UploaderWallet,
        UploaderWallet: evidence.UploaderWallet
    };
}

async function createTrustedEvidence({
    user,
    fileBuffer,
    file,
    captureMetadata,
    caseId,
    aiAnalysis,
    requestBlockchain,
    groupId = null,
    reviewStatus = 'not_required',
    quarantineId = null,
    approvedBy = null
}) {
    const encrypted = encryptBuffer(fileBuffer);
    const ipfsCID = await uploadEncryptedBlobToPinata(encrypted.encryptedBuffer, sanitizeFileName(file.originalname));
    const pendingChain = Boolean(requestBlockchain);

    const evidence = await EvidenceModel.create({
        user: user.id,
        uploadedBy: user.id,
        organizationId: user.organizationId || null,
        groupId,
        UploaderWallet: String(user.walletAddress).toLowerCase(),
        caseId,
        fileName: sanitizeFileName(file.originalname),
        mimeType: file.mimetype,
        fileSize: file.size || fileBuffer.length,
        fileHash: computeSha256(fileBuffer),
        captureMetadata,
        ipfsCID,
        encryption: {
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            algorithm: encrypted.algorithm
        },
        blockchainRequested: pendingChain,
        aiAnalysis,
        processingStatus: 'completed',
        reviewStatus,
        storageStatus: 'ipfs',
        blockchainStatus: pendingChain ? 'pending' : 'not_requested',
        quarantineId,
        approvedBy,
        approvedAt: approvedBy ? new Date() : null,
        status: pendingChain ? 'pending_blockchain' : 'stored_ipfs',
        statusMessage: pendingChain
            ? 'Encrypted evidence pinned to IPFS. Awaiting MetaMask blockchain proof.'
            : 'Encrypted evidence pinned to IPFS. Blockchain proof was not requested.'
    });

    await writeAuditLog({
        actor: user,
        organizationId: user.organizationId,
        action: 'ipfs_storage',
        targetType: 'evidence',
        targetId: evidence._id,
        metadata: { ipfsCID, blockchainRequested: pendingChain }
    });

    return evidence;
}

async function processEvidenceUpload({ user, file, fileBuffer, body }) {
    const captureMetadata = parseCaptureMetadata(body.captureMetadata);
    const caseId = body.caseId ? String(body.caseId).trim().slice(0, 120) : null;
    const fileHash = computeSha256(fileBuffer);
    await assertUniqueHash(fileHash);

    const policy = await getOrganizationPolicy(user.organizationId);
    const { requestAI, requestBlockchain, confirmStoreDespiteAi } = resolveUploadOptions(user, body, policy);

    let aiAnalysis = notRequestedAnalysis();
    if (requestAI) {
        try {
            aiAnalysis = await analyzeEvidence(fileBuffer, {
                originalName: file.originalname,
                mimeType: file.mimetype,
                captureMetadata
            });
        } catch (err) {
            throw httpError(err.statusCode || 502, err.message || 'AI verification failed. The evidence was not modified.');
        }
        await writeAuditLog({
            actor: user,
            organizationId: user.organizationId,
            action: 'ai_analysis',
            targetType: 'file',
            targetId: fileHash,
            metadata: {
                deepfakeDetected: aiAnalysis.deepfakeDetected,
                tamperingDetected: aiAnalysis.tamperingDetected
            }
        });
    }

    const suspicious = isSuspicious(aiAnalysis);

    if (isNormalUser(user) && requestAI && !confirmStoreDespiteAi) {
        return {
            requiresConfirmation: true,
            message: suspicious
                ? 'Potential manipulation detected. You may still store this evidence.'
                : 'AI analysis completed. Confirm to encrypt and store this evidence.',
            data: {
                fileHash,
                fileName: sanitizeFileName(file.originalname),
                aiAnalysis,
                requestAI,
                requestBlockchain
            }
        };
    }

    if (isEmployee(user) && suspicious) {
        if (!user.organizationId) {
            throw httpError(409, 'Employee accounts must belong to an organization before uploading evidence.');
        }

        const temporaryStorageReference = storeQuarantineFile(fileBuffer, file.originalname);
        const quarantine = await QuarantineEvidence.create({
            organizationId: user.organizationId,
            uploaderId: user.id,
            UploaderWallet: String(user.walletAddress).toLowerCase(),
            caseId,
            fileName: sanitizeFileName(file.originalname),
            mimeType: file.mimetype,
            fileSize: file.size || fileBuffer.length,
            originalFileHash: fileHash,
            captureMetadata,
            aiAnalysis,
            temporaryStorageReference,
            blockchainRequested: requestBlockchain,
            reviewStatus: 'pending_review'
        });

        await writeAuditLog({
            actor: user,
            organizationId: user.organizationId,
            action: 'quarantine',
            targetType: 'quarantineEvidence',
            targetId: quarantine._id,
            metadata: { originalFileHash: fileHash }
        });

        return {
            quarantined: true,
            message: 'This evidence is awaiting organization admin review.',
            data: {
                quarantineId: quarantine._id,
                fileHash,
                fileName: quarantine.fileName,
                reviewStatus: quarantine.reviewStatus,
                storageStatus: 'quarantine',
                blockchainStatus: 'not_requested',
                aiAnalysis,
                status: 'quarantine',
                statusMessage: 'Submitted for organization admin review.'
            }
        };
    }

    // Validate groupId if provided
    let groupId = null;
    if (body.groupId) {
        const Group = require('../model/groupModel');
        const group = await Group.findById(body.groupId);
        if (!group) {
            throw httpError(404, 'Group not found.');
        }
        if (String(group.organizationId) !== String(user.organizationId)) {
            throw httpError(403, 'You can only assign evidence to groups within your organization.');
        }
        groupId = body.groupId;
    }

    const evidence = await createTrustedEvidence({
        user,
        fileBuffer,
        file: { originalname: file.originalname, mimetype: file.mimetype, size: file.size },
        captureMetadata,
        caseId,
        aiAnalysis,
        requestBlockchain,
        groupId,
        reviewStatus: 'not_required'
    });

    await writeAuditLog({
        actor: user,
        organizationId: user.organizationId,
        action: 'upload',
        targetType: 'evidence',
        targetId: evidence._id
    });

    const extras = {};
    if (requestBlockchain) {
        extras.blockchainPayload = blockchainPayload(evidence);
    }

    return {
        message: requestBlockchain
            ? 'Evidence stored on IPFS. Use blockchainPayload to create an integrity proof with MetaMask.'
            : 'Evidence stored on encrypted IPFS.',
        data: publicEvidence(evidence, extras)
    };
}

module.exports = {
    parseBoolean,
    parseCaptureMetadata,
    sanitizeFileName,
    blockchainPayload,
    publicEvidence,
    createTrustedEvidence,
    processEvidenceUpload
};
