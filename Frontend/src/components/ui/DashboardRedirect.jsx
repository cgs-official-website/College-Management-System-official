import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const DashboardRedirect = () => {
  const { userRole, userData, loading } = useAuth();
  const role = typeof userRole === 'string' ? userRole.trim().toLowerCase() : '';

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

  if (role === 'superadmin') return <Navigate to="/super" replace />;

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

  if (role === 'student') return <Navigate to="/student/dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'parent') return <Navigate to="/parent" replace />;
  if (role === 'teacher' || role === 'hod' || role === 'faculty') return <Navigate to="/teacher" replace />;

  return <Navigate to="/login" replace />;
};

export default DashboardRedirect;
