import React from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Gavel,
} from 'lucide-react';

function DeviceChrome({ title, children, wide }) {
  return (
    <div className="pa-device" style={wide ? { maxWidth: '100%' } : undefined}>
      <div className="pa-device__bar">
        <span className="pa-device__dot" />
        <span className="pa-device__dot" />
        <span className="pa-device__dot" />
        <span className="pa-device__title">{title}</span>
      </div>
      <div className="pa-device__body">{children}</div>
    </div>
  );
}

/** Player management table mock */
export function PlayerManagementMock() {
  const players = [
    { init: 'RK', name: 'Rahul K.', role: 'All-rounder', cat: 'Icon', pay: 'Paid', status: 'Approved' },
    { init: 'AS', name: 'A. Sharma', role: 'Batsman', cat: 'Category A', pay: 'Paid', status: 'Approved' },
    { init: 'MP', name: 'M. Patel', role: 'Bowler', cat: 'Emerging', pay: 'Pending', status: 'Review' },
    { init: 'JS', name: 'J. Singh', role: 'WK', cat: 'Local', pay: 'Paid', status: 'Approved' },
    { init: 'TD', name: 'T. Dias', role: 'Overseas', cat: 'Overseas', pay: 'Paid', status: 'Approved' },
  ];

  return (
    <DeviceChrome title="Player Management · Premier Cup 2026">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: '8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.65rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--pa-border)',
            background: 'rgba(0,0,0,0.25)',
            color: 'var(--pa-slate-400)',
            fontSize: '0.75rem',
          }}
        >
          <Search size={14} /> Search players…
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.65rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--pa-border)',
            fontSize: '0.75rem',
            color: 'var(--pa-slate-300)',
          }}
        >
          <Filter size={14} /> Category
        </div>
      </div>

      <div className="pa-stat-grid pa-stat-grid--4" style={{ marginBottom: '0.85rem' }}>
        <div className="pa-stat">
          <div className="pa-stat__label">Registered</div>
          <div className="pa-stat__value">248</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Paid</div>
          <div className="pa-stat__value pa-stat__value--blue">231</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Approved</div>
          <div className="pa-stat__value">214</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">In review</div>
          <div className="pa-stat__value pa-stat__value--gold">17</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="pa-mock-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Role</th>
              <th>Category</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.name}>
                <td>
                  <div className="pa-mock-row">
                    <span className="pa-mock-avatar">{p.init}</span>
                    <span>{p.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--pa-slate-400)' }}>{p.role}</td>
                <td>
                  <span className="pa-badge" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                    {p.cat}
                  </span>
                </td>
                <td>
                  <span
                    className={p.pay === 'Paid' ? 'pa-badge pa-badge--success' : 'pa-badge pa-badge--gold'}
                    style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                  >
                    {p.pay}
                  </span>
                </td>
                <td style={{ color: p.status === 'Approved' ? '#86efac' : 'var(--pa-gold-soft)' }}>
                  {p.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DeviceChrome>
  );
}

/** Team & purse management mock */
export function TeamManagementMock() {
  const teams = [
    { name: 'Falcons', spent: '6.75L', remain: '3.25L', players: '8/15', color: '#e11d2e' },
    { name: 'Titans', spent: '5.20L', remain: '4.80L', players: '6/15', color: '#e8b923' },
    { name: 'Lions', spent: '7.10L', remain: '2.90L', players: '9/15', color: '#22c55e' },
    { name: 'Eagles', spent: '4.50L', remain: '5.50L', players: '5/15', color: '#ff7a84' },
  ];

  return (
    <DeviceChrome title="Team Management · Purse & Squad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--pa-slate-400)' }}>4 teams · ₹40L total purse</span>
        <span className="pa-badge pa-badge--gold">Squad max 15</span>
      </div>
      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {teams.map((t) => (
          <div
            key={t.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.75rem 0.85rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--pa-border)',
              background: 'rgba(0,0,0,0.22)',
            }}
          >
            <div className="pa-mock-row">
              <span
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  background: `${t.color}22`,
                  border: `1px solid ${t.color}55`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: t.color,
                }}
              >
                {t.name[0]}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-500)' }}>Owner assigned</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Spent</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>₹{t.spent}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Remaining</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pa-gold-soft)' }}>₹{t.remain}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Squad</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.players}</div>
            </div>
          </div>
        ))}
      </div>
    </DeviceChrome>
  );
}

/** Live auction + player card + safe bidding mock */
export function LiveAuctionMock() {
  return (
    <DeviceChrome title="Live Auction · Premier Cup 2026" wide>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span className="pa-badge pa-badge--live">LIVE</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--pa-slate-400)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} /> 00:00:18
        </span>
      </div>

      <div className="pa-auction-mock">
        <div className="pa-player-card-mock">
          <div className="pa-player-card-mock__top">
            <div className="pa-mock-row" style={{ gap: '0.75rem' }}>
              <div className="pa-player-card-mock__photo">SR</div>
              <div className="pa-player-card-mock__meta">
                <span className="pa-badge pa-badge--gold">Icon Player</span>
                <h4>Southn Rattan</h4>
                <p>All-rounder · Base ₹50,000</p>
              </div>
            </div>
          </div>

          <div className="pa-player-card-mock__stats">
            <div className="pa-player-card-mock__stat">
              <strong>285</strong>
              <span>Mats</span>
            </div>
            <div className="pa-player-card-mock__stat">
              <strong>9850</strong>
              <span>Runs</span>
            </div>
            <div className="pa-player-card-mock__stat">
              <strong>42.1</strong>
              <span>Avg</span>
            </div>
            <div className="pa-player-card-mock__stat">
              <strong>148</strong>
              <span>SR</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current bid
              </div>
              <div className="pa-bid-amount">₹1,00,000</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Highest bidder</div>
              <div style={{ fontWeight: 600, color: 'var(--pa-blue-bright)', fontSize: '0.9rem' }}>Falcons</div>
            </div>
          </div>
        </div>

        <div className="pa-bid-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--pa-slate-400)' }}>
            <Shield size={14} style={{ color: 'var(--pa-blue-bright)' }} /> Safe bid panel · Falcons
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Your remaining purse</div>
            <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 700, fontSize: '1.15rem' }}>₹3,25,000</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)', marginBottom: '0.35rem' }}>Next bid</div>
            <div className="pa-bid-btn-row">
              <div className="pa-bid-chip pa-bid-chip--active">₹1,10,000</div>
              <div className="pa-bid-chip">+10k</div>
              <div className="pa-bid-chip">+25k</div>
              <div className="pa-bid-chip">+50k</div>
            </div>
          </div>
          <div
            style={{
              marginTop: '0.25rem',
              padding: '0.7rem',
              borderRadius: '0.6rem',
              background: 'linear-gradient(135deg, var(--pa-blue), var(--pa-blue-deep))',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'white',
            }}
          >
            Confirm bid · ₹1,10,000
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)', textAlign: 'center' }}>
            Bid confirms only after you review the amount
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['Falcons', 'Titans', 'Lions', 'Eagles'].map((t, i) => (
            <span
              key={t}
              style={{
                fontSize: '0.7rem',
                padding: '0.3rem 0.55rem',
                borderRadius: '999px',
                border: '1px solid var(--pa-border)',
                color: i === 0 ? 'var(--pa-blue-bright)' : 'var(--pa-slate-400)',
                background: i === 0 ? 'rgba(225,29,46,0.12)' : 'transparent',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--pa-gold-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Gavel size={14} /> Next: Spin to select
        </span>
      </div>
    </DeviceChrome>
  );
}

/** Team owner dashboard mock */
export function TeamOwnerDashboardMock() {
  const squad = [
    { name: 'R. Khan', role: 'AR', price: '₹1.2L' },
    { name: 'A. Mehta', role: 'BAT', price: '₹95k' },
    { name: 'S. Rao', role: 'BOWL', price: '₹80k' },
    { name: 'P. Nair', role: 'WK', price: '₹70k' },
  ];

  return (
    <DeviceChrome title="Team Dashboard · Falcons">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-500)' }}>Secure team link · Live</div>
          <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 700, fontSize: '1.15rem' }}>Falcons</div>
        </div>
        <span className="pa-badge pa-badge--live">Real-time</span>
      </div>

      <div className="pa-stat-grid" style={{ marginBottom: '0.85rem' }}>
        <div className="pa-stat">
          <div className="pa-stat__label">Purse</div>
          <div className="pa-stat__value">₹10,00,000</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Spent</div>
          <div className="pa-stat__value">₹6,75,000</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Remaining</div>
          <div className="pa-stat__value pa-stat__value--gold">₹3,25,000</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Players</div>
          <div className="pa-stat__value pa-stat__value--blue">8 / 15</div>
        </div>
      </div>

      <div className="pa-owner-layout">
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--pa-border)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-500)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={12} /> Acquired players
          </div>
          {squad.map((p) => (
            <div
              key={p.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                padding: '0.3rem 0',
                borderBottom: '1px solid rgba(148,163,184,0.08)',
              }}
            >
              <span>
                {p.name} <span style={{ color: 'var(--pa-slate-500)' }}>{p.role}</span>
              </span>
              <span style={{ color: 'var(--pa-gold-soft)' }}>{p.price}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(225,29,46,0.3)',
            background: 'rgba(225,29,46,0.08)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-500)', marginBottom: '0.5rem' }}>On the block</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Southn Rattan</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--pa-slate-400)', margin: '0.25rem 0 0.6rem' }}>Icon · All-rounder</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)' }}>Current bid</div>
          <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 800, fontSize: '1.35rem', color: 'var(--pa-gold-soft)' }}>
            ₹1,00,000
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--pa-blue-bright)' }}>You are highest bidder</div>
        </div>
      </div>
    </DeviceChrome>
  );
}

/** Analytics mock */
export function AnalyticsMock() {
  const bars = [72, 55, 88, 40, 95, 62, 78, 48];
  const labels = ['F', 'T', 'L', 'E', 'W', 'S', 'R', 'K'];

  return (
    <DeviceChrome title="Auction Analytics · Organizer">
      <div className="pa-stat-grid pa-stat-grid--4" style={{ marginBottom: '1rem' }}>
        <div className="pa-stat">
          <div className="pa-stat__label">Registered</div>
          <div className="pa-stat__value">248</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Auctioned</div>
          <div className="pa-stat__value">142</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Total bids</div>
          <div className="pa-stat__value pa-stat__value--blue">1,284</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat__label">Highest bid</div>
          <div className="pa-stat__value pa-stat__value--gold">₹2.4L</div>
        </div>
      </div>

      <div className="pa-analytics-layout">
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--pa-border)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--pa-slate-400)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Team spending comparison
          </div>
          <div className="pa-chart-bars" style={{ marginBottom: '1.4rem' }}>
            {bars.map((h, i) => (
              <div key={labels[i]} className="pa-chart-bar" style={{ height: `${h}%` }}>
                <span>{labels[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { label: 'Purse allocated', value: '₹40,00,000' },
            { label: 'Purse spent', value: '₹28,40,000' },
            { label: 'Avg. player price', value: '₹48,200' },
            { label: 'Players remaining', value: '106' },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.55rem 0.7rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--pa-border)',
                background: 'rgba(0,0,0,0.18)',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ color: 'var(--pa-slate-400)' }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </DeviceChrome>
  );
}

/** Registration form mock */
export function RegistrationMock() {
  return (
    <DeviceChrome title="Player Registration · Public form">
      <div style={{ marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-500)' }}>Premier Cup 2026</div>
        <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 700 }}>Join the auction pool</div>
      </div>
      <div style={{ display: 'grid', gap: '0.55rem' }}>
        {[
          { label: 'Full name', value: 'Rahul Krishnan' },
          { label: 'Mobile', value: '+91 98XXX XXX21' },
          { label: 'Playing role', value: 'All-rounder' },
          { label: 'City / region', value: 'Bengaluru' },
        ].map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: '0.65rem', color: 'var(--pa-slate-500)', marginBottom: '0.2rem' }}>{f.label}</div>
            <div
              style={{
                padding: '0.55rem 0.7rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--pa-border)',
                background: 'rgba(0,0,0,0.25)',
                fontSize: '0.85rem',
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: '0.35rem',
            padding: '0.75rem',
            borderRadius: '0.65rem',
            border: '1px solid rgba(232,185,35,0.35)',
            background: 'rgba(232,185,35,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--pa-slate-400)' }}>Registration fee</div>
            <div style={{ fontWeight: 700, color: 'var(--pa-gold-soft)' }}>₹500</div>
          </div>
          <div
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, var(--pa-gold-soft), var(--pa-gold-deep))',
              color: '#1a1200',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            Pay & submit
          </div>
        </div>
      </div>
    </DeviceChrome>
  );
}

/** Spin / next player selector mock */
export function SpinSelectMock() {
  return (
    <div
      className="pa-card pa-card--elevated"
      style={{ padding: '1.25rem', textAlign: 'center' }}
    >
      <div style={{ fontSize: '0.75rem', color: 'var(--pa-slate-400)', marginBottom: '0.75rem' }}>
        Next player selection
      </div>
      <div
        style={{
          width: '7.5rem',
          height: '7.5rem',
          margin: '0 auto 1rem',
          borderRadius: '50%',
          border: '3px solid rgba(225,29,46,0.4)',
          background:
            'conic-gradient(from 0deg, #b01020, #e11d2e, #e8b923, #6b121c, #ff4d5a, #b01020)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 0 32px rgba(225,29,46,0.25)',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '5.2rem',
            height: '5.2rem',
            borderRadius: '50%',
            background: 'var(--pa-navy-900)',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--pa-border-strong)',
          }}
        >
          <div style={{ fontFamily: 'var(--pa-font-display)', fontWeight: 800, fontSize: '0.95rem' }}>SPIN</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--pa-slate-500)' }}>Select player</div>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--pa-slate-400)', margin: 0 }}>
        Fair random selection for the next player on the block — professional, not casino.
      </p>
    </div>
  );
}

/** Sponsor strip mock */
export function SponsorsMock() {
  const sponsors = ['Apex Sports', 'City Bank', 'NovaTel', 'Pulse Gear', 'Metro FM'];
  return (
    <div className="pa-device">
      <div className="pa-device__bar">
        <span className="pa-device__dot" />
        <span className="pa-device__dot" />
        <span className="pa-device__dot" />
        <span className="pa-device__title">Sponsor branding · Live display</span>
      </div>
      <div className="pa-device__body">
        <div style={{ fontSize: '0.75rem', color: 'var(--pa-slate-400)', marginBottom: '0.75rem' }}>
          Logos appear on auction displays and team views
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
          {sponsors.map((s, i) => (
            <div
              key={s}
              style={{
                flex: '1 1 5.5rem',
                minWidth: '5rem',
                padding: '1rem 0.5rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--pa-border)',
                background: i % 2 === 0 ? 'rgba(225,29,46,0.08)' : 'rgba(232,185,35,0.06)',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--pa-slate-300)',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckItem({ children }) {
  return (
    <li>
      <CheckCircle2 size={18} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export { DeviceChrome };
