import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Key, Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentGatewaySettings = () => {
  const { token, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gatewaySettings, setGatewaySettings] = useState({
    cashfree_app_id: '',
    cashfree_secret_key: '',
    cashfree_mode: 'sandbox'
  });

  useEffect(() => {
    if (token && isSuperAdmin) {
      fetchGatewaySettings();
    }
  }, [token, isSuperAdmin]);

  const fetchGatewaySettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/payment-gateway`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data) {
        setGatewaySettings(response.data);
      }
    } catch (error) {
      // If no settings found, that's okay
      if (error.response?.status !== 404) {
        console.error('Error fetching payment gateway settings:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/settings/payment-gateway`, gatewaySettings, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setGatewaySettings(response.data);
      toast.success('Payment gateway settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save payment gateway settings');
      console.error('Error saving payment gateway settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="glass border-white/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                  <p className="text-white/70">
                    Only Super Admins can access payment gateway settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Payment Gateway Settings</h1>
            <p className="text-white/80">Configure Cashfree payment gateway for PowerAuction</p>
          </div>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CreditCard className="w-6 h-6 mr-2" />
                Cashfree Configuration
              </CardTitle>
              <p className="text-white/70 text-sm mt-2">
                All registration payments will be collected to PowerAuction's Cashfree account.
                Event organizers will receive manual payouts after their events.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashfree_mode" className="text-white flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Environment Mode
                    </Label>
                    <Select
                      value={gatewaySettings.cashfree_mode}
                      onValueChange={(value) => setGatewaySettings({ ...gatewaySettings, cashfree_mode: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-white/60 text-xs">
                      Use Sandbox mode for testing, switch to Production when going live
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cashfree_app_id" className="text-white flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      Cashfree App ID
                    </Label>
                    <Input
                      id="cashfree_app_id"
                      placeholder="Your Cashfree App ID"
                      value={gatewaySettings.cashfree_app_id}
                      onChange={(e) => setGatewaySettings({ ...gatewaySettings, cashfree_app_id: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cashfree_secret_key" className="text-white flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      Cashfree Secret Key
                    </Label>
                    <Input
                      id="cashfree_secret_key"
                      type="password"
                      placeholder="Your Cashfree Secret Key"
                      value={gatewaySettings.cashfree_secret_key}
                      onChange={(e) => setGatewaySettings({ ...gatewaySettings, cashfree_secret_key: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">How it works:</h4>
                  <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
                    <li>All player registration payments are collected via PowerAuction's Cashfree account</li>
                    <li>Event organizers provide their bank details in Settings</li>
                    <li>PowerAuction admin manually transfers funds to organizers after events</li>
                    <li>This ensures secure payment handling and better control</li>
                  </ul>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
                  <p className="text-white/80 text-xs flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Important:</strong> Get your Cashfree credentials from{' '}
                      <a href="https://www.cashfree.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">
                        Cashfree Dashboard
                      </a>. Use sandbox credentials for testing and production credentials for live payments.
                    </span>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-purple-700 hover:bg-white/90"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : gatewaySettings.id ? 'Update Gateway Settings' : 'Save Gateway Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <FloatingMenu />
    </div>
  );
};

export default PaymentGatewaySettings;
