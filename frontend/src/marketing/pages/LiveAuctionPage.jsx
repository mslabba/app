import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, SectionHeading } from '../components/MarketingShell';
import { LiveAuctionMock, SpinSelectMock, CheckItem } from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

export default function LiveAuctionPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'Live Auction — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        <section className="pa-page-hero pa-container pa-reveal">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Live auction</p>
          <h1 className="pa-h1 pa-mt-sm">Control the room with confidence</h1>
          <p className="pa-lead pa-mt-md">
            Player cards, live bids, countdowns, team purses, and next-player selection — built for
            operators and franchise owners on auction day.
          </p>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-reveal pa-mb-lg">
            <LiveAuctionMock />
          </div>
          <div className="pa-split pa-mt-xl">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="On the block"
                title="Professional player cards"
                lead="Show photo, name, role, category, base price, statistics, current bid, and auction status in a broadcast-ready layout."
              />
              <ul className="pa-list">
                <CheckItem>Current bid and highest bidding team</CheckItem>
                <CheckItem>Bid activity feed</CheckItem>
                <CheckItem>Countdown timer</CheckItem>
                <CheckItem>Team purse indicators</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2 pa-img-frame">
              <img
                src="/images/player-card.png"
                alt="Live auction player card with bid activity"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
          </div>
        </section>

        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container pa-split">
            <div className="pa-reveal">
              <SpinSelectMock />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Next player"
                title="Spin to select — fair and professional"
                lead="Randomly select the next player for the block with a clear, exciting mechanism that fits a sports auction — not a casino floor."
              />
              <ul className="pa-list">
                <CheckItem>Operator-controlled selection</CheckItem>
                <CheckItem>Transparent random draw experience</CheckItem>
                <CheckItem>Seamless handoff to the player card</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Safe bidding"
                title="Reduce mistakes when money is on the line"
                lead="Owners see exact amounts, remaining purse, and confirm before a bid is placed."
              />
              <ul className="pa-list">
                <CheckItem>Clear bid amount and increments</CheckItem>
                <CheckItem>Confirmation step</CheckItem>
                <CheckItem>Team identity and purse context</CheckItem>
                <CheckItem>Live bid status during the countdown</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2 pa-img-frame">
              <img
                src="/images/hero.png"
                alt="Teams bidding in a professional auction room"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
          </div>
        </section>

        <section className="pa-section pa-container pa-center pa-reveal">
          <h2 className="pa-h2">See a live auction walkthrough</h2>
          <div className="pa-hero__ctas" style={{ justifyContent: 'center' }}>
            <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--lg">Book a Demo <ArrowRight size={18} /></Link>
            <Link to="/team-management" className="pa-btn pa-btn--secondary pa-btn--lg">Team management</Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
