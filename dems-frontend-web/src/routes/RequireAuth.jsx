import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RequireAuth({ roles }) {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/wallet-login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    // Redirect based on user's actual role
    if (role === 'super_admin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'officer') {
      return <Navigate to="/officer/dashboard" replace />;
    } else {
      return <Navigate to="/citizen/dashboard" replace />;
    }
  }

  return <Outlet />;
}
