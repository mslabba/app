/**
 * Generates one static HTML page per auction at:
 *   build/auctions/<eventId>/register/index.html
 *
 * Why this exists: link-preview crawlers (WhatsApp, Telegram, Facebook) do
 * NOT run JavaScript, so they only see the static HTML GitHub Pages serves.
 * The React app's runtime document.title change cannot affect previews —
 * the event name must be in the HTML itself. Each generated page is a copy
 * of build/index.html with event-specific <title> and Open Graph / Twitter
 * tags, so a shared registration link previews with the event name. The
 * page still boots the same app bundle, and React Router renders the
 * registration page as usual.
 *
 * Runs automatically as the `postbuild` step (see package.json), so the
 * normal `npm run deploy` flow publishes the pages. It never fails the
 * build: if the backend is unreachable, it prints a loud warning and the
 * deploy proceeds with the generic preview. Run the build again after the
 * backend is reachable to regenerate.
 *
 * Event source: GET <backend>/api/public/auctions (public share fields).
 * Backend URL resolution: REACT_APP_BACKEND_URL env, then
 * frontend/.env.production, then the production backend.
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://thepowerauction.com';
const FALLBACK_BACKEND_URL = 'https://power-auction-app-production.up.railway.app';
const ROOT = path.join(__dirname, '..');
const BUILD_INDEX = path.join(ROOT, 'build', 'index.html');

function resolveBackendUrl() {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  try {
    const envFile = fs.readFileSync(path.join(ROOT, '.env.production'), 'utf8');
    const match = envFile.match(/^REACT_APP_BACKEND_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch (_) {
    // No .env.production — fall through to the default.
  }
  return FALLBACK_BACKEND_URL;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Replace the content of a <meta property|name="key" ...> tag, or insert
// the tag before </head> when it is absent.
function setMeta(html, attr, key, value) {
  const escaped = escapeAttr(value);
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${key}" content="${escaped}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n</head>`);
}

function setTitle(html, title) {
  const escaped = escapeAttr(title);
  if (/<title>[^<]*<\/title>/.test(html)) {
    return html.replace(/<title>[^<]*<\/title>/, `<title>${escaped}</title>`);
  }
  return html.replace('</head>', `    <title>${escaped}</title>\n</head>`);
}

function setCanonical(html, href) {
  const re = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/;
  const tag = `<link rel="canonical" href="${escapeAttr(href)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n</head>`);
}

function absImage(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return SITE_URL + trimmed;
  return `${SITE_URL}/${trimmed}`;
}

async function main() {
  if (!fs.existsSync(BUILD_INDEX)) {
    console.warn(
      '\n⚠️  WARNING: build/index.html not found — skipping event page generation.\n'
    );
    return;
  }
  const baseHtml = fs.readFileSync(BUILD_INDEX, 'utf8');
  const backendUrl = resolveBackendUrl().replace(/\/$/, '');

  let events;
  try {
    const res = await fetch(`${backendUrl}/api/public/auctions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    events = await res.json();
  } catch (err) {
    console.warn(`\n⚠️  WARNING: could not fetch events from ${backendUrl} (${err.message}).`);
    console.warn('   Event registration pages were NOT generated — shared links will show the generic preview.');
    console.warn('   Make sure the backend is deployed with GET /api/public/auctions, then run the build again.\n');
    return;
  }
  if (!Array.isArray(events)) {
    console.warn('\n⚠️  WARNING: unexpected response from /api/public/auctions — no event pages generated.\n');
    return;
  }

  let generated = 0;
  for (const event of events) {
    if (!event.id || !event.name) continue;
    const pageUrl = `${SITE_URL}/auctions/${event.id}/register`;
    const title = `${event.name} — Player Registration | PowerAuction`;
    const description =
      stripHtml(event.description).slice(0, 200) ||
      `Register as a player for ${event.name} on PowerAuction.`;
    const image = absImage(event.banner_url || event.logo_url);

    let html = baseHtml;
    html = setTitle(html, title);
    html = setMeta(html, 'name', 'title', title);
    html = setMeta(html, 'name', 'description', description);
    html = setMeta(html, 'property', 'og:url', pageUrl);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', description);
    if (image) html = setMeta(html, 'property', 'og:image', image);
    html = setMeta(html, 'property', 'twitter:url', pageUrl);
    html = setMeta(html, 'property', 'twitter:title', title);
    html = setMeta(html, 'property', 'twitter:description', description);
    if (image) html = setMeta(html, 'property', 'twitter:image', image);
    html = setCanonical(html, pageUrl);

    const outDir = path.join(ROOT, 'build', 'auctions', String(event.id), 'register');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    generated += 1;
  }
  console.log(`✅ Generated ${generated} event registration page(s) under build/auctions/`);
}

main().catch((err) => {
  console.warn(`\n⚠️  WARNING: event page generation failed (${err.message}) — continuing with generic preview.\n`);
});
