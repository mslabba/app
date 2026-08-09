import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

const SPORTS = [
  { name: 'Cricket', body: 'Franchise leagues, corporate cups, and local T20-style auctions with categories and purses.' },
  { name: 'Football', body: 'Team drafts and player auctions with role-based squad building and budget caps.' },
  { name: 'Futsal', body: 'Fast-turnaround leagues that need clean registration and live bidding the same week.' },
  { name: 'Basketball', body: 'Roster construction with position needs and remaining budget visibility for owners.' },
  { name: 'Volleyball', body: 'School, college, and club auctions with shareable registration and team dashboards.' },
  { name: 'Other formats', body: 'Corporate sports days, multi-sport festivals, and regional tournaments with custom fields.' },
];

export default function SportsPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Sports Supported — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Multi-sport</p>
          <h1 className="pa-h1 pa-mt-sm">One auction platform. Many sports.</h1>
          <p className="pa-lead pa-mt-md">
            PowerAuction is built around the auction lifecycle — not a single sport. Adapt forms,
            categories, and squad rules to your game.
          </p>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Adaptable workflow"
                title="Same operating system, sport-specific setup"
                lead="Registration fields, player categories, and team rules change with your league. The live auction flow stays familiar for operators."
              />
              <ul className="pa-list">
                <CheckItem>Custom registration fields per sport</CheckItem>
                <CheckItem>Configurable player categories</CheckItem>
                <CheckItem>Purse and squad rules that match your format</CheckItem>
                <CheckItem>Live bidding and owner dashboards for any league</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2 pa-img-frame">
              <img
                src="/images/multi-sports.png"
                alt="Multi-sport athletes with auction technology interface"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
          </div>
        </section>

        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container">
            <div className="pa-feature-grid">
              {SPORTS.map((s, i) => (
                <article key={s.name} className={`pa-feature-card pa-reveal pa-reveal-delay-${(i % 3) + 1}`}>
                  <h3>{s.name}</h3>
                  <p>{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">Running a league we didn’t list?</h2>
          <p className="pa-lead pa-mt-md">Tell us your format — we’ll show how PowerAuction maps to it.</p>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/how-it-works" className="pa-btn pa-btn--secondary pa-btn--lg">How it works</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
