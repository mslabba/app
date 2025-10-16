import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import LoginPage from '@/pages/LoginPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import TeamDashboard from '@/pages/TeamDashboard';
import AuctionDisplay from '@/pages/AuctionDisplay';
import EventManagement from '@/pages/EventManagement';
import TeamManagement from '@/pages/TeamManagement';
import PlayerManagement from '@/pages/PlayerManagement';
import AuctionControl from '@/pages/AuctionControl';
import Analytics from '@/pages/Analytics';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
