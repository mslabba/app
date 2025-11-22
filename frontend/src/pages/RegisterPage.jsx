import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    mobile_number: '',
    role: 'event_organizer'
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, isEventOrganizer, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect to appropriate dashboard based on role
      const dashboardRoute = (isSuperAdmin || isEventOrganizer) ? '/admin' : '/dashboard';
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, isEventOrganizer, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error('Please accept the Terms of Service and Privacy Policy to continue.');
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
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        <Card className="glass border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <img
                src="/images/sports/logo-final.png"
                alt="PowerAuction Logo"
                className="h-12 w-auto"
                onError={(e) => {
                  console.error('Logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
              <div className="flex flex-col items-start">
                <span className="text-2xl font-bold text-white">Power<span className="text-red-500">Auction</span></span>
                <span className="text-xs text-white/60">Powered by Turgut</span>
              </div>
            </div>
            <CardDescription className="text-white/80">Join the sports auction platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-white">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <Input
                    id="display_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="text-white">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <Input
                    id="mobile_number"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={formData.mobile_number}
                    onChange={(e) => handleChange('mobile_number', e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Role</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event_organizer">Event Organizer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/60">
                  Event Organizers can create and manage events, categories, sponsors, players, and control auctions.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                    className="mt-1"
                  />
                  <div className="text-sm text-white/80 leading-relaxed">
                    <Label htmlFor="terms" className="cursor-pointer">
                      I agree to the{' '}
                      <Link to="/terms-of-service" className="text-blue-300 hover:text-blue-200 underline" target="_blank">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy-policy" className="text-blue-300 hover:text-blue-200 underline" target="_blank">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-purple-700 hover:bg-white/90 font-semibold"
                disabled={loading || !termsAccepted}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-white/80 hover:text-white text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
