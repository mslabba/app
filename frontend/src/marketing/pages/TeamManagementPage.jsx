import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { TeamManagementMock, TeamOwnerDashboardMock, CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

export default function TeamManagementPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Team Management — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Teams & purses</p>
          <h1 className="pa-h1 pa-mt-sm">Franchise setup with real budget control</h1>
          <p className="pa-lead pa-mt-md">
            Create teams, assign owners, allocate purse values, and give every franchise a live view of
            spend, remaining budget, and squad composition.
          </p>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <TeamManagementMock />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="For organizers"
                title="Configure every franchise before auction day"
                lead="Team names, logos, owners, purse amounts, and squad rules — ready before the first player is called."
              />
              <ul className="pa-list">
                <CheckItem>Create teams and upload logos</CheckItem>
                <CheckItem>Add team / franchise owners</CheckItem>
                <CheckItem>Set purse / budget values</CheckItem>
                <CheckItem>Configure squad size requirements</CheckItem>
                <CheckItem>Track players acquired, spent, and remaining purse</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container pa-split pa-split--reverse">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="For team owners"
                title="A secure real-time dashboard per team"
                lead="Share a private link. Owners monitor purse, squad, acquired players, and the current auction state without disrupting the control room."
              />
              <ul className="pa-list">
                <CheckItem>Purse · spent · remaining</CheckItem>
                <CheckItem>Players acquired vs squad max</CheckItem>
                <CheckItem>Spending history and composition</CheckItem>
                <CheckItem>Current player and bid status</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <TeamOwnerDashboardMock />
            </div>
          </div>
          <div className="pa-container pa-mt-xl">
            <div className="pa-reveal pa-img-frame" style={{ maxWidth: '56rem', marginInline: 'auto' }}>
              <img
                src="/images/team-dashboard.png"
                alt="Owner squad and auction dashboard"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
          </div>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">Give every owner financial clarity</h2>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/live-auction" className="pa-btn pa-btn--secondary pa-btn--lg">Live auction</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
