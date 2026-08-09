import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Mail, Share2, Link2 } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { RegistrationMock, PlayerManagementMock, CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

export default function PlayerRegistrationPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Player Registration — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Player registration</p>
          <h1 className="pa-h1 pa-mt-sm">From invitation link to paid registration</h1>
          <p className="pa-lead pa-mt-md">
            Organizers publish a form. Players complete profiles on any device. Optional fees are collected
            before players enter the auction pool.
          </p>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="For organizers"
                title="Create the form. Share one link."
                lead="Configure the fields your league needs — contact info, playing role, statistics, and custom questions."
              />
              <ul className="pa-list">
                <CheckItem>League-specific registration fields</CheckItem>
                <CheckItem>Shareable public link per auction</CheckItem>
                <CheckItem>Distribute via WhatsApp, email, social, or QR</CheckItem>
                <CheckItem>Central inbox of all applications</CheckItem>
              </ul>
              <div className="pa-inline pa-mt-md" style={{ color: 'var(--pa-slate-400)', fontSize: '0.875rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><MessageCircle size={16} /> WhatsApp</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Mail size={16} /> Email</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Share2 size={16} /> Social</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Link2 size={16} /> Direct link</span>
              </div>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <RegistrationMock />
            </div>
          </div>
        </section>

        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container pa-split">
            <div className="pa-reveal pa-img-frame">
              <img
                src="/images/registration-flow.png"
                alt="Player invitation, registration, payment and success flow"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="For players"
                title="Simple application. Optional payment."
                lead="Players open the link, complete their profile, upload required information, and pay the registration fee when enabled."
              />
              <ul className="pa-list">
                <CheckItem>Name, contact, role, and sports statistics</CheckItem>
                <CheckItem>Documents and photos when required</CheckItem>
                <CheckItem>Registration fee → payment gateway → confirmation</CheckItem>
                <CheckItem>Clear success state after submission</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split pa-split--reverse">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Organizer review"
                title="Track payments and approve players"
                lead="See who registered, who paid, and who is ready for categorization and the auction pool."
              />
              <ul className="pa-list">
                <CheckItem>Payment status per player</CheckItem>
                <CheckItem>Approval and rejection workflow</CheckItem>
                <CheckItem>Search and filters for large pools</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <PlayerManagementMock />
            </div>
          </div>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">Collect your next player pool in one flow</h2>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/live-auction" className="pa-btn pa-btn--secondary pa-btn--lg">Live auction</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
