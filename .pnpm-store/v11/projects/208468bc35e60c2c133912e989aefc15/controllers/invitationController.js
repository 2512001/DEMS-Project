const Invitation = require('../model/invitationModel');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const {
    sendEmployeeInvitationEmail,
    sendEmployeeApplicationSubmittedEmail
} = require('../services/emailService');
const { createAdminInvitation: createAdminInvitationRecord } = require('../services/invitationService');
const { isEmailVerified } = require('../services/otpService');
const { httpError } = require('../services/accessControl');

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

async function loadInvitation(token, expectedType) {
    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
        throw httpError(404, 'Invitation not found');
    }
    if (expectedType && invitation.invitationType !== expectedType) {
        throw httpError(400, 'This invitation is not valid for this action.');
    }
    if (invitation.status === 'expired' || new Date(invitation.expiresAt) < new Date()) {
        if (invitation.status === 'pending') {
            invitation.status = 'expired';
            await invitation.save();
        }
        throw httpError(400, 'Invitation has expired');
    }
    return invitation;
}

async function loadDbUser(reqUser) {
    const user = await User.findById(reqUser.id);
    if (!user) {
        throw httpError(401, 'Authenticated user no longer exists.');
    }
    return user;
}

function assertEmailMatch(invitation, user, submittedEmail) {
    const invited = normalizeEmail(invitation.invitedEmail);
    const submitted = normalizeEmail(submittedEmail);
    const profileEmail = normalizeEmail(user.profile?.email);

    if (submitted && submitted !== invited) {
        throw httpError(403, 'The verified email must match the invitation email.');
    }
    if (profileEmail && profileEmail !== invited) {
        throw httpError(403, 'This invitation is not for the email address on your account.');
    }
    if (!submitted && !profileEmail) {
        throw httpError(400, 'Confirm the invited email address before accepting.');
    }
}

async function assertEmailAvailable(email, currentUserId) {
    const existing = await User.findOne({ 'profile.email': email }).select('_id');
    if (existing && existing._id.toString() !== String(currentUserId)) {
        throw httpError(409, 'That email is already linked to another DEMS account.');
    }
}

function publicOrganization(organization) {
    if (!organization) return null;
    return {
        id: organization._id,
        _id: organization._id,
        name: organization.name,
        organizationCode: organization.organizationCode
    };
}

async function createAdminInvitation(req, res, next) {
    try {
        const { organizationId, invitedEmail, invitedName } = req.body;
        const { invitation, emailResult } = await createAdminInvitationRecord({
            organizationId,
            invitedEmail,
            invitedName,
            invitedBy: req.user.id,
            actor: req.user
        });

        res.status(201).json({
            success: true,
            message: emailResult.status === 'sent'
                ? 'Admin invitation created and emailed.'
                : 'Admin invitation created. Email was not delivered; share the in-app invitation link.',
            data: {
                invitationId: invitation._id,
                token: invitation.token,
                emailStatus: emailResult.status,
                emailError: emailResult.error || null
            }
        });
    } catch (error) {
        next(error);
    }
}

async function createEmployeeInvitation(req, res, next) {
    try {
        const { invitedEmail, invitedName, department, designation, employeeId, contactPhone } = req.body;
        const organizationId = req.user.role === 'admin' ? req.user.organizationId : req.body.organizationId;

        if (!organizationId) {
            throw httpError(400, 'Organization ID is required.');
        }
        if (req.user.role === 'admin' && String(req.user.organizationId) !== String(organizationId)) {
            throw httpError(403, 'You can only invite employees to your own organization.');
        }

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            throw httpError(404, 'Organization not found');
        }

        const email = normalizeEmail(invitedEmail);
        if (!email || !invitedName) {
            throw httpError(400, 'Invited email and name are required.');
        }

        const existingUser = await User.findOne({ 'profile.email': email });
        if (existingUser) {
            if (existingUser.role === 'admin' || existingUser.role === 'super_admin') {
                throw httpError(409, 'Administrators cannot be invited as employees.');
            }
            if (existingUser.role === 'officer' && existingUser.organizationId && existingUser.organizationId.toString() === String(organizationId)) {
                throw httpError(409, 'This user is already an officer of this organization.');
            }
            if (existingUser.organizationId && existingUser.organizationId.toString() !== String(organizationId) && existingUser.membershipStatus === 'active') {
                throw httpError(409, 'This user already belongs to another organization.');
            }
        }

        const existingInvitation = await Invitation.findOne({
            invitedEmail: email,
            status: { $in: ['pending', 'accepted'] },
            organizationId,
            invitationType: 'employee'
        });
        if (existingInvitation) {
            console.log('[INVITATION] Existing invitation found for email:', email, 'status:', existingInvitation.status);
            if (existingInvitation.status === 'accepted') {
                throw httpError(409, 'This email has already accepted an invitation for this organization.');
            }
            throw httpError(409, 'A pending invitation already exists for this email.');
        }

        const invitation = await Invitation.create({
            organizationId,
            invitedEmail: email,
            invitedName,
            invitationType: 'employee',
            invitedBy: req.user.id,
            department,
            designation,
            employeeId,
            contactPhone,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        });

        const emailResult = await sendEmployeeInvitationEmail(invitation, organization);
        invitation.emailStatus = emailResult.status;
        invitation.emailSentAt = emailResult.status === 'sent' ? new Date() : null;
        invitation.emailMessageId = emailResult.messageId || null;
        invitation.emailError = emailResult.error || null;
        await invitation.save();

        res.status(201).json({
            success: true,
            message: emailResult.status === 'sent'
                ? 'Employee invitation created and emailed.'
                : 'Employee invitation created. Email was not delivered; share the in-app invitation link.',
            data: {
                invitationId: invitation._id,
                token: invitation.token,
                emailStatus: emailResult.status,
                emailError: emailResult.error || null
            }
        });
    } catch (error) {
        next(error);
    }
}

async function getInvitationByToken(req, res, next) {
    try {
        const invitation = await loadInvitation(req.params.token);
        if (invitation.status !== 'pending' && invitation.status !== 'accepted') {
            throw httpError(400, 'Invitation is no longer valid');
        }

        const organization = await Organization.findById(invitation.organizationId);
        const organizationPayload = publicOrganization(organization);

        res.json({
            success: true,
            data: {
                invitationId: invitation._id,
                token: invitation.token,
                invitedEmail: invitation.invitedEmail,
                invitedName: invitation.invitedName,
                invitationType: invitation.invitationType,
                status: invitation.status,
                organization: organizationPayload,
                organizationId: organizationPayload,
                department: invitation.department,
                designation: invitation.designation,
                employeeId: invitation.employeeId,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error) {
        next(error);
    }
}

async function acceptAdminInvitation(req, res, next) {
    try {
        const invitation = await loadInvitation(req.params.token, 'organization_admin');
        if (invitation.status !== 'pending') {
            throw httpError(400, 'Invitation is no longer valid');
        }

        const user = await loadDbUser(req.user);
        const submittedEmail = normalizeEmail(req.body.email || user.profile?.email);
        assertEmailMatch(invitation, user, submittedEmail);
        await assertEmailAvailable(invitation.invitedEmail, user._id);

        if (user.role === 'super_admin') {
            throw httpError(409, 'Super Admin accounts cannot accept organization admin invitations.');
        }
        if (user.role === 'admin' && user.organizationId && user.organizationId.toString() !== invitation.organizationId.toString()) {
            throw httpError(409, 'This account already administers another organization.');
        }

        user.profile = {
            ...(user.profile?.toObject?.() || user.profile || {}),
            email: invitation.invitedEmail,
            displayName: String(req.body.name || invitation.invitedName || user.profile?.displayName || '').trim(),
            phone: String(req.body.phone || user.profile?.phone || '').trim()
        };
        user.role = 'admin';
        user.organizationId = invitation.organizationId;
        user.membershipStatus = 'active';
        await user.save();

        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        invitation.acceptedBy = user._id;
        invitation.acceptedWalletAddress = user.walletAddress;
        await invitation.save();

        const organization = await Organization.findById(invitation.organizationId);
        if (organization && !organization.adminId) {
            organization.adminId = user._id;
            await organization.save();
        }

        res.json({
            success: true,
            message: 'Invitation accepted successfully',
            data: {
                role: user.role,
                organizationId: user.organizationId
            }
        });
    } catch (error) {
        next(error);
    }
}

async function acceptEmployeeInvitation(req, res, next) {
    try {
        console.log('[INVITATION ACCEPT] acceptEmployeeInvitation called');
        console.log('[INVITATION ACCEPT] Token:', req.params.token);
        console.log('[INVITATION ACCEPT] Request body:', req.body);
        console.log('[INVITATION ACCEPT] Request user:', req.user);
        
        const invitation = await loadInvitation(req.params.token, 'employee');
        console.log('[INVITATION ACCEPT] Invitation loaded:', invitation._id);
        console.log('[INVITATION ACCEPT] Invitation status:', invitation.status);
        console.log('[INVITATION ACCEPT] Invitation email:', invitation.invitedEmail);
        console.log('[INVITATION ACCEPT] Invitation expiresAt:', invitation.expiresAt);
        console.log('[INVITATION ACCEPT] Current time:', new Date());
        console.log('[INVITATION ACCEPT] Remaining time:', new Date(invitation.expiresAt) - new Date());
        
        // Allow re-acceptance if invitation is accepted but user hasn't submitted application yet
        // This handles the case where user accepted but navigated away before completing application
        if (invitation.status === 'accepted') {
            console.log('[INVITATION ACCEPT] Invitation already accepted, checking if it belongs to this user');
            if (invitation.acceptedBy && invitation.acceptedBy.toString() === req.user.id) {
                console.log('[INVITATION ACCEPT] Invitation belongs to this user, allowing to proceed');
                // Don't throw error, allow user to proceed to application submission
            } else {
                console.log('[INVITATION ACCEPT] Invitation belongs to different user');
                return res.status(400).json({
                    success: false,
                    message: 'This invitation has already been accepted by another user.'
                });
            }
        }
        
        if (invitation.status !== 'pending' && invitation.status !== 'accepted') {
            console.log('[INVITATION ACCEPT] Invitation not valid, status:', invitation.status);
            return res.status(400).json({
                success: false,
                message: `Invitation is no longer valid. Current status: ${invitation.status}`
            });
        }

        const user = await loadDbUser(req.user);
        console.log('[INVITATION ACCEPT] User loaded:', user._id, 'role:', user.role);
        console.log('[INVITATION ACCEPT] User profile email:', user.profile?.email);
        
        const submittedEmail = normalizeEmail(req.body?.email || user.profile?.email);
        console.log('[INVITATION ACCEPT] Submitted email:', submittedEmail);
        
        // Log email matching check
        const invited = normalizeEmail(invitation.invitedEmail);
        const profileEmail = normalizeEmail(user.profile?.email);
        console.log('[INVITATION ACCEPT] Invited email:', invited);
        console.log('[INVITATION ACCEPT] Profile email:', profileEmail);
        console.log('[INVITATION ACCEPT] Email match check - submittedEmail:', submittedEmail, 'invited:', invited, 'profile:', profileEmail);
        
        // If user has no email yet, we'll set it from the invitation
        // This is expected for new users accepting invitations
        if (!submittedEmail || !profileEmail) {
            console.log('[INVITATION ACCEPT] User has no email yet, will set from invitation');
        } else {
            assertEmailMatch(invitation, user, submittedEmail);
            await assertEmailAvailable(invitation.invitedEmail, user._id);
        }

        if (user.role === 'admin' || user.role === 'super_admin') {
            console.log('[INVITATION ACCEPT] User is admin/super_admin, rejecting');
            return res.status(409).json({
                success: false,
                message: 'Administrator accounts cannot accept employee invitations.'
            });
        }

        // Only update invitation status if it's still pending
        if (invitation.status === 'pending') {
            invitation.status = 'accepted';
            invitation.acceptedAt = new Date();
            invitation.acceptedBy = user._id;
            invitation.acceptedWalletAddress = user.walletAddress;
            await invitation.save();
            console.log('[INVITATION ACCEPT] Invitation status updated to accepted');
        } else {
            console.log('[INVITATION ACCEPT] Invitation already accepted, skipping status update');
        }

        user.profile = {
            ...(user.profile?.toObject?.() || user.profile || {}),
            email: invitation.invitedEmail,
            displayName: String(req.body?.name || invitation.invitedName || user.profile?.displayName || '').trim(),
            phone: String(req.body?.phone || user.profile?.phone || '').trim(),
            emailVerified: false, // Force email verification for employee onboarding
            emailVerifiedAt: null
        };
        await user.save();
        console.log('[INVITATION ACCEPT] User profile updated, emailVerified set to false');

        res.json({
            success: true,
            message: 'Invitation accepted. Complete your application documents. You remain a citizen until an organization admin approves the request.',
            data: {
                invitationId: invitation._id,
                organizationId: invitation.organizationId,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[INVITATION ACCEPT] Error:', error);
        console.error('[INVITATION ACCEPT] Error message:', error.message);
        console.error('[INVITATION ACCEPT] Error stack:', error.stack);
        
        // Return the actual error message instead of generic 400
        const statusCode = error.statusCode || 500;
        const message = error.message || 'An error occurred while accepting the invitation';
        
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
}

async function submitEmployeeApplication(req, res, next) {
    try {
        const invitation = await loadInvitation(req.params.token, 'employee');
        const user = await loadDbUser(req.user);
        const documents = req.files ? req.files.documents : [];

        if (invitation.status !== 'accepted') {
            throw httpError(400, 'Accept the invitation before submitting an application.');
        }
        if (!invitation.acceptedBy || invitation.acceptedBy.toString() !== user._id.toString()) {
            throw httpError(403, 'This invitation is not for your account');
        }
        if (!documents.length) {
            throw httpError(400, 'At least one verification document is required.');
        }

        // CRITICAL: Never downgrade Super Admins or Admins
        if (user.role === 'super_admin' || user.role === 'admin') {
            throw httpError(409, 'Administrator accounts cannot submit employee applications.');
        }

        // Enforce email verification server-side so it cannot be bypassed by
        // calling this endpoint directly. EMAIL_VERIFIED is persisted on the
        // user (survives restarts) with the in-memory OTP store as a fallback.
        const emailVerified = Boolean(user.profile?.emailVerified) || isEmailVerified(invitation.invitedEmail);
        if (!emailVerified) {
            throw httpError(403, 'Verify your email with the OTP code before submitting your application.');
        }

        user.profile = {
            ...(user.profile?.toObject?.() || user.profile || {}),
            email: invitation.invitedEmail,
            displayName: String(req.body.displayName || req.body.name || invitation.invitedName || user.profile?.displayName || '').trim(),
            phone: String(req.body.phone || invitation.contactPhone || user.profile?.phone || '').trim(),
            department: invitation.department || user.profile?.department || '',
            designation: invitation.designation || user.profile?.designation || '',
            employeeId: invitation.employeeId || user.profile?.employeeId || ''
        };
        user.officerVerification = {
            status: 'pending',
            requestedAt: new Date(),
            requestedOrganizationId: invitation.organizationId,
            documents: documents.map((doc) => ({
                fieldName: 'documents',
                originalName: doc.originalname,
                path: doc.path,
                mimeType: doc.mimetype,
                size: doc.size
            })),
            aadhaarNumber: req.body.aadhaarNumber || '',
            governmentIdNumber: req.body.governmentIdNumber || '',
            badgeNumber: req.body.badgeNumber || '',
            rejectionReason: '',
            reviewedBy: null,
            reviewedAt: null
        };
        user.membershipStatus = 'pending_approval';
        user.membershipRejectionReason = '';
        // Do NOT change role - preserve existing role until approved
        await user.save();

        const organization = await Organization.findById(invitation.organizationId);
        if (organization) {
            const inviter = await User.findById(invitation.invitedBy).select('profile.email');
            await sendEmployeeApplicationSubmittedEmail(
                {
                    invitedName: user.profile.displayName || invitation.invitedName,
                    invitedEmail: invitation.invitedEmail,
                    designation: invitation.designation,
                    department: invitation.department,
                    notifyEmail: inviter?.profile?.email
                },
                organization
            );
        }

        res.json({
            success: true,
            message: 'Application submitted. You remain a citizen until the inviting organization admin approves it.',
            data: {
                status: 'pending',
                role: user.role,
                requestedOrganizationId: invitation.organizationId
            }
        });
    } catch (error) {
        next(error);
    }
}

async function getPendingInvitations(req, res, next) {
    try {
        const { organizationId } = req.params;
        if (req.user.role === 'admin' && String(req.user.organizationId || '') !== String(organizationId)) {
            throw httpError(403, 'You do not have access to this organization');
        }

        const invitations = await Invitation.find({
            organizationId,
            status: { $in: ['pending', 'accepted'] }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: invitations
        });
    } catch (error) {
        next(error);
    }
}

async function revokeInvitation(req, res, next) {
    try {
        const invitation = await Invitation.findById(req.params.invitationId);
        if (!invitation) {
            throw httpError(404, 'Invitation not found');
        }
        if (req.user.role === 'admin' && invitation.organizationId.toString() !== String(req.user.organizationId || '')) {
            throw httpError(403, 'You do not have access to this organization');
        }

        invitation.status = 'revoked';
        await invitation.save();

        res.json({
            success: true,
            message: 'Invitation revoked successfully'
        });
    } catch (error) {
        next(error);
    }
}

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
