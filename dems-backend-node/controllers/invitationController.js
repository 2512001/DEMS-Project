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
const { notifyOrganizationAdmins } = require('../services/notificationService');

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

    console.log('[EMAIL MATCH DEBUG] ======');
    console.log('[EMAIL MATCH DEBUG] Invitation.invitedEmail:', invitation.invitedEmail);
    console.log('[EMAIL MATCH DEBUG] Invitation.invitedEmail (normalized):', invited);
    console.log('[EMAIL MATCH DEBUG] User.profile.email:', user.profile?.email);
    console.log('[EMAIL MATCH DEBUG] User.profile.email (normalized):', profileEmail);
    console.log('[EMAIL MATCH DEBUG] req.body.email:', submittedEmail);
    console.log('[EMAIL MATCH DEBUG] req.body.email (normalized):', submitted);
    console.log('[EMAIL MATCH DEBUG] user.profile.emailVerified:', user.profile?.emailVerified);
    console.log('[EMAIL MATCH DEBUG] ======');

    // If user explicitly submitted an email that doesn't match invitation, reject
    if (submitted && submitted !== invited) {
        console.log('[EMAIL MATCH DEBUG] REJECTING: Submitted email does not match invitation email');
        throw httpError(403, 'The verified email must match the invitation email.');
    }

    // If user has a profile email that differs from invitation but is verified, that's OK for employee onboarding
    // The email will be updated from the invitation during application submission
    if (profileEmail && profileEmail !== invited) {
        console.log('[EMAIL MATCH DEBUG] Profile email differs from invitation - this is OK for employee onboarding');
    }

    // If no email submitted and no profile email, require email confirmation
    if (!submitted && !profileEmail) {
        console.log('[EMAIL MATCH DEBUG] REJECTING: No email provided');
        throw httpError(400, 'Confirm the invited email address before accepting.');
    }

    console.log('[EMAIL MATCH DEBUG] Email validation passed');
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
        // Only super admin can create organization admin invitations
        if (req.user.role !== 'super_admin') {
            throw httpError(403, 'Only Super Admin can create organization administrator invitations.');
        }

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
        console.log('[INVITATION ACCEPT] ======');
        console.log('[INVITATION ACCEPT] acceptEmployeeInvitation called');
        console.log('[INVITATION ACCEPT] Token:', req.params.token);
        console.log('[INVITATION ACCEPT] Request body:', JSON.stringify(req.body));
        console.log('[INVITATION ACCEPT] Request user:', req.user);
        
        const invitation = await loadInvitation(req.params.token, 'employee');
        console.log('[INVITATION ACCEPT] Invitation loaded:', invitation._id);
        console.log('[INVITATION ACCEPT] Invitation status:', invitation.status);
        console.log('[INVITATION ACCEPT] Invitation invitedEmail:', invitation.invitedEmail);
        console.log('[INVITATION ACCEPT] Invitation invitedName:', invitation.invitedName);
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
        console.log('[INVITATION ACCEPT] User loaded:', user._id);
        console.log('[INVITATION ACCEPT] User role:', user.role);
        console.log('[INVITATION ACCEPT] User profile.email:', user.profile?.email);
        console.log('[INVITATION ACCEPT] User profile.emailVerified:', user.profile?.emailVerified);
        
        const submittedEmail = normalizeEmail(req.body?.email || user.profile?.email);
        console.log('[INVITATION ACCEPT] Submitted email from req.body:', req.body?.email);
        console.log('[INVITATION ACCEPT] Submitted email from user.profile:', user.profile?.email);
        console.log('[INVITATION ACCEPT] Final submittedEmail:', submittedEmail);
        
        // Log email matching check
        const invited = normalizeEmail(invitation.invitedEmail);
        const profileEmail = normalizeEmail(user.profile?.email);
        console.log('[INVITATION ACCEPT] Invited email (normalized):', invited);
        console.log('[INVITATION ACCEPT] Profile email (normalized):', profileEmail);
        console.log('[INVITATION ACCEPT] Email match check - submittedEmail:', submittedEmail, 'invited:', invited, 'profile:', profileEmail);
        
        // For employee onboarding, always allow the invitation to be accepted
        // The email will be set from the invitation during the process
        // Only reject if user explicitly submits a different email
        if (req.body?.email && normalizeEmail(req.body.email) !== invited) {
            console.log('[INVITATION ACCEPT] ERROR: User explicitly submitted email that differs from invitation');
            return res.status(403).json({
                success: false,
                message: 'The verified email must match the invitation email.'
            });
        }
        
        console.log('[INVITATION ACCEPT] Email validation passed');

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
        console.log('[INVITATION ACCEPT] User profile updated');
        console.log('[INVITATION ACCEPT] User profile.email after update:', user.profile.email);
        console.log('[INVITATION ACCEPT] User profile.emailVerified after update:', user.profile.emailVerified);
        console.log('[INVITATION ACCEPT] ======');

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
        console.log('[SUBMIT APP] ======');
        console.log('[SUBMIT APP] submitEmployeeApplication called');
        console.log('[SUBMIT APP] Token:', req.params.token);
        console.log('[SUBMIT APP] Request body:', JSON.stringify(req.body));
        console.log('[SUBMIT APP] Request user:', req.user);
        
        const invitation = await loadInvitation(req.params.token, 'employee');
        console.log('[SUBMIT APP] Invitation loaded:', invitation._id);
        console.log('[SUBMIT APP] Invitation status:', invitation.status);
        console.log('[SUBMIT APP] Invitation invitedEmail:', invitation.invitedEmail);
        console.log('[SUBMIT APP] Invitation invitedName:', invitation.invitedName);
        console.log('[SUBMIT APP] Invitation acceptedBy:', invitation.acceptedBy);
        
        const user = await loadDbUser(req.user);
        console.log('[SUBMIT APP] User loaded:', user._id);
        console.log('[SUBMIT APP] User role:', user.role);
        console.log('[SUBMIT APP] User profile.email:', user.profile?.email);
        console.log('[SUBMIT APP] User profile.emailVerified:', user.profile?.emailVerified);
        console.log('[SUBMIT APP] User organizationId:', user.organizationId);
        
        const documents = req.files ? req.files.documents : [];
        console.log('[SUBMIT APP] Documents count:', documents.length);

        if (invitation.status !== 'accepted') {
            console.log('[SUBMIT APP] ERROR: Invitation not accepted, status:', invitation.status);
            throw httpError(400, 'Accept the invitation before submitting an application.');
        }
        if (!invitation.acceptedBy || invitation.acceptedBy.toString() !== user._id.toString()) {
            console.log('[SUBMIT APP] ERROR: Invitation not for this user');
            throw httpError(403, 'This invitation is not for your account');
        }
        if (!documents.length) {
            console.log('[SUBMIT APP] ERROR: No documents');
            throw httpError(400, 'At least one verification document is required.');
        }

        // CRITICAL: Never downgrade Super Admins or Admins
        if (user.role === 'super_admin' || user.role === 'admin') {
            console.log('[SUBMIT APP] ERROR: User is admin/super_admin');
            throw httpError(409, 'Administrator accounts cannot submit employee applications.');
        }

        // Enforce email verification server-side so it cannot be bypassed by
        // calling this endpoint directly. EMAIL_VERIFIED is persisted on the
        // user (survives restarts) with the in-memory OTP store as a fallback.
        // For employee onboarding, accept verification of either:
        // 1. The user's current email, OR
        // 2. The invitation email
        // The email will be updated to the invitation email during this submission
        const userEmail = user.profile?.email;
        const invitationEmail = invitation.invitedEmail;
        
        console.log('[SUBMIT APP] User current email:', userEmail);
        console.log('[SUBMIT APP] Invitation email:', invitationEmail);
        console.log('[SUBMIT APP] Checking email verification...');
        
        // Check if user's current email is verified OR if invitation email is verified
        const userCurrentEmailVerified = Boolean(user.profile?.emailVerified) || isEmailVerified(userEmail);
        const invitationEmailVerified = isEmailVerified(invitationEmail);
        
        console.log('[SUBMIT APP] User email verified:', userCurrentEmailVerified);
        console.log('[SUBMIT APP] Invitation email verified:', invitationEmailVerified);
        
        // Allow submission if either email is verified
        if (!userCurrentEmailVerified && !invitationEmailVerified) {
            console.log('[SUBMIT APP] ERROR: Neither email is verified');
            throw httpError(403, 'Verify your email with the OTP code before submitting your application.');
        }

        // If invitation email is verified but user's current email is different, mark it as verified
        if (invitationEmailVerified && !userCurrentEmailVerified) {
            const { markEmailVerified } = require('../services/otpService');
            markEmailVerified(invitationEmail);
            console.log('[SUBMIT APP] Marked invitation email as verified');
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
        console.log('[SUBMIT APP] Updating user profile email to:', invitation.invitedEmail);
        
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
        user.organizationId = invitation.organizationId; // CRITICAL: Set organizationId so admin can see pending request
        // Do NOT change role - preserve existing role until approved
        console.log('[SUBMIT APP] Saving user with membershipStatus:', user.membershipStatus);
        console.log('[SUBMIT APP] Saving user with organizationId:', user.organizationId);
        await user.save();
        console.log('[SUBMIT APP] User saved successfully');

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

            // Create in-app notification for organization admins
            await notifyOrganizationAdmins({
                organizationId: invitation.organizationId,
                type: 'employee_application',
                title: 'New employee application',
                message: `${user.profile.displayName || invitation.invitedName} has submitted an application for your review.`,
                actionUrl: '/admin/officer-approval',
                metadata: {
                    userId: user._id,
                    invitationId: invitation._id,
                    submittedAt: new Date()
                },
                excludeUserId: req.user.id
            });

            console.log('[INVITATION SUBMIT] Notification created for organization admins');
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
