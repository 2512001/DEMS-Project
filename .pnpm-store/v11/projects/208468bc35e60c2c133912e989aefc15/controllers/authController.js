const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../model/userModel');
const { writeAuditLog } = require('../services/auditService');
const { createOTP, verifyOTP, markEmailVerified, isEmailVerified } = require('../services/otpService');

const isValidWalletAddress = (walletAddress) => ethers.isAddress(walletAddress || '');

const buildNonceMessage = (nonce) => {
    return `DEMS authentication nonce: ${nonce}`;
};

const generateNonce = async (req, res, next) => {
    try {
        const walletAddress = (req.params.walletAddress || '').toLowerCase();

        if (!isValidWalletAddress(walletAddress)) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress is required.' });
        }

        const nonce = crypto.randomBytes(32).toString('hex');
        
        // Check if user exists first - NEVER overwrite existing role
        let user = await User.findOne({ walletAddress });
        
        if (user) {
            // Update existing user's nonce only - preserve existing role
            user.nonce = nonce;
            await user.save();
            console.log(`[AUTH] Nonce issued for existing wallet=${walletAddress}, role=${user.role}`);
        } else {
            // Create new user with default citizen role
            user = await User.create({
                walletAddress,
                nonce,
                role: 'citizen'
            });
            console.log(`[AUTH] New user created with wallet=${walletAddress}, role=citizen`);
        }

        return res.status(200).json({
            success: true,
            walletAddress: user.walletAddress,
            nonce: user.nonce,
            message: buildNonceMessage(user.nonce)
        });
    } catch (err) {
        next(err);
    }
};

const verifySignature = async (req, res, next) => {
    try {
        const walletAddress = (req.body.walletAddress || '').toLowerCase();
        const signature = req.body.signature;

        if (!isValidWalletAddress(walletAddress) || typeof signature !== 'string' || !signature.startsWith('0x')) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress and signature are required.' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('[AUTH] JWT_SECRET is not configured.');
            return res.status(500).json({ success: false, message: 'Authentication service is not configured.' });
        }

        const user = await User.findOne({ walletAddress });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Nonce not found. Request a nonce before verification.' });
        }

        const expectedMessage = buildNonceMessage(user.nonce);
        const recoveredAddress = ethers.verifyMessage(expectedMessage, signature).toLowerCase();

        if (recoveredAddress !== walletAddress) {
            console.warn(`[AUTH] Signature mismatch wallet=${walletAddress} recovered=${recoveredAddress}`);
            return res.status(401).json({ success: false, message: 'Signature verification failed.' });
        }

        user.nonce = crypto.randomBytes(32).toString('hex');
        await user.save();

        const payload = {
            id: user._id.toString(),
            role: user.role,
            walletAddress: user.walletAddress,
            organizationId: user.organizationId ? user.organizationId.toString() : null,
            profile: user.profile || {}
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

        await writeAuditLog({
            actor: payload,
            organizationId: payload.organizationId,
            action: 'user_login',
            targetType: 'user',
            targetId: payload.id,
            result: 'success'
        });

        return res.status(200).json({
            success: true,
            token,
            user: payload
        });
    } catch (err) {
        if (err.code === 'INVALID_ARGUMENT') {
            return res.status(400).json({ success: false, message: 'Invalid signature format.' });
        }

        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .select('_id walletAddress role organizationId accountStatus profile officerVerification membershipStatus createdAt updatedAt');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        console.log('[AUTH] /me - User role:', user.role, 'organizationId:', user.organizationId, 'emailVerified:', user.profile?.emailVerified);

        return res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const existingProfile = user.profile?.toObject?.() || user.profile || {};
        const displayName = String(req.body.displayName ?? existingProfile.displayName ?? '').trim().slice(0, 120);

        // SECURITY: Email changes are not allowed through direct profile update
        // Users must use OTP verification to change email
        if (req.body.email !== undefined && req.body.email !== existingProfile.email) {
            return res.status(400).json({
                success: false,
                message: 'Email changes require OTP verification. Please use the "Change email" button to verify your new email address.'
            });
        }

        // SECURITY: Never allow role, organization, or membership changes through profile updates.
        // Merge instead of overwrite so phone/department/verification flags are preserved.
        user.profile = {
            ...existingProfile,
            displayName
        };
        await user.save();

        const safeUser = await User.findById(req.user.id)
            .select('_id walletAddress role organizationId profile officerVerification createdAt updatedAt');

        return res.status(200).json({ success: true, message: 'Profile updated.', user: safeUser });
    } catch (err) {
        next(err);
    }
};

const sendEmailOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email address is required.' });
        }

        // Check if email is the same as current
        if (user.profile?.email?.toLowerCase() === email.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'This is already your current email address.' });
        }

        // Generate 6-digit OTP using centralized service
        const { otp, expiresAt } = await createOTP(email, 'email');

        // Log OTP for development (in production, send via email service)
        console.log(`[OTP] Email verification OTP for ${email}: ${otp}`);
        console.log(`[OTP] Expires at: ${new Date(expiresAt).toISOString()}`);

        // TODO: In production, integrate with email service like SendGrid, Nodemailer, etc.
        // await emailService.sendOtp(email, otp);

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email address.'
        });
    } catch (err) {
        next(err);
    }
};

const verifyEmailOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const result = await verifyOTP(email, otp, 'email');
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error || 'Invalid OTP. Please try again.' });
        }

        // OTP is valid, update email and mark as verified
        const existingProfile = user.profile?.toObject?.() || user.profile || {};
        user.profile = {
            ...existingProfile,
            email: email.trim(),
            emailVerified: true,
            emailVerifiedAt: new Date()
        };
        await user.save();

        // Mark email as verified in the centralized service
        markEmailVerified(email);

        const safeUser = await User.findById(req.user.id)
            .select('_id walletAddress role organizationId profile officerVerification createdAt updatedAt');

        await writeAuditLog({
            actor: req.user,
            organizationId: req.user.organizationId,
            action: 'email_changed',
            targetType: 'user',
            targetId: req.user.id,
            result: 'success',
            details: { newEmail: email }
        });

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully.',
            user: safeUser
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    generateNonce,
    verifySignature,
    getMe,
    updateProfile,
    sendEmailOtp,
    verifyEmailOtp
};
