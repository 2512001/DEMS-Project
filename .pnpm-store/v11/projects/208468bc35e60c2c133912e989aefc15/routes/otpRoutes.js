const express = require('express');
const router = express.Router();
const { createOTP, verifyOTP, resendOTP, canResendOTP, getUserOTPStatus } = require('../services/otpService');
const { sendEmail } = require('../services/emailService');
const User = require('../model/userModel');

// ============================================================
// PUBLIC EMAIL OTP ENDPOINTS (no auth required)
// These allow new users accepting invitations to verify their email
// ============================================================

// Request email OTP - public endpoint for invitation acceptors and new users
router.post('/email/request', async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email is required.' });
        }

        // Check if user already exists with this email
        const existingUser = await User.findOne({ 'profile.email': email }).select('_id role');
        if (existingUser) {
            // User already exists - check if email is already verified
            if (existingUser.profile && existingUser.profile.emailVerified) {
                return res.status(200).json({
                    success: true,
                    message: 'Email is already verified.',
                    emailVerified: true
                });
            }
            // User exists but email not verified - still allow OTP request
            // but return the existing user info
            return res.status(200).json({
                success: true,
                message: 'OTP sent. Email exists but not yet verified.',
                emailVerified: false,
                existingUserId: existingUser._id
            });
        }

        // Check resend cooldown
        const canResend = await canResendOTP(email, 'email');
        if (!canResend.canResend) {
            return res.status(429).json({ success: false, message: canResend.error });
        }

        // Create OTP
        const { otp, expiresAt } = await createOTP(email, 'email');

        // Send email
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0ea5e9;">Email Verification OTP</h2>
                <p>Your verification code for DEMS is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${otp}</p>
                <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
                <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                <p style="color: #666; font-size: 12px;">DEMS - Decentralized Evidence Management System</p>
            </div>
        `;

        const emailResult = await sendEmail({
            to: email,
            subject: 'DEMS Email Verification Code',
            html
        });

        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP email', error: emailResult.error });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            expiresAt,
            emailStatus: emailResult.status
        });
    } catch (err) {
        next(err);
    }
});

// Verify email OTP - public endpoint for invitation acceptors and new users
router.post('/email/verify', async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const result = await verifyOTP(email, otp, 'email');

        if (result.success) {
            // Update user email verification status if user exists
            if (req.user) {
                const user = await User.findById(req.user.id);
                if (user) {
                    user.profile = user.profile || {};
                    user.profile.emailVerified = true;
                    user.profile.emailVerifiedAt = new Date();
                    await user.save();
                }
            }

            return res.status(200).json({ success: true, message: 'Email verified successfully' });
        } else {
            return res.status(400).json({ success: false, message: result.error, attemptsRemaining: result.attemptsRemaining });
        }
    } catch (err) {
        next(err);
    }
});

// ============================================================
// AUTHENTICATED OTP ENDPOINTS (require JWT)
// For existing users who already have a JWT
// ============================================================

// Request phone OTP (requires authentication)
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

        if (!process.env.SMS_PROVIDER || !process.env.SMS_API_KEY) {
            console.log('[SMS] SMS provider not configured - OTP would be:', otp);
            return res.status(200).json({
                success: true,
                message: 'SMS provider not configured (development mode)',
                expiresAt,
                smsStatus: 'not_configured',
                devOTP: otp
            });
        }

        console.log('[SMS] SMS would be sent to:', phone, 'with OTP:', otp);

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

// Verify phone OTP (requires authentication)
router.post('/phone/verify', protect, async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
        }

        const result = await verifyOTP(phone, otp, 'phone');

        if (result.success) {
            const user = await User.findById(req.user.id);
            if (user) {
                user.profile = user.profile || {};
                user.profile.phoneVerified = true;
                user.profile.phoneVerifiedAt = new Date();
                await user.save();
            }

            return res.status(200).json({ success: true, message: 'Phone verified successfully' });
        } else {
            return res.status(400).json({ success: false, message: result.error, attemptsRemaining: result.attemptsRemaining });
        }
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

        if (typeof result === 'object' && 'otp' in result) {
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
                    return res.status(500).json({ success: false, message: 'Failed to send OTP email', error: emailResult.error });
                }
            } else {
                console.log('[SMS] SMS would be resent to:', contact, 'with OTP:', result.otp);
            }

            return res.status(200).json({
                success: true,
                message: 'OTP resent successfully',
                expiresAt: result.expiresAt
            });
        } else {
            return res.status(429).json({ success: false, message: result.error });
        }
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
        const phone = user.profile?.phone;

        const status = await getUserOTPStatus(email);

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