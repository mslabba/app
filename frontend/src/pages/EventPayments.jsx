import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, TrendingUp, CreditCard, Clock, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EventPayments = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (token && eventId) {
      fetchPayments();
    }
  }, [token, eventId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/auctions/${eventId}/payments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPaymentData(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PAID': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Paid' },
      'SUCCESS': { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Success' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: 'Pending' },
      'FAILED': { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, label: 'Failed' },
      'CANCELLED': { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle, label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig['PENDING'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading payment data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <div className="container mx-auto px-6 py-8">
          <Card className="glass border-white/20">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">No payment data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { event_name, payments, statistics } = paymentData;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/admin/events">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Payment Tracking</h1>
          <p className="text-white/80">{event_name}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(statistics.total_amount)}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Successful</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {statistics.successful_payments}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {statistics.pending_payments}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Payments</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {statistics.total_payments}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-16 h-16 mx-auto text-white/30 mb-4" />
                <p className="text-white/70">No payments received yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Order ID</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Player Name</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Phone</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-white/90 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white/80 text-sm font-mono">
                          {payment.order_id?.substring(0, 20)}...
                        </td>
                        <td className="py-3 px-4 text-white/80">{payment.customer_name}</td>
                        <td className="py-3 px-4 text-white/80 text-sm">{payment.customer_email}</td>
                        <td className="py-3 px-4 text-white/80 text-sm">{payment.customer_phone}</td>
                        <td className="py-3 px-4 text-white font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {formatDate(payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventPayments;
