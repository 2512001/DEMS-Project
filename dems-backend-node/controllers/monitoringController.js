const Evidence = require('../model/evidenceModel');
const Organization = require('../model/organizationModel');
const { isSuperAdmin } = require('../services/accessControl');

const getBlockchainMonitoring = async (req, res, next) => {
    try {
        if (!isSuperAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only Super Admin can access blockchain monitoring.' });
        }

        const {
            status = '',
            organizationId = '',
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (status) {
            filter.blockchainStatus = status;
        }

        if (organizationId) {
            filter.organizationId = organizationId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const maxLimit = Math.min(parseInt(limit), 100);

        const [evidence, total] = await Promise.all([
            Evidence.find(filter)
                .select('fileName fileHash ipfsCID blockchainStatus blockchainTxHash blockchainRequested organizationId uploadedBy createdAt')
                .populate('organizationId', 'name organizationCode')
                .populate('uploadedBy', 'profile.displayName walletAddress')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(maxLimit),
            Evidence.countDocuments(filter)
        ]);

        const stats = await Promise.all([
            Evidence.countDocuments({ blockchainStatus: 'confirmed' }),
            Evidence.countDocuments({ blockchainStatus: 'pending' }),
            Evidence.countDocuments({ blockchainStatus: 'failed' }),
            Evidence.countDocuments({ blockchainStatus: 'not_requested' })
        ]);

        return res.status(200).json({
            success: true,
            count: evidence.length,
            total,
            page: parseInt(page),
            limit: maxLimit,
            data: evidence,
            stats: {
                confirmed: stats[0],
                pending: stats[1],
                failed: stats[2],
                notRequested: stats[3]
            }
        });
    } catch (err) {
        next(err);
    }
};

const getStorageMonitoring = async (req, res, next) => {
    try {
        if (!isSuperAdmin(req.user)) {
            return res.status(403).json({ success: false, message: 'Only Super Admin can access storage monitoring.' });
        }

        const { organizationId = '' } = req.query;

        const filter = {};
        if (organizationId) {
            filter.organizationId = organizationId;
        }

        const [
            totalEvidence,
            evidenceByOrg,
            evidenceByType,
            ipfsStored,
            ipfsRetrievalFailures
        ] = await Promise.all([
            Evidence.countDocuments(filter),
            Evidence.aggregate([
                ...(organizationId ? [{ $match: { organizationId } }] : []),
                {
                    $group: {
                        _id: '$organizationId',
                        count: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'organizations',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'org'
                    }
                },
                {
                    $unwind: '$org'
                },
                {
                    $project: {
                        organizationId: '$_id',
                        organizationName: '$org.name',
                        organizationCode: '$org.organizationCode',
                        count: 1
                    }
                }
            ]),
            Evidence.aggregate([
                ...(organizationId ? [{ $match: { organizationId } }] : []),
                {
                    $group: {
                        _id: '$mimeType',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Evidence.countDocuments({ ...filter, ipfsCID: { $exists: true, $ne: null } }),
            Evidence.countDocuments({ ...filter, ipfsCID: { $exists: true, $ne: null }, status: 'ipfs_retrieval_failed' })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalEvidence,
                evidenceByOrg,
                evidenceByType,
                ipfsStored,
                ipfsRetrievalFailures,
                totalIPFS: ipfsStored,
                retrievalSuccessRate: ipfsStored > 0 ? ((ipfsStored - ipfsRetrievalFailures) / ipfsStored * 100).toFixed(2) : 0
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBlockchainMonitoring,
    getStorageMonitoring
};
