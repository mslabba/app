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
import { Trophy, User, CheckCircle, ArrowLeft, CreditCard, Users, XCircle, Calendar, Clock, MapPin } from 'lucide-react';
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
  KERALA_DISTRICTS,
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

// ---- Registration ticket (success screen) ----

// sessionStorage key for the ticket snapshot, so a page refresh after
// payment returns still shows the ticket. Display-only: the snapshot
// holds the player's own submitted details + registration id; it never
// authorises anything.
const ticketStorageKey = (eventId) => `powerauction:ticket:${eventId}`;

const initialsFor = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PA';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
};

const formatEventDate = (date) => {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// Player photo with an initials fallback — the photo is optional (and
// form-config dependent), so a missing or broken URL must never render
// a broken image.
const TicketPhoto = ({ photoUrl, name }) => {
  const [failed, setFailed] = useState(false);
  if (!photoUrl || failed) {
    return (
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0">
        <span className="text-2xl sm:text-3xl font-bold text-white">{initialsFor(name)}</span>
      </div>
    );
  }
  return (
    <img
      src={photoUrl}
      alt={`${name || 'Player'} photo`}
      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border-2 border-red-100"
      onError={() => setFailed(true)}
    />
  );
};

// Normalise a ticket from whatever the completion path hands us.
// playerValues is either the in-memory form values (same-session paths)
// or the payload the server saved at order creation (gateway return).
// payment.kind is 'free' | 'paid' | 'voucher' — 'voucher' only when the
// data actually carries a voucher code (a later voucher feature); it is
// never invented here.
const buildTicket = ({ registrationId, playerValues, payment, eventSnapshot }) => {
  const values = playerValues || {};
  const voucherCode = values.voucher_code || payment?.voucherCode || null;
  return {
    registrationId: registrationId || null,
    player: {
      name: values.name || '',
      photo_url: values.photo_url || null,
      position: values.position || null,
      district: values.district || null,
      contact_number: values.contact_number || null,
    },
    payment: {
      kind: voucherCode ? 'voucher' : payment?.kind || 'free',
      amount: payment?.amount ?? null,
      voucherCode,
      orderId: payment?.orderId || null,
    },
    event: eventSnapshot || null,
  };
};

// Ticket header brand — the organizer comes first: organizer logo →
// event logo → PowerAuction logo. The title next to the logo is the
// organizer name whenever an organizer/event logo is shown; only the pure
// fallback (neither logo set) shows the PowerAuction logo + wordmark.
// A logo that fails to load steps down to the next one in the chain.
const TicketHeaderBrand = ({ ev }) => {
  const sources = [ev.organizer_logo_url, ev.logo_url, '/images/sports/logo-final.png'].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (!src) return null;
  const isPowerAuction = src === '/images/sports/logo-final.png';
  return (
    <>
      <img
        src={src}
        alt={isPowerAuction ? 'PowerAuction' : `${ev.organizer_name || 'Organizer'} logo`}
        className="h-8 w-auto max-w-[180px] object-contain"
        onError={() => setIdx((i) => i + 1)}
      />
      {isPowerAuction ? (
        <span className="text-lg font-bold text-white whitespace-nowrap">
          Power<span className="text-red-500">Auction</span>
        </span>
      ) : (
        <span className="text-lg font-bold text-white whitespace-nowrap truncate max-w-[220px]">
          {ev.organizer_name || ev.name}
        </span>
      )}
    </>
  );
};

const RegistrationTicket = ({ ticket, event, onRegisterAnother }) => {
  // Prefer the live event (fresh fetch) over the snapshot stored with
  // the ticket — the snapshot is only a fallback for a restored ticket.
  const ev = event || ticket.event || {};
  const { player, payment } = ticket;
  const formattedDate = formatEventDate(ev.date);

  let paymentLabel = 'Free';
  if (payment.kind === 'paid') {
    paymentLabel = payment.amount != null
      ? `Paid ₹${Number(payment.amount).toLocaleString('en-IN')}`
      : 'Paid';
  } else if (payment.kind === 'voucher') {
    paymentLabel = payment.amount != null && Number(payment.amount) > 0
      ? `Paid ₹${Number(payment.amount).toLocaleString('en-IN')} (Voucher)`
      : 'Free with voucher';
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Success heading */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Registration Successful!</h2>
        <p className="text-white/80 text-sm mt-1">Your registration ticket is below.</p>
      </div>

      {/* Ticket card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden text-left">
        {/* Brand header — organizer first; PowerAuction only as the fallback */}
        <div className="bg-neutral-950 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TicketHeaderBrand key={[ev.organizer_logo_url, ev.logo_url].join('|')} ev={ev} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase whitespace-nowrap">
            Registration ticket
          </span>
        </div>
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-700" />

        {/* Event banner */}
        {ev.banner_url && (
          <img src={ev.banner_url} alt="" className="w-full h-28 object-cover" />
        )}

        {/* Player section */}
        <div className="px-5 pt-5 pb-4 flex gap-4 items-center">
          <TicketPhoto photoUrl={player.photo_url} name={player.name} />
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.2em] text-red-700 uppercase">Player</p>
            <h3 className="text-xl font-bold text-gray-900 truncate">{player.name || 'Player'}</h3>
            <p className="text-sm text-gray-600 mt-0.5 break-words">
              {[player.position, player.district].filter(Boolean).join(' · ') || 'Registered player'}
            </p>
          </div>
        </div>

        {/* Perforation divider */}
        <div className="px-5">
          <div className="border-t-2 border-dashed border-gray-300" />
        </div>

        {/* Event section */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Trophy className="w-4 h-4 text-red-600 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Event</p>
              <p className="font-semibold text-gray-900 break-words">{ev.name || 'PowerAuction event'}</p>
            </div>
          </div>
          {formattedDate && (
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-red-600 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Date</p>
                <p className="font-semibold text-gray-900">{formattedDate}</p>
              </div>
            </div>
          )}
          {ev.organizer_name && (
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-red-600 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Organizer</p>
                <p className="font-semibold text-gray-900 break-words">{ev.organizer_name}</p>
              </div>
            </div>
          )}
          {ev.venue && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-red-600 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Venue</p>
                <p className="font-semibold text-gray-900 break-words">{ev.venue}</p>
              </div>
            </div>
          )}
        </div>

        {/* Registration details */}
        <div className="mx-5 mb-1 grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Registration ID</p>
            <p className="font-mono text-xs text-gray-900 break-all mt-0.5">{ticket.registrationId || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Payment</p>
            <p className="font-semibold text-gray-900 mt-0.5 break-words">{paymentLabel}</p>
          </div>
        </div>

        {/* Powered-by footer — the ticket is the organizer's; PowerAuction is the technology provider */}
        <div className="mt-4 border-t border-gray-200 px-5 py-3 flex items-center justify-center gap-2">
          <img
            src="/images/sports/logo-final.png"
            alt="PowerAuction"
            className="h-4 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="text-xs text-gray-500">Powered by PowerAuction</span>
        </div>
      </div>

      {/* Pending-approval note — a status message about the registration, not part of the ticket */}
      <div className="mt-4">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Pending organizer approval.</strong> Your registration has been received — the
            organizer will review your application and get back to you soon.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <button
          type="button"
          onClick={onRegisterAnother}
          className="text-white/80 hover:text-white text-sm font-medium underline underline-offset-4"
        >
          Register another player
        </button>
      </div>
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
  // Voucher code applied by the player (validated server-side; the discount
  // is never trusted from the client — the server re-validates the code and
  // computes the amount at submit time).
  const [voucherCode, setVoucherCode] = useState('');
  const [voucher, setVoucher] = useState(null); // { code, type, value, amount_due, message } | null
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [formData, setFormData] = useState(() => emptyFormValues(resolveRegistrationFormConfig(null)));

  // Event details embedded in the ticket snapshot, so a restored ticket
  // still names the event even before the live event fetch completes.
  const eventSnapshot = () => ({
    name: event?.name || null,
    date: event?.date || null,
    logo_url: event?.logo_url || null,
    organizer_logo_url: event?.organizer_logo_url || null,
    banner_url: event?.banner_url || null,
    organizer_name: event?.organizer_name || null,
    venue: event?.venue || null,
  });

  const persistTicket = (nextTicket) => {
    try {
      sessionStorage.setItem(ticketStorageKey(eventId), JSON.stringify(nextTicket));
    } catch (e) {
      // Storage unavailable (private mode, quota) — the ticket still shows
      // for this session; only a refresh loses it.
    }
  };

  const handleRegisterAnother = () => {
    try {
      sessionStorage.removeItem(ticketStorageKey(eventId));
    } catch (e) {
      // Ignore storage errors — the form resets regardless.
    }
    setTicket(null);
    setSubmitted(false);
    setPaymentOrderId(null);
    setFormData(emptyFormValues(formConfig || resolveRegistrationFormConfig(event)));
  };

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

    // Restore a completed ticket after a refresh (display-only snapshot).
    // A payment return below overwrites it with fresh server data.
    try {
      const saved = sessionStorage.getItem(ticketStorageKey(eventId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.registrationId) {
          setTicket(parsed);
          setSubmitted(true);
        }
      }
    } catch (e) {
      // Corrupted snapshot — ignore and show the form.
    }

    // Check if returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      console.log('Detected payment return. Order ID:', orderId);
      setLoading(true); // Show loading overlay immediately
      // The server holds the form payload saved at order creation, so the
      // return no longer depends on this browser's session storage.
      verifyAndCompleteRegistration(orderId);
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

    // District is a combobox: Kerala districts as suggestions, free text
    // still allowed so non-Kerala leagues are not blocked. The stored
    // value stays a plain district string.
    if (field.key === 'district') {
      const hints = fieldConditions(field).map((c) => describeCondition(field, c));
      return (
        <div key={field.id}>
          <Label className="text-gray-700">{label}</Label>
          <Input
            type="text"
            list="kerala-districts"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || 'District'}
            required={!!field.required}
            className={commonClass}
          />
          <datalist id="kerala-districts">
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          {hints.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">{hints.join(' · ')}</p>
          )}
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

  const registrationFee = Number(event?.payment_settings?.registration_fee || 0);
  // Server-validated voucher preview: amount_due comes from the server.
  // The code is always re-sent at submit time and the server decides the
  // amount — a preview is never trusted to skip payment.
  const appliedVoucher = voucher?.valid ? voucher : null;
  const amountDue = appliedVoucher
    ? Number(appliedVoucher.amount_due ?? registrationFee)
    : registrationFee;
  const isFreeWithVoucher = !!appliedVoucher && amountDue === 0;

  const applyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError('Enter a voucher code first.');
      return;
    }
    setVoucherApplying(true);
    setVoucherError('');
    try {
      const { data } = await axios.post(`${API}/auctions/${eventId}/vouchers/validate`, {
        code,
      });
      if (data?.valid) {
        setVoucher({ ...data, code });
        setVoucherCode(code);
        toast.success(
          Number(data.amount_due) === 0
            ? 'Voucher applied — registration is free.'
            : `Voucher applied — you pay ₹${Number(data.amount_due).toLocaleString('en-IN')} instead of ₹${registrationFee.toLocaleString('en-IN')}.`
        );
      } else {
        setVoucher(null);
        setVoucherError(data?.message || 'This voucher code is not valid for this event.');
      }
    } catch (error) {
      setVoucher(null);
      setVoucherError(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          'Could not check this voucher code. You can still pay the full fee.'
      );
    } finally {
      setVoucherApplying(false);
    }
  };

  const clearVoucher = () => {
    setVoucher(null);
    setVoucherCode('');
    setVoucherError('');
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

      // Send the full registration payload with the order, so the server can
      // complete the registration even if the player never returns from the
      // gateway (UPI app-switch is the common case).
      const registrationPayload = buildRegistrationPayload(formData, cfg);
      // The client-sent amount is ignored server-side (the fee is read from
      // the event); likewise the voucher discount is computed server-side
      // from the stored voucher — the code is sent, never a client amount.
      const orderResponse = await axios.post(`${API}/payments/create-order`, {
        event_id: eventId,
        customer_name: formData.name.trim(),
        customer_email: emailForPayment,
        customer_phone: formData.contact_number.trim(),
        amount: event.payment_settings.registration_fee,
        ...(appliedVoucher ? { voucher_code: appliedVoucher.code } : {}),
        form_data: registrationPayload
      });

      // Player already paid for this event (paid, never returned, retried):
      // the server completed the registration from the saved payload.
      if (orderResponse.data.already_paid) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const nextTicket = buildTicket({
          registrationId: orderResponse.data.registration_id,
          playerValues: formData,
          payment: {
            kind: 'paid',
            amount: orderResponse.data.order_amount ?? event.payment_settings.registration_fee,
            orderId: orderResponse.data.order_id,
            voucherCode: appliedVoucher?.code || null,
          },
          eventSnapshot: eventSnapshot(),
        });
        setTicket(nextTicket);
        persistTicket(nextTicket);
        toast.success('Registration completed successfully!');
        setSubmitted(true);
        setPaymentLoading(false);
        return;
      }

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

  // The server completes the registration from the payload saved at order
  // creation (verify does it, the webhook does it too) — the return no
  // longer posts the registration from this browser's state.
  const verifyAndCompleteRegistration = async (orderId) => {
    try {
      setLoading(true);

      // Verify payment (server also completes the registration from the
      // saved payload when the payment is PAID).
      const verifyResponse = await axios.post(`${API}/payments/verify`, {
        order_id: orderId,
        event_id: eventId
      });

      const { payment_status, registration_completed, registration_id, order_amount, form_data, voucher_code } = verifyResponse.data;

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      if (payment_status !== 'PAID' && payment_status !== 'SUCCESS') {
        // Payment still processing at the gateway — the webhook (or a later
        // organizer sync) will complete the registration automatically.
        toast.info('Payment is still processing. Your registration will be confirmed automatically once the payment completes.');
        setLoading(false);
        return;
      }

      if (registration_completed) {
        // A fresh page load holds no form state, so the player details for
        // the ticket come from the payload the server saved at order
        // creation (returned by /payments/verify).
        const nextTicket = buildTicket({
          registrationId: registration_id,
          playerValues: form_data || {},
          payment: {
            kind: 'paid',
            amount: order_amount,
            orderId: orderId,
            voucherCode: voucher_code || form_data?.voucher_code || null,
          },
          eventSnapshot: eventSnapshot(),
        });
        setTicket(nextTicket);
        persistTicket(nextTicket);
        toast.success('Registration completed successfully!');
        setSubmitted(true);
      } else {
        // Paid, but the server holds no saved form payload (orders created
        // before this fix). No re-payment: the organizer completes it from
        // the payment record.
        toast.info('Payment received. Please contact the organizer to complete your registration.');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct registration with no Cashfree step: used when no payment is
  // collected, and when a full voucher makes the amount due ₹0. The
  // voucher code (if any) is sent so the server can re-validate it and
  // consume one use atomically with the registration.
  const submitDirectRegistration = async (voucherCodeToSend) => {
    try {
      setLoading(true);

      const registrationData = buildRegistrationPayload(formData, formConfig || resolveRegistrationFormConfig(event));
      if (voucherCodeToSend) registrationData.voucher_code = voucherCodeToSend;

      console.log('Sending direct registration request:', registrationData);
      const registerResponse = await axios.post(`${API}/auctions/${eventId}/register-player`, registrationData);

      const nextTicket = buildTicket({
        registrationId: registerResponse.data?.registration_id,
        playerValues: formData,
        payment: voucherCodeToSend
          ? { kind: 'voucher', amount: 0, voucherCode: voucherCodeToSend }
          : { kind: 'free', amount: 0 },
        eventSnapshot: eventSnapshot(),
      });
      setTicket(nextTicket);
      persistTicket(nextTicket);
      toast.success('Registration submitted successfully!');
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
      if (isFreeWithVoucher) {
        // Full voucher: nothing to pay — register directly, no Cashfree step.
        await submitDirectRegistration(appliedVoucher.code);
        return;
      }
      // Partial voucher (or none): pay the discounted amount via Cashfree.
      await initiateCashfreePayment();
    } else {
      // No payment required - direct registration
      await submitDirectRegistration(null);
    }
  };

  if (submitted) {
    // Defensive fallback: every completion path sets a ticket, but if one
    // ever lands here without it, keep the plain success message rather
    // than a blank screen.
    if (!ticket) {
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
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="container mx-auto px-6 py-8">
          <RegistrationTicket ticket={ticket} event={event} onRegisterAnother={handleRegisterAnother} />
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
                      {appliedVoucher ? (
                        <>
                          <div className="text-lg font-semibold text-gray-500 line-through">
                            ₹{registrationFee.toLocaleString('en-IN')}
                          </div>
                          {isFreeWithVoucher ? (
                            <div className="text-3xl font-bold text-green-600">Free with voucher</div>
                          ) : (
                            <div className="text-3xl font-bold text-green-600">
                              ₹{amountDue.toLocaleString('en-IN')}
                            </div>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            Voucher {appliedVoucher.code} applied
                            {appliedVoucher.type === 'percent' && appliedVoucher.value != null
                              ? ` (${appliedVoucher.value}% off)`
                              : appliedVoucher.type === 'fixed' && appliedVoucher.value != null
                                ? ` (₹${Number(appliedVoucher.value).toLocaleString('en-IN')} off)`
                                : ''}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-bold text-green-600">
                            ₹{registrationFee.toLocaleString('en-IN')}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">One-time payment</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 bg-blue-100 border border-blue-300 rounded p-3">
                    <p className="text-xs text-gray-700">
                      💳 <strong>Secure Payment:</strong> Payment will be processed securely via Cashfree Payment Gateway.
                      You'll be redirected to complete the payment after filling the form.
                    </p>
                  </div>
                  {/* Voucher code — preview only; the server re-validates the
                      code and computes the amount when the form is submitted. */}
                  <div className="mt-3">
                    {appliedVoucher ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-green-700">
                          ✓ Voucher <span className="font-mono font-semibold">{appliedVoucher.code}</span> applied
                          {isFreeWithVoucher
                            ? ' — no payment needed.'
                            : ` — you pay ₹${amountDue.toLocaleString('en-IN')}.`}
                        </p>
                        <button
                          type="button"
                          onClick={clearVoucher}
                          className="text-sm font-medium text-gray-600 underline hover:text-gray-800"
                        >
                          Remove voucher
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={voucherCode}
                            onChange={(e) => {
                              setVoucherCode(e.target.value.toUpperCase());
                              setVoucherError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                applyVoucher();
                              }
                            }}
                            placeholder="Have a voucher code? Enter it here"
                            className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 uppercase"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={applyVoucher}
                            disabled={voucherApplying || !voucherCode.trim()}
                            className="shrink-0 border-green-600 text-green-700 hover:bg-green-50"
                          >
                            {voucherApplying ? 'Checking…' : 'Apply'}
                          </Button>
                        </div>
                        {voucherError && (
                          <p className="mt-2 text-sm text-red-600">
                            {voucherError} You can still pay the full fee of ₹{registrationFee.toLocaleString('en-IN')}.
                          </p>
                        )}
                      </>
                    )}
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
                          isFreeWithVoucher ?
                            'Submit Registration' :
                            `Proceed to Pay ₹${amountDue.toLocaleString('en-IN')}` :
                          'Submit Registration'}
                  </Button>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  * Required fields. Your registration will be reviewed by the organizer.
                  {event?.payment_settings?.collect_payment && !isFreeWithVoucher && (
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
