import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const DashboardRedirect = () => {
  const { userRole, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center flex flex-col items-center">
          <FaSpinner className="animate-spin text-4xl text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to your workspace...</p>
        </div>
      </div>
    );
  }

  if (userRole === 'superadmin') return <Navigate to="/super" replace />;

  const collegeStatus = userData?.collegeStatus || userData?.college?.status;

  if (collegeStatus === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (collegeStatus === 'rejected') {
    return <Navigate to="/rejected" replace />;
  }

  if (collegeStatus === 'suspended') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (userRole === 'student') return <Navigate to="/student" replace />;
  
  // Approved college admins and staff proceed to admin panel
  return <Navigate to="/admin" replace />;
};

export default DashboardRedirect;
