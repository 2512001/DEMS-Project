const { ethers } = require('ethers');
const User = require('../model/userModel');
const Evidence = require('../model/evidenceModel');

const publicUserFields = '_id walletAddress role profile officerVerification.status officerVerification.requestedAt officerVerification.reviewedAt createdAt updatedAt';

const normalizeFiles = (files = {}) => {
    return Object.entries(files).flatMap(([fieldName, entries]) => {
        return entries.map((file) => ({
            fieldName,
            originalName: file.originalname,
            path: file.path,
            mimeType: file.mimetype,
            size: file.size
        }));
    });
};

const submitVerificationRequest = async (req, res, next) => {
    try {
        const documents = normalizeFiles(req.files);

        if (!documents.length) {
            return res.status(400).json({ success: false, message: 'At least one verification document is required.' });
        }

        const updates = {
            'officerVerification.status': 'pending',
            'officerVerification.badgeNumber': String(req.body.badgeNumber || '').trim().slice(0, 120),
            'officerVerification.governmentIdNumber': String(req.body.governmentIdNumber || '').trim().slice(0, 120),
            'officerVerification.aadhaarNumber': String(req.body.aadhaarNumber || '').trim().slice(0, 120),
            'officerVerification.documents': documents,
            'officerVerification.rejectionReason': '',
            'officerVerification.reviewedBy': null,
            'officerVerification.reviewedAt': null,
            'officerVerification.requestedAt': new Date()
        };

        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(publicUserFields);

        return res.status(201).json({
            success: true,
            message: 'Officer verification request submitted.',
            user
        });
    } catch (err) {
        next(err);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select(publicUserFields).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

const getVerificationRequests = async (req, res, next) => {
    try {
        const users = await User.find({ 'officerVerification.status': 'pending' })
            .select(`${publicUserFields} officerVerification`)
            .sort({ 'officerVerification.requestedAt': -1 });

        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

const reviewVerificationRequest = async (req, res, next) => {
    try {
        const { walletAddress, status, rejectionReason } = req.body;
        const normalizedWallet = (walletAddress || '').toLowerCase();

        if (!ethers.isAddress(normalizedWallet) || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress and status approved/rejected are required.' });
        }

        const updates = {
            'officerVerification.status': status,
            'officerVerification.rejectionReason': status === 'rejected' ? String(rejectionReason || '').slice(0, 500) : '',
            'officerVerification.reviewedBy': req.user.id,
            'officerVerification.reviewedAt': new Date()
        };

        if (status === 'approved') {
            updates.role = 'officer';
        }

        const user = await User.findOneAndUpdate(
            { walletAddress: normalizedWallet },
            { $set: updates },
            { new: true }
        ).select(`${publicUserFields} officerVerification`);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found for the provided wallet address.' });
        }

        return res.status(200).json({
            success: true,
            message: status === 'approved' ? 'Officer verification approved.' : 'Officer verification rejected.',
            user
        });
    } catch (err) {
        next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const [users, evidence] = await Promise.all([
            User.find({}).select(publicUserFields).sort({ updatedAt: -1 }).limit(25),
            Evidence.find({}).sort({ updatedAt: -1 }).limit(25)
        ]);

        const data = [
            ...users.map((user) => ({
                type: 'user',
                id: user._id,
                walletAddress: user.walletAddress,
                role: user.role,
                status: user.officerVerification?.status,
                timestamp: user.updatedAt
            })),
            ...evidence.map((item) => ({
                type: 'evidence',
                id: item._id,
                walletAddress: item.uploaderWallet || item.UploaderWallet,
                status: item.status,
                txHash: item.blockchainTxHash,
                timestamp: item.updatedAt
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        next(err);
    }
};

const upgradeOfficer = async (req, res, next) => {
    try {
        const walletAddress = (req.body.walletAddress || '').toLowerCase();

        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ success: false, message: 'Valid walletAddress is required.' });
        }

        const user = await User.findOneAndUpdate(
            { walletAddress },
            { $set: { role: 'officer' } },
            { new: true }
        ).select('_id walletAddress role updatedAt');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found for the provided wallet address.' });
        }

        console.log(`[ADMIN] Officer upgrade admin=${req.user.walletAddress} upgraded=${walletAddress}`);

        return res.status(200).json({
            success: true,
            message: 'User role upgraded to officer.',
            user
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    submitVerificationRequest,
    getUsers,
    getVerificationRequests,
    reviewVerificationRequest,
    getAuditLogs,
    upgradeOfficer
};
