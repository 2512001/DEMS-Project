const fs = require('fs');
const EvidenceModel = require('../model/evidenceModel');
const QuarantineEvidence = require('../model/quarantineEvidenceModel');
const { decryptFile } = require('../services/cryptoService');
const { fetchEncryptedBlobFromIpfs } = require('../services/ipfsService');
const { processEvidenceUpload, blockchainPayload } = require('../services/evidencePipelineService');
const { canAccessEvidence, isAdmin, isEmployee, isEvidenceOwner, httpError } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');
const { getOrganizationPolicy } = require('../services/organizationService');

const getFileBuffer = (file) => {
    if (file.buffer) return file.buffer;
    if (file.path) return fs.readFileSync(file.path);
    throw httpError(400, 'Uploaded file could not be read.');
};

const cleanupUploadedFile = (file) => {
    if (!file?.path) return;
    fs.unlink(file.path, (err) => {
        if (err) {
            console.error('[CLEANUP] Delete failed:', err.message);
        }
    });
};

const uploadEvidence = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No evidence file provided.' });
        }

        const fileBuffer = getFileBuffer(req.file);
        const result = await processEvidenceUpload({
            user: req.user,
            file: req.file,
            fileBuffer,
            body: req.body
        });

        return res.status(result.requiresConfirmation ? 200 : 201).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err instanceof SyntaxError) {
            return res.status(400).json({ success: false, message: 'captureMetadata must be valid JSON.' });
        }
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    } finally {
        cleanupUploadedFile(req.file);
    }
};

const getUploadPolicy = async (req, res, next) => {
    try {
        const policy = await getOrganizationPolicy(req.user.organizationId);
        return res.status(200).json({
            success: true,
            data: {
                role: req.user.role,
                organizationId: req.user.organizationId || null,
                requireAIForEmployees: isEmployee(req.user) ? policy.requireAIForEmployees : false,
                requireBlockchainForEmployees: isEmployee(req.user) ? policy.requireBlockchainForEmployees : false,
                aiOptional: !isEmployee(req.user) || !policy.requireAIForEmployees,
                blockchainOptional: !isEmployee(req.user) || !policy.requireBlockchainForEmployees
            }
        });
    } catch (err) {
        next(err);
    }
};

const getMyFiles = async (req, res, next) => {
    try {
        const walletAddress = String(req.user?.walletAddress || '').toLowerCase();
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
        const skip = (page - 1) * limit;
        const filter = { UploaderWallet: walletAddress };

        const [totalRecords, evidence, quarantine] = await Promise.all([
            EvidenceModel.countDocuments(filter),
            EvidenceModel.find(filter)
                .select('_id fileName ipfsCID fileHash fileSize mimeType status createdAt caseId blockchainTxHash blockchainStatus storageStatus reviewStatus processingStatus aiAnalysis organizationId versionNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            isEmployee(req.user)
                ? QuarantineEvidence.find({ uploaderId: req.user.id })
                    .select('-temporaryStorageReference')
                    .sort({ createdAt: -1 })
                    .limit(50)
                : Promise.resolve([])
        ]);

        return res.status(200).json({
            success: true,
            count: evidence.length,
            data: evidence,
            quarantine: quarantine.map((record) => ({
                ...record.toObject(),
                isQuarantine: true,
                fileHash: record.originalFileHash,
                status: record.reviewStatus === 'rejected' ? 'rejected' : 'quarantine',
                storageStatus: 'quarantine',
                blockchainStatus: 'not_requested'
            })),
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit) || 1,
                hasNextPage: page < Math.ceil(totalRecords / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        next(err);
    }
};

const getOrganizationEvidence = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this evidence.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization evidence.' });
        }

        const evidence = await EvidenceModel.find({ organizationId: req.user.organizationId })
            .select('-encryption')
            .sort({ createdAt: -1 })
            .limit(200);

        return res.status(200).json({ success: true, count: evidence.length, data: evidence });
    } catch (err) {
        next(err);
    }
};

const getEvidenceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const evidence = await EvidenceModel.findById(id);

        if (!evidence) {
            return res.status(404).json({ success: false, message: 'Evidence not found.' });
        }

        if (!canAccessEvidence(req.user, evidence)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this evidence.' });
        }

        let fileContent = null;
        if (evidence.ipfsCID && evidence.encryption?.iv && evidence.encryption?.authTag) {
            try {
                const encryptedBuffer = await fetchEncryptedBlobFromIpfs(evidence.ipfsCID);
                const originalBuffer = decryptFile(encryptedBuffer, evidence.encryption);
                fileContent = originalBuffer.toString('base64');
            } catch (err) {
                if (err.statusCode !== 422) {
                    throw err;
                }
            }
        }

        await writeAuditLog({
            actor: req.user,
            organizationId: evidence.organizationId,
            action: 'evidence_access',
            targetType: 'evidence',
            targetId: evidence._id
        });

        const evidencePayload = evidence.toObject();
        delete evidencePayload.encryption;

        return res.status(200).json({
            success: true,
            data: {
                ...evidencePayload,
                fileContent,
                blockchainPayload: evidence.blockchainStatus === 'pending' && evidence.ipfsCID
                    ? blockchainPayload(evidence)
                    : null
            }
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getEvidenceByCase = async (req, res, next) => {
    try {
        const caseId = String(req.params.caseId || '').trim();
        if (!caseId || caseId.length > 120) {
            return res.status(400).json({ success: false, message: 'Valid caseId is required.' });
        }

        const filter = { caseId };
        if (isAdmin(req.user)) {
            if (!req.user.organizationId) {
                return res.status(403).json({ success: false, message: 'You are not authorized to access this evidence.' });
            }
            filter.organizationId = req.user.organizationId;
        } else {
            filter.UploaderWallet = String(req.user.walletAddress).toLowerCase();
        }

        const evidence = await EvidenceModel.find(filter)
            .select('-encryption')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: evidence.length, data: evidence });
    } catch (err) {
        next(err);
    }
};

const finalizeEvidence = async (req, res, next) => {
    try {
        const evidenceId = String(req.params.evidenceId || '').trim();
        const txHash = String(req.body.txHash || '').trim();

        if (!txHash.startsWith('0x') || txHash.length !== 66) {
            return res.status(400).json({ success: false, message: 'Valid blockchain transaction hash is required.' });
        }

        const evidence = await EvidenceModel.findById(evidenceId);
        if (!evidence) {
            return res.status(404).json({ success: false, message: 'Evidence record not found.' });
        }

        if (!isEvidenceOwner(req.user, evidence)) {
            return res.status(403).json({ success: false, message: 'Only the original uploader wallet can finalize the blockchain proof.' });
        }
        if (!evidence.blockchainRequested || !['pending', 'failed'].includes(evidence.blockchainStatus)) {
            return res.status(409).json({ success: false, message: 'This evidence is not waiting for a blockchain proof.' });
        }

        evidence.blockchainTxHash = txHash;
        evidence.blockchainRequested = true;
        evidence.blockchainStatus = 'confirmed';
        evidence.status = 'stored_on_chain';
        evidence.statusMessage = 'Blockchain transaction confirmed and stored.';
        await evidence.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: evidence.organizationId,
            action: 'blockchain_transaction',
            targetType: 'evidence',
            targetId: evidence._id,
            metadata: { txHash }
        });

        return res.status(200).json({
            success: true,
            message: 'Evidence finalized on-chain.',
            data: {
                ...evidence.toObject(),
                encryption: undefined,
                blockchainPayload: blockchainPayload(evidence)
            }
        });
    } catch (err) {
        next(err);
    }
};

const markBlockchainFailed = async (req, res, next) => {
    try {
        const evidence = await EvidenceModel.findById(req.params.evidenceId);
        if (!evidence) {
            return res.status(404).json({ success: false, message: 'Evidence record not found.' });
        }
        if (!isEvidenceOwner(req.user, evidence)) {
            return res.status(403).json({ success: false, message: 'Only the original uploader wallet can update this blockchain proof.' });
        }

        evidence.blockchainStatus = 'failed';
        evidence.statusMessage = 'Blockchain proof could not be created. Your evidence remains stored in IPFS.';
        await evidence.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: evidence.organizationId,
            action: 'blockchain_failure',
            targetType: 'evidence',
            targetId: evidence._id,
            result: 'failed',
            reason: String(req.body.reason || '').slice(0, 500)
        });

        const payload = evidence.toObject();
        delete payload.encryption;

        return res.status(200).json({
            success: true,
            message: 'Blockchain proof could not be created. Your evidence remains stored in IPFS.',
            data: payload
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEvidenceById,
    uploadEvidence,
    getMyFiles,
    getEvidenceByCase,
    finalizeEvidence,
    getUploadPolicy,
    getOrganizationEvidence,
    markBlockchainFailed
};
