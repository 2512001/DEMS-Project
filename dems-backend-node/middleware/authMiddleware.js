const jwt = require('jsonwebtoken');
const User = require('../model/userModel');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ success: false, message: 'Authentication token required.' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('[AUTH] JWT_SECRET is not configured.');
            return res.status(500).json({ success: false, message: 'Authentication service is not configured.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id walletAddress role');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Authenticated user no longer exists.' });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
            walletAddress: user.walletAddress
        };

        next();
    } catch (err) {
        console.warn(`[AUTH] JWT verification failed: ${err.message}`);
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
};

module.exports = { protect };
