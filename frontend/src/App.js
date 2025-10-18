import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import TeamDashboard from '@/pages/TeamDashboard';
import AuctionDisplay from '@/pages/AuctionDisplay';
import EventManagement from '@/pages/EventManagement';
import CategoryManagement from '@/pages/CategoryManagement';
import TeamManagement from '@/pages/TeamManagement';
import PlayerManagement from '@/pages/PlayerManagement';
import AuctionControl from '@/pages/AuctionControl';
import Analytics from '@/pages/Analytics';
import ProtectedRoute from '@/components/ProtectedRoute';

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { isAuthenticated, isSuperAdmin, userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  console.log('User profile in redirect:', userProfile);
  console.log('Is super admin:', isSuperAdmin);
  
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/team" replace />;
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/display/:eventId" element={<AuctionDisplay />} />
            
            {/* Super Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/events" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <EventManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/categories/:eventId" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <CategoryManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/teams/:eventId" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <TeamManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/players/:eventId" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlayerManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/auction/:eventId" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <AuctionControl />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/analytics/:eventId" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            
            {/* Team Routes */}
            <Route 
              path="/team" 
              element={
                <ProtectedRoute>
                  <TeamDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/" element={<RoleBasedRedirect />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
