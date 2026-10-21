// Shared organization-admin invitation workflow.
//
// Both the Super Admin "assign admin" action (organizationController) and the
// invitation controller previously duplicated this exact business operation.
// Centralizing it here guarantees a single, consistent implementation:
// validation, duplicate prevention, existing-user role checks, invitation
// creation, email delivery, email-status persistence, and audit logging.

const Invitation = require('../model/invitationModel');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const { sendAdminInvitationEmail } = require('./emailService');
const { writeAuditLog } = require('./auditService');
const { httpError } = require('./accessControl');

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

/**
 * Create (or re-send) an organization-admin invitation.
 * Throws httpError for validation/conflict problems. A failed email send is NOT
 * an error — the invitation is still created and emailResult reports the status
 * so the caller can decide how to surface it.
 *
 * @returns {{ invitation, organization, emailResult }}
 */
async function createAdminInvitation({ organizationId, invitedEmail, invitedName, invitedBy, actor }) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
        throw httpError(404, 'Organization not found');
    }

    const email = normalizeEmail(invitedEmail);
    const name = String(invitedName || '').trim();
    if (!email || !name) {
        throw httpError(400, 'Invited email and name are required.');
    }

    const existingInvitation = await Invitation.findOne({
        invitedEmail: email,
        status: 'pending',
        organizationId,
        invitationType: 'organization_admin'
    });
    if (existingInvitation) {
        throw httpError(409, 'A pending invitation already exists for this email.');
    }

    const existingUser = await User.findOne({ 'profile.email': email });
    if (existingUser) {
        if (existingUser.role === 'super_admin') {
            throw httpError(409, 'Super Admin accounts cannot be assigned as organization admins.');
        }
        if (existingUser.role === 'admin' && existingUser.organizationId
            && existingUser.organizationId.toString() !== String(organizationId)) {
            throw httpError(409, 'This user is already an administrator of another organization.');
        }
    }

    const invitation = await Invitation.create({
        organizationId,
        invitedEmail: email,
        invitedName: name,
        invitationType: 'organization_admin',
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const emailResult = await sendAdminInvitationEmail(invitation, organization);
    invitation.emailStatus = emailResult.status;
    invitation.emailSentAt = emailResult.status === 'sent' ? new Date() : null;
    invitation.emailMessageId = emailResult.messageId || null;
    invitation.emailError = emailResult.error || null;
    await invitation.save();

    await writeAuditLog({
        actor: actor || { id: invitedBy },
        organizationId: organization._id,
        action: 'admin_invitation_created',
        targetType: 'invitation',
        targetId: invitation._id,
        metadata: {
            invitedEmail: email,
            emailStatus: emailResult.status,
            emailSent: Boolean(emailResult.success)
        }
    });

    return { invitation, organization, emailResult };
}

module.exports = {
    createAdminInvitation
};
