const express = require('express');
const router = express.Router();
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const Invitation = require('../model/invitationModel');
const Evidence = require('../model/evidenceModel');
const AuditLog = require('../model/auditLogModel');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Get platform-level analytics for Super Admin
router.get('/platform', protect, authorizeRoles('super_admin'), async (req, res, next) => {
    try {
        const [
            totalOrganizations,
            activeOrganizations,
            suspendedOrganizations,
            totalUsers,
            citizens,
            officers,
            admins,
            superAdmins,
            pendingInvitations,
            acceptedInvitations,
            expiredInvitations,
            totalEvidence,
            quarantinedEvidence,
            blockchainVerifiedEvidence,
            integrityVerified,
            integrityFailures
        ] = await Promise.all([
            Organization.countDocuments(),
            Organization.countDocuments({ status: 'active' }),
            Organization.countDocuments({ status: 'suspended' }),
            User.countDocuments(),
            User.countDocuments({ role: 'citizen' }),
            User.countDocuments({ role: 'officer' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'super_admin' }),
            Invitation.countDocuments({ status: 'pending' }),
            Invitation.countDocuments({ status: 'accepted' }),
            Invitation.countDocuments({ status: 'expired' }),
            Evidence.countDocuments(),
            Evidence.countDocuments({ quarantineStatus: 'quarantined' }),
            Evidence.countDocuments({ blockchainStatus: 'confirmed' }),
            Evidence.countDocuments({ integrityVerified: true }),
            Evidence.countDocuments({ integrityVerified: false })
        ]);

        // Get recent security events
        const recentSecurityEvents = await AuditLog.find({
            action: { $in: ['LOGIN_FAILED', 'INVITATION_EXPIRED', 'INTEGRITY_FAILED', 'SECURITY_ALERT'] }
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action actorId actorWallet metadata createdAt');

        // Get user growth over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Get organization growth over time
        const orgGrowth = await Organization.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalOrganizations,
                    activeOrganizations,
                    suspendedOrganizations,
                    totalUsers,
                    citizens,
                    officers,
                    admins,
                    superAdmins,
                    pendingInvitations,
                    acceptedInvitations,
                    expiredInvitations,
                    totalEvidence,
                    quarantinedEvidence,
                    blockchainVerifiedEvidence,
                    integrityVerified,
                    integrityFailures
                },
                recentSecurityEvents,
                trends: {
                    userGrowth,
                    orgGrowth
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get organization-specific analytics for Admin
router.get('/organization', protect, async (req, res, next) => {
    try {
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            return res.status(403).json({ success: false, message: 'Organization access required.' });
        }

        const [
            totalOfficers,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            totalEvidence,
            quarantinedEvidence,
            approvedEvidence,
            rejectedEvidence,
            blockchainConfirmedEvidence,
            integrityVerifiedEvidence
        ] = await Promise.all([
            User.countDocuments({ organizationId, role: 'officer' }),
            User.countDocuments({ organizationId, membershipStatus: 'pending' }),
            User.countDocuments({ organizationId, membershipStatus: 'active' }),
            User.countDocuments({ organizationId, membershipStatus: 'rejected' }),
            Evidence.countDocuments({ organizationId }),
            Evidence.countDocuments({ organizationId, quarantineStatus: 'quarantined' }),
            Evidence.countDocuments({ organizationId, quarantineStatus: 'approved' }),
            Evidence.countDocuments({ organizationId, quarantineStatus: 'rejected' }),
            Evidence.countDocuments({ organizationId, blockchainStatus: 'confirmed' }),
            Evidence.countDocuments({ organizationId, integrityVerified: true })
        ]);

        // Get department-wise evidence (if departments are used)
        const departmentEvidence = await Evidence.aggregate([
            { $match: { organizationId } },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent activity
        const recentActivity = await AuditLog.find({
            organizationId,
            action: { $in: ['EVIDENCE_UPLOADED', 'EVIDENCE_QUARANTINED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED'] }
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action actor metadata createdAt');

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalOfficers,
                    pendingApplications,
                    approvedApplications,
                    rejectedApplications,
                    totalEvidence,
                    quarantinedEvidence,
                    approvedEvidence,
                    rejectedEvidence,
                    blockchainConfirmedEvidence,
                    integrityVerifiedEvidence
                },
                departmentEvidence,
                recentActivity
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get officer-specific analytics
router.get('/officer', protect, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [
            totalEvidence,
            pendingEvidence,
            approvedEvidence,
            rejectedEvidence,
            quarantinedEvidence,
            blockchainConfirmedEvidence,
            integrityVerifiedEvidence
        ] = await Promise.all([
            Evidence.countDocuments({ uploadedBy: userId }),
            Evidence.countDocuments({ uploadedBy: userId, quarantineStatus: 'pending' }),
            Evidence.countDocuments({ uploadedBy: userId, quarantineStatus: 'approved' }),
            Evidence.countDocuments({ uploadedBy: userId, quarantineStatus: 'rejected' }),
            Evidence.countDocuments({ uploadedBy: userId, quarantineStatus: 'quarantined' }),
            Evidence.countDocuments({ uploadedBy: userId, blockchainStatus: 'confirmed' }),
            Evidence.countDocuments({ uploadedBy: userId, integrityVerified: true })
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalEvidence,
                    pendingEvidence,
                    approvedEvidence,
                    rejectedEvidence,
                    quarantinedEvidence,
                    blockchainConfirmedEvidence,
                    integrityVerifiedEvidence
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get citizen-specific analytics
router.get('/citizen', protect, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [
            totalEvidence,
            verifiedEvidence,
            pendingEvidence,
            blockchainConfirmedEvidence
        ] = await Promise.all([
            Evidence.countDocuments({ uploadedBy: userId }),
            Evidence.countDocuments({ uploadedBy: userId, integrityVerified: true }),
            Evidence.countDocuments({ uploadedBy: userId, integrityVerified: false }),
            Evidence.countDocuments({ uploadedBy: userId, blockchainStatus: 'confirmed' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalEvidence,
                    verifiedEvidence,
                    pendingEvidence,
                    blockchainConfirmedEvidence
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;