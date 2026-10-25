const { ethers } = require('ethers');
const mongoose = require('mongoose');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const AuditLog = require('../model/auditLogModel');
const { requireOrgAdmin, isAdmin } = require('../services/accessControl');
const { writeAuditLog } = require('../services/auditService');
const { ensureAdminOrganization } = require('../services/organizationService');

// Base user fields for public responses
const baseUserFields = {
    _id: 1,
    walletAddress: 1,
    role: 1,
    organizationId: 1,
    profile: 1,
    createdAt: 1,
    updatedAt: 1
};

// Extended fields for verification requests (includes officerVerification nested fields)
const verificationUserFields = {
    ...baseUserFields,
    'officerVerification.status': 1,
    'officerVerification.requestedAt': 1,
    'officerVerification.reviewedAt': 1
};

// Extended fields for membership review (includes membership status fields)
const membershipUserFields = {
    ...baseUserFields,
    membershipStatus: 1,
    membershipReviewedBy: 1,
    membershipReviewedAt: 1,
    membershipRejectionReason: 1,
    'officerVerification.status': 1,
    'officerVerification.requestedAt': 1,
    'officerVerification.reviewedAt': 1
};

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

        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(baseUserFields);
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

        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(baseUserFields);
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

        const Group = require('../model/groupModel');
        // Show active members AND pending approval requests (so admin can review them)
        const users = await User.find({
            organizationId: req.user.organizationId,
            $or: [
                { membershipStatus: 'active' },
                { membershipStatus: 'pending_approval' }
            ]
        })
            .select(baseUserFields)
            .sort({ createdAt: -1 });

        // Populate group information for each user
        const usersWithGroups = await Promise.all(
            users.map(async (user) => {
                // Only show groups for active members
                const groups = user.membershipStatus === 'active'
                    ? await Group.find({
                        organizationId: req.user.organizationId,
                        members: user._id,
                        isActive: true
                    }).select('name _id')
                    : [];

                return {
                    ...user.toObject(),
                    groups
                };
            })
        );

        return res.status(200).json({ success: true, count: usersWithGroups.length, data: usersWithGroups });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getVerificationRequests = async (req, res, next) => {
    try {
        console.log('[VERIFICATION_REQUESTS] Fetching verification requests');
        console.log('[VERIFICATION_REQUESTS] Req.user:', req.user);
        console.log('[VERIFICATION_REQUESTS] Organization ID:', req.user.organizationId);
        console.log('[VERIFICATION_REQUESTS] Role:', req.user.role);

        if (!isAdmin(req.user)) {
            console.log('[VERIFICATION_REQUESTS] ERROR: User is not admin');
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (!req.user.organizationId) {
            console.log('[VERIFICATION_REQUESTS] ERROR: User has no organization');
            return res.status(403).json({ success: false, message: 'You must belong to an organization to access organization data.' });
        }

        // Get both legacy officer verification requests and new membership status requests
        const query = {
            $or: [
                { 'officerVerification.status': 'pending', 'officerVerification.requestedOrganizationId': req.user.organizationId },
                { membershipStatus: 'pending_approval', organizationId: req.user.organizationId }
            ]
        };

        console.log('[VERIFICATION_REQUESTS] Query:', JSON.stringify(query));

        const users = await User.find(query)
            .select(membershipUserFields)
            .sort({ createdAt: -1 });

        console.log('[VERIFICATION_REQUESTS] Found users:', users.length);
        console.log('[VERIFICATION_REQUESTS] User IDs:', users.map(u => u._id));

        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        console.error('[VERIFICATION_REQUESTS] ERROR:', err);
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

        const existing = await User.findOne({ walletAddress: normalizedWallet }).select(verificationUserFields);
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
        ).select(verificationUserFields);

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

        const existing = await User.findById(userId).select(membershipUserFields);
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
        ).select(baseUserFields);

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

        // Build filter from query parameters
        const filter = { organizationId: req.user.organizationId };

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.actorId) {
            filter.actorId = req.query.actorId;
        }

        if (req.query.result) {
            filter.result = req.query.result;
        }

        if (req.query.targetId) {
            filter.targetId = req.query.targetId;
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate);
            }
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const skip = parseInt(req.query.skip, 10) || 0;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: logs.length,
            total,
            data: logs
        });
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

const getPlatformUsers = async (req, res, next) => {
    try {
        // Only super admin can access platform-wide user listing
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can access platform-wide user data.' });
        }

        const {
            role,
            organizationId,
            membershipStatus,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (role) {
            filter.role = role;
        }

        if (organizationId) {
            filter.organizationId = organizationId;
        }

        if (membershipStatus) {
            filter.membershipStatus = membershipStatus;
        }

        if (search) {
            filter.$or = [
                { 'profile.displayName': { $regex: search, $options: 'i' } },
                { 'profile.email': { $regex: search, $options: 'i' } },
                { walletAddress: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const maxLimit = Math.min(parseInt(limit), 100);

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('_id walletAddress role organizationId membershipStatus profile.displayName profile.email profile.phone accountStatus createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(maxLimit),
            User.countDocuments(filter)
        ]);

        // Populate organization names if needed
        const Organization = require('../model/organizationModel');
        const usersWithOrgNames = await Promise.all(
            users.map(async (user) => {
                if (user.organizationId) {
                    const org = await Organization.findById(user.organizationId).select('name organizationCode');
                    return {
                        ...user.toObject(),
                        organizationName: org?.name || 'Unknown',
                        organizationCode: org?.organizationCode || 'Unknown'
                    };
                }
                return {
                    ...user.toObject(),
                    organizationName: null,
                    organizationCode: null
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: usersWithOrgNames.length,
            total,
            page: parseInt(page),
            limit: maxLimit,
            data: usersWithOrgNames
        });
    } catch (err) {
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
    upgradeOfficer,
    getPlatformUsers
};
