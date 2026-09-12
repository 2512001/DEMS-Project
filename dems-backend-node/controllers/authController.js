const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../model/userModel');
const { writeAuditLog } = require('../services/auditService');

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
        
        // Check if user exists first
        let user = await User.findOne({ walletAddress });
        
        if (user) {
            // Update existing user's nonce only - never change role
            user.nonce = nonce;
            await user.save();
        } else {
            // Create new user with default citizen role
            user = await User.create({
                walletAddress,
                nonce,
                role: 'citizen'
            });
        }

        console.log(`[AUTH] Nonce issued for wallet=${walletAddress}, role=${user.role}`);

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
            organizationId: user.organizationId ? user.organizationId.toString() : null
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
            .select('_id walletAddress role organizationId profile officerVerification createdAt updatedAt');

        return res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const profile = {
            displayName: String(req.body.displayName || '').trim().slice(0, 120),
            email: String(req.body.email || '').trim().slice(0, 160)
        };

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { profile } },
            { new: true }
        ).select('_id walletAddress role organizationId profile officerVerification createdAt updatedAt');

        return res.status(200).json({ success: true, message: 'Profile updated.', user });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    generateNonce,
    verifySignature,
    getMe,
    updateProfile
};
