import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, Chrome } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect to appropriate dashboard based on role
      const dashboardRoute = isSuperAdmin ? '/admin' : '/dashboard';
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, authLoading, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      toast.success('Login successful!');
      // Navigate to dashboard for role-based redirect
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
      // Navigate to dashboard for role-based redirect
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md fade-in">
        <Card className="glass border-white/20 shadow-2xl" data-testid="login-card">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold text-white">PowerAuctions</CardTitle>
            <CardDescription className="text-white/80">powered by Turgut - Sign in to manage your auction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-4" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    data-testid="password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-purple-700 hover:bg-white/90 font-semibold"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-white/60">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={loading}
              data-testid="google-login-button"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>

            <div className="text-center text-sm text-white/60 space-y-2">
              <div className="pt-2 border-t border-white/20">
                <p>Don't have an account?</p>
                <Link to="/register" className="text-white hover:text-white/80 underline">
                  Create Account
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
