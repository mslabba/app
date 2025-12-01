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
import ImageUpload from '@/components/ImageUpload';

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
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      toast.error('Event not found');
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
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setLoading(false);
        return;
      }

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
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit registration';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering! The organizer will review your registration and get back to you soon.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Player Registration</h1>
          {event && (
            <div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <Card className="bg-white/95 backdrop-blur-sm border-white/30 shadow-xl">
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
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                      placeholder="Your age"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_number">Contact Number</Label>
                    <Input
                      id="contact_number"
                      value={formData.contact_number}
                      onChange={(e) => handleChange('contact_number', e.target.value)}
                      placeholder="Your phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Playing Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Playing Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position/Role</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      placeholder="e.g., Batsman, Forward, Midfielder"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => handleChange('specialty', e.target.value)}
                      placeholder="e.g., Right-hand bat, Left-foot"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="previous_team">Previous Team</Label>
                  <Input
                    id="previous_team"
                    value={formData.previous_team}
                    onChange={(e) => handleChange('previous_team', e.target.value)}
                    placeholder="Your previous team/club"
                  />
                </div>

                <div>
                  <Label htmlFor="cricheroes_link">CricHeroes Profile Link</Label>
                  <Input
                    id="cricheroes_link"
                    value={formData.cricheroes_link}
                    onChange={(e) => handleChange('cricheroes_link', e.target.value)}
                    placeholder="https://cricheroes.com/profile/..."
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Player Photo</h3>
                <ImageUpload
                  label="Upload Your Photo"
                  value={formData.photo_url}
                  onChange={(url) => handleChange('photo_url', url)}
                  placeholder="Upload your photo or enter URL"
                  sampleType={{ type: 'players', subtype: 'photos' }}
                />
              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Career Statistics (Optional)</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="matches">Matches</Label>
                    <Input
                      id="matches"
                      type="number"
                      value={formData.stats.matches}
                      onChange={(e) => handleChange('stats.matches', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="runs">Runs/Goals</Label>
                    <Input
                      id="runs"
                      type="number"
                      value={formData.stats.runs}
                      onChange={(e) => handleChange('stats.runs', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wickets">Wickets/Assists</Label>
                    <Input
                      id="wickets"
                      type="number"
                      value={formData.stats.wickets}
                      onChange={(e) => handleChange('stats.wickets', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
                  disabled={loading}
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
