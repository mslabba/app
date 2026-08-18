import React, { useEffect } from 'react';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';
import { MarketingShell } from '@/marketing/components/MarketingShell';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy — PowerAuction';
  }, []);

  return (
    <MarketingShell>
      <div className="pa-bg-radial">
        <div className="pa-container pa-legal">
          <header className="pa-legal__header">
            <div className="pa-legal__icon" aria-hidden="true">
              <Shield size={28} />
            </div>
            <p className="pa-eyebrow" style={{ justifyContent: 'center' }}>Legal</p>
            <h1 className="pa-h1 pa-mt-sm" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}>
              Privacy Policy
            </h1>
            <p className="pa-legal__meta">
              Effective Date: November 13, 2025 · Last Updated: November 13, 2025
            </p>
          </header>

          <article className="pa-legal__doc">
            <section>
              <h2>1. Introduction</h2>
              <p>
                Welcome to The Power Auction (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We operate thepowerauction.com (the
                &quot;Website&quot;) and provide online sports auction management services (collectively, the &quot;Services&quot;).
                We are committed to protecting your privacy and ensuring the security of your personal information.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our
                Website and use our Services. Please read this Privacy Policy carefully. By accessing or using our Services, you
                agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              <h3>2.1 Personal Information You Provide</h3>
              <p>We collect information that you voluntarily provide to us when you:</p>

              <h4>Register for an account</h4>
              <ul>
                <li>Full name</li>
                <li>Email address</li>
                <li>Username and password</li>
                <li>Phone number</li>
                <li>Date of birth (to verify age requirements)</li>
              </ul>

              <h4>Participate in auctions</h4>
              <ul>
                <li>Billing address</li>
                <li>Shipping address</li>
                <li>Payment information (credit/debit card details, PayPal account)</li>
                <li>Bid history and purchase records</li>
              </ul>

              <h4>Contact us</h4>
              <ul>
                <li>Name, email address, and message content</li>
                <li>Any other information you choose to provide</li>
              </ul>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>We use the collected information for the following purposes:</p>

              <h4>3.1 To Provide and Maintain Services</h4>
              <ul>
                <li>Create and manage your account</li>
                <li>Process auction bids and transactions</li>
                <li>Facilitate payment processing</li>
                <li>Arrange shipping and delivery</li>
                <li>Send transaction confirmations and receipts</li>
                <li>Provide customer support</li>
              </ul>

              <h4>3.2 To Improve User Experience</h4>
              <ul>
                <li>Personalize your experience on the Website</li>
                <li>Recommend relevant auction items</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze usage patterns to improve functionality</li>
                <li>Conduct research and analytics</li>
              </ul>
            </section>

            <section>
              <h2>4. Data Security</h2>
              <p>We implement appropriate technical and organizational security measures to protect your personal information:</p>
              <ul>
                <li>
                  <strong>Encryption:</strong> All data transmission is encrypted using SSL/TLS protocols (HTTPS)
                </li>
                <li>
                  <strong>Secure storage:</strong> Passwords are hashed and salted using industry-standard algorithms
                </li>
                <li>
                  <strong>Access controls:</strong> Limited access to personal information on a need-to-know basis
                </li>
                <li>
                  <strong>Regular security audits:</strong> Periodic vulnerability assessments and penetration testing
                </li>
                <li>
                  <strong>Payment security:</strong> We do not store complete credit card information; payment details are
                  processed through PCI DSS-compliant payment processors
                </li>
                <li>
                  <strong>Monitoring:</strong> Continuous monitoring for suspicious activity and unauthorized access
                </li>
              </ul>
              <p>
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to
                protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2>5. Your Privacy Rights</h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul>
                <li>
                  <strong>Access and Portability:</strong> Request a copy of the personal information we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal information (subject to legal retention
                  requirements)
                </li>
                <li>
                  <strong>Restriction and Objection:</strong> Object to processing of your personal information
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw consent for marketing communications at any time
                </li>
              </ul>
              <p>
                To exercise your rights, please contact us at: powerauction@inraylabs.com. We will respond to your request
                within 30 days.
              </p>
            </section>

            <section>
              <h2>6. International Data Transfers</h2>
              <p>
                <strong>Our Operations:</strong> The Power Auction is operated from India. Our servers and data processing
                facilities are located in India and/or with our cloud service providers (such as AWS, Google Cloud).
              </p>
              <p>
                <strong>Global Service:</strong> We provide services to users worldwide. When you use our Services from outside
                India, your information will be transferred to, stored, and processed in India and potentially other countries
                where our service providers operate.
              </p>
              <p>
                By using our Services, you consent to the transfer of your information to India and other countries, which may
                have different data protection rules than your country of residence.
              </p>
            </section>

            <section>
              <h2>7. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We
                will notify you of any material changes by:
              </p>
              <ul>
                <li>Posting the new Privacy Policy on this page with an updated &quot;Last Updated&quot; date</li>
                <li>Sending an email notification to the email address associated with your account</li>
                <li>Displaying a prominent notice on our Website</li>
              </ul>
              <p>
                Your continued use of our Services after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2>8. Contact Us</h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please
                contact us:
              </p>
              <div className="pa-legal__callout">
                <h4>The Power Auction</h4>
                <div className="pa-legal__contact-row">
                  <Mail size={16} aria-hidden="true" />
                  <span>powerauction@inraylabs.com</span>
                </div>
                <div className="pa-legal__contact-row">
                  <Phone size={16} aria-hidden="true" />
                  <span>+91 9947702294</span>
                </div>
                <div className="pa-legal__contact-row">
                  <MapPin size={16} aria-hidden="true" />
                  <div>
                    <p style={{ margin: 0 }}>10/179, Alappuzha, Kerala, India</p>
                    <p style={{ margin: 0 }}>PIN Code: 688005</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2>9. Consent</h2>
              <p>
                By using The Power Auction Services, you acknowledge that you have read and understood this Privacy Policy and
                agree to its terms.
              </p>
            </section>
          </article>
        </div>
      </div>
    </MarketingShell>
  );
};

export default PrivacyPolicy;
