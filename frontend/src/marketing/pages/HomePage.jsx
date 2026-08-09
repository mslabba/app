import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  Layers,
  Users,
  Gavel,
  LayoutDashboard,
  BarChart3,
  Megaphone,
  Shield,
  Zap,
  Link2,
  MessageCircle,
  Mail,
  Share2,
  CheckCircle2,
  Target,
  Timer,
  Wallet,
} from 'lucide-react';
import { MarketingShell, SectionHeading, CTAGroup } from '../components/MarketingShell';
import {
  PlayerManagementMock,
  TeamManagementMock,
  LiveAuctionMock,
  TeamOwnerDashboardMock,
  AnalyticsMock,
  RegistrationMock,
  SpinSelectMock,
  SponsorsMock,
  CheckItem,
} from '../components/ProductMocks';
import { useReveal } from '../hooks/useReveal';

const LIFECYCLE = [
  'Create auction',
  'Invite players',
  'Registration',
  'Payment',
  'Player review',
  'Categorize',
  'Create teams',
  'Allocate purse',
  'Add sponsors',
  'Start auction',
  'Live bidding',
  'Team allocation',
  'Analytics',
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Player registration',
    body: 'Shareable forms with role, stats, and league-specific fields — distributed by link, WhatsApp, email, or social.',
  },
  {
    icon: CreditCard,
    title: 'Registration payments',
    body: 'Optional fees with payment gateway collection. Track paid vs pending registrations in one place.',
  },
  {
    icon: Layers,
    title: 'Configurable categories',
    body: 'Icon, overseas, local, emerging — or define your own categories with constraints that fit your league.',
  },
  {
    icon: Users,
    title: 'Teams & purses',
    body: 'Create teams, assign owners, set budgets, and monitor squad size, spend, and remaining purse.',
  },
  {
    icon: Gavel,
    title: 'Live auction control',
    body: 'Player cards, base price, current bid, countdown, and spin-to-select for the next player on the block.',
  },
  {
    icon: Shield,
    title: 'Safe bidding',
    body: 'Clear amounts, confirmation steps, and purse-aware bidding so owners bid with confidence.',
  },
  {
    icon: LayoutDashboard,
    title: 'Team owner dashboards',
    body: 'Secure real-time links for each franchise: squad, spend history, remaining purse, and live bid status.',
  },
  {
    icon: BarChart3,
    title: 'Auction analytics',
    body: 'Registrations, bids, average prices, highest sales, and team spending comparisons after every event.',
  },
  {
    icon: Megaphone,
    title: 'Sponsor branding',
    body: 'Add sponsors, upload logos, and display branding on auction screens throughout the event.',
  },
];

const WHY = [
  {
    icon: Target,
    title: 'End-to-end, not just bidding',
    body: 'Registration, payments, categories, teams, live auction, and analytics live in one operating system.',
  },
  {
    icon: Zap,
    title: 'Built for live events',
    body: 'Real-time updates for operators, team owners, and display screens when the room is full and the clock is running.',
  },
  {
    icon: Wallet,
    title: 'Financial control',
    body: 'Purse allocation, remaining budget, safe bid limits, and squad composition stay visible at every step.',
  },
  {
    icon: Timer,
    title: 'Less chaos, more control',
    body: 'Replace spreadsheets, paper paddles, and calculator math with a single source of auction truth.',
  },
];

const SPORTS = ['Cricket', 'Football', 'Futsal', 'Basketball', 'Volleyball', 'Corporate leagues', 'School & college', 'Franchise tournaments'];

function HomePage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'PowerAuction — Professional Sports Auction Management';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Run professional sports player auctions without spreadsheets and chaos. Registration, payments, teams, live bidding, purse tracking, and analytics in one platform.'
      );
    }
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        {/* ===== HERO ===== */}
        <section className="pa-hero pa-container">
          <div className="pa-hero__grid">
            <div className="pa-hero__copy pa-reveal">
              <p className="pa-eyebrow">Sports auction operating system</p>
              <h1 className="pa-h1 pa-mt-sm">
                Run your next player auction{' '}
                <span className="pa-blue-text">like a pro.</span>
              </h1>
              <p className="pa-lead pa-mt-md">
                PowerAuction unifies player registration, payments, team management, live bidding,
                purse tracking, and auction analytics — so league organizers can run professional
                auctions without spreadsheets, paperwork, or chaos.
              </p>
              <CTAGroup
                primaryTo="/contact"
                primaryLabel="Book a Demo"
                secondaryTo="/how-it-works"
                secondaryLabel="See How It Works"
                tertiaryTo="/features"
                tertiaryLabel="Explore Features"
              />
              <div className="pa-hero__proof">
                <div className="pa-hero__proof-item">
                  <strong>Full lifecycle</strong>
                  <span>Register → bid → report</span>
                </div>
                <div className="pa-hero__proof-item">
                  <strong>Multi-sport</strong>
                  <span>Cricket, football & more</span>
                </div>
                <div className="pa-hero__proof-item">
                  <strong>Real-time</strong>
                  <span>Owners & operators in sync</span>
                </div>
              </div>
            </div>

            <div className="pa-hero__visual pa-reveal pa-reveal-delay-2">
              <div className="pa-hero__frame">
                <img
                  src="/images/hero.png"
                  alt="PowerAuction live player auction boardroom with real-time bidding display"
                  width={1376}
                  height={768}
                  fetchPriority="high"
                />
              </div>
              <div className="pa-hero__float pa-hero__float--top">
                <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Current bid</div>
                <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 800, color: 'var(--pa-gold-soft)', fontSize: '1.1rem' }}>
                  ₹1,00,000
                </div>
              </div>
              <div className="pa-hero__float pa-hero__float--bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="pa-badge pa-badge--live" style={{ padding: '0.2rem 0.55rem' }}>LIVE</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--pa-slate-300)' }}>8 teams bidding</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST ===== */}
        <div className="pa-trust">
          <div className="pa-container pa-trust__row">
            <span className="pa-trust__item">
              <CheckCircle2 size={16} /> Built for league organizers
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} /> Players · Teams · Operators
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} /> Registration to final bid
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} /> Purse-aware safe bidding
            </span>
          </div>
        </div>

        {/* ===== EVERYTHING YOU NEED ===== */}
        <section className="pa-section pa-container" id="product">
          <SectionHeading
            center
            eyebrow="Platform"
            title="Everything you need to run a player auction"
            lead="One product for organizers, players, team owners, and auction operators — not a pile of disconnected tools."
            className="pa-reveal pa-mb-lg"
          />
          <div className="pa-feature-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className={`pa-feature-card pa-reveal pa-reveal-delay-${(i % 3) + 1}`}>
                <div className="pa-feature-card__icon">
                  <f.icon size={22} aria-hidden="true" />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ===== LIFECYCLE ===== */}
        <section className="pa-section pa-section--tight pa-bg-radial-soft">
          <div className="pa-container">
            <SectionHeading
              center
              eyebrow="Complete lifecycle"
              title="From empty spreadsheet to sold player"
              lead="PowerAuction covers every stage of the auction — so nothing falls through WhatsApp threads or paper lists."
              className="pa-reveal pa-mb-lg"
            />
            <div className="pa-lifecycle pa-reveal">
              {LIFECYCLE.map((step, i) => (
                <div key={step} className="pa-lifecycle__step">
                  <span className="pa-lifecycle__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pa-lifecycle__label">{step}</span>
                </div>
              ))}
            </div>
            <div className="pa-center pa-mt-lg pa-reveal">
              <Link to="/how-it-works" className="pa-btn pa-btn--secondary">
                Walk through the full workflow <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== REGISTRATION ===== */}
        <section className="pa-section pa-container" id="registration">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Player registration"
                title="Invite players. Collect complete profiles."
                lead="Create a registration form for your league, share one link, and let players apply from any device."
              />
              <ul className="pa-list">
                <CheckItem>Organizer builds the form with sport-specific fields</CheckItem>
                <CheckItem>Distribute via WhatsApp, email, social, or direct link</CheckItem>
                <CheckItem>Players submit name, contact, role, stats, and documents</CheckItem>
                <CheckItem>Review, filter, and approve registrations in the dashboard</CheckItem>
              </ul>
              <div className="pa-inline pa-mt-md" style={{ color: 'var(--pa-slate-400)', fontSize: '0.875rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><MessageCircle size={16} /> WhatsApp</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Mail size={16} /> Email</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Share2 size={16} /> Social</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Link2 size={16} /> Direct link</span>
              </div>
              <Link to="/player-registration" className="pa-btn pa-btn--primary pa-mt-lg">
                Player registration details <ArrowRight size={16} />
              </Link>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <RegistrationMock />
            </div>
          </div>

          <div className="pa-split pa-mt-xl" style={{ marginTop: 'clamp(3rem, 6vw, 5rem)' }}>
            <div className="pa-reveal pa-img-frame">
              <img
                src="/images/registration-flow.png"
                alt="Registration invitation, profile, payment, and confirmation workflow across devices"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Payments"
                title="Collect registration fees when you need them"
                lead="Attach an optional registration fee. Players pay through the gateway; you track successful payments and incomplete applications."
              />
              <ul className="pa-list">
                <CheckItem>Optional registration fee per event</CheckItem>
                <CheckItem>Payment gateway checkout in the registration flow</CheckItem>
                <CheckItem>Clear paid / pending status on every player</CheckItem>
                <CheckItem>Only successful registrations enter your auction pool</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== PLAYER MANAGEMENT ===== */}
        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container">
            <div className="pa-split pa-split--reverse">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Player management"
                  title="Review, categorize, and prepare the pool"
                  lead="Search, filter, and manage every registration. Assign configurable categories before the auction starts."
                />
                <ul className="pa-list">
                  <CheckItem>Payment and approval status at a glance</CheckItem>
                  <CheckItem>Player profiles with stats and documents</CheckItem>
                  <CheckItem>Configurable categories — Icon, Overseas, Local, Emerging, or your own</CheckItem>
                  <CheckItem>Filters and search for large player pools</CheckItem>
                </ul>
              </div>
              <div className="pa-reveal pa-reveal-delay-2">
                <PlayerManagementMock />
              </div>
            </div>
          </div>
        </section>

        {/* ===== TEAM & PURSE ===== */}
        <section className="pa-section pa-container" id="teams">
          <div className="pa-split">
            <div className="pa-reveal">
              <TeamManagementMock />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Team & purse management"
                title="Build franchises. Allocate budgets. Track squads."
                lead="Create teams with logos and owners, set purse values, and watch spending and remaining budget update as players are sold."
              />
              <ul className="pa-list">
                <CheckItem>Team names, logos, and owner accounts</CheckItem>
                <CheckItem>Purse / budget allocation per team</CheckItem>
                <CheckItem>Players acquired, total spent, remaining purse</CheckItem>
                <CheckItem>Squad size and composition requirements</CheckItem>
              </ul>
              <Link to="/team-management" className="pa-btn pa-btn--secondary pa-mt-lg">
                Team management <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== LIVE AUCTION ===== */}
        <section className="pa-section pa-bg-radial-soft" id="live-auction">
          <div className="pa-container">
            <SectionHeading
              center
              eyebrow="Live auction"
              title="Broadcast-quality control for the auction room"
              lead="Current player, statistics, base price, highest bid, countdown, and team purses — designed for operators and displays under pressure."
              className="pa-reveal pa-mb-lg"
            />
            <div className="pa-reveal pa-mb-lg">
              <LiveAuctionMock />
            </div>
            <div className="pa-split" style={{ marginTop: '2.5rem' }}>
              <div className="pa-reveal">
                <div className="pa-img-frame">
                  <img
                    src="/images/player-card.png"
                    alt="Professional player card with statistics and live bid activity on auction display"
                    loading="lazy"
                    width={1376}
                    height={768}
                  />
                </div>
              </div>
              <div className="pa-stack pa-reveal pa-reveal-delay-2">
                <SectionHeading
                  eyebrow="Player card & selection"
                  title="Professional player cards. Fair next-player selection."
                  lead="When a player is selected, present a broadcast-style card with photo, role, category, base price, and stats. Use spin-to-select for the next player — exciting, structured, and professional."
                />
                <SpinSelectMock />
                <Link to="/live-auction" className="pa-btn pa-btn--primary">
                  Explore live auction <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SAFE BIDDING ===== */}
        <section className="pa-section pa-container">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Safe bidding"
                title="Bid with clarity. Avoid costly mistakes."
                lead="Team owners see the current highest bid, their next amount, remaining purse, and confirm before the bid is placed."
              />
              <ul className="pa-list">
                <CheckItem>Clear bid amount and increment chips</CheckItem>
                <CheckItem>Confirmation before a bid is committed</CheckItem>
                <CheckItem>Team identity and remaining purse always visible</CheckItem>
                <CheckItem>Countdown and bid status during live rounds</CheckItem>
              </ul>
            </div>
            <div className="pa-reveal pa-reveal-delay-2 pa-card pa-card--elevated" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="pa-badge">Falcons · Safe bid</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--pa-slate-400)' }}>Countdown 00:18</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--pa-slate-500)' }}>Current highest</div>
              <div style={{ fontFamily: 'var(--pa-font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--pa-gold-soft)' }}>
                ₹1,00,000
              </div>
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="pa-stat">
                  <div className="pa-stat__label">Your next bid</div>
                  <div className="pa-stat__value pa-stat__value--blue">₹1,10,000</div>
                </div>
                <div className="pa-stat">
                  <div className="pa-stat__label">Remaining purse</div>
                  <div className="pa-stat__value">₹3,25,000</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, var(--pa-blue), var(--pa-blue-deep))',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                Confirm bid · ₹1,10,000
              </div>
              <p className="pa-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.75rem' }}>
                Reliability first — every bid is intentional.
              </p>
            </div>
          </div>
        </section>

        {/* ===== TEAM OWNER ===== */}
        <section className="pa-section pa-bg-radial-soft">
          <div className="pa-container">
            <div className="pa-split pa-split--reverse">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Team owner experience"
                  title="Every franchise gets a secure real-time view"
                  lead="Share a private dashboard link with each team owner. They track purse, squad, spending, and the current auction player as it happens."
                />
                <ul className="pa-list">
                  <CheckItem>Purse, spent, remaining, and squad size</CheckItem>
                  <CheckItem>Acquired players and spending history</CheckItem>
                  <CheckItem>Live view of the player on the block</CheckItem>
                  <CheckItem>Bid status without cluttering the main control room</CheckItem>
                </ul>
              </div>
              <div className="pa-reveal pa-reveal-delay-2">
                <TeamOwnerDashboardMock />
              </div>
            </div>
            <div className="pa-reveal pa-mt-xl pa-img-frame" style={{ maxWidth: '56rem', marginInline: 'auto' }}>
              <img
                src="/images/team-dashboard.png"
                alt="Team owner squad and auction dashboard with purse and analytics"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
          </div>
        </section>

        {/* ===== ANALYTICS ===== */}
        <section className="pa-section pa-container" id="analytics">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Auction analytics"
                title="Know how the auction performed"
                lead="Organizer dashboards surface registrations, bids, spend, and team comparisons — without drowning you in charts."
              />
              <ul className="pa-list">
                <CheckItem>Players registered, approved, and auctioned</CheckItem>
                <CheckItem>Total bids, purse allocated vs spent</CheckItem>
                <CheckItem>Average price and highest bid</CheckItem>
                <CheckItem>Team spending comparison</CheckItem>
              </ul>
              <Link to="/auction-dashboard" className="pa-btn pa-btn--secondary pa-mt-lg">
                Organizer dashboard <ArrowRight size={16} />
              </Link>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <AnalyticsMock />
            </div>
          </div>
        </section>

        {/* ===== SPONSORS ===== */}
        <section className="pa-section pa-section--tight pa-container">
          <div className="pa-split">
            <div className="pa-reveal pa-reveal-delay-1">
              <SponsorsMock />
            </div>
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Sponsors"
                title="Bring sponsor branding into the auction"
                lead="Add sponsors, upload logos, associate them with the event, and display branding on live auction screens."
              />
              <ul className="pa-list">
                <CheckItem>Sponsor profiles and logo uploads</CheckItem>
                <CheckItem>Association with auction or teams</CheckItem>
                <CheckItem>On-screen branding during live rounds</CheckItem>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== MULTI-SPORT ===== */}
        <section className="pa-section pa-bg-radial-soft" id="sports">
          <div className="pa-container">
            <div className="pa-split">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Multi-sport"
                  title="Not a cricket-only product"
                  lead="The same auction workflow adapts to different sports and tournament formats — from franchise leagues to corporate cups."
                />
                <div className="pa-sports pa-mt-md">
                  {SPORTS.map((s) => (
                    <span key={s} className="pa-sport-pill">{s}</span>
                  ))}
                </div>
                <Link to="/sports" className="pa-btn pa-btn--secondary pa-mt-lg">
                  Sports supported <ArrowRight size={16} />
                </Link>
              </div>
              <div className="pa-reveal pa-reveal-delay-2 pa-img-frame">
                <img
                  src="/images/multi-sports.png"
                  alt="Cricket, football, and basketball athletes with multi-sport auction interface"
                  loading="lazy"
                  width={1376}
                  height={768}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="pa-section pa-container" id="how-it-works">
          <SectionHeading
            center
            eyebrow="How PowerAuction works"
            title="Three phases. One platform."
            lead="Set up before auction day, run live with confidence, and review results when the last player is sold."
            className="pa-reveal pa-mb-lg"
          />
          <div className="pa-steps">
            <article className="pa-step pa-reveal">
              <div className="pa-step__num">01</div>
              <h3>Prepare</h3>
              <p>
                Create the auction, open registration, collect payments, review players, set categories,
                build teams, allocate purses, and add sponsors.
              </p>
            </article>
            <article className="pa-step pa-reveal pa-reveal-delay-1">
              <div className="pa-step__num">02</div>
              <h3>Auction live</h3>
              <p>
                Select players, present cards and stats, take bids with countdown control, and keep every
                team’s purse and squad in sync.
              </p>
            </article>
            <article className="pa-step pa-reveal pa-reveal-delay-2">
              <div className="pa-step__num">03</div>
              <h3>Report</h3>
              <p>
                Review sold players, team compositions, spending analytics, and export what your league
                needs after the event.
              </p>
            </article>
          </div>
        </section>

        {/* ===== WHY ===== */}
        <section className="pa-section pa-section--tight pa-bg-radial-soft">
          <div className="pa-container">
            <SectionHeading
              center
              eyebrow="Why organizers choose PowerAuction"
              title="Professional auctions without the operational mess"
              className="pa-reveal pa-mb-lg"
            />
            <div className="pa-why-grid">
              {WHY.map((item, i) => (
                <div key={item.title} className={`pa-why-item pa-reveal pa-reveal-delay-${(i % 2) + 1}`}>
                  <div className="pa-why-item__icon">
                    <item.icon size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="pa-section pa-container">
          <div className="pa-cta-band pa-reveal">
            <div className="pa-cta-band__bg">
              <img
                src="/images/auction-room.png"
                alt="Professional league auction room with teams bidding"
                loading="lazy"
                width={1376}
                height={768}
              />
            </div>
            <div className="pa-cta-band__overlay" />
            <div className="pa-cta-band__content">
              <p className="pa-eyebrow">Ready when your league is</p>
              <h2 className="pa-h2 pa-mt-sm">Run the entire player auction from one platform.</h2>
              <p className="pa-lead pa-mt-md" style={{ color: 'var(--pa-slate-300)' }}>
                Book a demo and see registration, team purses, live bidding, and owner dashboards
                working together for your next event.
              </p>
              <div className="pa-hero__ctas">
                <Link to="/contact" className="pa-btn pa-btn--gold pa-btn--lg">
                  Book a Demo <ArrowRight size={18} />
                </Link>
                <Link to="/features" className="pa-btn pa-btn--secondary pa-btn--lg">
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}

export default HomePage;
