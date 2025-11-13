import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Shield, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 relative z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="/images/sports/logo-final.png"
                alt="PowerAuctions Logo"
                className="h-12 w-auto"
                onError={(e) => {
                  console.error('Logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">Power<span className="text-red-500">Auction</span></span>
                <span className="text-xs text-white/60">Powered by Turgut</span>
              </div>
            </div>
            <Link
              to="/"
              className="flex items-center text-white hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        <Card className="glass border-white/20 shadow-2xl max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Privacy Policy</CardTitle>
            <p className="text-white/80">Effective Date: November 13, 2025 | Last Updated: November 13, 2025</p>
          </CardHeader>
          <CardContent className="space-y-8 text-white/90 max-h-96 overflow-y-auto">

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
              <p className="leading-relaxed">
                Welcome to The Power Auction ("we," "our," or "us"). We operate thepowerauction.com (the "Website") and provide online
                sports memorabilia auction services (collectively, the "Services"). We are committed to protecting your privacy and
                ensuring the security of your personal information.
              </p>
              <p className="leading-relaxed mt-2">
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Website
                and use our Services. Please read this Privacy Policy carefully. By accessing or using our Services, you agree to the
                collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-white mb-2">2.1 Personal Information You Provide</h3>
              <p className="leading-relaxed mb-2">We collect information that you voluntarily provide to us when you:</p>

              <div className="ml-4 space-y-3">
                <div>
                  <strong>Register for an account:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Username and password</li>
                    <li>Phone number</li>
                    <li>Date of birth (to verify age requirements)</li>
                  </ul>
                </div>

                <div>
                  <strong>Participate in auctions:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Billing address</li>
                    <li>Shipping address</li>
                    <li>Payment information (credit/debit card details, PayPal account)</li>
                    <li>Bid history and purchase records</li>
                  </ul>
                </div>

                <div>
                  <strong>Contact us:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Name, email address, and message content</li>
                    <li>Any other information you choose to provide</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-3">We use the collected information for the following purposes:</p>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white">3.1 To Provide and Maintain Services</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Create and manage your account</li>
                    <li>Process auction bids and transactions</li>
                    <li>Facilitate payment processing</li>
                    <li>Arrange shipping and delivery</li>
                    <li>Send transaction confirmations and receipts</li>
                    <li>Provide customer support</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">3.2 To Improve User Experience</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Personalize your experience on the Website</li>
                    <li>Recommend relevant auction items</li>
                    <li>Remember your preferences and settings</li>
                    <li>Analyze usage patterns to improve functionality</li>
                    <li>Conduct research and analytics</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
              <p className="leading-relaxed mb-3">We implement appropriate technical and organizational security measures to protect your personal information:</p>
              <ul className="list-disc ml-6">
                <li><strong>Encryption:</strong> All data transmission is encrypted using SSL/TLS protocols (HTTPS)</li>
                <li><strong>Secure storage:</strong> Passwords are hashed and salted using industry-standard algorithms</li>
                <li><strong>Access controls:</strong> Limited access to personal information on a need-to-know basis</li>
                <li><strong>Regular security audits:</strong> Periodic vulnerability assessments and penetration testing</li>
                <li><strong>Payment security:</strong> We do not store complete credit card information; payment details are processed through PCI DSS-compliant payment processors</li>
                <li><strong>Monitoring:</strong> Continuous monitoring for suspicious activity and unauthorized access</li>
              </ul>
              <p className="leading-relaxed mt-3">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Your Privacy Rights</h2>
              <p className="leading-relaxed mb-3">Depending on your location, you may have the following rights regarding your personal information:</p>

              <div className="space-y-2">
                <div><strong>Access and Portability:</strong> Request a copy of the personal information we hold about you</div>
                <div><strong>Correction:</strong> Request correction of inaccurate or incomplete information</div>
                <div><strong>Deletion:</strong> Request deletion of your personal information (subject to legal retention requirements)</div>
                <div><strong>Restriction and Objection:</strong> Object to processing of your personal information</div>
                <div><strong>Withdraw Consent:</strong> Withdraw consent for marketing communications at any time</div>
              </div>

              <p className="leading-relaxed mt-3">
                To exercise your rights, please contact us at: privacy@thepowerauction.com. We will respond to your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. International Data Transfers</h2>
              <p className="leading-relaxed mb-3">
                <strong>Our Operations:</strong> The Power Auction is operated from India. Our servers and data processing facilities
                are located in India and/or with our cloud service providers (such as AWS, Google Cloud).
              </p>
              <p className="leading-relaxed mb-3">
                <strong>Global Service:</strong> We provide services to users worldwide. When you use our Services from outside India,
                your information will be transferred to, stored, and processed in India and potentially other countries where our
                service providers operate.
              </p>
              <p className="leading-relaxed">
                By using our Services, you consent to the transfer of your information to India and other countries, which may have
                different data protection rules than your country of residence.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Changes to This Privacy Policy</h2>
              <p className="leading-relaxed mb-3">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
                We will notify you of any material changes by:
              </p>
              <ul className="list-disc ml-6 mb-3">
                <li>Posting the new Privacy Policy on this page with an updated "Last Updated" date</li>
                <li>Sending an email notification to the email address associated with your account</li>
                <li>Displaying a prominent notice on our Website</li>
              </ul>
              <p className="leading-relaxed">
                Your continued use of our Services after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
              </p>

              <div className="bg-white/10 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-white">The Power Auction</h4>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>privacy@thepowerauction.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  <span>+91-9037138030</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-red-400 mt-1" />
                  <div>
                    <p>10/179, Alappuzha, Kerala, India</p>
                    <p>PIN Code: 688005</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Consent</h2>
              <p className="leading-relaxed">
                By using The Power Auction Services, you acknowledge that you have read and understood this Privacy Policy
                and agree to its terms.
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;