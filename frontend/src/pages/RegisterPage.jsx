import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MarketingShell, LOGO_SRC } from '@/marketing/components/MarketingShell';
import Captcha from '@/components/Captcha';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    mobile_number: '',
    role: 'event_organizer',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, isEventOrganizer, loading: authLoading } = useAuth();

  useEffect(() => {
    document.title = 'Create Account — PowerAuction';
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const dashboardRoute = isSuperAdmin || isEventOrganizer ? '/admin' : '/dashboard';
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, isEventOrganizer, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (!captchaVerified) {
      toast.error('Please complete the security verification (CAPTCHA).');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/register`, formData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Failed to register');
      if (captchaRef.current) captchaRef.current.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (authLoading) {
    return (
      <div className="pa-auth__loading">
        <div>
          <div className="pa-auth__spinner" aria-hidden="true" />
          <p>Checking authentication…</p>
        </div>
      </div>
    );
  }

  return (
    <MarketingShell>
      <div className="pa-bg-radial pa-auth">
        <div className="pa-auth__card pa-auth__card--wide">
          <div className="pa-auth__brand">
            <Link to="/" className="pa-auth__brand-link" aria-label="PowerAuction home">
              <img src={LOGO_SRC} alt="" width={48} height={48} decoding="async" />
              <span className="pa-nav__logo-text">
                <span className="pa-nav__logo-name">
                  Power<span className="pa-nav__logo-accent">Auction</span>
                </span>
                <span className="pa-nav__logo-tagline">Powered by Turgut</span>
              </span>
            </Link>
            <p>Create your organizer account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="pa-auth__field">
              <label htmlFor="display_name">Full name</label>
              <div className="pa-auth__input-wrap">
                <User size={18} aria-hidden="true" />
                <input
                  id="display_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="pa-auth__field">
              <label htmlFor="email">Email</label>
              <div className="pa-auth__input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@league.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="pa-auth__field">
              <label htmlFor="mobile_number">Mobile number</label>
              <div className="pa-auth__input-wrap">
                <Phone size={18} aria-hidden="true" />
                <input
                  id="mobile_number"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={formData.mobile_number}
                  onChange={(e) => handleChange('mobile_number', e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="pa-auth__field">
              <label htmlFor="password">Password</label>
              <div className="pa-auth__input-wrap">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="pa-auth__field">
              <label htmlFor="role">Role</label>
              <div className="pa-auth__input-wrap">
                <User size={18} aria-hidden="true" />
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                >
                  <option value="event_organizer">Event Organizer</option>
                </select>
              </div>
              <p className="pa-auth__hint">
                Event organizers can create and manage events, categories, sponsors, players, and control auctions.
              </p>
            </div>

            <div className="pa-auth__check">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the{' '}
                <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Captcha ref={captchaRef} onVerify={setCaptchaVerified} />

            <button
              type="submit"
              className="pa-btn pa-btn--primary"
              style={{ width: '100%' }}
              disabled={loading || !termsAccepted || !captchaVerified}
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          <div className="pa-auth__footer">
            <p style={{ margin: 0 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
};

export default RegisterPage;
