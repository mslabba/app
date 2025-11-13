import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Terms of Service</CardTitle>
            <p className="text-white/80">Effective Date: November 13, 2025 | Last Updated: November 13, 2025</p>
          </CardHeader>
          <CardContent className="space-y-8 text-white/90 max-h-96 overflow-y-auto">

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction and Acceptance of Terms</h2>
              <p className="leading-relaxed mb-3">
                Welcome to The Power Auction ("we," "us," "our," or "Company"). These Terms of Service ("Terms," "Agreement") govern
                your access to and use of thepowerauction.com (the "Website"), our mobile applications, and all related services
                (collectively, the "Services").
              </p>
              <p className="leading-relaxed mb-3">
                By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms,
                you must not access or use our Services.
              </p>

              <div className="bg-white/10 rounded-lg p-4 mb-3">
                <h4 className="font-semibold text-white mb-2">Operator Information:</h4>
                <ul className="space-y-1">
                  <li><strong>Company Name:</strong> The Power Auction</li>
                  <li><strong>Registered Office:</strong> 10/179, Alappuzha, Kerala, India</li>
                  <li><strong>Contact Email:</strong> support@thepowerauction.com</li>
                  <li><strong>Grievance Officer:</strong> Muhammed Shihabudeen, grievance@thepowerauction.com</li>
                  <li><strong>Website:</strong> https://thepowerauction.com</li>
                </ul>
              </div>

              <p className="leading-relaxed">
                These Terms constitute a legally binding agreement between you ("User," "you," or "your") and The Power Auction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility and Account Registration</h2>

              <h3 className="text-lg font-medium text-white mb-2">2.1 Age Requirements</h3>
              <p className="leading-relaxed mb-3">You must be at least 18 years of age to use our Services. By using our Services, you represent and warrant that:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>You are at least 18 years old</li>
                <li>You have the legal capacity to enter into binding contracts</li>
                <li>You are not prohibited from using our Services under applicable laws</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">2.2 Account Registration</h3>
              <p className="leading-relaxed mb-2">To participate in auctions, you must create an account by providing:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Accurate and complete information</li>
                <li>A valid email address</li>
                <li>A secure password</li>
                <li>Verification of identity (as required)</li>
              </ul>

              <p className="leading-relaxed mb-2">You are responsible for:</p>
              <ul className="list-disc ml-6">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Auction Rules and Bidding</h2>

              <h3 className="text-lg font-medium text-white mb-2">3.1 Auction Participation</h3>
              <p className="leading-relaxed mb-2">By placing a bid, you agree that:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Each bid constitutes a binding offer to purchase the item</li>
                <li>Bids cannot be retracted except in exceptional circumstances (clerical error, item description materially changed)</li>
                <li>You will complete the transaction if you are the winning bidder</li>
                <li>You have read and understood the item description, condition, and terms</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">3.2 Bidding Process</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white">Bid Placement:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Bids must be placed in the increment specified for each auction</li>
                    <li>You may place manual bids or use our automatic bidding feature (proxy bidding)</li>
                    <li>Our system will automatically increment your bid up to your maximum amount when outbid</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">Bid Confirmation:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>You will receive confirmation of each bid via email/notification</li>
                    <li>You can view your active bids in your account dashboard</li>
                    <li>You will be notified if you are outbid</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-white mb-2 mt-4">3.3 Winning an Auction</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white">Auction Close:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Auctions close at the specified date and time</li>
                    <li>The highest bidder at closing time is the winner</li>
                    <li>Anti-sniping rules may extend the auction if bids are placed in the final minutes</li>
                    <li>Time displayed is Indian Standard Time (IST) unless otherwise specified</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">Winner Obligations:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Pay for the item within 72 hours of auction close</li>
                    <li>Respond to seller communications promptly</li>
                    <li>Complete the transaction in good faith</li>
                    <li>Provide accurate shipping information</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Prohibited Conduct</h2>

              <h3 className="text-lg font-medium text-white mb-2">4.1 You Agree NOT To:</h3>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white">Account Abuse:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Create multiple accounts to circumvent bans</li>
                    <li>Share or sell your account</li>
                    <li>Impersonate others</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">Platform Abuse:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Interfere with or disrupt the Services</li>
                    <li>Use bots, scrapers, or automated tools without permission</li>
                    <li>Attempt to gain unauthorized access to systems</li>
                    <li>Introduce viruses, malware, or harmful code</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">Commercial Abuse:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Engage in money laundering or fraud</li>
                    <li>Use the platform for illegal transactions</li>
                    <li>Manipulate prices or engage in anti-competitive behavior</li>
                    <li>Avoid paying fees through alternative arrangements</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-white mb-2 mt-4">4.2 Consequences of Violations</h3>
              <p className="leading-relaxed mb-2">Violations may result in:</p>
              <ul className="list-disc ml-6">
                <li>Content removal</li>
                <li>Account suspension or termination</li>
                <li>Forfeiture of funds or items</li>
                <li>Legal action and liability for damages</li>
                <li>Reporting to law enforcement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Payment Terms</h2>

              <h3 className="text-lg font-medium text-white mb-2">5.1 Payment Methods</h3>
              <p className="leading-relaxed mb-2">We accept the following payment methods:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Credit/Debit Cards (Visa, Mastercard, American Express, RuPay)</li>
                <li>UPI (Indian users)</li>
                <li>Net Banking</li>
                <li>Digital Wallets (Paytm, PhonePe, Google Pay)</li>
                <li>PayPal (International users)</li>
                <li>Other payment methods as specified</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">5.2 Payment Processing</h3>
              <ul className="list-disc ml-6 mb-3">
                <li>All payments are processed securely through our payment partners</li>
                <li>We do not store complete credit card information</li>
                <li>Payments must be made in the currency specified for each auction</li>
                <li>Currency conversion fees may apply for international transactions</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">5.3 Taxes</h3>
              <ul className="list-disc ml-6">
                <li>Buyers are responsible for all applicable taxes, including GST (Goods and Services Tax in India)</li>
                <li>International buyers are responsible for customs duties and import taxes</li>
                <li>Tax invoices will be provided as per Indian tax regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimer of Warranties</h2>

              <h3 className="text-lg font-medium text-white mb-2">6.1 "AS IS" Service</h3>
              <p className="leading-relaxed mb-3">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
              </p>
              <p className="leading-relaxed mb-2">We disclaim all warranties, express or implied, including:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Merchantability and fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy, reliability, or completeness of content</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Security of data transmission</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">6.2 No Guarantee of Results</h3>
              <p className="leading-relaxed mb-2">We do not guarantee:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Items will sell or achieve certain prices</li>
                <li>Buyers will complete purchases</li>
                <li>Sellers will deliver items as described</li>
                <li>Disputes will be resolved in your favor</li>
              </ul>
              <p className="leading-relaxed">
                <strong>You use our Services at your own risk.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>

              <h3 className="text-lg font-medium text-white mb-2">7.1 To the Maximum Extent Permitted by Law:</h3>
              <p className="leading-relaxed mb-3">
                <strong>WE SHALL NOT BE LIABLE FOR:</strong>
              </p>
              <ul className="list-disc ml-6 mb-3">
                <li>Indirect, incidental, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Damages resulting from user errors or misuse</li>
                <li>Unauthorized access to your account</li>
                <li>Actions of other users (buyers, sellers, or third parties)</li>
                <li>Technical failures, downtime, or interruptions</li>
                <li>Loss or damage to items during shipping</li>
              </ul>

              <p className="leading-relaxed">
                <strong>EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong>
              </p>

              <h3 className="text-lg font-medium text-white mb-2 mt-4">7.2 Limitation Amount</h3>
              <p className="leading-relaxed">
                Our total liability for any claims arising from these Terms or use of our Services shall not exceed:
                The fees you paid to us in the 12 months preceding the claim, OR ₹10,000 (Ten Thousand Indian Rupees) / $100 USD,
                whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Governing Law and Jurisdiction</h2>

              <h3 className="text-lg font-medium text-white mb-2">8.1 Governing Law</h3>
              <p className="leading-relaxed mb-3">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.
              </p>

              <p className="leading-relaxed mb-2">Specifically:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Indian Contract Act, 1872</li>
                <li>Information Technology Act, 2000</li>
                <li>Consumer Protection Act, 2019</li>
                <li>Digital Personal Data Protection Act, 2023</li>
                <li>Other applicable Indian laws</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-2">8.2 Jurisdiction</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white">For Indian Users:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Any disputes shall be subject to the exclusive jurisdiction of the courts in Alappuzha, Kerala, India</li>
                    <li>You consent to personal jurisdiction in these courts</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white">For International Users:</h4>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Disputes shall first be subject to the jurisdiction of Indian courts</li>
                    <li>However, you may pursue claims in your local jurisdiction if permitted by local law</li>
                    <li>Consumer protection laws in your country may provide additional rights</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Modifications to Services and Terms</h2>

              <h3 className="text-lg font-medium text-white mb-2">9.1 Service Changes</h3>
              <p className="leading-relaxed mb-2">We reserve the right to:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>Modify, suspend, or discontinue any aspect of the Services</li>
                <li>Change fees and pricing with 30 days' notice</li>
                <li>Add or remove features</li>
                <li>Update auction rules and policies</li>
              </ul>
              <p className="leading-relaxed mb-3">We are not liable for any modifications or interruptions to the Services.</p>

              <h3 className="text-lg font-medium text-white mb-2">9.2 Terms Changes</h3>
              <p className="leading-relaxed mb-2">We may update these Terms from time to time. Changes will be effective:</p>
              <ul className="list-disc ml-6 mb-3">
                <li>When posted on our Website with a new "Last Updated" date</li>
                <li>15 days after email notification to registered users</li>
                <li>Immediately for legal or regulatory compliance</li>
              </ul>
              <p className="leading-relaxed">
                Your continued use of the Services after changes constitutes acceptance of the modified Terms.
                If you disagree with changes, you must stop using the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact Information</h2>
              <p className="leading-relaxed mb-4">
                For questions, concerns, or complaints regarding these Terms or our Services:
              </p>

              <div className="bg-white/10 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-white">The Power Auction</h4>

                <div>
                  <h5 className="font-medium text-white">General Inquiries:</h5>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>support@thepowerauction.com</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="w-4 h-4 text-green-400" />
                    <span>+91-9037138030</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-white">Legal Matters:</h5>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>legal@thepowerauction.com</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-white">Grievances (Indian Users):</h5>
                  <div className="mt-1">
                    <p>Grievance Officer: Muhammed Shihabudeen</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span>grievance@thepowerauction.com</span>
                    </div>
                    <p className="text-sm text-white/70 mt-1">Response Time: Within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-2 border-t border-white/20">
                  <MapPin className="w-4 h-4 text-red-400 mt-1" />
                  <div>
                    <p>10/179, Alappuzha, Kerala, India</p>
                    <p>PIN Code: 688005</p>
                    <p className="mt-1">Website: https://thepowerauction.com</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Acknowledgment and Acceptance</h2>
              <p className="leading-relaxed mb-3">
                <strong>BY CLICKING "I ACCEPT," CREATING AN ACCOUNT, OR USING OUR SERVICES, YOU ACKNOWLEDGE THAT:</strong>
              </p>
              <ul className="list-disc ml-6 mb-3">
                <li>You have read and understood these Terms of Service</li>
                <li>You agree to be bound by these Terms</li>
                <li>You are at least 18 years of age</li>
                <li>You have the legal capacity to enter into this agreement</li>
                <li>You will comply with all applicable laws and regulations</li>
              </ul>
              <p className="leading-relaxed font-medium">
                If you do not agree to these Terms, you must immediately cease using our Services.
              </p>

              <div className="bg-white/10 rounded-lg p-3 mt-4">
                <p className="text-center text-white/90">
                  <strong>Last Updated: November 13, 2025 | Version: 1.0</strong>
                </p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;