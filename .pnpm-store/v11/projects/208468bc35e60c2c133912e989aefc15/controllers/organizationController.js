const Organization = require('../model/organizationModel');
const User = require('../model/userModel');
const Evidence = require('../model/evidenceModel');
const QuarantineEvidence = require('../model/quarantineEvidenceModel');
const { generateOrganizationCode } = require('../services/organizationService');
const { requireOrgAdmin, isAdmin, isSuperAdmin } = require('../services/accessControl');
const { parseBoolean } = require('../services/evidencePipelineService');
const { writeAuditLog } = require('../services/auditService');

const listOrganizations = async (req, res, next) => {
    try {
        // Only super admin can list all organizations
        if (!isSuperAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        const organizations = await Organization.find({})
            .select('_id name organizationCode status createdAt createdBy adminId')
            .sort({ name: 1 })
            .limit(200);
        return res.status(200).json({ success: true, count: organizations.length, data: organizations });
    } catch (err) {
        next(err);
    }
};

const createOrganization = async (req, res, next) => {
    try {
        // Only super admin can create organizations
        if (!isSuperAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only Super Admin can create organizations.' });
        }

        const {
            name,
            organizationType,
            description,
            officialEmail,
            officialPhone,
            website,
            address,
            primaryContact
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Organization name is required.' });
        }

        const organization = await Organization.create({
            name: String(name).trim().slice(0, 160),
            organizationCode: generateOrganizationCode(),
            organizationType: organizationType || 'other',
            description: description ? String(description).trim().slice(0, 500) : '',
            officialEmail: officialEmail ? String(officialEmail).trim().toLowerCase().slice(0, 120) : '',
            officialPhone: officialPhone ? String(officialPhone).trim().slice(0, 20) : '',
            website: website ? String(website).trim().slice(0, 200) : '',
            address: address || {},
            primaryContact: primaryContact || {},
            createdBy: req.user.id,
            status: 'active',
            policy: {
                requireAIForEmployees: true,
                requireBlockchainForEmployees: false
            }
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: organization._id,
            action: 'organization_created',
            targetType: 'organization',
            targetId: organization._id,
            metadata: { 
                name: organization.name,
                organizationCode: organization.organizationCode,
                organizationType: organization.organizationType
            }
        });

        return res.status(201).json({ 
            success: true, 
            message: 'Organization created successfully.', 
            data: organization 
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Organization code conflict. Please try again.' });
        }
        next(err);
    }
};

const assignOrganizationAdmin = async (req, res, next) => {
    try {
        // Only super admin can assign organization admins
        if (!isSuperAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only Super Admin can assign organization administrators.' });
        }

        const { organizationId, invitedEmail, invitedName } = req.body;
        
        if (!organizationId || !invitedEmail || !invitedName) {
            return res.status(400).json({ success: false, message: 'Organization ID, email, and name are required.' });
        }

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        // Use invitation system instead of direct assignment
        const Invitation = require('../model/invitationModel');
        const { sendAdminInvitationEmail } = require('../services/emailService');

        // Check for existing pending invitation
        const existingInvitation = await Invitation.findOne({
            organizationId,
            invitedEmail: invitedEmail.toLowerCase(),
            invitationType: 'organization_admin',
            status: 'pending'
        });

        if (existingInvitation) {
            return res.status(409).json({ 
                success: false, 
                message: 'A pending invitation already exists for this email.' 
            });
        }

        // Create invitation
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await Invitation.create({
            organizationId,
            invitedEmail: invitedEmail.toLowerCase(),
            invitedName: invitedName.trim(),
            invitationType: 'organization_admin',
            invitedBy: req.user.id,
            expiresAt
        });

        console.log('[ASSIGN-ADMIN] Sending invitation email to:', invitation.invitedEmail);
        console.log('[ASSIGN-ADMIN] Organization:', organization.name);
        console.log('[ASSIGN-ADMIN] Invitation ID:', invitation._id);
        console.log('[ASSIGN-ADMIN] Token:', invitation.token);

        const emailResult = await sendAdminInvitationEmail(invitation, organization);

        console.log('[ASSIGN-ADMIN] Email result:', {
            success: emailResult?.success,
            status: emailResult?.status,
            code: emailResult?.code,
            messageId: emailResult?.messageId || null,
            error: emailResult?.error || null
        });

        await Invitation.findByIdAndUpdate(invitation._id, {
            emailStatus: emailResult.status,
            emailSentAt: emailResult.status === 'sent' ? new Date() : null,
            emailMessageId: emailResult.messageId || null,
            emailError: emailResult.error || null
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: organization._id,
            action: 'admin_invitation_created',
            targetType: 'invitation',
            targetId: invitation._id,
            metadata: {
                invitedEmail: invitation.invitedEmail,
                emailStatus: emailResult.status,
                emailSent: emailResult.success
            }
        });

        if (!emailResult.success) {
            return res.status(502).json({
                success: false,
                message: 'Invitation was created but the email could not be sent. Check SMTP settings.',
                code: 'EMAIL_SEND_FAILED',
                error: emailResult.error,
                data: {
                    invitationId: invitation._id,
                    invitedEmail: invitation.invitedEmail,
                    expiresAt: invitation.expiresAt,
                    emailStatus: emailResult.status
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Organization administrator invitation sent successfully.',
            data: {
                invitationId: invitation._id,
                invitedEmail: invitation.invitedEmail,
                expiresAt: invitation.expiresAt,
                emailSent: true,
                emailStatus: emailResult.status
            }
        });
    } catch (err) {
        next(err);
    }
};

const getMyOrganization = async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(200).json({ success: true, data: null });
        }

        const organization = await Organization.findById(req.user.organizationId);
        return res.status(200).json({ success: true, data: organization });
    } catch (err) {
        next(err);
    }
};

const updateOrganizationSettings = async (req, res, next) => {
    try {
        // Only organization admins can update their organization settings
        if (!isSuperAdmin(req.user) && !req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        // If not super admin, user must belong to the organization they're updating
        if (!isSuperAdmin(req.user)) {
            const organization = await Organization.findById(req.user.organizationId);
            if (!organization) {
                return res.status(404).json({ success: false, message: 'Organization not found.' });
            }
            // Verify the user is the admin of this organization
            if (String(organization.adminId) !== String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'You are not the administrator of this organization.' });
            }
        }

        const name = req.body.name ? String(req.body.name).trim().slice(0, 160) : '';
        const organizationId = req.body.organizationId || req.user.organizationId;
        
        let organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        if (name) organization.name = name;
        
        // Generate organization code if not present
        if (!organization.organizationCode) {
            organization.organizationCode = generateOrganizationCode();
        }
        
        // Set adminId if not present
        if (!organization.adminId && req.user.organizationId === String(organization._id)) {
            organization.adminId = req.user.id;
        }
        
        organization.policy = organization.policy || {};
        if (req.body.requireAIForEmployees !== undefined) {
            organization.policy.requireAIForEmployees = parseBoolean(req.body.requireAIForEmployees);
        }
        if (req.body.requireBlockchainForEmployees !== undefined) {
            organization.policy.requireBlockchainForEmployees = parseBoolean(req.body.requireBlockchainForEmployees);
        }
        await organization.save();

        await writeAuditLog({
            actor: req.user,
            organizationId: organization._id,
            action: 'organization_settings',
            targetType: 'organization',
            targetId: organization._id
        });

        return res.status(200).json({ success: true, message: 'Organization settings updated.', data: organization });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getOrganizationOverview = async (req, res, next) => {
    try {
        await ensureAdminOrganization(req.user);
        requireOrgAdmin(req.user);
        const orgId = req.user.organizationId;

        const [employees, totalEvidence, pendingReview, quarantined, blockchain, pendingApplications] = await Promise.all([
            User.countDocuments({ organizationId: orgId, role: 'officer', membershipStatus: 'active' }),
            Evidence.countDocuments({ organizationId: orgId }),
            QuarantineEvidence.countDocuments({ organizationId: orgId, reviewStatus: 'pending_review' }),
            QuarantineEvidence.countDocuments({ organizationId: orgId }),
            Evidence.countDocuments({ organizationId: orgId, blockchainStatus: 'confirmed' }),
            User.countDocuments({ organizationId: orgId, membershipStatus: 'pending_approval' })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                employees,
                totalEvidence,
                pendingReview,
                quarantined,
                blockchain,
                pendingApplications
            }
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getOrganizationDetails = async (req, res, next) => {
    try {
        const { organizationId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required.' });
        }

        // Verify access
        if (req.user.role !== 'super_admin' && String(req.user.organizationId) !== String(organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view this organization.' });
        }

        const organization = await Organization.findById(organizationId);

        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        const User = require('../model/userModel');
        const Evidence = require('../model/evidenceModel');
        const Invitation = require('../model/invitationModel');

        const [adminCount, employeeCount, evidenceCount, pendingInvitations] = await Promise.all([
            User.countDocuments({ organizationId, role: 'admin', accountStatus: 'active' }),
            User.countDocuments({ organizationId, role: 'officer', membershipStatus: 'active' }),
            Evidence.countDocuments({ organizationId }),
            Invitation.countDocuments({ organizationId, status: 'pending' })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                ...organization.toObject(),
                stats: {
                    adminCount,
                    employeeCount,
                    evidenceCount,
                    pendingInvitations
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

const getOrganizationAdmins = async (req, res, next) => {
    try {
        const { organizationId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required.' });
        }

        // Verify access
        if (req.user.role !== 'super_admin' && String(req.user.organizationId) !== String(organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view this organization.' });
        }

        const User = require('../model/userModel');
        const admins = await User.find({
            organizationId,
            role: 'admin',
            accountStatus: 'active'
        })
        .select('_id walletAddress profile.displayName profile.email profile.phone profile.department profile.designation accountStatus createdAt')
        .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (err) {
        next(err);
    }
};

const resolveOrganizationByCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Organization code is required.' });
        }

        const organization = await Organization.findOne({ 
            organizationCode: code.toUpperCase(),
            status: 'active'
        }).select('_id name organizationCode');

        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found with this code.' });
        }

        return res.status(200).json({ 
            success: true, 
            data: organization 
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listOrganizations,
    createOrganization,
    assignOrganizationAdmin,
    getMyOrganization,
    updateOrganizationSettings,
    getOrganizationOverview,
    getOrganizationDetails,
    getOrganizationAdmins,
    resolveOrganizationByCode
};
