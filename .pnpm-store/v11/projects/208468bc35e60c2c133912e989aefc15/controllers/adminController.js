const { ethers } = require('ethers');
const mongoose = require('mongoose');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const AuditLog = require('../model/auditLogModel');
const { requireOrgAdmin } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');
const { ensureAdminOrganization } = require('../services/organizationService');

const publicUserFields = '_id walletAddress role organizationId profile officerVerification.status officerVerification.requestedAt officerVerification.reviewedAt createdAt updatedAt';

const normalizeFiles = (files = {}) => {
    return Object.entries(files).flatMap(([fieldName, entries]) => {
        return entries.map((file) => ({
            fieldName,
            originalName: file.originalname,
            path: file.path,
            mimeType: file.mimetype,
            size: file.size
        }));
    });
};

const submitVerificationRequest = async (req, res, next) => {
    try {
        const documents = normalizeFiles(req.files);

        if (!documents.length) {
            return res.status(400).json({ success: false, message: 'At least one verification document is required.' });
        }

        const requestedOrganizationId = String(req.body.organizationId || req.body.requestedOrganizationId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(requestedOrganizationId)) {
            return res.status(400).json({ success: false, message: 'A valid target organizationId is required.' });
        }

        const targetOrganization = await Organization.findById(requestedOrganizationId).select('_id');
        if (!targetOrganization) {
            return res.status(404).json({ success: false, message: 'Target organization not found.' });
        }

        const updates = {
            'officerVerification.status': 'pending',
            'officerVerification.badgeNumber': String(req.body.badgeNumber || '').trim().slice(0, 120),
            'officerVerification.governmentIdNumber': String(req.body.governmentIdNumber || '').trim().slice(0, 120),
            'officerVerification.aadhaarNumber': String(req.body.aadhaarNumber || '').trim().slice(0, 120),
            'officerVerification.documents': documents,
            'officerVerification.rejectionReason': '',
            'officerVerification.reviewedBy': null,
            'officerVerification.reviewedAt': null,
            'officerVerification.requestedAt': new Date(),
            'officerVerification.requestedOrganizationId': targetOrganization._id
        };

        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(publicUserFields);
        await writeAuditLog({
            actor: req.user,
            organizationId: targetOrganization._id,
            action: 'employee_membership_request',
            targetType: 'user',
            targetId: user._id
        });

        return res.status(201).json({
            success: true,
            message: 'Employee membership request submitted.',
            user
        });
    } catch (err) {
        next(err);
    }
};

const submitVerificationRequestByCode = async (req, res, next) => {
    try {
        const documents = normalizeFiles(req.files);

        if (!documents.length) {
            return res.status(400).json({ success: false, message: 'At least one verification document is required.' });
        }

        const organizationCode = String(req.body.organizationCode || '').trim().toUpperCase();
        if (!organizationCode) {
            return res.status(400).json({ success: false, message: 'Organization code is required.' });
        }

        const targetOrganization = await Organization.findOne({ 
            organizationCode,
            status: 'active'
        }).select('_id name organizationCode');
        
        if (!targetOrganization) {
            return res.status(404).json({ success: false, message: 'Organization not found with this code.' });
        }

        const updates = {
            'officerVerification.status': 'pending',
            'officerVerification.badgeNumber': String(req.body.badgeNumber || '').trim().slice(0, 120),
            'officerVerification.governmentIdNumber': String(req.body.governmentIdNumber || '').trim().slice(0, 120),
            'officerVerification.aadhaarNumber': String(req.body.aadhaarNumber || '').trim().slice(0, 120),
            'officerVerification.documents': documents,
            'officerVerification.rejectionReason': '',
            'officerVerification.reviewedBy': null,
            'officerVerification.reviewedAt': null,
            'officerVerification.requestedAt': new Date(),
            'officerVerification.requestedOrganizationId': targetOrganization._id
        };

        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(publicUserFields);
        await writeAuditLog({
            actor: req.user,
            organizationId: targetOrganization._id,
            action: 'employee_membership_request_by_code',
            targetType: 'user',
            targetId: user._id,
            metadata: { organizationCode }
        });

        return res.status(201).json({
            success: true,
            message: 'Employee membership request submitted for organization review.',
            user,
            organization: { name: targetOrganization.name, organizationCode: targetOrganization.organizationCode }
        });
    } catch (err) {
        next(err);
    }
};

const getUsers = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        const users = await User.find({ organizationId: req.user.organizationId })
            .select(publicUserFields)
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getVerificationRequests = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        // Get both legacy officer verification requests and new membership status requests
        const users = await User.find({
            $or: [
                { 'officerVerification.status': 'pending', 'officerVerification.requestedOrganizationId': req.user.organizationId },
                { membershipStatus: 'pending_approval', organizationId: req.user.organizationId }
            ]
        })
            .select(`${publicUserFields} officerVerification membershipStatus membershipReviewedBy membershipReviewedAt membershipRejectionReason profile`)
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const reviewVerificationRequest = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        const { walletAddress, status, rejectionReason } = req.body;
        const normalizedWallet = (walletAddress || '').toLowerCase();

        if (!ethers.isAddress(normalizedWallet) || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress and status approved/rejected are required.' });
        }

        const updates = {
            'officerVerification.status': status,
            'officerVerification.rejectionReason': status === 'rejected' ? String(rejectionReason || '').slice(0, 500) : '',
            'officerVerification.reviewedBy': req.user.id,
            'officerVerification.reviewedAt': new Date()
        };

        const existing = await User.findOne({ walletAddress: normalizedWallet }).select(`${publicUserFields} officerVerification`);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'User not found for the provided wallet address.' });
        }
        if (existing.officerVerification?.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This membership request is not pending review.' });
        }
        if (String(existing.officerVerification?.requestedOrganizationId || '') !== String(req.user.organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to review this membership request.' });
        }
        if (existing.organizationId && String(existing.organizationId) !== String(req.user.organizationId)) {
            return res.status(409).json({ success: false, message: 'This user already belongs to another organization.' });
        }
        if (existing.role === 'admin') {
            return res.status(409).json({ success: false, message: 'Organization admins cannot be converted into employees of another organization.' });
        }

        if (status === 'approved') {
            updates.role = 'officer';
            updates.organizationId = req.user.organizationId;
            updates.membershipStatus = 'active';
        } else {
            updates.membershipStatus = 'rejected';
            updates.organizationId = null;
        }

        const user = await User.findOneAndUpdate(
            { walletAddress: normalizedWallet },
            { $set: updates },
            { new: true }
        ).select(`${publicUserFields} officerVerification`);

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: status === 'approved' ? 'employee_approval' : 'employee_rejection',
            targetType: 'user',
            targetId: user._id,
            reason: updates['officerVerification.rejectionReason']
        });

        return res.status(200).json({
            success: true,
            message: status === 'approved' ? 'Employee membership approved.' : 'Employee membership rejected.',
            user
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const reviewMembershipApplication = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        const { userId, status, rejectionReason } = req.body;

        if (!userId || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid user ID and status approved/rejected are required.' });
        }

        const existing = await User.findById(userId).select(`${publicUserFields} membershipStatus membershipReviewedBy membershipReviewedAt membershipRejectionReason profile organizationId officerVerification`);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (existing.membershipStatus !== 'pending_approval') {
            return res.status(409).json({ success: false, message: 'This application is not pending review.' });
        }

        const requestedOrg = existing.organizationId || existing.officerVerification?.requestedOrganizationId;
        if (String(requestedOrg || '') !== String(req.user.organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to review this application.' });
        }

        // CRITICAL: Never downgrade Super Admins or Admins
        if (existing.role === 'super_admin' || existing.role === 'admin') {
            return res.status(409).json({ success: false, message: 'Administrator accounts cannot be reviewed or downgraded through this process.' });
        }

        const updates = {
            membershipStatus: status === 'approved' ? 'active' : 'rejected',
            membershipReviewedBy: req.user.id,
            membershipReviewedAt: new Date(),
            membershipRejectionReason: status === 'rejected' ? String(rejectionReason || '').slice(0, 500) : ''
        };

        if (status === 'approved') {
            updates.role = 'officer';
            updates.organizationId = req.user.organizationId;
        } else {
            updates.organizationId = null;
            updates.role = existing.role === 'officer' ? 'citizen' : existing.role;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select(publicUserFields);

        // Send email notification
        const Organization = require('../model/organizationModel');
        const { sendEmployeeApprovedEmail, sendEmployeeRejectedEmail } = require('../services/emailService');
        
        const organization = await Organization.findById(req.user.organizationId);
        if (organization) {
            if (status === 'approved') {
                const emailResult = await sendEmployeeApprovedEmail(
                    { invitedName: user.profile?.displayName || existing.profile?.displayName, invitedEmail: user.profile?.email || existing.profile?.email },
                    organization
                );
                console.log('[ADMIN] Approval email status:', emailResult.status);
            } else {
                const emailResult = await sendEmployeeRejectedEmail(
                    { invitedName: user.profile?.displayName || existing.profile?.displayName, invitedEmail: user.profile?.email || existing.profile?.email },
                    organization,
                    rejectionReason
                );
                console.log('[ADMIN] Rejection email status:', emailResult.status);
            }
        }

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'membership_application_review',
            targetType: 'user',
            targetId: user._id,
            metadata: { decision: status, rejectionReason }
        });

        return res.status(200).json({
            success: true,
            message: status === 'approved' ? 'Employee application approved successfully.' : 'Employee application rejected.',
            user
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        const logs = await AuditLog.find({ organizationId: req.user.organizationId })
            .sort({ createdAt: -1 })
            .limit(100);

        return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const upgradeOfficer = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        const walletAddress = (req.body.walletAddress || '').toLowerCase();
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress is required.' });
        }

        const existing = await User.findOne({ walletAddress }).select('_id walletAddress role organizationId');
        if (!existing) {
            return res.status(404).json({ success: false, message: 'User not found for the provided wallet address.' });
        }
        if (existing.role === 'admin') {
            return res.status(409).json({ success: false, message: 'Organization admins cannot be converted into employees.' });
        }
        if (existing.organizationId && String(existing.organizationId) !== String(req.user.organizationId)) {
            return res.status(409).json({ success: false, message: 'This user already belongs to another organization.' });
        }

        const user = await User.findOneAndUpdate(
            { walletAddress },
            { $set: { role: 'officer', organizationId: req.user.organizationId } },
            { new: true }
        ).select('_id walletAddress role organizationId updatedAt');

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'employee_approval',
            targetType: 'user',
            targetId: user._id
        });

        return res.status(200).json({
            success: true,
            message: 'User role upgraded to organization employee.',
            user
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

module.exports = {
    submitVerificationRequest,
    submitVerificationRequestByCode,
    getUsers,
    getVerificationRequests,
    reviewVerificationRequest,
    reviewMembershipApplication,
    getAuditLogs,
    upgradeOfficer
};
