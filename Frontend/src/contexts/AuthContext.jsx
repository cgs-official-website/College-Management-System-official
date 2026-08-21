import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { FullPageSkeleton } from '../components/ui/FullPageSkeleton';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('zuna_token', response.data.accessToken);
    
    await restoreSession();
    return response.data.user;
  }

  async function register(email, password, additionalData) {
    if (additionalData.role === 'admin') {
      await api.post('/auth/register', {
        adminEmail: email,
        password,
        collegeName: additionalData.collegeName,
        slug: additionalData.collegeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      });
      // Automatically log the user in after registration
      return await login(email, password);
    }
    throw new Error("Only Admin registration is currently implemented in REST API");
  }

  function logout() {
    localStorage.removeItem('zuna_token');
    setCurrentUser(null);
    setUserRole(null);
    setUserData(null);
  }

  function resetPassword(email) {
    throw new Error("Password reset not yet implemented in REST API");
  }

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  const restoreSession = async () => {
    const token = localStorage.getItem('zuna_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const data = response.data;
      
      setCurrentUser({ uid: data.id, email: data.email });
      setUserRole(data.role);
      
      setUserData({
        uid: data.id,
        email: data.email,
        role: data.role,
        collegeId: data.collegeId,
        collegeName: data.college?.name,
        collegeLogo: data.college?.logoUrl,
        ...data
      });
    } catch (error) {
      console.error("Session restore failed", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();

    const handleAuthExpired = () => logout();
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (userRole === 'superadmin') {
      document.title = "Zuna | College Management System";
    } else if (userData?.collegeName) {
      document.title = userData.collegeName;
    } else {
      document.title = "Zuna | College Management System";
    }
  }, [userData, userRole]);

  const value = {
    currentUser,
    userData,
    userRole,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <FullPageSkeleton /> : children}
    </AuthContext.Provider>
  );
}
