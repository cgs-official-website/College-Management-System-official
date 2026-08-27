import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center flex flex-col items-center">
          <FaSpinner className="animate-spin text-4xl text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Zuna Workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Superadmin has universal access
  if (userRole !== 'superadmin') {
    const collegeStatus = userData?.collegeStatus || userData?.college?.status;
    
    // If college is pending approval, block admin routes and route to pending approval
    if (collegeStatus === 'pending') {
      return <Navigate to="/pending-approval" replace />;
    }

    if (collegeStatus === 'rejected') {
      return <Navigate to="/rejected" replace />;
    }

    if (collegeStatus === 'suspended') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // If roles are specified and user's role is not in the list, redirect
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
