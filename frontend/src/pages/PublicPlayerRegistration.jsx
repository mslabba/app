import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, User, CheckCircle, ArrowLeft, CreditCard, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploadWithCrop from '@/components/ImageUploadWithCrop';
import DocumentUpload from '@/components/DocumentUpload';
import {
  buildRegistrationPayload,
  describeCondition,
  emptyFormValues,
  enabledFields,
  fieldConditions,
  resolveRegistrationFormConfig,
  validateRegistrationValues,
  COLUMN_KEYS,
  STATS_KEYS,
} from '@/lib/registrationFormConfig';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
const TRAILING_PUNCT = /[.,;:!?)\]]+$/;

// Render one line of organizer text, turning URLs into clickable links.
const renderLineWithLinks = (line, keyPrefix) =>
  line.split(URL_PATTERN).map((part, i) => {
    if (!part) return null;
    if (/^(https?:\/\/|www\.)/.test(part)) {
      const trailing = (part.match(TRAILING_PUNCT) || [''])[0];
      const url = trailing ? part.slice(0, -trailing.length) : part;
      const href = url.startsWith('www.') ? `https://${url}` : url;
      return (
        <span key={`${keyPrefix}-${i}`}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-red-700 underline decoration-red-300 underline-offset-2 break-all hover:text-red-800"
          >
            {url}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });

// Organizer description with its original line breaks preserved:
// blank lines start a new paragraph, single line breaks stay as breaks.
const RichDescription = ({ text }) => {
  const paragraphs = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, pi) => (
        <p key={pi} className="break-words">
          {paragraph.split('\n').map((line, li, lines) => (
            <span key={li}>
              {renderLineWithLinks(line, `${pi}-${li}`)}
              {li < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
};

const PublicPlayerRegistration = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [registrationInfo, setRegistrationInfo] = useState(null);
  const [formData, setFormData] = useState(() => emptyFormValues(resolveRegistrationFormConfig(null)));

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

    // Check if returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      console.log('Detected payment return. Order ID:', orderId);
      setLoading(true); // Show loading overlay immediately

      // Restore form data from sessionStorage
      const savedFormData = sessionStorage.getItem(`registration_form_${eventId}`);
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
        console.log('Restored form data:', parsedData);

        // Auto-complete registration with the restored form data
        setTimeout(() => {
          verifyAndCompleteRegistration(orderId, parsedData);
        }, 500);
      } else {
        console.error('No saved form data found');
        toast.error('Registration data not found. Please fill the form again.');
        setLoading(false);
      }
    }
  }, [eventId]);

  // Browser tab title shows the event name. (Share previews are a separate
  // mechanism — see scripts/generate-event-pages.js — because preview
  // crawlers do not run JavaScript.)
  useEffect(() => {
    if (event?.name) {
      document.title = `${event.name} — Player Registration | PowerAuction`;
    }
  }, [event]);

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
      const cfg = resolveRegistrationFormConfig(response.data);
      setFormConfig(cfg);
      // Preserve restored payment form data if present
      setFormData((prev) => {
        const base = emptyFormValues(cfg);
        const hasValues = prev?.name || prev?.contact_number;
        if (!hasValues) return base;
        return {
          ...base,
          ...prev,
          stats: { ...base.stats, ...(prev.stats || {}) },
          extra_fields: { ...base.extra_fields, ...(prev.extra_fields || {}) },
        };
      });

      // Fetch registration count
      try {
        const countResponse = await axios.get(`${API}/auctions/${eventId}/registration-count`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        setRegistrationInfo(countResponse.data);
      } catch (countError) {
        console.error('Failed to fetch registration count:', countError);
      }
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

  const activeFields = useMemo(
    () => enabledFields(formConfig || resolveRegistrationFormConfig(event)),
    [formConfig, event]
  );

  const handleChange = (fieldKey, value) => {
    if (STATS_KEYS.has(fieldKey)) {
      setFormData((prev) => ({
        ...prev,
        stats: { ...(prev.stats || {}), [fieldKey]: value },
      }));
      return;
    }
    if (COLUMN_KEYS.has(fieldKey)) {
      setFormData((prev) => ({ ...prev, [fieldKey]: value }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      extra_fields: { ...(prev.extra_fields || {}), [fieldKey]: value },
    }));
  };

  const getFieldValue = (fieldKey) => {
    if (STATS_KEYS.has(fieldKey)) return formData.stats?.[fieldKey] ?? '';
    if (COLUMN_KEYS.has(fieldKey)) return formData[fieldKey] ?? '';
    return formData.extra_fields?.[fieldKey] ?? '';
  };

  const renderField = (field) => {
    const label = `${field.label}${field.required ? ' *' : ''}`;
    const value = getFieldValue(field.key);
    const commonClass = 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

    if (field.type === 'image') {
      return (
        <div key={field.id} className="md:col-span-2">
          <ImageUploadWithCrop
            label={label}
            value={value}
            onChange={(url) => handleChange(field.key, url)}
            placeholder={field.placeholder || 'Upload image or enter URL'}
            sampleType={{ type: 'players', subtype: 'photos' }}
            enableCrop={true}
            cropAspect={1}
            required={!!field.required}
          />
        </div>
      );
    }
    if (field.type === 'file') {
      return (
        <div key={field.id} className="md:col-span-2">
          <DocumentUpload
            label={label}
            value={value}
            onChange={(url) => handleChange(field.key, url)}
            placeholder={field.placeholder || 'Upload file (image or PDF) or enter URL'}
            accept="image/*,application/pdf"
            maxSize={10 * 1024 * 1024}
          />
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="md:col-span-2">
          <Label className="text-gray-700">{label}</Label>
          <Textarea
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={!!field.required}
            className={commonClass}
            rows={3}
          />
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <div key={field.id}>
          <Label className="text-gray-700">{label}</Label>
          <Select value={value || undefined} onValueChange={(v) => handleChange(field.key, v)}>
            <SelectTrigger className={commonClass}>
              <SelectValue placeholder={field.placeholder || 'Select…'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    const inputType =
      field.type === 'number'
        ? 'number'
        : field.type === 'email'
          ? 'email'
          : field.type === 'tel'
            ? 'tel'
            : field.type === 'date'
              ? 'date'
              : 'text';

    const hints = fieldConditions(field).map((c) => describeCondition(field, c));

    return (
      <div key={field.id}>
        <Label className="text-gray-700">{label}</Label>
        <Input
          type={inputType}
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          placeholder={field.placeholder || ''}
          required={!!field.required}
          className={commonClass}
        />
        {hints.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">{hints.join(' · ')}</p>
        )}
      </div>
    );
  };

  const initiateCashfreePayment = async () => {
    try {
      setPaymentLoading(true);

      const cfg = formConfig || resolveRegistrationFormConfig(event);
      const err = validateRegistrationValues(formData, cfg);
      if (err) {
        toast.error(err);
        setPaymentLoading(false);
        return;
      }

      // Cashfree typically needs an email — use form email or a placeholder
      const emailForPayment =
        (formData.email || '').trim() ||
        `player+${(formData.contact_number || 'guest').replace(/\D/g, '')}@thepowerauction.com`;

      // Save form data to sessionStorage before redirecting to payment
      sessionStorage.setItem(`registration_form_${eventId}`, JSON.stringify(formData));
      console.log('Saved form data to sessionStorage');

      // Create payment order
      const orderResponse = await axios.post(`${API}/payments/create-order`, {
        event_id: eventId,
        customer_name: formData.name.trim(),
        customer_email: emailForPayment,
        customer_phone: formData.contact_number.trim(),
        amount: event.payment_settings.registration_fee
      });

      const { order_id, payment_session_id } = orderResponse.data;
      setPaymentOrderId(order_id);

      // Initialize Cashfree SDK
      const cashfree = window.Cashfree({
        mode: 'production' // Use production mode for live payments
      });

      // Open checkout
      const checkoutOptions = {
        paymentSessionId: payment_session_id,
        returnUrl: `${window.location.origin}/auctions/${eventId}/register?payment=success&order_id=${order_id}`,
      };

      cashfree.checkout(checkoutOptions).then((result) => {
        if (result.error) {
          toast.error('Payment failed. Please try again.');
          setPaymentLoading(false);
        }
        if (result.redirect) {
          // Payment successful - will redirect
          console.log('Payment redirect initiated');
        }
      });
    } catch (error) {
      console.error('Payment initiation failed:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to initiate payment';
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      toast.error(errorMessage);
      setPaymentLoading(false);
    }
  };

  const verifyAndCompleteRegistration = async (orderId, savedFormData = null) => {
    try {
      setLoading(true);

      // Use saved form data if provided, otherwise use current state
      const dataToUse = savedFormData || formData;
      console.log('Using form data for registration:', dataToUse);

      // Verify payment
      const verifyResponse = await axios.post(`${API}/payments/verify`, {
        order_id: orderId,
        event_id: eventId
      });

      if (verifyResponse.data.payment_status !== 'PAID' && verifyResponse.data.payment_status !== 'SUCCESS') {
        toast.error('Payment verification failed. Please contact support.');
        setLoading(false);
        return;
      }

      const cfg = formConfig || resolveRegistrationFormConfig(event);
      const registrationData = {
        ...buildRegistrationPayload(dataToUse, cfg),
        payment_order_id: orderId,
      };

      console.log('Sending registration request:', registrationData);
      await axios.post(`${API}/auctions/${eventId}/register-player`, registrationData);

      // Clear saved form data
      sessionStorage.removeItem(`registration_form_${eventId}`);

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      toast.success('Registration completed successfully!');
      setSubmitted(true);
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cfg = formConfig || resolveRegistrationFormConfig(event);
    const validationError = validateRegistrationValues(formData, cfg);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check if payment is required
    if (event?.payment_settings?.collect_payment) {
      // Initiate payment - form data will be saved and restored after payment
      await initiateCashfreePayment();
    } else {
      // No payment required - direct registration
      try {
        setLoading(true);

        const registrationData = buildRegistrationPayload(formData, cfg);

        console.log('Sending non-payment registration request:', registrationData);
        await axios.post(`${API}/auctions/${eventId}/register-player`, registrationData);

        toast.success('Registration submitted successfully!');
        setSubmitted(true);
      } catch (error) {
        console.error('Registration failed:', error);
        toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
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
    <div className="min-h-screen app-bg relative">
      {/* Loading Overlay for Payment Verification */}
      {loading && !submitted && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Payment</h3>
            <p className="text-gray-600 text-sm">
              Verifying your payment and completing registration...
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Event hero: banner, logo, event name and organizer description */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden mb-6 sm:mb-8">
          {event?.banner_url && (
            <div className="bg-neutral-950 flex justify-center">
              <img
                src={event.banner_url}
                alt={`${event.name} banner`}
                className="w-auto max-w-full h-auto max-h-[300px] sm:max-h-[420px] object-contain"
              />
            </div>
          )}
          <div className="px-5 sm:px-8 pb-6 sm:pb-8 text-center">
            <div
              className={`flex justify-center ${
                event?.banner_url ? '-mt-10 sm:-mt-12 relative' : 'pt-6 sm:pt-8'
              }`}
            >
              {event?.logo_url ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3">
                  <img
                    src={event.logo_url}
                    alt={`${event.name} logo`}
                    className="h-16 sm:h-20 w-auto max-w-[220px] object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-lg flex items-center justify-center">
                  <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              )}
            </div>
            {event?.name && (
              <p className="mt-4 text-[11px] sm:text-xs font-bold tracking-[0.2em] text-red-700 uppercase">
                Player Registration
              </p>
            )}
            <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 break-words">
              {event ? event.name : 'Player Registration'}
            </h1>
            {event?.description && (
              <div className="mt-5 text-left bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 sm:px-6 sm:py-5 text-[15px] leading-relaxed text-gray-700">
                <RichDescription text={event.description} />
              </div>
            )}
          </div>
        </div>

        {/* Registration Closed Message */}
        {registrationInfo?.has_limit && registrationInfo?.slots_remaining !== null && registrationInfo.slots_remaining <= 0 && (
          <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm border-red-300 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Closed</h2>
              <p className="text-gray-600 mb-2">
                The maximum number of registrations ({registrationInfo.limit}) has been reached for this event.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Please contact the event organizer for more information.
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
        )}

        {/* Registration Form - only show if registration is open */}
        {(!registrationInfo?.has_limit || (registrationInfo?.slots_remaining !== null && registrationInfo.slots_remaining > 0)) && (
          <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm border-white/30 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-gray-800 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Player Registration
                </span>
                {registrationInfo?.has_limit && registrationInfo?.slots_remaining !== null && (
                  <span className="flex items-center text-sm font-normal bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 mr-1" />
                    {registrationInfo.slots_remaining} slots remaining
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Info Banner */}
              {event?.payment_settings?.collect_payment && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <CreditCard className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          Registration Fee Required
                        </h4>
                        <p className="text-gray-700 text-sm mt-1">
                          This event requires a registration fee to participate
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center sm:text-right border-t border-green-200 sm:border-0 pt-3 sm:pt-0">
                      <div className="text-3xl font-bold text-green-600">
                        ₹{Number(event.payment_settings.registration_fee || 0).toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">One-time payment</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-blue-100 border border-blue-300 rounded p-3">
                    <p className="text-xs text-gray-700">
                      💳 <strong>Secure Payment:</strong> Payment will be processed securely via Cashfree Payment Gateway.
                      You'll be redirected to complete the payment after filling the form.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Your details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeFields.map((field) => renderField(field))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <Button
                    type="submit"
                    disabled={loading || paymentLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-medium"
                  >
                    {loading ? 'Submitting...' :
                      paymentLoading ? 'Processing Payment...' :
                        event?.payment_settings?.collect_payment ?
                          `Proceed to Pay ₹${event.payment_settings.registration_fee}` :
                          'Submit Registration'}
                  </Button>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  * Required fields. Your registration will be reviewed by the organizer.
                  {event?.payment_settings?.collect_payment && (
                    <><br />You will be redirected to a secure payment gateway to complete the registration fee.</>
                  )}
                </p>
              </form>
            </CardContent>
          </Card>
        )}

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
