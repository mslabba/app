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
import { MarketingShell, SectionHeading, CTAGroup, MarketingImage } from '../components/MarketingShell';
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

const SEO_TITLE =
  'Sports Player Auction Software for Cricket, Football & More | PowerAuction';
const SEO_DESCRIPTION =
  'Run sports player auctions with registration, payments, team purses, live bidding and analytics. Built for cricket, football and multi-sport leagues.';

const LIFECYCLE = [
  { label: 'Create auction', phase: 'Setup' },
  { label: 'Invite players', phase: 'Setup' },
  { label: 'Registration', phase: 'Players' },
  { label: 'Payment', phase: 'Players' },
  { label: 'Player review', phase: 'Players' },
  { label: 'Categorize', phase: 'Players' },
  { label: 'Create teams', phase: 'Teams' },
  { label: 'Allocate purse', phase: 'Teams' },
  { label: 'Add sponsors', phase: 'Teams' },
  { label: 'Start auction', phase: 'Live' },
  { label: 'Live bidding', phase: 'Live' },
  { label: 'Player allocation', phase: 'Live' },
  { label: 'Analytics', phase: 'Report' },
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Player registration',
    body: 'Custom forms with role, stats, and league fields — share by link, WhatsApp, email, or social.',
  },
  {
    icon: CreditCard,
    title: 'Registration payments',
    body: 'Optional fees via payment gateway. Track paid vs pending registrations in one place.',
  },
  {
    icon: Layers,
    title: 'Configurable categories',
    body: 'Icon, overseas, local, emerging — or define categories that match your league rules.',
  },
  {
    icon: Users,
    title: 'Teams & purses',
    body: 'Create teams, assign owners, set budgets, and monitor squad size, spend, and remaining purse.',
  },
  {
    icon: Gavel,
    title: 'Live auction control',
    body: 'Player cards, base price, current bid, countdown, and spin-to-select for the next player.',
  },
  {
    icon: Shield,
    title: 'Safe bidding',
    body: 'Clear amounts, confirmation steps, and purse-aware bidding so owners bid with confidence.',
  },
  {
    icon: LayoutDashboard,
    title: 'Team owner dashboards',
    body: 'Secure real-time links for each franchise: squad, spend history, remaining purse, bid status.',
  },
  {
    icon: BarChart3,
    title: 'Auction analytics',
    body: 'Registrations, bids, average prices, highest sales, and team spending comparisons.',
  },
  {
    icon: Megaphone,
    title: 'Sponsor branding',
    body: 'Add sponsors, upload logos, and display branding on auction screens during the event.',
  },
];

const WHY = [
  {
    icon: Target,
    title: 'End-to-end, not just bidding',
    body: 'Registration, payments, categories, teams, live auction, and analytics in one operating system.',
  },
  {
    icon: Zap,
    title: 'Built for live events',
    body: 'Real-time updates for operators, team owners, and display screens when the clock is running.',
  },
  {
    icon: Wallet,
    title: 'Financial control',
    body: 'Purse allocation, remaining budget, safe bid context, and squad composition stay visible.',
  },
  {
    icon: Timer,
    title: 'Less chaos, more control',
    body: 'Replace spreadsheets, paper paddles, and calculator math with a single source of auction truth.',
  },
];

const SPORTS = [
  'Cricket',
  'Football',
  'Futsal',
  'Basketball',
  'Volleyball',
  'Corporate leagues',
  'School & college',
  'Franchise tournaments',
];

const CATEGORIES = ['Icon Player', 'Category Player', 'Overseas Player', 'Local Player', 'Emerging Player'];

const FAQ = [
  {
    q: 'What is sports player auction software?',
    a: 'Sports player auction software helps league organizers run the full player auction process — from registration and payments to team purses, live bidding, and post-event analytics — instead of juggling spreadsheets and chat threads.',
  },
  {
    q: 'How does PowerAuction work?',
    a: 'You create an auction, open player registration (with optional fees), review and categorize players, build teams with purse values, then run the live auction with safe bidding. Team owners can follow a real-time dashboard; organizers get analytics after the event.',
  },
  {
    q: 'Can I conduct a cricket player auction with PowerAuction?',
    a: 'Yes. PowerAuction is commonly used for cricket league and franchise-style player auctions, with configurable categories, squad rules, and purse tracking.',
  },
  {
    q: 'Can I conduct a football player auction?',
    a: 'Yes. The same workflow supports football and other sports: adapt registration fields, roles, categories, and squad rules to your format.',
  },
  {
    q: 'Can players register online?',
    a: 'Yes. Organizers publish a registration link that can be shared via WhatsApp, email, social media, or a direct URL. Players complete their profile from any device.',
  },
  {
    q: 'Can players pay registration fees online?',
    a: 'Yes. You can attach an optional registration fee and collect it through the payment gateway in the registration flow, with clear paid or pending status for each player.',
  },
  {
    q: 'Can I categorize players?',
    a: 'Yes. Categories are configurable. Examples include Icon Player, Overseas, Local, or Emerging — define whatever structure your league needs before the auction starts.',
  },
  {
    q: 'Can I create teams and allocate purse values?',
    a: 'Yes. Create teams, assign owners, set purse/budget amounts, and track spent amount, remaining purse, and squad size as players are sold.',
  },
  {
    q: 'Can team owners participate in live bidding?',
    a: 'Yes. Team owners bid during live rounds with clear bid amounts, confirmation, and remaining purse context designed to reduce mistakes.',
  },
  {
    q: 'Can team owners track their remaining purse?',
    a: 'Yes. Each team can have a secure real-time dashboard showing purse, spent, remaining budget, acquired players, and the player currently on the block.',
  },
  {
    q: 'Does PowerAuction support real-time auction dashboards?',
    a: 'Yes. Organizers run the control room while team owners follow dedicated real-time views so everyone stays aligned during the event.',
  },
  {
    q: 'Can I add sponsors to my auction?',
    a: 'Yes. Add sponsors, upload logos, associate them with the event, and display branding on auction screens.',
  },
  {
    q: 'Can PowerAuction be used for different sports?',
    a: 'Yes. PowerAuction is multi-sport: cricket, football, futsal, basketball, volleyball, corporate and school/college formats can use the same auction operating system with sport-specific setup.',
  },
];

function injectJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function HomePage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  useEffect(() => {
    document.title = SEO_TITLE;
    const setMeta = (selector, attr, value) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', SEO_DESCRIPTION);
    setMeta('meta[name="title"]', 'content', SEO_TITLE);
    setMeta('meta[property="og:title"]', 'content', SEO_TITLE);
    setMeta('meta[property="og:description"]', 'content', SEO_DESCRIPTION);
    setMeta(
      'meta[property="og:image"]',
      'content',
      'https://thepowerauction.com/images/marketing/sports-player-auction-live-bidding.jpg'
    );
    setMeta('meta[property="twitter:title"]', 'content', SEO_TITLE);
    setMeta('meta[property="twitter:description"]', 'content', SEO_DESCRIPTION);
    setMeta(
      'meta[property="twitter:image"]',
      'content',
      'https://thepowerauction.com/images/marketing/sports-player-auction-live-bidding.jpg'
    );

    injectJsonLd('pa-ld-software', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'PowerAuction',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SEO_DESCRIPTION,
      url: 'https://thepowerauction.com/',
    });

    injectJsonLd('pa-ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    });

    injectJsonLd('pa-ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://thepowerauction.com/',
        },
      ],
    });

    return () => {
      ['pa-ld-software', 'pa-ld-faq', 'pa-ld-breadcrumb'].forEach((id) => {
        document.getElementById(id)?.remove();
      });
    };
  }, []);

  return (
    <MarketingShell>
      <div ref={rootRef} className="pa-bg-radial">
        {/* ===== HERO ===== */}
        <section className="pa-hero pa-container" aria-labelledby="hero-heading">
          <div className="pa-hero__grid">
            <div className="pa-hero__copy pa-reveal">
              <p className="pa-eyebrow">Sports auction management platform</p>
              <h1 id="hero-heading" className="pa-h1 pa-mt-sm">
                Run your next player auction{' '}
                <span className="pa-brand-text">like a pro.</span>
              </h1>
              <p className="pa-lead pa-mt-md">
                PowerAuction is sports player auction software for cricket, football, and multi-sport
                leagues. Manage player registration, registration payments, teams, purse values, live
                bidding, and auction analytics from one platform — without spreadsheets or chaos.
              </p>
              <CTAGroup
                primaryTo="/contact"
                primaryLabel="Book a Demo"
                secondaryTo="/how-it-works"
                secondaryLabel="See How It Works"
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

            <div className="pa-hero__visual pa-hero__product pa-reveal pa-reveal-delay-2">
              <LiveAuctionMock />
              <div className="pa-hero__metrics" aria-hidden="true">
                <div className="pa-hero__metric">
                  <strong>₹2,40,000</strong>
                  <span>Current bid</span>
                </div>
                <div className="pa-hero__metric">
                  <strong>Falcons</strong>
                  <span>Highest bid</span>
                </div>
                <div className="pa-hero__metric">
                  <strong>00:07</strong>
                  <span>Countdown</span>
                </div>
              </div>
              <p className="pa-illus-note">Illustrative auction UI — sample figures for demonstration only.</p>
            </div>
          </div>
        </section>

        {/* ===== TRUST ===== */}
        <div className="pa-trust">
          <div className="pa-container pa-trust__row">
            <span className="pa-trust__item">
              <CheckCircle2 size={16} aria-hidden="true" /> Built for league organizers
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} aria-hidden="true" /> Players · Teams · Operators
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} aria-hidden="true" /> Registration to final bid
            </span>
            <span className="pa-trust__item">
              <CheckCircle2 size={16} aria-hidden="true" /> Purse-aware safe bidding
            </span>
          </div>
        </div>

        {/* ===== EVERYTHING YOU NEED ===== */}
        <section className="pa-section pa-container" id="product" aria-labelledby="features-heading">
          <SectionHeading
            center
            eyebrow="Platform"
            title="Everything you need to run a sports player auction"
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
        <section className="pa-section pa-section--tight pa-bg-radial-soft" aria-labelledby="lifecycle-heading">
          <div className="pa-container">
            <SectionHeading
              center
              eyebrow="Complete auction lifecycle"
              title="From registration to analytics — not just the bidding screen"
              lead="PowerAuction manages the full sports player auction workflow so nothing falls through WhatsApp threads or paper lists."
              className="pa-reveal pa-mb-lg"
            />

            <div className="pa-timeline pa-reveal" role="list" aria-label="Auction lifecycle steps">
              <div className="pa-timeline__track">
                {LIFECYCLE.map((step, i) => (
                  <div key={step.label} className="pa-timeline__step" role="listitem">
                    <span className="pa-timeline__dot" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="pa-timeline__card">
                      <span>{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crawlable list fallback for SEO (visible structure also in timeline) */}
            <p className="pa-muted pa-center pa-mt-md" style={{ fontSize: '0.9rem', maxWidth: '42rem', marginInline: 'auto' }}>
              Create auction → invite players → registration → payment → review → categorize → teams →
              purse → sponsors → live bidding → allocation → analytics.
            </p>

            <div className="pa-center pa-mt-lg pa-reveal">
              <Link to="/how-it-works" className="pa-btn pa-btn--secondary">
                See how PowerAuction works <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== REGISTRATION ===== */}
        <section className="pa-section pa-container" id="registration" aria-labelledby="registration-heading">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Player registration"
                title="Create player registration forms and share the link"
                lead="Build a custom registration form for your league, share one link, and collect complete player profiles online."
              />
              <ul className="pa-list">
                <CheckItem>Create custom registration forms with sport-specific fields</CheckItem>
                <CheckItem>Share registration links via WhatsApp, email, social, or direct URL</CheckItem>
                <CheckItem>Accept online registrations from any device</CheckItem>
                <CheckItem>Track successful registrations in the organizer dashboard</CheckItem>
              </ul>
              <div className="pa-inline pa-mt-md" style={{ color: 'var(--pa-slate-400)', fontSize: '0.875rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={16} aria-hidden="true" /> Email
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Share2 size={16} aria-hidden="true" /> Social
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Link2 size={16} aria-hidden="true" /> Direct link
                </span>
              </div>
              <Link to="/player-registration" className="pa-btn pa-btn--primary pa-mt-lg">
                Player registration details <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <RegistrationMock />
            </div>
          </div>

          <div className="pa-split" style={{ marginTop: 'clamp(3rem, 6vw, 5rem)' }}>
            <div className="pa-reveal pa-img-frame">
              <MarketingImage
                name="player-registration-payment-sports-auction"
                alt="Player registration invitation, profile form, payment checkout, and confirmation workflow"
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Payments"
                title="Collect registration payments when required"
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
        <section className="pa-section pa-bg-radial-soft" aria-labelledby="player-mgmt-heading">
          <div className="pa-container">
            <div className="pa-split pa-split--reverse">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Player management"
                  title="Manage and categorize registered players"
                  lead="Search, filter, and review every registration. Assign configurable categories before the auction starts."
                />
                <ul className="pa-list">
                  <CheckItem>Player list with search and filters</CheckItem>
                  <CheckItem>Registration and payment status</CheckItem>
                  <CheckItem>Player profiles and statistics</CheckItem>
                  <CheckItem>Configurable categories for your league rules</CheckItem>
                </ul>
                <div className="pa-cats" aria-label="Example player categories">
                  {CATEGORIES.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <p className="pa-illus-note">Example categories — fully configurable per auction.</p>
              </div>
              <div className="pa-reveal pa-reveal-delay-2">
                <PlayerManagementMock />
              </div>
            </div>
          </div>
        </section>

        {/* ===== TEAM & PURSE ===== */}
        <section className="pa-section pa-container" id="teams" aria-labelledby="teams-heading">
          <div className="pa-split">
            <div className="pa-reveal pa-container--wide" style={{ maxWidth: '100%' }}>
              <TeamManagementMock />
              <p className="pa-illus-note">Illustrative team purse view — sample amounts only.</p>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <SectionHeading
                eyebrow="Team management"
                title="Build teams and allocate purses"
                lead="Create franchises with logos and owners, set purse values, and track auction economics as players are sold."
              />
              <ul className="pa-list">
                <CheckItem>Team name, logo, and owner assignment</CheckItem>
                <CheckItem>Allocated purse / budget per team</CheckItem>
                <CheckItem>Spent amount and remaining purse</CheckItem>
                <CheckItem>Players acquired and squad size</CheckItem>
              </ul>
              <Link to="/team-management" className="pa-btn pa-btn--secondary pa-mt-lg">
                Team management <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== LIVE AUCTION (immersive) ===== */}
        <section
          className="pa-bleed pa-bleed--immersive"
          id="live-auction"
          aria-labelledby="live-auction-heading"
        >
          <div className="pa-container pa-container--wide" style={{ position: 'relative', zIndex: 1 }}>
            <SectionHeading
              center
              eyebrow="Live auction"
              title="Run the live player auction with broadcast-quality control"
              lead="Current player, statistics, base price, highest bid, countdown, and team purses — designed for operators and displays under pressure."
              className="pa-reveal pa-mb-lg"
            />
            <div className="pa-reveal pa-mb-lg">
              <LiveAuctionMock />
              <p className="pa-illus-note pa-center">Illustrative live auction interface.</p>
            </div>
            <div className="pa-split" style={{ marginTop: '2.5rem' }}>
              <div className="pa-reveal pa-img-frame">
                <MarketingImage
                  name="cricket-player-auction-player-card"
                  alt="Professional sports auction player card with statistics and live bid activity"
                  sizes="(max-width: 1024px) 100vw, 640px"
                />
              </div>
              <div className="pa-stack pa-reveal pa-reveal-delay-2">
                <SectionHeading
                  eyebrow="Player selection"
                  title="Professional player cards and fair next-player selection"
                  lead="Present a broadcast-style player card with photo, role, category, base price, and key stats. Use spin-to-select for the next player — exciting, structured, and professional."
                />
                <SpinSelectMock />
                <Link to="/live-auction" className="pa-btn pa-btn--primary">
                  Explore live auction <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SAFE BIDDING ===== */}
        <section className="pa-section pa-container" aria-labelledby="safe-bidding-heading">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Safe bidding"
                title="Power safe, real-time bidding"
                lead="Team owners see the current highest bid, their next amount, remaining purse, and confirm before the bid is placed."
              />
              <ul className="pa-list">
                <CheckItem>Clear bid amount and increment options</CheckItem>
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
              <div
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--pa-gold-soft)',
                }}
              >
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
                  background: 'linear-gradient(135deg, var(--pa-brand), var(--pa-brand-deep))',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                Confirm bid · ₹1,10,000
              </div>
              <p className="pa-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.75rem' }}>
                Reliability first — every bid is intentional.
              </p>
              <p className="pa-illus-note">Illustrative bidding panel.</p>
            </div>
          </div>
        </section>

        {/* ===== TEAM OWNER ===== */}
        <section className="pa-section pa-bg-radial-soft" aria-labelledby="owner-heading">
          <div className="pa-container">
            <div className="pa-split pa-split--reverse">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Team owner dashboard"
                  title="Give team owners a real-time dashboard"
                  lead="Share a private link with each franchise. Owners track purse, squad, spending, and the current auction player as it happens."
                />
                <ul className="pa-list">
                  <CheckItem>Purse, spent, remaining, and squad size</CheckItem>
                  <CheckItem>Acquired players and spending history</CheckItem>
                  <CheckItem>Live view of the player on the block</CheckItem>
                  <CheckItem>Bid status without cluttering the control room</CheckItem>
                </ul>
              </div>
              <div className="pa-reveal pa-reveal-delay-2">
                <TeamOwnerDashboardMock />
              </div>
            </div>
            <div className="pa-reveal pa-mt-xl pa-img-frame" style={{ maxWidth: '56rem', marginInline: 'auto' }}>
              <MarketingImage
                name="sports-auction-team-purse-dashboard"
                alt="Team owner real-time dashboard showing purse remaining, squad composition, and acquired players"
                sizes="(max-width: 900px) 100vw, 896px"
              />
            </div>
          </div>
        </section>

        {/* ===== ANALYTICS ===== */}
        <section className="pa-section pa-container" id="analytics" aria-labelledby="analytics-heading">
          <div className="pa-split">
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Auction analytics"
                title="Track auction spending and analytics"
                lead="Organizer dashboards surface registrations, bids, spend, and team comparisons — focused, not noisy."
              />
              <ul className="pa-list">
                <CheckItem>Players registered, approved, and auctioned</CheckItem>
                <CheckItem>Total bids, purse allocated vs spent</CheckItem>
                <CheckItem>Average price and highest bid</CheckItem>
                <CheckItem>Team spending comparison</CheckItem>
              </ul>
              <Link to="/auction-dashboard" className="pa-btn pa-btn--secondary pa-mt-lg">
                Organizer dashboard <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="pa-reveal pa-reveal-delay-2">
              <AnalyticsMock />
              <p className="pa-illus-note">Illustrative analytics UI — sample data only.</p>
            </div>
          </div>
        </section>

        {/* ===== SPONSORS ===== */}
        <section className="pa-section pa-section--tight pa-container" aria-labelledby="sponsors-heading">
          <div className="pa-split">
            <div className="pa-reveal pa-reveal-delay-1">
              <SponsorsMock />
            </div>
            <div className="pa-reveal">
              <SectionHeading
                eyebrow="Sponsors"
                title="Add sponsors and event branding"
                lead="Upload sponsor logos, associate them with the auction, and display branding on live screens."
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
        <section className="pa-section pa-bg-radial-soft" id="sports" aria-labelledby="sports-heading">
          <div className="pa-container">
            <div className="pa-split">
              <div className="pa-reveal">
                <SectionHeading
                  eyebrow="Multi-sport"
                  title="Built for cricket, football and other sports"
                  lead="The same auction platform adapts to different sports and tournament formats — franchise leagues, corporate cups, and school competitions."
                />
                <div className="pa-sports pa-mt-md">
                  {SPORTS.map((s) => (
                    <span key={s} className="pa-sport-pill">
                      {s}
                    </span>
                  ))}
                </div>
                <Link to="/sports" className="pa-btn pa-btn--secondary pa-mt-lg">
                  Sports supported <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className="pa-reveal pa-reveal-delay-2 pa-img-frame">
                <MarketingImage
                  name="multi-sport-player-auction-platform"
                  alt="Multi-sport player auction platform for cricket, football, and basketball leagues"
                  sizes="(max-width: 1024px) 100vw, 560px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="pa-section pa-container" id="how-it-works" aria-labelledby="how-heading">
          <SectionHeading
            center
            eyebrow="Workflow"
            title="How PowerAuction works"
            lead="Set up before auction day, run live with confidence, and review results when the last player is sold."
            className="pa-reveal pa-mb-lg"
          />
          <div className="pa-steps">
            <article className="pa-step pa-reveal">
              <div className="pa-step__num" aria-hidden="true">
                01
              </div>
              <h3>Prepare</h3>
              <p>
                Create the auction, open registration, collect payments, review players, set categories,
                build teams, allocate purses, and add sponsors.
              </p>
            </article>
            <article className="pa-step pa-reveal pa-reveal-delay-1">
              <div className="pa-step__num" aria-hidden="true">
                02
              </div>
              <h3>Auction live</h3>
              <p>
                Select players, present cards and stats, take bids with countdown control, and keep every
                team&apos;s purse and squad in sync.
              </p>
            </article>
            <article className="pa-step pa-reveal pa-reveal-delay-2">
              <div className="pa-step__num" aria-hidden="true">
                03
              </div>
              <h3>Report</h3>
              <p>
                Review sold players, team compositions, spending analytics, and export what your league
                needs after the event.
              </p>
            </article>
          </div>
          <div className="pa-center pa-mt-lg pa-reveal">
            <Link to="/how-it-works" className="pa-btn pa-btn--ghost" style={{ color: 'var(--pa-brand-bright)' }}>
              Full workflow guide <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ===== WHY ===== */}
        <section className="pa-section pa-section--tight pa-bg-radial-soft" aria-labelledby="why-heading">
          <div className="pa-container">
            <SectionHeading
              center
              eyebrow="Why organizers choose PowerAuction"
              title="Professional sports auctions without the operational mess"
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

        {/* ===== FAQ ===== */}
        <section className="pa-section pa-container" id="faq" aria-labelledby="faq-heading">
          <SectionHeading
            center
            eyebrow="FAQ"
            title="Frequently asked questions"
            lead="Straight answers about sports player auction software, registration, bidding, and multi-sport support."
            className="pa-reveal pa-mb-lg"
          />
          <div className="pa-faq pa-reveal">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <div className="pa-faq__body">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="pa-center pa-mt-lg pa-reveal">
            <Link to="/contact" className="pa-btn pa-btn--secondary">
              Still have questions? Book a demo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="pa-section pa-container" aria-labelledby="cta-heading">
          <div className="pa-cta-band pa-reveal">
            <div className="pa-cta-band__bg">
              <MarketingImage
                name="sports-auction-event-room"
                alt="Professional sports player auction event room with teams ready to bid"
                sizes="100vw"
              />
            </div>
            <div className="pa-cta-band__overlay" />
            <div className="pa-cta-band__content">
              <p className="pa-eyebrow">Ready when your league is</p>
              <h2 id="cta-heading" className="pa-h2 pa-mt-sm">
                Ready to run your next auction?
              </h2>
              <p className="pa-lead pa-mt-md" style={{ color: 'var(--pa-slate-300)' }}>
                Bring player registration, team management, live bidding, and auction analytics into one
                platform.
              </p>
              <div className="pa-hero__ctas">
                <Link to="/contact" className="pa-btn pa-btn--gold pa-btn--lg">
                  Book a Demo <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link to="/how-it-works" className="pa-btn pa-btn--secondary pa-btn--lg">
                  See How It Works
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
