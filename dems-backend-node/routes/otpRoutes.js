const express = require('express');
const router = express.Router();
const { createOTP, verifyOTP, resendOTP, canResendOTP, getUserOTPStatus, markEmailVerified } = require('../services/otpService');
const { sendEmail } = require('../services/emailService');
const { sendSms, isSmsConfigured } = require('../services/smsService');
const { protect, attachUserIfPresent } = require('../middleware/authMiddleware');
const User = require('../model/userModel');

const isProduction = () => process.env.NODE_ENV === 'production';

function maskContact(value) {
    const str = String(value || '');
    if (str.length <= 4) return '****';
    return `${str.slice(0, 2)}****${str.slice(-2)}`;
}

// ============================================================
// PUBLIC EMAIL OTP ENDPOINTS (optional auth)
// These allow new users accepting invitations to verify their email.
// attachUserIfPresent lets us persist verification against the signed-in
// account when the client sends its token (invitation acceptance flow),
// without requiring auth for brand-new users.
// ============================================================

// Request email OTP
router.post('/email/request', attachUserIfPresent, async (req, res, next) => {
    try {
        console.log('[OTP REQUEST] ======');
        console.log('[OTP REQUEST] OTP request called');
        console.log('[OTP REQUEST] Request body:', req.body);
        console.log('[OTP REQUEST] Authenticated user:', req.user?.id);
        
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            console.log('[OTP REQUEST] ERROR: Invalid email');
            return res.status(400).json({ success: false, message: 'Valid email is required.' });
        }

        console.log('[OTP REQUEST] Email:', email);
        console.log('[OTP REQUEST] Email (normalized):', email.toLowerCase());

        // Check if user already exists with this email
        const existingUser = await User.findOne({ 'profile.email': email.toLowerCase() }).select('_id role profile.emailVerified organizationId');
        console.log('[OTP REQUEST] Existing user check - user:', existingUser?._id, 'emailVerified:', existingUser?.profile?.emailVerified, 'organizationId:', existingUser?.organizationId);
        
        // For employee invitation flow, always allow OTP send even if email was previously verified
        // The invitation acceptance sets emailVerified to false to force re-verification
        // Only skip OTP if user is already verified AND has an organization (completed onboarding)
        if (existingUser && existingUser.profile && existingUser.profile.emailVerified && existingUser.organizationId) {
            console.log('[OTP REQUEST] Email already verified and user has organization - skipping OTP');
            return res.status(200).json({
                success: true,
                message: 'Email is already verified.',
                emailVerified: true
            });
        }
        
        // If user is verified but has no organization (employee onboarding in progress), reset verification to force OTP
        if (existingUser && existingUser.profile && existingUser.profile.emailVerified && !existingUser.organizationId) {
            console.log('[OTP REQUEST] User verified but no organization - resetting emailVerified to force OTP');
            existingUser.profile.emailVerified = false;
            existingUser.profile.emailVerifiedAt = null;
            await existingUser.save();
        }
        
        console.log('[OTP REQUEST] Proceeding with OTP generation');

        // Check resend cooldown
        const canResend = await canResendOTP(email, 'email');
        console.log('[OTP REQUEST] Can resend:', canResend.canResend);
        if (!canResend.canResend) {
            console.log('[OTP REQUEST] ERROR: Resend cooldown active');
            return res.status(429).json({ success: false, message: canResend.error });
        }

        // Try to get user name for personalization
        const userName = existingUser?.profile?.displayName || existingUser?.profile?.name || '';

        // Create OTP
        console.log('[OTP REQUEST] Creating OTP');
        const { otp, expiresAt } = await createOTP(email, 'email');
        console.log('[OTP REQUEST] OTP generated:', otp);
        console.log('[OTP REQUEST] OTP expires at:', expiresAt);

        // Send email
        const greeting = userName ? `Hello ${userName},` : 'Hello,';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0ea5e9;">Email Verification Code</h2>
                <p>${greeting}</p>
                <p>Your verification code for DEMS is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${otp}</p>
                <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
                <p>Please enter this code in the verification page to complete your email verification.</p>
                <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
            </div>
        `;

        console.log('[OTP REQUEST] Calling email service');
        const emailResult = await sendEmail({
            to: email,
            subject: 'Verify your email address - DEMS',
            html,
            text: `${greeting}\n\nYour verification code for DEMS is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nDEMS - Decentralized Evidence Management System`
        });

        console.log('[OTP REQUEST] Email service called');
        console.log('[OTP REQUEST] Email result:', emailResult);

        if (!emailResult.success) {
            console.log('[OTP REQUEST] ERROR: Email sending failed:', emailResult.error);
            return res.status(502).json({
                success: false,
                message: emailResult.status === 'not_configured'
                    ? 'Email delivery is not configured on the server.'
                    : 'Failed to send OTP email',
                emailStatus: emailResult.status,
                error: emailResult.error
            });
        }

        console.log('[OTP REQUEST] SMTP send attempted: YES');
        console.log('[OTP REQUEST] SMTP result:', emailResult.status);
        console.log('[OTP REQUEST] Message ID:', emailResult.messageId);
        console.log('[OTP REQUEST] ======');

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            expiresAt,
            emailStatus: emailResult.status
        });
    } catch (err) {
        console.error('[OTP REQUEST] ERROR:', err);
        console.error('[OTP REQUEST] Error stack:', err.stack);
        next(err);
    }
});

// Verify email OTP
router.post('/email/verify', attachUserIfPresent, async (req, res, next) => {
    try {
        console.log('[OTP VERIFY] ======');
        console.log('[OTP VERIFY] OTP verify called');
        console.log('[OTP VERIFY] Request body:', req.body);
        console.log('[OTP VERIFY] Authenticated user:', req.user?.id);
        
        const { email, otp } = req.body;

        if (!email || !otp) {
            console.log('[OTP VERIFY] ERROR: Missing email or OTP');
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        console.log('[OTP VERIFY] Email:', email);
        console.log('[OTP VERIFY] Verifying OTP...');

        const result = await verifyOTP(email, otp, 'email');
        console.log('[OTP VERIFY] OTP verification result:', result.success);

        if (!result.success) {
            console.log('[OTP VERIFY] ERROR: OTP verification failed:', result.error);
            return res.status(400).json({ success: false, message: result.error, attemptsRemaining: result.attemptsRemaining });
        }

        const emailLower = email.toLowerCase();
        console.log('[OTP VERIFY] Marking email as verified in service:', emailLower);
        // Record the verified email as a server-side fact (EMAIL_VERIFIED state),
        // separate from EMAIL_SENT. This is what onboarding enforcement checks.
        markEmailVerified(emailLower);

        // Persist verification on the owning account when we can identify one:
        // the signed-in user (token sent on this route) or an existing account
        // that already owns this email. Only bind the email if it is free or
        // already theirs, so one user cannot verify another user's email.
        let targetUser = null;
        if (req.user?.id) {
            console.log('[OTP VERIFY] Finding user by authenticated ID:', req.user.id);
            targetUser = await User.findById(req.user.id);
        }
        if (!targetUser) {
            console.log('[OTP VERIFY] Finding user by email:', emailLower);
            targetUser = await User.findOne({ 'profile.email': emailLower });
        }
        
        if (targetUser) {
            console.log('[OTP VERIFY] Target user found:', targetUser._id);
            console.log('[OTP VERIFY] Target user current email:', targetUser.profile?.email);
            console.log('[OTP VERIFY] Target user current emailVerified:', targetUser.profile?.emailVerified);
            
            const owner = await User.findOne({ 'profile.email': emailLower }).select('_id');
            const emailFreeOrMine = !owner || owner._id.toString() === targetUser._id.toString();
            console.log('[OTP VERIFY] Email free or mine:', emailFreeOrMine);
            
            if (emailFreeOrMine) {
                console.log('[OTP VERIFY] Updating user emailVerified to true');
                targetUser.profile = {
                    ...(targetUser.profile?.toObject?.() || targetUser.profile || {}),
                    email: emailLower,
                    emailVerified: true,
                    emailVerifiedAt: new Date()
                };
                await targetUser.save();
                console.log('[OTP VERIFY] User saved successfully');
            } else {
                console.log('[OTP VERIFY] WARNING: Email belongs to another user, not updating');
            }
        } else {
            console.log('[OTP VERIFY] No target user found to persist verification');
        }

        console.log('[OTP VERIFY] ======');
        return res.status(200).json({ success: true, message: 'Email verified successfully', emailVerified: true });
    } catch (err) {
        console.error('[OTP VERIFY] ERROR:', err);
        next(err);
    }
});

// ============================================================
// AUTHENTICATED PHONE OTP ENDPOINTS (require JWT)
// ============================================================

// Request phone OTP
router.post('/phone/request', protect, async (req, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length < 10) {
            return res.status(400).json({ success: false, message: 'Valid phone number is required.' });
        }

        // Check resend cooldown
        const canResend = await canResendOTP(phone, 'phone');
        if (!canResend.canResend) {
            return res.status(429).json({ success: false, message: canResend.error });
        }

        // Create OTP
        const { otp, expiresAt } = await createOTP(phone, 'phone');

        if (!isSmsConfigured()) {
            // Development convenience ONLY: never log OTP values in production.
            if (!isProduction()) {
                console.log(`[SMS][DEV] Provider not configured. Verification code for ${maskContact(phone)}: ${otp}`);
            }
            return res.status(200).json({
                success: true,
                message: 'SMS provider is not configured. Set TWILIO_* or SMS_API_* env vars to enable delivery.',
                expiresAt,
                smsStatus: 'not_configured'
            });
        }

        const smsResult = await sendSms(phone, `Your DEMS verification code is ${otp}. It expires in 10 minutes.`);

        if (smsResult.status !== 'sent') {
            return res.status(502).json({
                success: false,
                message: 'Failed to send verification SMS.',
                smsStatus: smsResult.status,
                error: smsResult.error || null
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            expiresAt,
            smsStatus: 'sent'
        });
    } catch (err) {
        next(err);
    }
});

// Verify phone OTP
router.post('/phone/verify', protect, async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
        }

        const result = await verifyOTP(phone, otp, 'phone');

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error, attemptsRemaining: result.attemptsRemaining });
        }

        const user = await User.findById(req.user.id);
        if (user) {
            // Bind the verified number to this account so phoneVerified always
            // reflects the number that was actually verified — a user cannot
            // verify one number and have a different stored number marked verified.
            user.profile = {
                ...(user.profile?.toObject?.() || user.profile || {}),
                phone: String(phone).trim(),
                phoneVerified: true,
                phoneVerifiedAt: new Date()
            };
            await user.save();
        }

        return res.status(200).json({ success: true, message: 'Phone verified successfully' });
    } catch (err) {
        next(err);
    }
});

// Resend OTP (requires authentication)
router.post('/resend', protect, async (req, res, next) => {
    try {
        const { type, contact } = req.body;

        if (!type || !contact) {
            return res.status(400).json({ success: false, message: 'Type and contact are required.' });
        }

        const result = await resendOTP(contact, type);

        if (!(typeof result === 'object' && 'otp' in result)) {
            return res.status(429).json({ success: false, message: result.error });
        }

        if (type === 'email') {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0ea5e9;">Email Verification OTP (Resent)</h2>
                    <p>Your new verification code for DEMS is:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${result.otp}</p>
                    <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
                </div>
            `;

            const emailResult = await sendEmail({
                to: contact,
                subject: 'DEMS Email Verification Code (Resent)',
                html
            });

            if (!emailResult.success) {
                return res.status(502).json({ success: false, message: 'Failed to send OTP email', error: emailResult.error });
            }
        } else {
            if (!isSmsConfigured()) {
                if (!isProduction()) {
                    console.log(`[SMS][DEV] Provider not configured. Resent code for ${maskContact(contact)}: ${result.otp}`);
                }
                return res.status(200).json({
                    success: true,
                    message: 'SMS provider is not configured.',
                    expiresAt: result.expiresAt,
                    smsStatus: 'not_configured'
                });
            }
            const smsResult = await sendSms(contact, `Your DEMS verification code is ${result.otp}. It expires in 10 minutes.`);
            if (smsResult.status !== 'sent') {
                return res.status(502).json({ success: false, message: 'Failed to resend verification SMS.', smsStatus: smsResult.status, error: smsResult.error || null });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            expiresAt: result.expiresAt
        });
    } catch (err) {
        next(err);
    }
});

// Get OTP status (requires authentication)
router.get('/status', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const email = user.profile?.email;

        const status = await getUserOTPStatus(email || '');

        res.status(200).json({
            success: true,
            data: {
                emailVerified: user.profile?.emailVerified || false,
                phoneVerified: user.profile?.phoneVerified || false,
                otpStatus: status
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
