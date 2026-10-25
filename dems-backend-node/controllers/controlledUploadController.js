const {
    createPendingUploadRequest,
    signPendingUploadRequest,
    approvePendingUploadRequest,
    superAdminApprovePendingUploadRequest,
    rejectPendingUploadRequest,
    getPendingUploadRequests,
    getPendingUploadRequestById
} = require('../services/controlledUploadService');
const { isSuperAdmin, isAdmin, httpError } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');

/**
 * Create a new pending upload request (controlled evidence workflow)
 */
const createPendingUpload = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No evidence file provided.' });
        }

        const result = await createPendingUploadRequest({
            user: req.user,
            file: req.file,
            fileBuffer: req.file.buffer,
            body: req.body
        });

        return res.status(201).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Sign a pending upload request (uploader authorization)
 */
const signPendingUpload = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { signature } = req.body;

        if (!signature) {
            return res.status(400).json({ success: false, message: 'Signature is required.' });
        }

        const result = await signPendingUploadRequest({
            user: req.user,
            requestId,
            signature
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Approve a pending upload request (Organization Admin)
 */
const approvePendingUpload = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { signature, reason } = req.body;

        if (!signature) {
            return res.status(400).json({ success: false, message: 'Signature is required.' });
        }

        const result = await approvePendingUploadRequest({
            user: req.user,
            requestId,
            signature,
            reason
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Approve a pending upload request (Super Admin)
 */
const superAdminApprovePendingUpload = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { signature, reason } = req.body;

        if (!signature) {
            return res.status(400).json({ success: false, message: 'Signature is required.' });
        }

        const result = await superAdminApprovePendingUploadRequest({
            user: req.user,
            requestId,
            signature,
            reason
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Reject a pending upload request
 */
const rejectPendingUpload = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        const result = await rejectPendingUploadRequest({
            user: req.user,
            requestId,
            reason
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Get pending upload requests (for approval queues)
 */
const listPendingUploads = async (req, res, next) => {
    try {
        const filters = {
            workflowStatus: req.query.status,
            page: parseInt(req.query.page, 10) || 1,
            limit: Math.min(parseInt(req.query.limit, 10) || 20, 100)
        };

        // Role-based filtering
        if (isSuperAdmin(req.user)) {
            // Super Admin can see all pending uploads
            // No organization filter
        } else if (isAdmin(req.user)) {
            // Organization Admin can see pending uploads for their organization
            filters.organizationId = req.user.organizationId;
        } else {
            // Regular users can only see their own
            filters.uploaderId = req.user.id;
        }

        const result = await getPendingUploadRequests(filters);

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

/**
 * Get a single pending upload request by ID
 */
const getPendingUploadById = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const pendingRequest = await getPendingUploadRequestById(requestId, req.user);

        // Return without sensitive fields
        const publicRequest = pendingRequest.toObject();
        delete publicRequest.quarantineStorageReference;
        delete publicRequest.signatureNonce;

        return res.status(200).json({
            success: true,
            data: publicRequest
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

module.exports = {
    createPendingUpload,
    signPendingUpload,
    approvePendingUpload,
    superAdminApprovePendingUpload,
    rejectPendingUpload,
    listPendingUploads,
    getPendingUploadById
};
