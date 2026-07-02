import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();
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
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user's role is not in the list, redirect to an unauthorized or generic dashboard
  // NOTE: If userRole is still null (e.g., they just signed up and firestore isn't updated), we might want to handle that.
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    // They are logged in but don't have the right role
    // For now, redirect to login, or you could create a generic '/unauthorized' page.
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
