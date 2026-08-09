import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

const PHASES = [
  {
    phase: '01 · Setup',
    title: 'Create the auction and open the gates',
    steps: [
      'Create a league / auction event with your rules',
      'Configure categories, squad rules, and base prices',
      'Publish a player registration form and share the link',
      'Collect optional registration fees through the payment gateway',
      'Review, approve, and categorize registered players',
      'Create teams, assign owners, allocate purses, add sponsors',
    ],
  },
  {
    phase: '02 · Live',
    title: 'Run the auction room',
    steps: [
      'Start the live auction from the operator console',
      'Select the next player (including spin / random selection)',
      'Display the professional player card and statistics',
      'Accept bids with countdown and clear highest-bidder state',
      'Team owners bid safely with purse visibility',
      'Sold players update squads and remaining budgets instantly',
    ],
  },
  {
    phase: '03 · After',
    title: 'Close with full visibility',
    steps: [
      'Review sold and unsold players',
      'Inspect each team’s final squad and spend',
      'Use analytics for average prices, totals, and comparisons',
      'Share outcomes with organizers and franchises',
    ],
  },
];

const LIFECYCLE = [
  'Create auction', 'Invite players', 'Registration', 'Payment', 'Player review',
  'Categorize', 'Create teams', 'Allocate purse', 'Add sponsors', 'Start auction',
  'Live bidding', 'Team allocation', 'Analytics',
];

export default function HowItWorksPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'How It Works — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Workflow</p>
          <h1 className="pa-h1 pa-mt-sm">How PowerAuction runs an auction</h1>
          <p className="pa-lead pa-mt-md">
            From the first registration link to the last sold player — a single path for organizers,
            players, and team owners.
          </p>
        </section>

        <section className="pa-section pa-section--tight pa-container">
          <SectionHeading center eyebrow="Lifecycle" title="Thirteen stages. Zero spreadsheet handoffs." className="pa-reveal pa-mb-lg" />
          <div className="pa-lifecycle pa-reveal">
            {LIFECYCLE.map((step, i) => (
              <div key={step} className="pa-lifecycle__step">
                <span className="pa-lifecycle__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="pa-lifecycle__label">{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-stack" style={{ gap: '2.5rem' }}>
            {PHASES.map((p, idx) => (
              <div key={p.phase} className={`pa-split ${idx % 2 === 1 ? 'pa-split--reverse' : ''} pa-reveal`}>
                <div>
                  <p className="pa-eyebrow">{p.phase}</p>
                  <h2 className="pa-h3 pa-mt-sm">{p.title}</h2>
                  <ul className="pa-list">
                    {p.steps.map((s) => (
                      <CheckItem key={s}>{s}</CheckItem>
                    ))}
                  </ul>
                </div>
                <div className="pa-card pa-card--elevated" style={{ padding: '1.75rem', minHeight: '14rem', display: 'grid', placeItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--pa-font-display)', fontSize: '3rem', fontWeight: 800, color: 'transparent', background: 'linear-gradient(180deg, rgba(225,29,46,0.55), rgba(225,29,46,0.1))', WebkitBackgroundClip: 'text' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <p className="pa-muted" style={{ marginTop: '0.5rem' }}>{p.phase.split('·')[1]?.trim() || p.phase}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-center pa-reveal">
            <h2 className="pa-h2">Ready to walk through it live?</h2>
            <p className="pa-lead pa-mt-md">We’ll map PowerAuction to your league format and auction rules.</p>
            <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
              <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
              <Link to="/features" className="pa-btn pa-btn--secondary pa-btn--lg">View features</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
