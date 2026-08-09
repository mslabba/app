import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { AnalyticsMock, PlayerManagementMock, SponsorsMock, CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

export default function AuctionDashboardPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Auction Dashboard & Analytics — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Organizer dashboard</p>
          <h1 className="pa-h1 pa-mt-sm">Operational visibility before, during, and after</h1>
          <p className="pa-lead pa-mt-md">
            Manage players, monitor the live event, track finances, and review analytics from a single
            organizer workspace.
          </p>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Analytics"
                title="Metrics that matter after the gavel falls"
                lead="Registrations, approvals, bids, purse utilization, averages, and team comparisons — focused, not noisy."
              />
              <ul className="pa-list">
                <CheckItem>Total players registered and approved</CheckItem>
                <CheckItem>Players auctioned and remaining</CheckItem>
                <CheckItem>Total bids and highest bid</CheckItem>
                <CheckItem>Purse allocated vs spent</CheckItem>
                <CheckItem>Average player price and team spend charts</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <AnalyticsMock />
            </div>
          </div>
        </section>

        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container pa-split pa-split--reverse">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Operations"
                title="Player and payment control"
                lead="Approve registrations, track payments, and keep categories ready for the live auction."
              />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <PlayerManagementMock />
            </div>
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SponsorsMock />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Sponsors"
                title="Event branding under your control"
                lead="Manage sponsor logos and display them on auction screens during the event."
              />
              <ul className="pa-list">
                <CheckItem>Add sponsors and upload logos</CheckItem>
                <CheckItem>Associate with auction or teams</CheckItem>
                <CheckItem>Showcase branding on live displays</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">Get a walkthrough of the organizer console</h2>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/features" className="pa-btn pa-btn--secondary pa-btn--lg">All features</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
