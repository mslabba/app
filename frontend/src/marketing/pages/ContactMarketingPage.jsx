import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { MarketingShell } from '../components/MarketingShell';
import { useReveal } from '../hooks/useReveal';
import Captcha from '../../components/Captcha';

export default function ContactMarketingPage() {
  const rootRef = useRef(null);
  const captchaRef = useRef(null);
  useReveal(rootRef);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    organization: '',
    sport: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Book a Demo — PowerAuction';
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaVerified) {
      setError('Please complete the security verification (CAPTCHA).');
      return;
    }

    setLoading(true);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://power-auction-app-production.up.railway.app';
      
      // Notify backend -> triggers email notification to hello@inraylabs.com
      try {
        await fetch(`${backendUrl}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } catch (err) {
        console.warn('Backend contact notification warning:', err);
      }

      // Also submit to Web3Forms
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: '8083453d-10a9-4fff-804c-f03e42872907',
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          organization: formData.organization,
          sport: formData.sport,
          message: formData.message,
          subject: `Demo request from ${formData.name}${formData.organization ? ` · ${formData.organization}` : ''}`,
        }),
      });

      const result = await response.json();
      if (result.success || response.ok) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again or email us directly.');
      }
    } catch {
      setError('Unable to send right now. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Contact</p>
          <h1 className="pa-h1 pa-mt-sm">Book a demo</h1>
          <p className="pa-lead pa-mt-md">
            Tell us about your league or tournament. We’ll show how PowerAuction handles registration,
            teams, live bidding, and owner dashboards for your format.
          </p>
        </section>

        <section className="pa-section pa-section--tight pa-container">
          <div className="pa-split" style={{ alignItems: 'start' }}>
            <div className="pa-reveal">
              <div className="pa-card pa-card--elevated" style={{ padding: '1.75rem' }}>
                {submitted ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0.5rem' }}>
                    <CheckCircle2 size={40} style={{ color: 'var(--pa-success)', margin: '0 auto 1rem' }} />
                    <h2 className="pa-h3">Request received</h2>
                    <p className="pa-body pa-mt-sm">
                      Thanks — we’ll get back to you shortly to schedule a walkthrough.
                    </p>
                    <Link to="/" className="pa-btn pa-btn--secondary pa-mt-lg">
                      Back to home
                    </Link>
                  </div>
                ) : (
                  <form className="pa-form" onSubmit={handleSubmit}>
                    <div className="pa-field">
                      <label htmlFor="name">Full name</label>
                      <input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                      />
                    </div>
                    <div className="pa-field">
                      <label htmlFor="email">Work email</label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="you@league.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="pa-field">
                      <label htmlFor="mobile">Mobile</label>
                      <input
                        id="mobile"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => handleChange('mobile', e.target.value)}
                        placeholder="+91 …"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="pa-field">
                      <label htmlFor="organization">League / organization</label>
                      <input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => handleChange('organization', e.target.value)}
                        placeholder="e.g. City Premier League"
                      />
                    </div>
                    <div className="pa-field">
                      <label htmlFor="sport">Primary sport</label>
                      <select
                        id="sport"
                        value={formData.sport}
                        onChange={(e) => handleChange('sport', e.target.value)}
                      >
                        <option value="">Select…</option>
                        <option>Cricket</option>
                        <option>Football</option>
                        <option>Futsal</option>
                        <option>Basketball</option>
                        <option>Volleyball</option>
                        <option>Corporate multi-sport</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="pa-field">
                      <label htmlFor="message">What are you planning?</label>
                      <textarea
                        id="message"
                        required
                        value={formData.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        placeholder="Players, teams, auction date, anything we should know…"
                      />
                    </div>
                    <Captcha ref={captchaRef} onVerify={setCaptchaVerified} />
                    {error && (
                      <p style={{ color: '#fca5a5', fontSize: '0.9rem' }} role="alert">
                        {error}
                      </p>
                    )}
                    <button type="submit" className="pa-btn pa-btn--primary pa-btn--lg" disabled={loading || !captchaVerified}>
                      {loading ? 'Sending…' : 'Request demo'}
                      {!loading && <ArrowRight size={18} />}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="pa-reveal pa-reveal-delay-2 pa-stack" style={{ gap: '1.25rem' }}>
              <div className="pa-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <MessageSquare size={22} style={{ color: 'var(--pa-blue-bright)', flexShrink: 0 }} />
                  <div>
                    <h3 className="pa-h3" style={{ fontSize: '1.1rem' }}>What happens on a demo</h3>
                    <p className="pa-body pa-mt-sm" style={{ fontSize: '0.95rem' }}>
                      A focused walkthrough of registration, team purses, live bidding, and owner dashboards —
                      mapped to your league size and rules.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pa-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Mail size={22} style={{ color: 'var(--pa-gold)', flexShrink: 0 }} />
                  <div>
                    <h3 className="pa-h3" style={{ fontSize: '1.1rem' }}>Prefer email?</h3>
                    <p className="pa-body pa-mt-sm" style={{ fontSize: '0.95rem' }}>
                      Use the form and we’ll respond on the address you provide. Existing organizers can also{' '}
                      <Link to="/login" style={{ color: 'var(--pa-blue-bright)' }}>log in</Link> to the platform.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pa-card" style={{ padding: '1.5rem' }}>
                <h3 className="pa-h3" style={{ fontSize: '1.1rem' }}>Useful links</h3>
                <div className="pa-stack" style={{ marginTop: '0.85rem', gap: '0.5rem' }}>
                  <Link to="/how-it-works" style={{ color: 'var(--pa-slate-300)' }}>How it works →</Link>
                  <Link to="/features" style={{ color: 'var(--pa-slate-300)' }}>Features →</Link>
                  <Link to="/pricing" style={{ color: 'var(--pa-slate-300)' }}>Pricing →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
