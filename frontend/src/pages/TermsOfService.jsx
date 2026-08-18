import React, { useEffect } from 'react';
import { FileText, Mail, Phone, MapPin } from 'lucide-react';
import { MarketingShell } from '@/marketing/components/MarketingShell';

const TermsOfService = () => {
  useEffect(() => {
    document.title = 'Terms of Service — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div className="pa-bg-radial">
        <div className="pa-container pa-legal">
          <header className="pa-legal__header">
            <div className="pa-legal__icon pa-legal__icon--terms" aria-hidden="true">
              <FileText size={28} />
            </div>
            <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Legal</p>
            <h1 className="pa-h1 pa-mt-sm" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}>
              Terms of Service
            </h1>
            <p className="pa-legal__meta">
              Effective Date: November 13, 2025 · Last Updated: November 13, 2025
            </p>
          </header>

          <article className="pa-legal__doc">
            <section>
              <h2>1. Introduction and Acceptance of Terms</h2>
              <p>
                Welcome to The Power Auction (&quot;we,&quot; &quot;us,&quot; &quot;our,&quot; or &quot;Company&quot;). These Terms of
                Service (&quot;Terms,&quot; &quot;Agreement&quot;) govern your access to and use of thepowerauction.com (the
                &quot;Website&quot;), our mobile applications, and all related services (collectively, the &quot;Services&quot;).
              </p>
              <p>
                By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you
                must not access or use our Services.
              </p>

              <div className="pa-legal__callout">
                <h4>Operator Information</h4>
                <ul>
                  <li>
                    <strong>Company Name:</strong> The Power Auction
                  </li>
                  <li>
                    <strong>Registered Office:</strong> 10/179, Alappuzha, Kerala, India
                  </li>
                  <li>
                    <strong>Contact Email:</strong> powerauction@inraylabs.com
                  </li>
                  <li>
                    <strong>Grievance Officer:</strong> Muhammed Shihabudeen, powerauction@inraylabs.com
                  </li>
                  <li>
                    <strong>Website:</strong> https://thepowerauction.com
                  </li>
                </ul>
              </div>

              <p>
                These Terms constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or
                &quot;your&quot;) and The Power Auction.
              </p>
            </section>

            <section>
              <h2>2. Eligibility and Account Registration</h2>

              <h3>2.1 Age Requirements</h3>
              <p>
                You must be at least 18 years of age to use our Services. By using our Services, you represent and warrant that:
              </p>
              <ul>
                <li>You are at least 18 years old</li>
                <li>You have the legal capacity to enter into binding contracts</li>
                <li>You are not prohibited from using our Services under applicable laws</li>
              </ul>

              <h3>2.2 Account Registration</h3>
              <p>To participate in auctions, you must create an account by providing:</p>
              <ul>
                <li>Accurate and complete information</li>
                <li>A valid email address</li>
                <li>A secure password</li>
                <li>Verification of identity (as required)</li>
              </ul>
              <p>You are responsible for:</p>
              <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2>3. Auction Rules and Bidding</h2>

              <h3>3.1 Auction Participation</h3>
              <p>By placing a bid, you agree that:</p>
              <ul>
                <li>Each bid constitutes a binding offer to purchase the item</li>
                <li>
                  Bids cannot be retracted except in exceptional circumstances (clerical error, item description materially
                  changed)
                </li>
                <li>You will complete the transaction if you are the winning bidder</li>
                <li>You have read and understood the item description, condition, and terms</li>
              </ul>

              <h3>3.2 Bidding Process</h3>
              <h4>Bid Placement</h4>
              <ul>
                <li>Bids must be placed in the increment specified for each auction</li>
                <li>You may place manual bids or use our automatic bidding feature (proxy bidding)</li>
                <li>Our system will automatically increment your bid up to your maximum amount when outbid</li>
              </ul>
              <h4>Bid Confirmation</h4>
              <ul>
                <li>You will receive confirmation of each bid via email/notification</li>
                <li>You can view your active bids in your account dashboard</li>
                <li>You will be notified if you are outbid</li>
              </ul>

              <h3>3.3 Winning an Auction</h3>
              <h4>Auction Close</h4>
              <ul>
                <li>Auctions close at the specified date and time</li>
                <li>The highest bidder at closing time is the winner</li>
                <li>Anti-sniping rules may extend the auction if bids are placed in the final minutes</li>
                <li>Time displayed is Indian Standard Time (IST) unless otherwise specified</li>
              </ul>
              <h4>Winner Obligations</h4>
              <ul>
                <li>Pay for the item within 72 hours of auction close</li>
                <li>Respond to seller communications promptly</li>
                <li>Complete the transaction in good faith</li>
                <li>Provide accurate shipping information</li>
              </ul>
            </section>

            <section>
              <h2>4. Prohibited Conduct</h2>

              <h3>4.1 You Agree NOT To</h3>
              <h4>Account Abuse</h4>
              <ul>
                <li>Create multiple accounts to circumvent bans</li>
                <li>Share or sell your account</li>
                <li>Impersonate others</li>
              </ul>
              <h4>Platform Abuse</h4>
              <ul>
                <li>Interfere with or disrupt the Services</li>
                <li>Use bots, scrapers, or automated tools without permission</li>
                <li>Attempt to gain unauthorized access to systems</li>
                <li>Introduce viruses, malware, or harmful code</li>
              </ul>
              <h4>Commercial Abuse</h4>
              <ul>
                <li>Engage in money laundering or fraud</li>
                <li>Use the platform for illegal transactions</li>
                <li>Manipulate prices or engage in anti-competitive behavior</li>
                <li>Avoid paying fees through alternative arrangements</li>
              </ul>

              <h3>4.2 Consequences of Violations</h3>
              <p>Violations may result in:</p>
              <ul>
                <li>Content removal</li>
                <li>Account suspension or termination</li>
                <li>Forfeiture of funds or items</li>
                <li>Legal action and liability for damages</li>
                <li>Reporting to law enforcement</li>
              </ul>
            </section>

            <section>
              <h2>5. Payment Terms</h2>

              <h3>5.1 Payment Methods</h3>
              <p>We accept the following payment methods:</p>
              <ul>
                <li>Credit/Debit Cards (Visa, Mastercard, American Express, RuPay)</li>
                <li>UPI (Indian users)</li>
                <li>Net Banking</li>
                <li>Digital Wallets (Paytm, PhonePe, Google Pay)</li>
                <li>PayPal (International users)</li>
                <li>Other payment methods as specified</li>
              </ul>

              <h3>5.2 Payment Processing</h3>
              <ul>
                <li>All payments are processed securely through our payment partners</li>
                <li>We do not store complete credit card information</li>
                <li>Payments must be made in the currency specified for each auction</li>
                <li>Currency conversion fees may apply for international transactions</li>
              </ul>

              <h3>5.3 Taxes</h3>
              <ul>
                <li>Buyers are responsible for all applicable taxes, including GST (Goods and Services Tax in India)</li>
                <li>International buyers are responsible for customs duties and import taxes</li>
                <li>Tax invoices will be provided as per Indian tax regulations</li>
              </ul>
            </section>

            <section>
              <h2>6. Disclaimer of Warranties</h2>

              <h3>6.1 &quot;AS IS&quot; Service</h3>
              <p>THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.</p>
              <p>We disclaim all warranties, express or implied, including:</p>
              <ul>
                <li>Merchantability and fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy, reliability, or completeness of content</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Security of data transmission</li>
              </ul>

              <h3>6.2 No Guarantee of Results</h3>
              <p>We do not guarantee:</p>
              <ul>
                <li>Items will sell or achieve certain prices</li>
                <li>Buyers will complete purchases</li>
                <li>Sellers will deliver items as described</li>
                <li>Disputes will be resolved in your favor</li>
              </ul>
              <p>
                <strong>You use our Services at your own risk.</strong>
              </p>
            </section>

            <section>
              <h2>7. Limitation of Liability</h2>

              <h3>7.1 To the Maximum Extent Permitted by Law</h3>
              <p>
                <strong>WE SHALL NOT BE LIABLE FOR:</strong>
              </p>
              <ul>
                <li>Indirect, incidental, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Damages resulting from user errors or misuse</li>
                <li>Unauthorized access to your account</li>
                <li>Actions of other users (buyers, sellers, or third parties)</li>
                <li>Technical failures, downtime, or interruptions</li>
                <li>Loss or damage to items during shipping</li>
              </ul>
              <p>
                <strong>EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong>
              </p>

              <h3>7.2 Limitation Amount</h3>
              <p>
                Our total liability for any claims arising from these Terms or use of our Services shall not exceed: The fees you
                paid to us in the 12 months preceding the claim, OR ₹10,000 (Ten Thousand Indian Rupees) / $100 USD, whichever is
                greater.
              </p>
            </section>

            <section>
              <h2>8. Governing Law and Jurisdiction</h2>

              <h3>8.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of
                law principles.
              </p>
              <p>Specifically:</p>
              <ul>
                <li>Indian Contract Act, 1872</li>
                <li>Information Technology Act, 2000</li>
                <li>Consumer Protection Act, 2019</li>
                <li>Digital Personal Data Protection Act, 2023</li>
                <li>Other applicable Indian laws</li>
              </ul>

              <h3>8.2 Jurisdiction</h3>
              <h4>For Indian Users</h4>
              <ul>
                <li>Any disputes shall be subject to the exclusive jurisdiction of the courts in Alappuzha, Kerala, India</li>
                <li>You consent to personal jurisdiction in these courts</li>
              </ul>
              <h4>For International Users</h4>
              <ul>
                <li>Disputes shall first be subject to the jurisdiction of Indian courts</li>
                <li>However, you may pursue claims in your local jurisdiction if permitted by local law</li>
                <li>Consumer protection laws in your country may provide additional rights</li>
              </ul>
            </section>

            <section>
              <h2>9. Modifications to Services and Terms</h2>

              <h3>9.1 Service Changes</h3>
              <p>We reserve the right to:</p>
              <ul>
                <li>Modify, suspend, or discontinue any aspect of the Services</li>
                <li>Change fees and pricing with 30 days&apos; notice</li>
                <li>Add or remove features</li>
                <li>Update auction rules and policies</li>
              </ul>
              <p>We are not liable for any modifications or interruptions to the Services.</p>

              <h3>9.2 Terms Changes</h3>
              <p>We may update these Terms from time to time. Changes will be effective:</p>
              <ul>
                <li>When posted on our Website with a new &quot;Last Updated&quot; date</li>
                <li>15 days after email notification to registered users</li>
                <li>Immediately for legal or regulatory compliance</li>
              </ul>
              <p>
                Your continued use of the Services after changes constitutes acceptance of the modified Terms. If you disagree
                with changes, you must stop using the Services.
              </p>
            </section>

            <section>
              <h2>10. Contact Information</h2>
              <p>For questions, concerns, or complaints regarding these Terms or our Services:</p>
              <div className="pa-legal__callout">
                <h4>The Power Auction</h4>
                <h4>General Inquiries</h4>
                <div className="pa-legal__contact-row">
                  <Mail size={16} aria-hidden="true" />
                  <span>powerauction@inraylabs.com</span>
                </div>
                <div className="pa-legal__contact-row">
                  <Phone size={16} aria-hidden="true" />
                  <span>+91 9947702294</span>
                </div>
                <h4>Legal Matters</h4>
                <div className="pa-legal__contact-row">
                  <Mail size={16} aria-hidden="true" />
                  <span>powerauction@inraylabs.com</span>
                </div>
                <h4>Grievances (Indian Users)</h4>
                <p style={{ marginBottom: '0.35rem' }}>Grievance Officer: Muhammed Shihabudeen</p>
                <div className="pa-legal__contact-row">
                  <Mail size={16} aria-hidden="true" />
                  <span>powerauction@inraylabs.com</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--pa-slate-500)', marginTop: '0.35rem' }}>
                  Response Time: Within 24 hours
                </p>
                <div className="pa-legal__contact-row" style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--pa-border)' }}>
                  <MapPin size={16} aria-hidden="true" />
                  <div>
                    <p style={{ margin: 0 }}>10/179, Alappuzha, Kerala, India</p>
                    <p style={{ margin: 0 }}>PIN Code: 688005</p>
                    <p style={{ margin: '0.35rem 0 0' }}>Website: https://thepowerauction.com</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2>11. Acknowledgment and Acceptance</h2>
              <p>
                <strong>
                  BY CLICKING &quot;I ACCEPT,&quot; CREATING AN ACCOUNT, OR USING OUR SERVICES, YOU ACKNOWLEDGE THAT:
                </strong>
              </p>
              <ul>
                <li>You have read and understood these Terms of Service</li>
                <li>You agree to be bound by these Terms</li>
                <li>You are at least 18 years of age</li>
                <li>You have the legal capacity to enter into this agreement</li>
                <li>You will comply with all applicable laws and regulations</li>
              </ul>
              <p>
                <strong>If you do not agree to these Terms, you must immediately cease using our Services.</strong>
              </p>
              <div className="pa-legal__callout" style={{ textAlign: 'center' }}>
                <strong>Last Updated: November 13, 2025 · Version: 1.0</strong>
              </div>
            </section>
          </article>
        </div>
      </div>
    </MarketingShell>
  );
};

export default TermsOfService;
