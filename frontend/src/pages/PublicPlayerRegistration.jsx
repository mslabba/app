import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, User, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploadWithCrop from '@/components/ImageUploadWithCrop';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublicPlayerRegistration = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    position: '',
    specialty: '',
    previous_team: '',
    cricheroes_link: '',
    contact_number: '',
    email: '',
    photo_url: '',
    stats: {
      matches: '',
      runs: '',
      wickets: '',
      goals: '',
      assists: ''
    }
  });

  useEffect(() => {
    // Log environment info for debugging
    console.log('Environment check:', {
      location: window.location.href,
      protocol: window.location.protocol,
      isHTTPS: window.location.protocol === 'https:',
      API: API,
      eventId: eventId,
      timestamp: new Date().toISOString()
    });

    fetchEvent();
  }, [eventId]);

  const testConnectivity = async () => {
    try {
      console.log('Testing basic connectivity...');
      console.log('API URL:', API);
      console.log('Full URL:', `${API}/auctions/${eventId}`);
      console.log('Network online:', navigator.onLine);
      console.log('User agent:', navigator.userAgent);

      // Test basic connectivity
      const testResponse = await fetch(`${API}/auctions/${eventId}`, {
        method: 'HEAD',
        mode: 'cors'
      });
      console.log('Connectivity test response:', {
        ok: testResponse.ok,
        status: testResponse.status,
        headers: Object.fromEntries(testResponse.headers.entries())
      });
    } catch (error) {
      console.error('Connectivity test failed:', error);
    }
  };

  const fetchEvent = async () => {
    try {
      await testConnectivity();

      const response = await axios.get(`${API}/auctions/${eventId}`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${API}/auctions/${eventId}`,
        userAgent: navigator.userAgent,
        isNetworkError: !error.response,
        isTimeoutError: error.code === 'ECONNABORTED'
      });
      toast.error(`Failed to load event details: ${error.message || 'Network error'}`);
    }
  };

  const handleChange = (field, value) => {
    if (field.startsWith('stats.')) {
      const statField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        stats: { ...prev.stats, [statField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setLoading(true);

      const registrationData = {
        name: formData.name.trim(),
        age: formData.age ? parseInt(formData.age) : null,
        position: formData.position.trim() || null,
        specialty: formData.specialty.trim() || null,
        previous_team: formData.previous_team.trim() || null,
        cricheroes_link: formData.cricheroes_link.trim() || null,
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim() || null,
        photo_url: formData.photo_url.trim() || null,
        stats: {
          matches: formData.stats.matches ? parseInt(formData.stats.matches) : null,
          runs: formData.stats.runs ? parseInt(formData.stats.runs) : null,
          wickets: formData.stats.wickets ? parseInt(formData.stats.wickets) : null,
          goals: formData.stats.goals ? parseInt(formData.stats.goals) : null,
          assists: formData.stats.assists ? parseInt(formData.stats.assists) : null,
        }
      };

      const response = await axios.post(`${API}/auctions/${eventId}/register-player`, registrationData);

      toast.success('Registration submitted successfully!');
      setSubmitted(true);
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container mx-auto px-6 py-8">
          <Card className="max-w-md mx-auto bg-white/95 backdrop-blur-sm border-white/30 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Thank you for registering! The organizer will review your application and get back to you soon.
              </p>
              <Link
                to="/"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {event && event.logo_url ? (
              <img
                src={event.logo_url}
                alt={`${event.name} logo`}
                className="w-16 h-16 object-contain rounded-lg bg-white/20 p-2 backdrop-blur-sm"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Player Registration</h1>
          {event && (
            <div className="space-y-2">
              <p className="text-white/90 text-xl font-medium">Register for {event.name}</p>
              {event.description && (
                <p className="text-white/70 text-sm max-w-2xl mx-auto">
                  {event.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Registration Form */}
        <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Player Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-700">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age" className="text-gray-700">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                      placeholder="Your age"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_number" className="text-gray-700">Phone Number</Label>
                    <Input
                      id="contact_number"
                      value={formData.contact_number}
                      onChange={(e) => handleChange('contact_number', e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Playing Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Playing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position" className="text-gray-700">Position/Role</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      placeholder="e.g., Batsman, Forward, Midfielder"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty" className="text-gray-700">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => handleChange('specialty', e.target.value)}
                      placeholder="e.g., Right-handed, Left foot"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="previous_team" className="text-gray-700">Previous Team</Label>
                    <Input
                      id="previous_team"
                      value={formData.previous_team}
                      onChange={(e) => handleChange('previous_team', e.target.value)}
                      placeholder="Your previous team name"
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cricheroes_link" className="text-gray-700">CricHeroes Profile Link</Label>
                    <Input
                      id="cricheroes_link"
                      value={formData.cricheroes_link}
                      onChange={(e) => handleChange('cricheroes_link', e.target.value)}
                      placeholder="https://cricheroes.com/profile/..."
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Player Photo</h3>
                <ImageUploadWithCrop
                  label="Upload Your Photo"
                  value={formData.photo_url}
                  onChange={(url) => handleChange('photo_url', url)}
                  placeholder="Upload your photo or enter URL"
                  sampleType={{ type: 'players', subtype: 'photos' }}
                  enableCrop={true}
                  cropAspect={1}
                />
              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Career Statistics (Optional)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="matches" className="text-gray-700">Matches</Label>
                    <Input
                      id="matches"
                      type="number"
                      value={formData.stats.matches}
                      onChange={(e) => handleChange('stats.matches', e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="runs" className="text-gray-700">Runs/Goals</Label>
                    <Input
                      id="runs"
                      type="number"
                      value={formData.stats.runs}
                      onChange={(e) => handleChange('stats.runs', e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="wickets" className="text-gray-700">Wickets/Assists</Label>
                    <Input
                      id="wickets"
                      type="number"
                      value={formData.stats.wickets}
                      onChange={(e) => handleChange('stats.wickets', e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-medium"
                >
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>

              <p className="text-sm text-gray-500 text-center">
                * Required fields. Your registration will be reviewed by the organizer.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center text-white/80 hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicPlayerRegistration;
