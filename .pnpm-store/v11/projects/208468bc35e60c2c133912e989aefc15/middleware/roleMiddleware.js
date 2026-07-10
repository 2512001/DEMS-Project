const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`[RBAC] Denied role=${req.user.role} wallet=${req.user.walletAddress} route=${req.method} ${req.originalUrl}`);
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        next();
    };
};

module.exports = { authorizeRoles };
