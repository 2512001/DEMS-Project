const crypto = require('crypto');
const User = require('../model/userModel');

// OTP Configuration
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_RESEND_ATTEMPTS = 5;

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Tracks emails that have completed OTP verification, so verification state
// (EMAIL_VERIFIED) is a distinct, server-side fact from merely having an OTP
// issued (EMAIL_SENT). Entries expire so the signal cannot be relied on forever.
const verifiedEmailStore = new Map();
const VERIFIED_EMAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function markEmailVerified(email) {
    verifiedEmailStore.set(String(email || '').toLowerCase(), Date.now());
}

function isEmailVerified(email) {
    const key = String(email || '').toLowerCase();
    const verifiedAt = verifiedEmailStore.get(key);
    if (!verifiedAt) return false;
    if (Date.now() - verifiedAt > VERIFIED_EMAIL_TTL_MS) {
        verifiedEmailStore.delete(key);
        return false;
    }
    return true;
}

function generateSecureOTP() {
    // Generate a 6-digit OTP
    return crypto.randomInt(100000, 999999).toString();
}

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

function getOTPKey(email, type) {
    return `${type}:${email.toLowerCase()}`;
}

async function createOTP(email, type = 'email') {
    const otp = generateSecureOTP();
    const key = getOTPKey(email, type);
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpData = {
        otp: hashedOTP,
        expiresAt,
        attempts: 0,
        resentAt: null,
        resendAttempts: 0,
        createdAt: new Date()
    };

    otpStore.set(key, otpData);

    return { otp, expiresAt };
}

async function verifyOTP(email, otp, type = 'email') {
    const key = getOTPKey(email, type);
    const otpData = otpStore.get(key);

    if (!otpData) {
        return { success: false, error: 'OTP not found or expired' };
    }

    if (new Date() > otpData.expiresAt) {
        otpStore.delete(key);
        return { success: false, error: 'OTP has expired' };
    }

    if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
        otpStore.delete(key);
        return { success: false, error: 'Maximum attempts exceeded' };
    }

    otpData.attempts++;
    const hashedOTP = hashOTP(otp);

    if (hashedOTP !== otpData.otp) {
        if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
            otpStore.delete(key);
        }
        return { success: false, error: 'Invalid OTP', attemptsRemaining: OTP_MAX_ATTEMPTS - otpData.attempts };
    }

    // OTP verified successfully
    otpStore.delete(key);
    return { success: true };
}

async function canResendOTP(email, type = 'email') {
    const key = getOTPKey(email, type);
    const otpData = otpStore.get(key);

    if (!otpData) {
        return { canResend: true };
    }

    if (otpData.resendAttempts >= OTP_MAX_RESEND_ATTEMPTS) {
        return { canResend: false, error: 'Maximum resend attempts exceeded' };
    }

    if (otpData.resentAt) {
        const cooldownEnd = new Date(otpData.resentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
        if (new Date() < cooldownEnd) {
            const remainingSeconds = Math.ceil((cooldownEnd - new Date()) / 1000);
            return { canResend: false, error: `Please wait ${remainingSeconds} seconds before resending`, remainingSeconds };
        }
    }

    return { canResend: true };
}

async function resendOTP(email, type = 'email') {
    const canResend = await canResendOTP(email, type);
    if (!canResend.canResend) {
        return canResend;
    }

    // Delete old OTP and create new one
    const key = getOTPKey(email, type);
    otpStore.delete(key);

    return await createOTP(email, type);
}

async function getUserOTPStatus(email) {
    const emailOTP = otpStore.get(getOTPKey(email, 'email'));
    const phoneOTP = otpStore.get(getOTPKey(email, 'phone'));

    return {
        emailOTP: emailOTP ? {
            hasOTP: true,
            expiresAt: emailOTP.expiresAt,
            attempts: emailOTP.attempts,
            resendAttempts: emailOTP.resendAttempts
        } : { hasOTP: false },
        phoneOTP: phoneOTP ? {
            hasOTP: true,
            expiresAt: phoneOTP.expiresAt,
            attempts: phoneOTP.attempts,
            resendAttempts: phoneOTP.resendAttempts
        } : { hasOTP: false }
    };
}

module.exports = {
    createOTP,
    verifyOTP,
    canResendOTP,
    resendOTP,
    getUserOTPStatus,
    markEmailVerified,
    isEmailVerified,
    OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS
};