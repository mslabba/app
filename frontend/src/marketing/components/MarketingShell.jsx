import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import '../design.css';

const PRIMARY_NAV = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/sports', label: 'Sports' },
  { to: '/pricing', label: 'Pricing' },
];

const LOGO_SRC = '/images/sports/logo-final.png';

function Logo({ className = '' }) {
  return (
    <Link to="/" className={`pa-nav__logo ${className}`} aria-label="PowerAuction home">
      <img
        src={LOGO_SRC}
        alt=""
        className="pa-nav__logo-mark"
        width={40}
        height={40}
        decoding="async"
      />
      <span className="pa-nav__logo-text">
        <span className="pa-nav__logo-name">
          Power<span className="pa-nav__logo-accent">Auction</span>
        </span>
        <span className="pa-nav__logo-tagline">Powered by Turgut</span>
      </span>
    </Link>
  );
}

export { LOGO_SRC };

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className={`pa-nav ${scrolled || open ? 'pa-nav--scrolled' : ''}`}>
      <div className="pa-container pa-nav__inner">
        <Logo />

        <nav className="pa-nav__links" aria-label="Primary">
          {PRIMARY_NAV.map((link) => (
            <NavLink
              key={link.to + link.label}
              to={link.to}
              className={({ isActive }) =>
                `pa-nav__link${isActive ? ' pa-nav__link--active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pa-nav__actions">
          <Link
            to="/login"
            className="pa-btn pa-btn--ghost pa-btn--sm pa-nav__login"
            style={{ color: 'var(--pa-slate-300)' }}
          >
            Login
          </Link>
          <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--sm pa-nav__demo">
            Book a Demo
          </Link>
          <button
            type="button"
            className="pa-nav__burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className={`pa-nav__mobile${open ? ' open' : ''}`} id="mobile-nav">
        {PRIMARY_NAV.map((link) => (
          <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link to="/player-registration" onClick={() => setOpen(false)}>
          Player Registration
        </Link>
        <Link to="/live-auction" onClick={() => setOpen(false)}>
          Live Auction
        </Link>
        <Link to="/team-management" onClick={() => setOpen(false)}>
          Team Management
        </Link>
        <Link to="/auction-dashboard" onClick={() => setOpen(false)}>
          Dashboard
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', padding: '0 0.5rem' }}>
          <Link to="/login" className="pa-btn pa-btn--secondary pa-btn--sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link to="/contact" className="pa-btn pa-btn--primary pa-btn--sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>
            Book a Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="pa-footer">
      <div className="pa-container">
        <div className="pa-footer__grid">
          <div className="pa-footer__brand">
            <Logo />
            <p>Professional sports auction management. From player registration to the final bid — one platform.</p>
          </div>

          <div className="pa-footer__col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/player-registration">Player Registration</Link>
            <Link to="/live-auction">Live Auction</Link>
            <Link to="/team-management">Team Management</Link>
            <Link to="/auction-dashboard">Analytics</Link>
          </div>

          <div className="pa-footer__col">
            <h4>Company</h4>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/sports">Sports</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="pa-footer__col">
            <h4>Legal</h4>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/login">Login</Link>
            <Link to="/contact">Book a Demo</Link>
          </div>
        </div>

        <div className="pa-footer__bottom">
          <span>© {new Date().getFullYear()} PowerAuction. All rights reserved.</span>
          <span>Built for league organizers who run real auctions.</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }) {
  return (
    <div className="pa-site">
      <a href="#main-content" className="pa-skip-link">
        Skip to main content
      </a>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lead, center = false, className = '', id }) {
  return (
    <div className={`${center ? 'pa-center' : ''} ${className}`.trim()} id={id}>
      {eyebrow && <p className="pa-eyebrow pa-mb-sm">{eyebrow}</p>}
      {title && <h2 className="pa-h2 pa-mb-md">{title}</h2>}
      {lead && <p className="pa-lead">{lead}</p>}
    </div>
  );
}

/** Optimized marketing image with WebP + JPEG fallback */
export function MarketingImage({
  name,
  alt,
  className = '',
  width = 1600,
  height = 900,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 720px',
}) {
  const base = `/images/marketing/${name}`;
  return (
    <picture className={`pa-picture ${className}`.trim()}>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        src={`${base}.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'async' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={sizes}
      />
    </picture>
  );
}

export function CTAGroup({ primaryTo = '/contact', primaryLabel = 'Book a Demo', secondaryTo = '/how-it-works', secondaryLabel = 'See How It Works', tertiaryTo, tertiaryLabel }) {
  return (
    <div className="pa-hero__ctas">
      <Link to={primaryTo} className="pa-btn pa-btn--primary pa-btn--lg">
        {primaryLabel}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <Link to={secondaryTo} className="pa-btn pa-btn--secondary pa-btn--lg">
        {secondaryLabel}
      </Link>
      {tertiaryTo && tertiaryLabel && (
        <Link to={tertiaryTo} className="pa-btn pa-btn--ghost pa-btn--lg" style={{ color: 'var(--pa-slate-300)' }}>
          {tertiaryLabel}
        </Link>
      )}
    </div>
  );
}

export default MarketingShell;
