const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
    }
};

// Development mode flag
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create transporter
let transporter = null;

function initializeTransporter() {
    if (isDevelopment && (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) {
        console.log('[EMAIL] Development mode: SMTP not configured, emails will be logged only');
        return null;
    }

    try {
        transporter = nodemailer.createTransporter(emailConfig);
        console.log('[EMAIL] Email transporter initialized');
        return transporter;
    } catch (error) {
        console.error('[EMAIL] Failed to initialize email transporter:', error.message);
        return null;
    }
}

function getInvitationUrl(token, type) {
    const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    if (type === 'organization_admin') {
        return `${baseUrl}/invitation/admin/${token}`;
    } else {
        return `${baseUrl}/invitation/employee/${token}`;
    }
}

async function sendAdminInvitationEmail(invitation, organization) {
    const subject = `You're invited to be an Organization Administrator for ${organization.name}`;
    const invitationUrl = getInvitationUrl(invitation.token, 'organization_admin');
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">Organization Administrator Invitation</h2>
            <p>Hello ${invitation.invitedName},</p>
            <p>You have been invited to become an Organization Administrator for <strong>${organization.name}</strong>.</p>
            <p>As an Organization Administrator, you will be able to:</p>
            <ul>
                <li>Manage organization employees</li>
                <li>Review employee applications</li>
                <li>Manage organization evidence</li>
                <li>Configure organization policies</li>
            </ul>
            <p><strong>Organization Details:</strong></p>
            <ul>
                <li>Organization: ${organization.name}</li>
                <li>Organization Code: ${organization.organizationCode}</li>
            </ul>
            <p><strong>Important:</strong> This invitation will expire on ${new Date(invitation.expiresAt).toLocaleDateString()}.</p>
            <p style="margin: 30px 0;">
                <a href="${invitationUrl}" 
                   style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return await sendEmail({
        to: invitation.invitedEmail,
        subject,
        html
    });
}

async function sendEmployeeInvitationEmail(invitation, organization) {
    const subject = `You're invited to join ${organization.name} as an Employee`;
    const invitationUrl = getInvitationUrl(invitation.token, 'employee');
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">Employee Invitation</h2>
            <p>Hello ${invitation.invitedName},</p>
            <p>You have been invited to join <strong>${organization.name}</strong> as an Employee.</p>
            ${invitation.designation ? `<p><strong>Position:</strong> ${invitation.designation}</p>` : ''}
            ${invitation.department ? `<p><strong>Department:</strong> ${invitation.department}</p>` : ''}
            <p><strong>Organization Details:</strong></p>
            <ul>
                <li>Organization: ${organization.name}</li>
                <li>Organization Code: ${organization.organizationCode}</li>
            </ul>
            <p><strong>Important:</strong> This invitation will expire on ${new Date(invitation.expiresAt).toLocaleDateString()}.</p>
            <p style="margin: 30px 0;">
                <a href="${invitationUrl}" 
                   style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return await sendEmail({
        to: invitation.invitedEmail,
        subject,
        html
    });
}

async function sendEmployeeApplicationSubmittedEmail(application, organization) {
    const subject = `Employee Application Submitted - ${organization.name}`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">Employee Application Submitted</h2>
            <p>A new employee application has been submitted for <strong>${organization.name}</strong>.</p>
            <p><strong>Applicant Details:</strong></p>
            <ul>
                <li>Name: ${application.invitedName}</li>
                <li>Email: ${application.invitedEmail}</li>
                ${application.designation ? `<li>Position: ${application.designation}</li>` : ''}
                ${application.department ? `<li>Department: ${application.department}</li>` : ''}
            </ul>
            <p>Please review the application in your Organization Admin dashboard.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    // Send to organization admins
    const adminEmails = await getOrganizationAdminEmails(organization._id);
    if (adminEmails.length > 0) {
        return await sendEmail({
            to: adminEmails.join(','),
            subject,
            html
        });
    }
}

async function sendEmployeeApprovedEmail(application, organization) {
    const subject = `Your Application to ${organization.name} has been Approved`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">Application Approved</h2>
            <p>Congratulations ${application.invitedName},</p>
            <p>Your application to join <strong>${organization.name}</strong> has been approved.</p>
            <p>You can now access the Employee Dashboard using your MetaMask wallet.</p>
            <p style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}" 
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Go to DEMS
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return await sendEmail({
        to: application.invitedEmail,
        subject,
        html
    });
}

async function sendEmployeeRejectedEmail(application, organization, reason) {
    const subject = `Your Application to ${organization.name} has been Reviewed`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">Application Review Update</h2>
            <p>Hello ${application.invitedName},</p>
            <p>Your application to join <strong>${organization.name}</strong> has been reviewed.</p>
            <p><strong>Status:</strong> Not Approved</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You may reapply in the future if you believe this was an error.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return await sendEmail({
        to: application.invitedEmail,
        subject,
        html
    });
}

async function sendEmail(options) {
    // Development mode: log email instead of sending
    if (isDevelopment && !transporter) {
        console.log('[EMAIL] Development mode - Email would be sent:');
        console.log('[EMAIL] To:', options.to);
        console.log('[EMAIL] Subject:', options.subject);
        console.log('[EMAIL] HTML length:', options.html.length);
        console.log('[EMAIL] First 200 chars of HTML:', options.html.substring(0, 200));
        console.log('[EMAIL] ==================================');
        console.log('[EMAIL] Email Status: NOT_CONFIGURED');
        console.log('[EMAIL] Configure SMTP credentials in .env to send real emails');
        console.log('[EMAIL] ==================================');
        return { success: true, mode: 'development', status: 'not_configured' };
    }

    if (!transporter) {
        transporter = initializeTransporter();
    }

    if (!transporter) {
        console.error('[EMAIL] Email transporter not available');
        return { success: false, error: 'Email transporter not available', status: 'failed' };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@dems.com',
            ...options
        });
        console.log('[EMAIL] Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId, status: 'sent' };
    } catch (error) {
        console.error('[EMAIL] Failed to send email:', error.message);
        return { success: false, error: error.message, status: 'failed' };
    }
}

async function getOrganizationAdminEmails(organizationId) {
    const User = require('../model/userModel');
    const admins = await User.find({
        organizationId,
        role: 'admin',
        accountStatus: 'active'
    }).select('profile.email');
    
    return admins
        .map(admin => admin.profile?.email)
        .filter(email => email && email.includes('@'));
}

module.exports = {
    initializeTransporter,
    sendAdminInvitationEmail,
    sendEmployeeInvitationEmail,
    sendEmployeeApplicationSubmittedEmail,
    sendEmployeeApprovedEmail,
    sendEmployeeRejectedEmail,
    sendEmail
};