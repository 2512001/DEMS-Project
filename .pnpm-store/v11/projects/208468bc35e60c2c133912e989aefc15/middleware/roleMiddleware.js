const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        console.log('[RBAC] Checking authorization - User role:', req.user.role, 'Required roles:', roles, 'Wallet:', req.user.walletAddress);

        // Super admin has access to all admin routes
        if (req.user.role === 'super_admin' && roles.includes('admin')) {
            console.log('[RBAC] Access granted - Super admin accessing admin route');
            return next();
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`[RBAC] Denied role=${req.user.role} wallet=${req.user.walletAddress} route=${req.method} ${req.originalUrl}`);
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        console.log('[RBAC] Access granted - Role matches');
        next();
    };
};

module.exports = { authorizeRoles };
