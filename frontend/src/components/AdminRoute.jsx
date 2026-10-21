import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-amber-400">
            <FiShield className="w-6 h-6" />
          </div>
        </div>
        <p className="text-sm font-bold text-slate-400 font-heading tracking-wide">
          Verifying Administrator Privileges...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    toast.error('Access restricted to administrators only.');
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default AdminRoute;
