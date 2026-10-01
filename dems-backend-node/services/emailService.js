const nodemailer = require('nodemailer');

function smtpUser() {
    return String(process.env.SMTP_USER || '').trim();
}

function smtpPass() {
    return String(process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
}

function smtpHost() {
    return String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
}

function isGmailHost(host) {
    return /gmail\.com$/i.test(host) || host.toLowerCase() === 'smtp.gmail.com';
}

function isSMTPConfigured() {
    return Boolean(smtpUser() && smtpPass() && smtpHost());
}

let transporter = null;
let smtpVerified = false;
let activeTransportLabel = '';

function initializeTransporter() {
    transporter = null;
    smtpVerified = false;
    activeTransportLabel = '';

    if (!isSMTPConfigured()) {
        console.log('[EMAIL] SMTP not configured - Set SMTP_USER, SMTP_PASSWORD, and SMTP_HOST in .env');
        return null;
    }

    const user = smtpUser();
    const pass = smtpPass();
    const host = smtpHost();
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
    const auth = { user, pass };

    try {
        // For Gmail, use the specialized service configuration
        if (isGmailHost(host)) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth,
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 25000
            });
            activeTransportLabel = 'gmail-service';
        } else {
            // For other SMTP providers
            transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth,
                requireTLS: !secure,
                tls: {
                    minVersion: 'TLSv1.2',
                    servername: host
                },
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 25000,
                family: 4
            });
            activeTransportLabel = `${host}:${port}`;
        }
        
        console.log(`[EMAIL] Transporter initialized (${activeTransportLabel})`);
        return transporter;
    } catch (error) {
        console.error('[EMAIL] Failed to initialize email transporter:', error.message);
        return null;
    }
}

async function verifySMTPConnection() {
    if (!isSMTPConfigured()) {
        return { success: false, error: 'SMTP credentials not configured' };
    }

    if (!transporter) {
        transporter = initializeTransporter();
    }

    if (!transporter) {
        return { success: false, error: 'Transporter initialization failed' };
    }

    try {
        await transporter.verify();
        smtpVerified = true;
        console.log(`[EMAIL] SMTP connection verified (${activeTransportLabel})`);
        return { success: true, transport: activeTransportLabel };
    } catch (error) {
        console.error(`[EMAIL] SMTP verify failed (${activeTransportLabel}):`, error.message);
        smtpVerified = false;
        return { success: false, error: error.message };
    }
}

function getInvitationUrl(token, type) {
    const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5174';
    if (type === 'organization_admin') {
        return `${baseUrl}/invitation/admin/${token}`;
    }
    return `${baseUrl}/invitation/employee/${token}`;
}

function fromAddress() {
    const user = smtpUser();
    const configured = String(process.env.EMAIL_FROM || '').trim();
    if (configured && user && configured.toLowerCase().includes(user.toLowerCase())) {
        return configured;
    }
    return user ? `DEMS <${user}>` : (configured || 'noreply@dems.com');
}

async function sendAdminInvitationEmail(invitation, organization) {
    console.log('[sendAdminInvitationEmail] Called with:', {
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        organizationName: organization.name,
        token: invitation.token
    });

    const subject = `You're invited to be an Organization Administrator for ${organization.name}`;
    const invitationUrl = getInvitationUrl(invitation.token, 'organization_admin');

    console.log('[sendAdminInvitationEmail] Invitation URL:', invitationUrl);

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
            <p>Or paste this link in your browser:</p>
            <p style="word-break: break-all;">${invitationUrl}</p>
            <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    const result = await sendEmail({
        to: invitation.invitedEmail,
        subject,
        html,
        text: `You are invited to be an Organization Administrator for ${organization.name}. Accept here: ${invitationUrl}`
    });

    console.log('[sendAdminInvitationEmail] sendEmail returned:', result);
    return result;
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
            <p>Or paste this link in your browser:</p>
            <p style="word-break: break-all;">${invitationUrl}</p>
            <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return sendEmail({
        to: invitation.invitedEmail,
        subject,
        html,
        text: `You are invited to join ${organization.name} as an employee. Accept here: ${invitationUrl}`
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

    const adminEmails = await getOrganizationAdminEmails(organization._id);
    if (application.notifyEmail && application.notifyEmail.includes('@')) {
        adminEmails.push(application.notifyEmail);
    }
    const uniqueEmails = [...new Set(adminEmails)];
    if (uniqueEmails.length === 0) {
        return { success: true, status: 'skipped', error: null };
    }

    return sendEmail({
        to: uniqueEmails.join(','),
        subject,
        html
    });
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
                <a href="${process.env.FRONTEND_URL || 'http://127.0.0.1:5174'}"
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Go to DEMS
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
        </div>
    `;

    return sendEmail({
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

    return sendEmail({
        to: application.invitedEmail,
        subject,
        html
    });
}

function describeSmtpError(error) {
    const code = error.code || error.responseCode;
    if (code === 'EAUTH' || code === 535) {
        return 'Gmail rejected the login. Use a 16-character App Password (not your normal Gmail password) with 2-Step Verification enabled.';
    }
    if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'EDNS') {
        return `Could not reach SMTP server: ${error.message}`;
    }
    return error.message || 'Unknown SMTP error';
}

async function sendEmail(options) {
    console.log('[sendEmail] Called with options:', {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html,
        hasText: !!options.text
    });

    if (!isSMTPConfigured()) {
        console.log('[sendEmail] SMTP credentials are not configured');
        return { success: false, status: 'not_configured', error: 'SMTP credentials not configured' };
    }

    if (!transporter) {
        console.log('[sendEmail] Initializing transporter...');
        transporter = initializeTransporter();
    }

    if (!transporter) {
        console.log('[sendEmail] Transporter initialization failed');
        return { success: false, status: 'failed', error: 'Email transporter initialization failed' };
    }

    const mail = {
        from: fromAddress(),
        ...options
    };

    if (!mail.text && mail.html) {
        mail.text = String(mail.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    try {
        console.log('[sendEmail] Attempting to send email via transporter...');
        const info = await transporter.sendMail(mail);
        console.log(`[sendEmail] Email sent successfully to ${options.to} (${info.messageId})`);
        return { success: true, messageId: info.messageId, status: 'sent', transport: activeTransportLabel };
    } catch (error) {
        console.error('[sendEmail] Failed to send email:', error.message);
        console.error('[sendEmail] Error code:', error.code);
        return {
            success: false,
            error: describeSmtpError(error),
            status: 'failed',
            code: error.code
        };
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
        .map((admin) => admin.profile?.email)
        .filter((email) => email && email.includes('@'));
}

module.exports = {
    initializeTransporter,
    verifySMTPConnection,
    isSMTPConfigured,
    sendAdminInvitationEmail,
    sendEmployeeInvitationEmail,
    sendEmployeeApplicationSubmittedEmail,
    sendEmployeeApprovedEmail,
    sendEmployeeRejectedEmail,
    sendEmail
};
