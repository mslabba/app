import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, CreditCard, Building2, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    swift_code: '',
    branch_name: '',
    upi_id: ''
  });

  useEffect(() => {
    if (token) {
      fetchBankDetails();
    }
  }, [token]);

  const fetchBankDetails = async () => {
    try {
      const response = await axios.get(`${API}/settings/bank-details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data) {
        setBankDetails(response.data);
      }
    } catch (error) {
      // If no bank details found, that's okay
      if (error.response?.status !== 404) {
        console.error('Error fetching bank details:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/settings/bank-details`, bankDetails, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setBankDetails(response.data);
      toast.success('Bank details saved successfully!');
    } catch (error) {
      toast.error('Failed to save bank details');
      console.error('Error saving bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-white/80">Manage your account and payment settings</p>
          </div>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Landmark className="w-6 h-6 mr-2" />
                Bank Account Details
              </CardTitle>
              <p className="text-white/70 text-sm mt-2">
                Add your bank details to receive payments collected from player registrations
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-white flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Bank Name
                    </Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g., State Bank of India"
                      value={bankDetails.bank_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name" className="text-white flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Account Holder Name
                    </Label>
                    <Input
                      id="account_holder_name"
                      placeholder="As per bank records"
                      value={bankDetails.account_holder_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, account_holder_name: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-white">
                      Account Number
                    </Label>
                    <Input
                      id="account_number"
                      type="text"
                      placeholder="Bank account number"
                      value={bankDetails.account_number}
                      onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code" className="text-white">
                      IFSC Code
                    </Label>
                    <Input
                      id="ifsc_code"
                      placeholder="e.g., SBIN0001234"
                      value={bankDetails.ifsc_code}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="swift_code" className="text-white">
                      SWIFT Code (Optional)
                    </Label>
                    <Input
                      id="swift_code"
                      placeholder="For international transfers"
                      value={bankDetails.swift_code}
                      onChange={(e) => setBankDetails({ ...bankDetails, swift_code: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch_name" className="text-white flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Branch Name
                    </Label>
                    <Input
                      id="branch_name"
                      placeholder="Bank branch location"
                      value={bankDetails.branch_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, branch_name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="upi_id" className="text-white flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      UPI ID (Optional)
                    </Label>
                    <Input
                      id="upi_id"
                      placeholder="e.g., yourname@paytm"
                      value={bankDetails.upi_id}
                      onChange={(e) => setBankDetails({ ...bankDetails, upi_id: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Collection
                  </h4>
                  <p className="text-white/80 text-sm">
                    When payment collection is enabled for an auction, all registration payments will be collected
                    by PowerAuction and transferred to your bank account after the event concludes.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-purple-700 hover:bg-white/90"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : bankDetails.id ? 'Update Bank Details' : 'Save Bank Details'}
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

export default Settings;
