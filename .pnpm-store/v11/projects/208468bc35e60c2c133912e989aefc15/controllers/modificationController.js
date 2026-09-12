const ModificationRequest = require('../model/modificationRequestModel');
const EvidenceModel = require('../model/evidenceModel');
const { isEmployee, requireOrgAdmin, isEvidenceOwner } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');
const { ensureAdminOrganization } = require('../services/organizationService');
const { processEvidenceUpload, blockchainPayload, publicEvidence } = require('../services/evidencePipelineService');
const { computeSha256 } = require('../services/cryptoService');

const createModificationRequest = async (req, res, next) => {
    try {
        if (!isEmployee(req.user)) {
            return res.status(403).json({ success: false, message: 'Only organization employees can request evidence modifications.' });
        }
        if (!req.user.organizationId) {
            return res.status(409).json({ success: false, message: 'Employee accounts must belong to an organization.' });
        }

        const changeReason = String(req.body.changeReason || '').trim().slice(0, 1000);
        const proposedCaseId = req.body.proposedCaseId ? String(req.body.proposedCaseId).trim().slice(0, 120) : null;
        if (!changeReason) {
            return res.status(400).json({ success: false, message: 'A change reason is required.' });
        }

        const evidence = await EvidenceModel.findById(req.body.evidenceId);
        if (!evidence) {
            return res.status(404).json({ success: false, message: 'Evidence not found.' });
        }
        if (!isEvidenceOwner(req.user, evidence)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to request a modification for this evidence.' });
        }
        if (!evidence.organizationId || String(evidence.organizationId) !== String(req.user.organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to request a modification for this evidence.' });
        }

        const pending = await ModificationRequest.findOne({
            evidenceId: evidence._id,
            requestedBy: req.user.id,
            status: 'pending'
        }).select('_id');
        if (pending) {
            return res.status(409).json({ success: false, message: 'A pending modification request already exists for this evidence.' });
        }

        const request = await ModificationRequest.create({
            organizationId: req.user.organizationId,
            evidenceId: evidence._id,
            requestedBy: req.user.id,
            changeReason,
            proposedCaseId
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'modification_request',
            targetType: 'modificationRequest',
            targetId: request._id,
            reason: changeReason
        });

        return res.status(201).json({ success: true, message: 'Modification request submitted for admin review.', data: request });
    } catch (err) {
        next(err);
    }
};

const listModificationRequests = async (req, res, next) => {
    try {
        if (isEmployee(req.user)) {
            const requests = await ModificationRequest.find({ requestedBy: req.user.id })
                .populate('evidenceId', 'fileName caseId fileHash status')
                .sort({ createdAt: -1 });
            return res.status(200).json({ success: true, count: requests.length, data: requests });
        }

        await ensureAdminOrganization(req.user);
        requireOrgAdmin(req.user);

        const requests = await ModificationRequest.find({ organizationId: req.user.organizationId })
            .populate('evidenceId', 'fileName caseId fileHash status')
            .populate('requestedBy', 'walletAddress profile')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const reviewModificationRequest = async (req, res, next) => {
    try {
        await ensureAdminOrganization(req.user);
        requireOrgAdmin(req.user);

        const decision = String(req.body.decision || req.body.status || '').toLowerCase();
        const reason = String(req.body.reason || '').trim().slice(0, 500);
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'A review reason is required.' });
        }

        const request = await ModificationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Modification request not found.' });
        }
        if (String(request.organizationId) !== String(req.user.organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }
        if (request.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This modification request has already been reviewed.' });
        }

        request.status = decision;
        request.reviewedBy = req.user.id;
        request.reviewedAt = new Date();
        request.adminDecisionReason = reason;

        if (decision === 'approved') {
            // If there's a new file evidence ID, this is a file replacement
            if (request.newEvidenceId) {
                const newEvidence = await EvidenceModel.findById(request.newEvidenceId);
                const oldEvidence = await EvidenceModel.findById(request.evidenceId);
                
                if (newEvidence && oldEvidence) {
                    // Update old evidence to preserve version history and point to new content
                    const history = Array.isArray(oldEvidence.versionHistory) ? oldEvidence.versionHistory : [];
                    history.push({
                        versionNumber: Number(oldEvidence.versionNumber || 1),
                        caseId: oldEvidence.caseId || null,
                        changeReason: oldEvidence.changeReason || '',
                        changedBy: oldEvidence.changedBy || request.requestedBy,
                        approvedBy: oldEvidence.approvedBy || null,
                        approvedAt: oldEvidence.approvedAt || null,
                        snapshotAt: new Date()
                    });
                    
                    oldEvidence.versionHistory = history;
                    oldEvidence.versionNumber = Number(oldEvidence.versionNumber || 1) + 1;
                    // The current evidence becomes the new version, so we don't change previousVersion
                    // The history already contains the snapshot of the previous version
                    oldEvidence.fileHash = newEvidence.fileHash;
                    oldEvidence.ipfsCID = newEvidence.ipfsCID;
                    oldEvidence.encryption = newEvidence.encryption;
                    oldEvidence.fileSize = newEvidence.fileSize;
                    oldEvidence.aiAnalysis = newEvidence.aiAnalysis;
                    oldEvidence.changedBy = request.requestedBy;
                    oldEvidence.changeReason = request.changeReason;
                    oldEvidence.approvedBy = req.user.id;
                    oldEvidence.approvedAt = new Date();
                    oldEvidence.statusMessage = 'File content replaced with new version after admin approval.';
                    oldEvidence.status = newEvidence.status;
                    oldEvidence.storageStatus = newEvidence.storageStatus;
                    oldEvidence.blockchainStatus = newEvidence.blockchainStatus;
                    oldEvidence.blockchainRequested = newEvidence.blockchainRequested;
                    oldEvidence.blockchainTxHash = newEvidence.blockchainTxHash;
                    
                    if (request.proposedCaseId) {
                        oldEvidence.caseId = request.proposedCaseId;
                    }
                    
                    await oldEvidence.save();
                    
                    // Mark the temporary new evidence as superseded
                    newEvidence.status = 'superseded';
                    newEvidence.statusMessage = 'This version was superseded by an approved modification.';
                    await newEvidence.save();
                    
                    request.resultingEvidenceId = oldEvidence._id;
                }
            } else {
                // Original metadata-only change logic
                const evidence = await EvidenceModel.findById(request.evidenceId);
                if (evidence) {
                    const history = Array.isArray(evidence.versionHistory) ? evidence.versionHistory : [];
                    history.push({
                        versionNumber: Number(evidence.versionNumber || 1),
                        caseId: evidence.caseId || null,
                        changeReason: evidence.changeReason || '',
                        changedBy: evidence.changedBy || request.requestedBy,
                        approvedBy: evidence.approvedBy || null,
                        approvedAt: evidence.approvedAt || null,
                        snapshotAt: new Date()
                    });
                    evidence.versionHistory = history;
                    evidence.versionNumber = Number(evidence.versionNumber || 1) + 1;
                    if (request.proposedCaseId) {
                        evidence.caseId = request.proposedCaseId;
                    }
                    evidence.changedBy = request.requestedBy;
                    evidence.changeReason = request.changeReason;
                    evidence.approvedBy = req.user.id;
                    evidence.approvedAt = new Date();
                    evidence.statusMessage = 'Controlled metadata update applied after admin approval. File content was not overwritten.';
                    await evidence.save();
                    request.resultingEvidenceId = evidence._id;
                }
            }
        }

        await request.save();
        await writeAuditLog({
            actor: req.user,
            organizationId: request.organizationId,
            action: decision === 'approved' ? 'modification_approval' : 'modification_rejection',
            targetType: 'modificationRequest',
            targetId: request._id,
            reason
        });

        return res.status(200).json({
            success: true,
            message: decision === 'approved' ? 'Modification approved. A new evidence version was recorded.' : 'Modification request rejected.',
            data: request
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const submitModifiedFile = async (req, res, next) => {
    const fs = require('fs');
    
    const cleanupUploadedFile = (file) => {
        if (!file?.path) return;
        fs.unlink(file.path, (err) => {
            if (err) {
                console.error('[CLEANUP] Delete failed:', err.message);
            }
        });
    };

    try {
        if (!isEmployee(req.user)) {
            return res.status(403).json({ success: false, message: 'Only organization employees can submit modified evidence files.' });
        }
        if (!req.user.organizationId) {
            return res.status(409).json({ success: false, message: 'Employee accounts must belong to an organization.' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Evidence file is required.' });
        }

        const request = await ModificationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Modification request not found.' });
        }
        if (String(request.organizationId) !== String(req.user.organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }
        if (request.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This modification request has already been reviewed.' });
        }
        if (request.newEvidenceId) {
            return res.status(409).json({ success: false, message: 'A modified file has already been submitted for this request.' });
        }

        const originalEvidence = await EvidenceModel.findById(request.evidenceId);
        if (!originalEvidence) {
            return res.status(404).json({ success: false, message: 'Original evidence not found.' });
        }

        const getFileBuffer = (file) => {
            if (file.buffer) return file.buffer;
            if (file.path) return fs.readFileSync(file.path);
            throw new Error('Uploaded file could not be read.');
        };

        const fileBuffer = getFileBuffer(req.file);
        const newFileHash = computeSha256(fileBuffer);

        if (newFileHash === originalEvidence.fileHash) {
            return res.status(400).json({ success: false, message: 'The modified file is identical to the original. No changes detected.' });
        }

        // Create a temporary new evidence record with the modified file
        const captureMetadata = originalEvidence.captureMetadata;
        const caseId = request.proposedCaseId || originalEvidence.caseId;
        
        const evidence = await processEvidenceUpload({
            user: req.user,
            file: req.file,
            fileBuffer,
            body: {
                caseId,
                captureMetadata,
                requestAI: false,
                requestBlockchain: originalEvidence.blockchainRequested
            }
        });

        // Link the new evidence to the modification request
        request.newEvidenceId = evidence.data?._id || evidence.data?.evidenceId;
        await request.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'modified_file_submission',
            targetType: 'modificationRequest',
            targetId: request._id,
            metadata: { 
                originalFileHash: originalEvidence.fileHash,
                newFileHash: newFileHash,
                newEvidenceId: request.newEvidenceId
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Modified file submitted. Awaiting admin approval to replace the original evidence.',
            data: {
                ...request.toObject(),
                newFileHash,
                preview: evidence.data
            }
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    } finally {
        cleanupUploadedFile(req.file);
    }
};

module.exports = {
    createModificationRequest,
    listModificationRequests,
    reviewModificationRequest,
    submitModifiedFile
};
