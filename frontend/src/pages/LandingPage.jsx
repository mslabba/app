import React from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Gavel,
  BarChart3,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Target,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const LandingPage = () => {
  const { isAuthenticated, isSuperAdmin, isEventOrganizer, loading } = useAuth();

  const features = [
    {
      icon: <Gavel className="w-8 h-8" />,
      title: "Live Auction System",
      description: "Real-time bidding with instant updates and competitive auction environment"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Management",
      description: "Complete team creation, budget management, and player acquisition tracking"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Analytics & Reports",
      description: "Comprehensive statistics, spending analysis, and performance insights"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Role-Based Access",
      description: "Secure authentication with different access levels for admins and team managers"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-Time Updates",
      description: "Instant notifications and live updates during auction proceedings"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Smart Bidding",
      description: "Intelligent bidding system with budget constraints and validation"
    }
  ];

  const benefits = [
    "Streamlined auction management process",
    "Transparent and fair bidding system",
    "Complete audit trail of all transactions",
    "Mobile-responsive design for any device",
    "Customizable auction rules and settings",
    "Professional team and player management"
  ];

  const testimonials = [
    {
      name: "Sports League Manager",
      role: "Cricket Premier League",
      content: "This platform revolutionized our player auction process. The real-time bidding and analytics made everything transparent and efficient.",
      rating: 5
    },
    {
      name: "Team Administrator",
      role: "Football Championship",
      content: "Managing our team budget and tracking acquisitions has never been easier. The interface is intuitive and powerful.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
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
                <span className="text-2xl font-bold text-white">Power<span className="text-red-500">Auction</span></span>
                <span className="text-xs text-white/60">Powered by Turgut</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/contact"
                className="text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
              >
                Contact Us
              </Link>
              {isAuthenticated ? (
                <Link
                  to={(isSuperAdmin || isEventOrganizer) ? "/admin" : "/dashboard"}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Background Sports Images */}
      <div className="absolute inset-0 opacity-10 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 blur-xl"></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 rounded-full bg-gradient-to-br from-red-400 to-yellow-500 blur-xl"></div>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-6 relative z-10">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/sports/hero-img.jpg)',
            backgroundPosition: 'center center',
            backgroundSize: 'cover'
          }}
        ></div>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Hero Image */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <Gavel className="w-12 h-12 text-purple-600" />
                  </div>
                </div>
                {/* Floating sports icons */}
                <div className="absolute -top-4 -left-8 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-2 -right-6 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-2 -left-4 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce delay-300">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              The Future of
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Sports Auctions</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
              Professional sports auction platform with real-time bidding, comprehensive team management,
              and powerful analytics. Built for leagues, tournaments, and sports organizations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link
                  to={(isSuperAdmin || isEventOrganizer) ? "/admin" : "/dashboard"}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center group"
                >
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center group"
                  >
                    Start Your Auction
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300 flex items-center"
                  >
                    Watch Demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-black/20 relative">
        {/* Sports equipment background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 text-6xl">🏏</div>
          <div className="absolute top-40 right-20 text-5xl">⚽</div>
          <div className="absolute bottom-40 left-1/4 text-7xl">🏀</div>
          <div className="absolute bottom-20 right-10 text-4xl">🏆</div>
          <div className="absolute top-60 left-1/2 text-5xl">🥇</div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Everything you need to run professional sports auctions with confidence and efficiency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
              >
                <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-2">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                Why Choose PowerAuctions?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-white/80 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center"
                >
                  Get Started Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>

            <div className="relative">
              {/* Sports stadium background */}
              <div className="absolute inset-0 opacity-10">
                <div className="text-8xl absolute top-4 left-4">🏟️</div>
                <div className="text-6xl absolute bottom-8 right-8">🎯</div>
              </div>
              {/* Hero image as subtle background */}
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5 rounded-3xl"
                style={{
                  backgroundImage: 'url(/images/sports/hero-img.jpg)',
                  backgroundPosition: 'center center',
                  backgroundSize: 'cover'
                }}
              ></div>

              <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl p-8 backdrop-blur-md border border-white/20 relative z-10">
                {/* Central trophy image */}
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center group hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Gavel className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">500+</div>
                    <div className="text-white/70">Successful Auctions</div>
                  </div>
                  <div className="text-center group hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">50+</div>
                    <div className="text-white/70">Sports Organizations</div>
                  </div>
                  <div className="text-center group hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">10K+</div>
                    <div className="text-white/70">Players Auctioned</div>
                  </div>
                  <div className="text-center group hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                    <div className="text-white/70">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-black/20 relative">
        {/* Sports background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 text-4xl">🏏</div>
          <div className="absolute top-32 right-10 text-5xl">⚽</div>
          <div className="absolute bottom-20 left-10 text-6xl">🏀</div>
          <div className="absolute bottom-40 right-32 text-3xl">🏆</div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Sports Leaders
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              See what sports organizations are saying about PowerAuctions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group"
              >
                {/* Sports icon for each testimonial */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {index === 0 ? (
                      <div className="text-2xl">🏏</div>
                    ) : (
                      <div className="text-2xl">⚽</div>
                    )}
                  </div>
                </div>
                <p className="text-white/80 text-lg mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-4">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-white/60">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative">
        {/* Sports celebration background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-bounce">🏆</div>
          <div className="absolute top-20 right-20 text-5xl animate-pulse">🥇</div>
          <div className="absolute bottom-20 left-1/4 text-4xl animate-bounce delay-300">🎉</div>
          <div className="absolute bottom-10 right-10 text-7xl animate-pulse delay-500">🏟️</div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Championship trophy visual */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                {/* Celebration sparkles */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-3 w-4 h-4 bg-orange-400 rounded-full animate-ping delay-300"></div>
                <div className="absolute -bottom-1 -left-3 w-5 h-5 bg-yellow-300 rounded-full animate-ping delay-500"></div>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Auctions?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Join hundreds of sports organizations already using PowerAuctions to run successful auctions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center text-white/60">
                <Clock className="w-5 h-5 mr-2" />
                <span>Setup in under 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 border-t border-white/10 py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
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
                  <span className="text-2xl font-bold text-white">Power<span className="text-red-500">Auction</span></span>
                  <span className="text-xs text-white/60">Powered by Turgut</span>
                </div>
              </div>
              <p className="text-white/60 max-w-md">
                The most advanced sports auction platform designed for professional leagues,
                tournaments, and sports organizations worldwide.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/60">
            <p>&copy; 2025 PowerAuctions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
