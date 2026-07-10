const { verifyEvidenceIntegrity } = require('../services/evidenceVerificationService');

const verifyEvidenceBlockchain = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Evidence ID is required.'
            });
        }

        const result = await verifyEvidenceIntegrity(id);

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message
            });
        }

        if (err.code === 'EVIDENCE_NOT_ON_CHAIN') {
            return res.status(422).json({
                success: false,
                message: err.message
            });
        }

        if (err.message?.includes('EVIDENCE_CONTRACT_ADDRESS')) {
            return res.status(503).json({
                success: false,
                message: err.message
            });
        }

        console.error('[VERIFY_BLOCKCHAIN_ERROR]', err);
        next(err);
    }
};

module.exports = {
    verifyEvidenceBlockchain
};
