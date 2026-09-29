import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MarketingShell } from '../components/MarketingShell';

export const POST = {
  title: "What Is a Sports Player Auction? A Complete Guide",
  slug: '/blog/what-is-a-sports-player-auction',
  date: '29 September 2026',
  dateIso: '2026-09-29',
  metaTitle: 'What Is a Sports Player Auction? A Guide',
  metaDescription:
    'A sports player auction lets teams bid for players against a purse you set. This guide covers registration, categories, live bidding, and allocation.',
  excerpt: "A sports player auction is a live event where teams bid for players, one at a time. Each team spends from a purse the organizer sets. When a player is sold, that player joins the winning team’s squad and the price comes off that team’s purse.",
  image: '/images/marketing/what-is-a-sports-player-auction.jpg',
  imageAlt:
    'Team owners at a table watching a cricket player card on a large screen, with an operator at a side desk.',
};

function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    const selectors = [
      'meta[name="description"]',
      'meta[name="title"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="twitter:title"]',
      'meta[property="twitter:description"]',
    ];
    const prev = selectors.map((sel) => {
      const el = document.querySelector(sel);
      return [el, el ? el.getAttribute('content') : null];
    });
    const set = (sel, value) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute('content', value);
    };
    document.title = title;
    set('meta[name="description"]', description);
    set('meta[name="title"]', title);
    set('meta[property="og:title"]', title);
    set('meta[property="og:description"]', description);
    set('meta[property="twitter:title"]', title);
    set('meta[property="twitter:description"]', description);
    return () => {
      document.title = prevTitle;
      prev.forEach(([el, value]) => {
        if (el && value != null) el.setAttribute('content', value);
      });
    };
  }, [title, description]);
}

export function BlogIndexPage() {
  usePageMeta(
    'Blog — PowerAuction',
    'Guides for organizers running a sports player auction, from registration and categories to live bidding.'
  );

  return (
    <MarketingShell>
      <div className="pa-bg-radial">
        <section className="pa-page-hero pa-container">
          <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Blog</p>
          <h1 className="pa-h1 pa-mt-sm">Guides for running a player auction</h1>
          <p className="pa-lead pa-mt-md">
            Practical notes on how a sports player auction works, written for organizers.
          </p>
        </section>
        <section className="pa-section pa-section--tight pa-container">
          <div className="pa-blog-list">
            <Link to={POST.slug} className="pa-blog-card">
              <img src={POST.image} alt={POST.imageAlt} width={1600} height={900} />
              <div>
                <p className="pa-legal__meta">{POST.date}</p>
                <h2>{POST.title}</h2>
                <p>{POST.excerpt}</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}

export function BlogPostPage() {
  usePageMeta(POST.metaTitle, POST.metaDescription);

  return (
    <MarketingShell>
      <div className="pa-bg-radial">
        <div className="pa-container pa-legal">
          <header className="pa-legal__header">
            <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Blog</p>
            <h1 className="pa-h1 pa-mt-sm" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}>
              {POST.title}
            </h1>
            <p className="pa-legal__meta">
              <time dateTime={POST.dateIso}>{POST.date}</time>
            </p>
          </header>
          <figure className="pa-blog-hero">
            <img
              src={POST.image}
              alt={POST.imageAlt}
              width={1600}
              height={900}
            />
          </figure>
          <article className="pa-legal__doc">
            <p>A sports player auction is a live event where teams bid for players, one at a time. Each team spends from a purse the organizer sets. When a player is sold, that player joins the winning team’s squad and the price comes off that team’s purse.</p>
            <p>The work around that moment is who may register, which category they sit in, the opening price, who may bid, and what each team can still spend.</p>
            <h2>Who a player auction is for</h2>
            <p>This format is for organizers who build squads by bidding, not by a fixed pick list. That is often a local cricket league, a football or futsal tournament, a school or college competition, or a corporate sports day. It also fits a club that wants named teams, owners, a budget, and a room where everyone can see the player on the block.</p>
            <p>You need a player list, teams, a purse for each team, and one person who runs the room. Players register. Owners bid for the right to add a player, inside rules you fix first. The organizer watches the numbers and does not bid for a team. If you assign players by a published order, with no price and no competing bids, you are running a draft.</p>
            <h2>How an auction differs from a draft</h2>
            <p>In a draft, teams take turns in an order set before the day. A team uses its pick, then the next team uses theirs. Money is not the mechanism. A snake draft reverses the order each round. Your job is to keep that order honest and the roster rules clear.</p>
            <p>In a player auction, more than one team can want the same player. They bid. The purse is the limit. A team that has spent most of its budget cannot keep matching a team that has more left. Squad size can stop a team too. Once a side has filled the squad you allowed, it stops taking players, or it bids only inside the squad rules you wrote down.</p>
            <p>Who comes up next also differs. In a draft, the pick order is the design. In an auction, the operator chooses the next player, or uses a spin that draws the name at random so the room sees the selection.</p>
            <p>Categories, base prices, and squad size are still fixed before bidding starts. What is live is the price and the countdown, not a new rulebook written in the room.</p>
            <h2>The sequence of a typical auction</h2>
            <p>The labels change by sport. The order of work usually does not.</p>
            <ol>
              <li>Open registration and decide who is in the pool.</li>
              <li>Place players into categories.</li>
              <li>Create teams, assign owners, and set each purse.</li>
              <li>Set a base price.</li>
              <li>Run live bidding, one player at a time.</li>
              <li>Allocate the sold player and update that team’s purse and squad.</li>
            </ol>
            <p><strong>Registration.</strong> You publish one form and share the link. Players can receive it on WhatsApp, by email, on social media, as a direct URL, or as a QR code. They complete it from any device: name, contact, playing role, and the statistics the form asks for. If you need a photo or a document, the form can require it.</p>
            <p>A registration fee is optional. If you turn it on, the player pays through a payment gateway in that flow and gets a confirmation. You see a paid or pending status on each player, and you can approve or reject the application. Search and filters help once the list is long. A pending payment is not the same thing as an approved player.</p>
            <p><strong>Categories.</strong> Before the day, you group approved players. You name the groups. A cricket league might use icon, overseas, local, or emerging. A football event might group by role. Those words are examples. They are not a list you must copy. Categories tell the room what kind of player is up, and they can sit beside different base prices or squad rules.</p>
            <p><strong>Teams and the purse.</strong> You create each team, add a name and a logo if you have them, and assign an owner. You set the purse. That number is the budget the team may spend. You also set squad size. From here, three figures have to move together: players acquired, amount spent, and amount left. Sponsors can be tied to the event or to a team. Their logos are what you will show on the screens.</p>
            <p>You set the purse for this event. There is no standard purse that every auction must use.</p>
            <p><strong>Base price.</strong> The base price is the opening figure. You set it with the categories and squad rules, before anyone bids. On the day the player card shows it with the photo, name, role, category, and statistics, so the room is looking at one opening number.</p>
            <p><strong>Live bidding.</strong> The operator starts the session from the control view. The next player is chosen on purpose, or by a spin that draws a name and then opens that player’s card. The display shows the current bid, the team holding it, a countdown, and the bid activity. Purse indicators stay visible so the room can see what each team has left.</p>
            <p>An owner does not call a number and hope it was heard. They see the bid amount, see the purse that remains, and confirm before the bid is placed. When a player is sold, that team’s squad and remaining budget update before the next card.</p>
            <p><strong>After the last player.</strong> You can review who sold and who did not, then open each team’s final squad and spend. The records also cover registrations, approvals, players auctioned and players still remaining, total bids, the highest bid, purse allocated against purse spent, average price, and how team spend compares. Those numbers describe this event. They are not a standard price for a type of player.</p>
            <h2>What the organizer controls</h2>
            <p>The organizer, or an operator they name, runs setup and the room. Before the day that means the form, whether a fee is charged, approvals, categories, teams, purses, squad rules, base prices, and sponsor logos.</p>
            <p>On the day they start the live session, pick or spin the next player, put the card on the display, and run the countdown. They watch auction status, which players are sold, and the team indicators. The logos on those screens are the ones uploaded for the auction or for a team.</p>
            <p>They do not bid for a franchise. Their job is one picture of who is on the block, the current bid, the time left, and what each team can still spend. A spreadsheet and a chat thread can disagree. The control view is the copy the room follows.</p>
            <p>Close the event from the same workspace: registrations and approvals, players auctioned and still remaining, bids, the highest bid, purse allocated versus spent, average price, and team spend side by side. A sample amount on a demonstration screen is not your purse.</p>
            <h2>What team owners see</h2>
            <p>Each team can have a private link, separate from the control desk. The owner sees purse, amount spent, and amount remaining, players acquired against the squad maximum, spending history, squad composition, the player on the block, and the bid status.</p>
            <p>When they bid, the amount and the remaining purse are on that screen, and they confirm before the bid is sent. Confirmation reduces mistakes. It does not replace the purse and squad limits you set earlier.</p>
            <p>Players do not use this view. Their step was the registration form, and a payment only if you asked for one.</p>
            <h2>Which sports this applies to</h2>
            <p>The stages above are not tied to one game. You change the form, the categories, and the squad rules. The live flow — card, bid, countdown, purse — stays the same for the operator.</p>
            <p>Cricket covers franchise leagues, corporate cups, and local T20-style auctions with categories and purses. Football uses the same bidding, with roles and a budget cap. Futsal events are often short, so registration and the live session may fall in the same week. Basketball squads are built around positions, with remaining budget in view. Volleyball fits school, college, and club events that need a shareable link and a dashboard per team.</p>
            <p>Corporate leagues and school or college events are formats, not extra sports. A corporate sports day or a regional tournament can use one registration flow and one auction. The list is cricket, football, futsal, basketball, and volleyball, plus those corporate and school or college formats.</p>
            <p>If your event is not on that list, the test is still plain. You need players, teams, categories, and a purse. Keep this sequence and change the form and the squad rules.</p>
            <h2>Before you run the first one</h2>
            <p>Write down four decisions before you book a hall: who may register, which categories you will use, the purse for each team, and how many players a squad may hold. Those choices are the auction. The screen’s job is to keep them visible while people bid.</p>
            <p>A walkthrough of the flow is at <a href="https://thepowerauction.com/demo">https://thepowerauction.com/demo</a>. If you would rather describe the tournament first, use <a href="https://thepowerauction.com/contact">https://thepowerauction.com/contact</a>. Name the sport, about how many players and teams you expect, and the purse rule you plan to set.</p>
          </article>
        </div>
      </div>
    </MarketingShell>
  );
}
