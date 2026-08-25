import React from 'react';
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
  if (userRole === 'student') return <Navigate to="/student" replace />;
  
  // Everyone else goes to the admin panel where their role-based permissions take over
  return <Navigate to="/admin" replace />;
};

export default DashboardRedirect;
