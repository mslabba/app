import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import {
  PlayerManagementMock,
  TeamManagementMock,
  LiveAuctionMock,
  AnalyticsMock,
  RegistrationMock,
} from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

const GROUPS = [
  {
    title: 'Registration & payments',
    items: [
      'Public registration links',
      'Custom form fields per league',
      'WhatsApp, email, and social distribution',
      'Optional registration fees',
      'Payment status tracking',
      'Approval workflow',
    ],
    to: '/player-registration',
  },
  {
    title: 'Players & categories',
    items: [
      'Central player database',
      'Search and filters',
      'Configurable categories',
      'Stats and profiles',
      'Payment and approval status',
      'Bulk-friendly management',
    ],
    to: '/features',
  },
  {
    title: 'Teams & purses',
    items: [
      'Team creation and logos',
      'Owner assignment',
      'Purse allocation',
      'Squad size tracking',
      'Spend and remaining budget',
      'Sponsor association',
    ],
    to: '/team-management',
  },
  {
    title: 'Live auction',
    items: [
      'Player cards with statistics',
      'Base price and current bid',
      'Countdown control',
      'Spin / random next player',
      'Safe bidding for owners',
      'Real-time team indicators',
    ],
    to: '/live-auction',
  },
  {
    title: 'Owner & operator views',
    items: [
      'Secure team dashboard links',
      'Live purse and squad',
      'Organizer control room',
      'Auction status monitoring',
      'Sold player tracking',
      'Display-ready layouts',
    ],
    to: '/auction-dashboard',
  },
  {
    title: 'Analytics & sponsors',
    items: [
      'Registration and bid metrics',
      'Team spending comparison',
      'Average and highest prices',
      'Sponsor logo management',
      'On-screen branding',
      'Post-event visibility',
    ],
    to: '/auction-dashboard',
  },
];

export default function FeaturesPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Features — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Product features</p>
          <h1 className="pa-h1 pa-mt-sm">The complete sports auction toolkit</h1>
          <p className="pa-lead pa-mt-md">
            Every capability league organizers need to register players, build teams, run live bidding,
            and report results — without bolting tools together.
          </p>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">
              Book a Demo <ArrowRight size={18} />
            </Link>
            <Link to="/how-it-works" className="pa-btn pa-btn--secondary pa-btn--lg">
              How it works
            </Link>
          </div>
        </section>

        <section className="pa-section pa-section--tight pa-container">
          <div className="pa-feature-grid">
            {GROUPS.map((g, i) => (
              <article key={g.title} className={`pa-feature-card pa-reveal pa-reveal-delay-${(i % 3) + 1}`}>
                <h3>{g.title}</h3>
                <ul className="pa-list" style={{ marginTop: '0.85rem' }}>
                  {g.items.map((item) => (
                    <li key={item} style={{ fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--pa-blue-bright)' }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to={g.to} className="pa-btn pa-btn--ghost pa-btn--sm" style={{ marginTop: '1rem', paddingLeft: 0, color: 'var(--pa-blue-bright)' }}>
                  Learn more <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="pa-section pa-container">
          <SectionHeading center eyebrow="In the product" title="Interfaces built for auction day" className="pa-reveal pa-mb-lg" />
          <div className="pa-stack" style={{ gap: '2rem' }}>
            <div className="pa-reveal"><RegistrationMock /></div>
            <div className="pa-reveal"><PlayerManagementMock /></div>
            <div className="pa-reveal"><TeamManagementMock /></div>
            <div className="pa-reveal"><LiveAuctionMock /></div>
            <div className="pa-reveal"><AnalyticsMock /></div>
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-cta-band pa-reveal" style={{ minHeight: '16rem' }}>
            <div className="pa-cta-band__overlay" style={{ background: 'linear-gradient(135deg, #100c0e, #1c1518)' }} />
            <div className="pa-cta-band__content">
              <h2 className="pa-h2">See PowerAuction on your next league calendar</h2>
              <div className="pa-hero__ctas">
                <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo</Link>
                <Link to="/pricing" className="pa-btn pa-btn--secondary pa-btn--lg">Pricing</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
