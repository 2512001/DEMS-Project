import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RequireAuth({ roles }) {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/wallet-login" replace state={{ from: location }} />;
  }

  // For email verification route, allow access without role check
  if (location.pathname === '/auth/email-verification') {
    return <Outlet />;
  }

  if (roles?.length && role && !roles.includes(role)) {
    return <Navigate to={
      role === 'super_admin' ? '/superadmin/dashboard'
        : role === 'admin' ? '/admin/dashboard'
          : role === 'officer' ? '/officer/dashboard'
            : '/citizen/dashboard'
    } replace />;
  }

  return <Outlet />;
}
