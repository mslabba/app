import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { MarketingShell } from '../components/MarketingShell';
import { useReveal } from '../hooks/useReveal';

const PLANS = [
  {
    name: 'League',
    blurb: 'For organizers running a single tournament or season auction.',
    price: 'Custom',
    cta: 'Talk to us',
    featured: false,
    features: [
      'One auction event setup',
      'Player registration & payments',
      'Team & purse management',
      'Live auction & safe bidding',
      'Team owner dashboards',
      'Core analytics',
      'Email support',
    ],
  },
  {
    name: 'Series',
    blurb: 'For federations and operators running multiple events or sports.',
    price: 'Custom',
    cta: 'Book a Demo',
    featured: true,
    features: [
      'Multiple events & sports',
      'Everything in League',
      'Advanced categories & sponsors',
      'Priority onboarding',
      'Operator training session',
      'Enhanced analytics',
      'Priority support',
    ],
  },
];

export default function PricingPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Pricing — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Pricing</p>
          <h1 className="pa-h1 pa-mt-sm">Pricing that matches your league</h1>
          <p className="pa-lead pa-mt-md">
            PowerAuction is scoped to your event size, sports, and operational needs. Book a demo for a
            clear proposal — no invented public price list.
          </p>
        </section>

        <section className="pa-section pa-section--tight pa-container">
          <div className="pa-pricing-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`pa-price-card pa-reveal ${plan.featured ? 'pa-price-card--featured' : ''}`}
              >
                {plan.featured && (
                  <span className="pa-badge" style={{ alignSelf: 'flex-start', marginBottom: '0.75rem' }}>
                    Most popular for series
                  </span>
                )}
                <h2 className="pa-h3">{plan.name}</h2>
                <p className="pa-muted" style={{ fontSize: '0.95rem', marginTop: '0.35rem' }}>{plan.blurb}</p>
                <div className="pa-price-card__price">{plan.price}</div>
                <p className="pa-muted" style={{ fontSize: '0.85rem' }}>Tailored to your auction</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={16} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className={`pa-btn ${plan.featured ? 'pa-btn--primary' : 'pa-btn--secondary'}`}
                  style={{ width: '100%' }}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
          <p className="pa-center pa-muted pa-mt-lg pa-reveal" style={{ fontSize: '0.9rem' }}>
            Need a one-off corporate tournament or a multi-city series? We’ll quote based on players, teams, and support level.
          </p>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">Get a proposal for your next auction</h2>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--gold pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/features" className="pa-btn pa-btn--secondary pa-btn--lg">See features</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
