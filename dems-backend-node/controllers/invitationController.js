const Invitation = require('../model/invitationModel');
const Organization = require('../model/organizationModel');
const User = require('../model/userModel');
const { writeAuditLog } = require('../services/auditService');
const { sendAdminInvitationEmail, sendEmployeeInvitationEmail } = require('../services/emailService');
const { httpError } = require('../services/accessControl');

// Helper function to check invitation expiration
function isInvitationExpired(invitation) {
    return new Date() > new Date(invitation.expiresAt);
}

// Create organization admin invitation
const createAdminInvitation = async (req, res, next) => {
    try {
        const { organizationId, invitedEmail, invitedName } = req.body;

        if (!organizationId || !invitedEmail || !invitedName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Organization ID, email, and name are required.' 
            });
        }

        // Verify organization exists
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        // Check if invitation already exists for this email and organization
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

        // Create invitation (expires in 7 days)
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

        // Send email
        const emailResult = await sendAdminInvitationEmail(invitation, organization);

        await writeAuditLog({
            actor: req.user,
            organizationId,
            action: 'admin_invitation_created',
            targetType: 'invitation',
            targetId: invitation._id,
            metadata: { 
                invitedEmail: invitation.invitedEmail,
                emailStatus: emailResult.success ? 'sent' : 'failed',
                emailMode: emailResult.mode || 'production'
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Organization administrator invitation created successfully.',
            data: {
                invitationId: invitation._id,
                invitedEmail: invitation.invitedEmail,
                expiresAt: invitation.expiresAt,
                emailStatus: emailResult.success ? 'sent' : 'failed',
                emailMode: emailResult.mode || 'production'
            }
        });
    } catch (err) {
        next(err);
    }
};

// Create employee invitation
const createEmployeeInvitation = async (req, res, next) => {
    try {
        const { 
            organizationId, 
            invitedEmail, 
            invitedName,
            department,
            designation,
            employeeId,
            contactPhone
        } = req.body;

        if (!organizationId || !invitedEmail || !invitedName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Organization ID, email, and name are required.' 
            });
        }

        // Verify organization exists
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        // Check if invitation already exists
        const existingInvitation = await Invitation.findOne({
            organizationId,
            invitedEmail: invitedEmail.toLowerCase(),
            invitationType: 'employee',
            status: 'pending'
        });

        if (existingInvitation) {
            return res.status(409).json({ 
                success: false, 
                message: 'A pending invitation already exists for this email.' 
            });
        }

        // Create invitation (expires in 14 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        const invitation = await Invitation.create({
            organizationId,
            invitedEmail: invitedEmail.toLowerCase(),
            invitedName: invitedName.trim(),
            invitationType: 'employee',
            invitedBy: req.user.id,
            expiresAt,
            department: department?.trim() || '',
            designation: designation?.trim() || '',
            employeeId: employeeId?.trim() || '',
            contactPhone: contactPhone?.trim() || ''
        });

        // Send email
        const emailResult = await sendEmployeeInvitationEmail(invitation, organization);

        await writeAuditLog({
            actor: req.user,
            organizationId,
            action: 'employee_invitation_created',
            targetType: 'invitation',
            targetId: invitation._id,
            metadata: { 
                invitedEmail: invitation.invitedEmail,
                department: invitation.department,
                designation: invitation.designation,
                emailStatus: emailResult.success ? 'sent' : 'failed',
                emailMode: emailResult.mode || 'production'
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Employee invitation created successfully.',
            data: {
                invitationId: invitation._id,
                invitedEmail: invitation.invitedEmail,
                expiresAt: invitation.expiresAt,
                emailStatus: emailResult.success ? 'sent' : 'failed',
                emailMode: emailResult.mode || 'production'
            }
        });
    } catch (err) {
        next(err);
    }
};

// Get invitation by token
const getInvitationByToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invitation token is required.' });
        }

        const invitation = await Invitation.findOne({ token })
            .populate('organizationId')
            .populate('invitedBy', 'profile.displayName profile.email');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        // Check if expired
        if (isInvitationExpired(invitation)) {
            await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
            return res.status(410).json({ success: false, message: 'This invitation has expired.' });
        }

        // Check if already accepted
        if (invitation.status === 'accepted') {
            return res.status(409).json({ success: false, message: 'This invitation has already been accepted.' });
        }

        // Check if revoked
        if (invitation.status === 'revoked') {
            return res.status(403).json({ success: false, message: 'This invitation has been revoked.' });
        }

        return res.status(200).json({
            success: true,
            data: invitation
        });
    } catch (err) {
        next(err);
    }
};

// Accept invitation (admin)
const acceptAdminInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { email, name, phone } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invitation token is required.' });
        }

        const invitation = await Invitation.findOne({ token })
            .populate('organizationId');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        if (invitation.invitationType !== 'organization_admin') {
            return res.status(400).json({ success: false, message: 'This is not an admin invitation.' });
        }

        if (invitation.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This invitation is no longer valid.' });
        }

        if (isInvitationExpired(invitation)) {
            await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
            return res.status(410).json({ success: false, message: 'This invitation has expired.' });
        }

        // Verify email matches invitation
        if (email && email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Email does not match invitation.' });
        }

        // Update user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check if user already belongs to another organization
        if (user.organizationId && String(user.organizationId) !== String(invitation.organizationId._id)) {
            return res.status(409).json({ 
                success: false, 
                message: 'You already belong to another organization.' 
            });
        }

        // Update user role and organization
        user.role = 'admin';
        user.organizationId = invitation.organizationId._id;
        user.profile.displayName = name || user.profile.displayName;
        user.profile.email = email || user.profile.email;
        user.profile.phone = phone || user.profile.phone;
        user.accountStatus = 'active';
        await user.save();

        // Update invitation
        await Invitation.findByIdAndUpdate(invitation._id, {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: user._id
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: invitation.organizationId._id,
            action: 'admin_invitation_accepted',
            targetType: 'invitation',
            targetId: invitation._id,
            result: 'success'
        });

        return res.status(200).json({
            success: true,
            message: 'You are now an Organization Administrator.',
            data: {
                role: user.role,
                organizationId: user.organizationId,
                organizationName: invitation.organizationId.name
            }
        });
    } catch (err) {
        next(err);
    }
};

// Accept invitation (employee) - first step
const acceptEmployeeInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invitation token is required.' });
        }

        const invitation = await Invitation.findOne({ token })
            .populate('organizationId');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        if (invitation.invitationType !== 'employee') {
            return res.status(400).json({ success: false, message: 'This is not an employee invitation.' });
        }

        if (invitation.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This invitation is no longer valid.' });
        }

        if (isInvitationExpired(invitation)) {
            await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
            return res.status(410).json({ success: false, message: 'This invitation has expired.' });
        }

        // Update invitation status to show it's been opened
        // User will need to complete profile and submit application
        return res.status(200).json({
            success: true,
            message: 'Invitation valid. Please complete your profile.',
            data: {
                organizationName: invitation.organizationId.name,
                organizationCode: invitation.organizationId.organizationCode,
                invitedName: invitation.invitedName,
                department: invitation.department,
                designation: invitation.designation,
                employeeId: invitation.employeeId
            }
        });
    } catch (err) {
        next(err);
    }
};

// Submit employee application after accepting invitation
const submitEmployeeApplication = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { documents } = req.files || {};
        
        // Get profile data from body
        const profileData = {
            displayName: req.body.displayName,
            email: req.body.email,
            phone: req.body.phone
        };

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invitation token is required.' });
        }

        const invitation = await Invitation.findOne({ token })
            .populate('organizationId');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        if (invitation.invitationType !== 'employee') {
            return res.status(400).json({ success: false, message: 'This is not an employee invitation.' });
        }

        if (invitation.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'This invitation is no longer valid.' });
        }

        if (isInvitationExpired(invitation)) {
            await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
            return res.status(410).json({ success: false, message: 'This invitation has expired.' });
        }

        // Update user profile
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check if user already belongs to another organization
        if (user.organizationId && String(user.organizationId) !== String(invitation.organizationId._id)) {
            return res.status(409).json({ 
                success: false, 
                message: 'You already belong to another organization.' 
            });
        }

        // Update profile
        if (profileData.displayName) user.profile.displayName = profileData.displayName;
        if (profileData.email) user.profile.email = profileData.email;
        if (profileData.phone) user.profile.phone = profileData.phone;
        user.profile.department = invitation.department;
        user.profile.designation = invitation.designation;
        user.profile.employeeId = invitation.employeeId;

        // Process documents
        const documentArray = [];
        if (documents) {
            const docFields = Array.isArray(documents) ? documents : [documents];
            for (const doc of docFields) {
                if (doc) {
                    documentArray.push({
                        fieldName: doc.fieldname,
                        originalName: doc.originalname,
                        path: doc.path,
                        mimeType: doc.mimetype,
                        size: doc.size,
                        uploadedAt: new Date()
                    });
                }
            }
        }

        // Set membership status to pending approval
        user.membershipStatus = 'pending_approval';
        user.officerVerification = {
            status: 'pending',
            documents: documentArray,
            badgeNumber: invitation.employeeId || '',
            governmentIdNumber: '',
            aadhaarNumber: '',
            requestedAt: new Date(),
            requestedOrganizationId: invitation.organizationId._id
        };

        await user.save();

        // Update invitation
        await Invitation.findByIdAndUpdate(invitation._id, {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: user._id
        });

        await writeAuditLog({
            actor: req.user,
            organizationId: invitation.organizationId._id,
            action: 'employee_application_submitted',
            targetType: 'user',
            targetId: user._id,
            result: 'pending_approval'
        });

        return res.status(200).json({
            success: true,
            message: 'Employee application submitted. Awaiting Organization Admin approval.',
            data: {
                membershipStatus: user.membershipStatus,
                organizationName: invitation.organizationId.name
            }
        });
    } catch (err) {
        next(err);
    }
};

// List pending invitations for an organization
const getPendingInvitations = async (req, res, next) => {
    try {
        const { organizationId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required.' });
        }

        // Verify user has access to this organization
        if (req.user.role !== 'super_admin' && String(req.user.organizationId) !== String(organizationId)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view invitations for this organization.' });
        }

        const invitations = await Invitation.find({
            organizationId,
            status: 'pending'
        })
        .populate('invitedBy', 'profile.displayName')
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: invitations.length,
            data: invitations
        });
    } catch (err) {
        next(err);
    }
};

// Revoke invitation
const revokeInvitation = async (req, res, next) => {
    try {
        const { invitationId } = req.params;

        const invitation = await Invitation.findById(invitationId)
            .populate('organizationId');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found.' });
        }

        // Verify user has access to this organization
        if (req.user.role !== 'super_admin' && String(req.user.organizationId) !== String(invitation.organizationId._id)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to revoke this invitation.' });
        }

        if (invitation.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'Can only revoke pending invitations.' });
        }

        await Invitation.findByIdAndUpdate(invitationId, { status: 'revoked' });

        await writeAuditLog({
            actor: req.user,
            organizationId: invitation.organizationId._id,
            action: 'invitation_revoked',
            targetType: 'invitation',
            targetId: invitationId,
            result: 'success'
        });

        return res.status(200).json({
            success: true,
            message: 'Invitation revoked successfully.'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createAdminInvitation,
    createEmployeeInvitation,
    getInvitationByToken,
    acceptAdminInvitation,
    acceptEmployeeInvitation,
    submitEmployeeApplication,
    getPendingInvitations,
    revokeInvitation
};