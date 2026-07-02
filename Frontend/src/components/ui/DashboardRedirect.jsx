import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const DashboardRedirect = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center flex flex-col items-center">
          <FaSpinner className="animate-spin text-4xl text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (userRole === 'superadmin') return <Navigate to="/super" replace />;
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  if (userRole === 'teacher') return <Navigate to="/teacher" replace />;
  if (userRole === 'student') return <Navigate to="/student" replace />;
  if (userRole === 'parent') return <Navigate to="/parent" replace />;

  // Fallback or unassigned role
  return <Navigate to="/login" replace />;
};

export default DashboardRedirect;
