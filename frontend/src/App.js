import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import TeamDashboard from '@/pages/TeamDashboard';
import AuctionDisplay from '@/pages/AuctionDisplay';
import EventManagement from '@/pages/EventManagement';
import CategoryManagement from '@/pages/CategoryManagement';
import TeamManagement from '@/pages/TeamManagement';
import PlayerManagement from '@/pages/PlayerManagement';
import PriorityPlayers from '@/pages/PriorityPlayers';
import SoldPlayersManagement from '@/pages/SoldPlayersManagement';
import AuctionControl from '@/pages/AuctionControl';
import SponsorManagement from '@/pages/SponsorManagement';
import Analytics from '@/pages/Analytics';
import PublicPlayerRegistration from '@/pages/PublicPlayerRegistration';
import PlayerRegistrationManagement from '@/pages/PlayerRegistrationManagement';
import PublicTeamStats from '@/pages/PublicTeamStats';
import TestPage from '@/pages/TestPage';
import PromoteToAdmin from '@/pages/PromoteToAdmin';
import LogoutPage from '@/pages/LogoutPage';
import CloudinaryTest from '@/pages/CloudinaryTest';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import ContactPage from '@/pages/ContactPage';
import UserManagement from '@/pages/UserManagement';
import Settings from '@/pages/Settings';
import PaymentGatewaySettings from '@/pages/PaymentGatewaySettings';
import EventPayments from '@/pages/EventPayments';
import EventSettings from '@/pages/EventSettings';
import OrganizerOnboarding from '@/pages/OrganizerOnboarding';
import LivePlayerBoard from '@/pages/LivePlayerBoard';
import LiveTeamsBoard from '@/pages/LiveTeamsBoard';
import ProtectedRoute from '@/components/ProtectedRoute';

// Marketing product pages (new site IA)
import FeaturesPage from '@/marketing/pages/FeaturesPage';
import HowItWorksPage from '@/marketing/pages/HowItWorksPage';
import PlayerRegistrationPage from '@/marketing/pages/PlayerRegistrationPage';
import LiveAuctionPage from '@/marketing/pages/LiveAuctionPage';
import TeamManagementPage from '@/marketing/pages/TeamManagementPage';
import AuctionDashboardPage from '@/marketing/pages/AuctionDashboardPage';
import SportsPage from '@/marketing/pages/SportsPage';
import PricingPage from '@/marketing/pages/PricingPage';
import ContactMarketingPage from '@/marketing/pages/ContactMarketingPage';
import ScrollToTop from '@/marketing/components/ScrollToTop';

// Dashboard redirect component for authenticated users
const DashboardRedirect = () => {
  const { isAuthenticated, isSuperAdmin, isEventOrganizer, userProfile, loading } = useAuth();

  // Wait for auth to complete
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen app-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Wait for user profile to load before redirecting
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen app-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your profile...</p>
        </div>
      </div>
    );
  }

  console.log('User profile in redirect:', userProfile);
  console.log('Is super admin:', isSuperAdmin);
  console.log('Is event organizer:', isEventOrganizer);

  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isEventOrganizer) {
    return <Navigate to="/admin" replace />;  // Event organizers also use admin dashboard
  }

  return <Navigate to="/team" replace />;
};

function App() {
  console.log('App component rendering...');
  console.log('Environment check:', {
    REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
    REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL ? 'SET' : 'NOT SET'
  });

  // Error boundary for DOM errors
  const handleError = (error, errorInfo) => {
    if (error.message && (
      error.message.includes('removeChild') ||
      error.message.includes('The node to be removed is not a child of this node')
    )) {
      console.warn('DOM manipulation error caught and suppressed:', error.message);
      return;
    }
    console.error('App Error:', error, errorInfo);
  };

  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public marketing site */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/player-registration" element={<PlayerRegistrationPage />} />
            <Route path="/live-auction" element={<LiveAuctionPage />} />
            <Route path="/team-management" element={<TeamManagementPage />} />
            <Route path="/auction-dashboard" element={<AuctionDashboardPage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactMarketingPage />} />
            <Route path="/demo" element={<ContactMarketingPage />} />

            {/* App / public operational routes */}
            <Route path="/test" element={<TestPage />} />
            <Route path="/test-cloudinary" element={<CloudinaryTest />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact-legacy" element={<ContactPage />} />
            <Route path="/promote-to-admin" element={<PromoteToAdmin />} />
            <Route path="/display/:eventId" element={<AuctionDisplay />} />
            <Route path="/auctions/:eventId/register" element={<PublicPlayerRegistration />} />

            {/* Public Team Statistics - No authentication required */}
            <Route path="/public/team/:teamId/stats" element={<PublicTeamStats />} />

            {/* Public live broadcast boards (OBS / vMix) — token-scoped, no login */}
            <Route path="/live/:publicToken/player" element={<LivePlayerBoard />} />
            <Route path="/live/:publicToken/teams" element={<LiveTeamsBoard />} />

            {/* Dashboard redirect for authenticated users */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

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
              path="/admin/onboarding"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <OrganizerOnboarding />
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
              path="/admin/priority-players/:eventId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PriorityPlayers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sold-players/:eventId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SoldPlayersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/registrations/:eventId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PlayerRegistrationManagement />
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
              path="/admin/sponsors/:eventId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SponsorManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payment-settings"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PaymentGatewaySettings />
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
            <Route
              path="/admin/events/:eventId/settings"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <EventSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:eventId/payments"
              element={
                <ProtectedRoute>
                  <EventPayments />
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
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
