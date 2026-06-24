import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import LandingPage from './pages/landing/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProtectedRoute from './components/ui/ProtectedRoute';
import DashboardRedirect from './components/ui/DashboardRedirect';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import AdminLayout from './pages/admin/AdminLayout';
import TeacherLayout from './pages/teacher/TeacherLayout';
import StudentLayout from './pages/student/StudentLayout';
import ParentLayout from './pages/parent/ParentLayout';
import { Toaster } from 'react-hot-toast';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <Router>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:collegeSlug" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
            
            {/* Super Admin Routes */}
            <Route path="/super/*" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminLayout /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminLayout /></ProtectedRoute>} />
            
            {/* Teacher Routes */}
            <Route path="/teacher/*" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>} />
            
            {/* Student Routes */}
            <Route path="/student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>} />

            {/* Parent Routes */}
            <Route path="/parent/*" element={<ProtectedRoute allowedRoles={['parent']}><ParentLayout /></ProtectedRoute>} />
          </Routes>
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'dark:bg-[#0A0F1C] dark:text-white border border-slate-200 dark:border-white/10 shadow-xl rounded-2xl font-sans',
              style: {
                padding: '16px',
                color: '#0f172a',
                fontWeight: '600',
                borderRadius: '16px'
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
                style: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
              }
            }}
          />
        </Router>
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
