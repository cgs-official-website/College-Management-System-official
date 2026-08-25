import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import LandingPage from './pages/landing/LandingPage';
import DemoSeeder from './pages/landing/DemoSeeder';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentRegister from './pages/auth/StudentRegister';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import StaffSetup from './pages/auth/StaffSetup';
import { PendingApproval, RejectedApproval } from './pages/auth/PendingApproval';
import ProtectedRoute from './components/ui/ProtectedRoute';
import DashboardRedirect from './components/ui/DashboardRedirect';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import AdminLayout from './pages/admin/AdminLayout';
import StudentLayout from './pages/student/StudentLayout';
import NotFound from './pages/error/NotFound';
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
            <Route path="/setup-demo" element={<DemoSeeder />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:roleParam" element={<Register />} />
            <Route path="/register/:roleParam/:collegeSlug" element={<Register />} />
            
            {/* Student Registration (Public with Token) */}
            <Route path="/student/register" element={<StudentRegister />} />
            <Route path="/student/register/:tokenParam" element={<StudentRegister />} />

            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/staff-setup" element={<StaffSetup />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/rejected" element={<RejectedApproval />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
            
            {/* Super Admin Routes */}
            <Route path="/super/*" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminLayout /></ProtectedRoute>} />

            {/* Admin/Staff Routes */}
            <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>} />

            {/* Student Portal Routes */}
            <Route path="/student/*" element={<ProtectedRoute allowedRoles={['student', 'superadmin']}><StudentLayout /></ProtectedRoute>} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
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
