import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase';
import { toast } from 'sonner';
import { Mail, Lock, Chrome, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import axios from 'axios';
import { MarketingShell, LOGO_SRC } from '@/marketing/components/MarketingShell';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, isEventOrganizer, loading: authLoading } = useAuth();

  useEffect(() => {
    document.title = 'Login — PowerAuction';
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const dashboardRoute = isSuperAdmin || isEventOrganizer ? '/admin' : '/dashboard';
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, isEventOrganizer, authLoading, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setResetLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, null, {
        params: { email: resetEmail },
      });
      toast.success(`Password reset email sent! Check your inbox at ${resetEmail}`);
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.response?.status === 404) {
        toast.error('No account found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else {
        toast.error('Failed to send password reset email');
      }
    } finally {
      setResetLoading(false);
    }
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
        <div className="pa-auth__card" data-testid="login-card">
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
            <p>Sign in to manage your auction</p>
          </div>

          <form onSubmit={handleEmailLogin} data-testid="login-form">
            <div className="pa-auth__field">
              <label htmlFor="email">Email</label>
              <div className="pa-auth__input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@league.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="pa-auth__field">
              <div className="pa-auth__label-row">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="pa-auth__link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="pa-auth__input-wrap">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="pa-btn pa-btn--primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          <div className="pa-auth__divider">Or continue with</div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="pa-btn pa-btn--secondary"
            style={{ width: '100%' }}
            disabled={loading}
            data-testid="google-login-button"
          >
            <Chrome size={18} aria-hidden="true" />
            Sign in with Google
          </button>

          <div className="pa-auth__footer">
            <p style={{ margin: 0 }}>
              Don&apos;t have an account? <Link to="/register">Create account</Link>
            </p>
          </div>
        </div>

        {showForgotPassword && (
          <div
            className="pa-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !resetLoading) {
                setShowForgotPassword(false);
                setResetEmail('');
              }
            }}
          >
            <div className="pa-modal">
              <h2 id="reset-password-title">Reset your password</h2>
              <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
              <form onSubmit={handleForgotPassword}>
                <div className="pa-auth__field">
                  <label htmlFor="reset-email">Email</label>
                  <div className="pa-auth__input-wrap">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="pa-modal__actions">
                  <button
                    type="button"
                    className="pa-btn pa-btn--secondary pa-btn--sm"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="pa-btn pa-btn--primary pa-btn--sm" disabled={resetLoading}>
                    {resetLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MarketingShell>
  );
};

export default LoginPage;
