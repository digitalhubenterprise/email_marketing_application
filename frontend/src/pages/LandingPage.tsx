import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Send,
  MessageSquare,
  ShieldCheck,
  Zap,
  BarChart3,
  Server,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  Smartphone,
  Cpu,
  Layers,
  Star,
  Check,
  Headphones,
  Menu as MenuIcon,
  X as XIcon,
  TrendingUp,
  Activity,
  MousePointerClick,
  Radio,
  Sliders,
  Play
} from 'lucide-react';
import { useAuth } from '../App';

export default function LandingPage() {
  const { appConfig } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'email' | 'sms' | 'telegram' | 'analytics'>('email');

  const siteName = appConfig?.site_name || "SmartCampaign";
  const siteLogo = appConfig?.logo_url;
  const supportEmail = appConfig?.support_email || "support@smartcampaign.today";

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const plans = [
    {
      name: "Starter",
      tier: "free",
      monthlyPrice: 0,
      annualPrice: 0,
      description: "Essential toolkit for individuals & early startups launching first email campaigns.",
      badge: "Free Trial",
      popular: false,
      features: [
        "1,000 Verified Contacts",
        "5,000 Email Sends / month",
        "1 Active SMTP Server Node",
        "5 Starter HTML Templates",
        "Basic Click & Open Analytics",
        "Unsubscribe Link Management",
        "Standard Email Support"
      ],
      ctaText: "Get Started Free",
      ctaLink: "/register?plan=free"
    },
    {
      name: "Standard",
      tier: "pro",
      monthlyPrice: 15,
      annualPrice: 12,
      description: "High-performance marketing suite for growing businesses & active senders.",
      badge: "Most Popular",
      popular: true,
      features: [
        "10,000 Verified Contacts",
        "50,000 Email Sends / month",
        "3 Active SMTP Server Nodes",
        "A/B Subject Line Split Testing",
        "20+ Premium Responsive Templates",
        "SMS Gateway Integration (Twilio/BulkSMS)",
        "Advanced Heatmap & Device Analytics",
        "Scheduled & Batch Dispatches",
        "Priority Support Response"
      ],
      ctaText: "Start Standard Plan",
      ctaLink: "/register?plan=pro"
    },
    {
      name: "Premium",
      tier: "business",
      monthlyPrice: 35,
      annualPrice: 28,
      description: "Maximum throughput & multi-channel automation for high-volume agencies.",
      badge: "Best Value",
      popular: false,
      features: [
        "50,000 Verified Contacts",
        "200,000 Email Sends / month",
        "5 Active SMTP Server Nodes",
        "Full Telegram Marketing Suite (IMEI/Bot)",
        "SMS & WhatsApp Dispatch Gateways",
        "Dedicated IP Warm-up Manager",
        "Custom Unsubscribe Page Builder",
        "Automated PDF Analytics Export",
        "24/7 Priority VIP Support"
      ],
      ctaText: "Scale With Premium",
      ctaLink: "/register?plan=business"
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      monthlyPrice: 79,
      annualPrice: 65,
      description: "Dedicated infrastructure & custom API access for massive SaaS applications.",
      badge: "Unlimited",
      popular: false,
      features: [
        "Unlimited Verified Contacts",
        "Unlimited Email Dispatches",
        "Unlimited Custom SMTP Nodes",
        "Dhru Fusion API & Listener Suite",
        "Dedicated Server Pool Architecture",
        "TRC20 & BEP20 Crypto Payment Gateways",
        "Custom Domain & CNAME Tracking",
        "SLA 99.99% Uptime Guarantee",
        "Dedicated Account Executive"
      ],
      ctaText: "Contact Enterprise",
      ctaLink: "/register?plan=enterprise"
    }
  ];

  const features = [
    {
      icon: <Server className="w-6 h-6 text-indigo-400" />,
      title: "Multi-Node SMTP Load Balancing",
      description: "Rotate dispatches seamlessly across unlimited custom SMTP nodes to maximize inbox placement and maintain peak IP sender reputation.",
      color: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30"
    },
    {
      icon: <Send className="w-6 h-6 text-purple-400" />,
      title: "Automated A/B Subject Testing",
      description: "Test multiple subject lines simultaneously. SmartCampaign automatically calculates open rate conversion and dispatches the winner.",
      color: "from-purple-500/20 to-purple-500/5 border-purple-500/30"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-sky-400" />,
      title: "Telegram & SMS Omni-Channel",
      description: "Reach customers on their favorite messaging apps. Integrated bulk SMS gateways (Twilio, BulkSMSBD, Vonage) and Telegram Bot tools.",
      color: "from-sky-500/20 to-sky-500/5 border-sky-500/30"
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-400" />,
      title: "Real-Time Tracking & Heatmaps",
      description: "Track opens, clicks, device types, geolocation, and unsubscribes live as campaign dispatches process through Celery workers.",
      color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Instant API & Dhru Fusion Sync",
      description: "Full developer API suite compatible with Dhru Fusion, custom webhooks, and automated background job processing.",
      color: "from-amber-500/20 to-amber-500/5 border-amber-500/30"
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: "Bank-Grade Encryption & Crypto",
      description: "AES-256 encrypted SMTP credentials, rate limiting protection, JWT authentication, and TRC20/BEP20 crypto payments.",
      color: "from-rose-500/20 to-rose-500/5 border-rose-500/30"
    }
  ];

  const faqs = [
    {
      question: "How does Multi-Node SMTP Load Balancing improve deliverability?",
      answer: "Instead of sending thousands of emails from a single SMTP server (which triggers spam filters), SmartCampaign automatically distributes your dispatch volume across multiple SMTP nodes. This prevents IP reputation burnout and keeps your inbox delivery rate above 99%."
    },
    {
      question: "Can I connect my own custom SMS gateways and Telegram bots?",
      answer: "Yes! SmartCampaign includes built-in connectors for Twilio, BulkSMSBD, Vonage, custom HTTP GET/POST SMS APIs, as well as Telegram Bot API listeners for automated subscriber broadcasts and IMEI/Server notifications."
    },
    {
      question: "What payment methods are supported for subscription billing?",
      answer: "We support instant TRC20 (USDT), BEP20 (USDT/USDC), Merchant QR Code payments, as well as standard invoicing and manual admin reviews."
    },
    {
      question: "Can I upgrade or downgrade my subscription plan at any time?",
      answer: "Absolutely! You can upgrade your plan at any time from your account dashboard. Upgrades take effect immediately with pro-rated quota increases."
    },
    {
      question: "Is my SMTP password and recipient list secure?",
      answer: "Yes. All custom SMTP passwords are encrypted at rest using AES-256 Fernet cryptography. Your contact lists are strictly isolated in a multi-tenant PostgreSQL database with append-only security logs."
    }
  ];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Animated Ambient Mesh Light Beams */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute top-[600px] -right-20 w-[600px] h-[600px] bg-sky-600/10 rounded-full filter blur-[160px] pointer-events-none" />
      <div className="absolute top-[1600px] -left-20 w-[700px] h-[700px] bg-emerald-600/10 rounded-full filter blur-[170px] pointer-events-none" />
      <div className="absolute top-[2800px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full filter blur-[160px] pointer-events-none" />

      {/* ─── Header / Top Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#080c14]/85 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="h-10 object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                {siteName}
              </span>
              <span className="hidden sm:inline-block ml-2 text.10px] font-black tracking-widest uppercase bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                SaaS v3.0
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Console</a>
            <a href="#omnichannel" className="hover:text-white transition-colors">Omni-Channel</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs & Mobile Hamburger Toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all hidden sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden backdrop-blur-2xl bg-[#0b101c]/95 border-b border-white/[0.08] px-4 pt-4 pb-6 space-y-4 animate-slideDown">
            <nav className="flex flex-col space-y-3 text-xs font-bold text-slate-200">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                Features
              </a>
              <a 
                href="#demo" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                Live Console Demo
              </a>
              <a 
                href="#omnichannel" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                Omni-Channel Engine
              </a>
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                Pricing Plans
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white text-center"
              >
                Customer Sign In
              </Link>
              <Link
                to="/master_adm/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-[11px] font-bold text-slate-400 text-center hover:text-white"
              >
                Super Admin Terminal →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Animated Neon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold mb-8 animate-pulse shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Omni-Channel SaaS Marketing & High Deliverability Engine 3.0</span>
        </div>

        {/* Main H1 Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.12] mb-6">
          Scale Email, SMS & Telegram Dispatches With{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Instant 99.8% Inbox Placement
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed mb-10">
          Automate bulk campaign dispatches across multi-node SMTP load balancers, SMS gateways, and Telegram bots. Features real-time click heatmaps, automated A/B split testing, and crypto billing.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 w-full max-w-md sm:max-w-none mx-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-sm font-extrabold text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span>Start Free 30-Day Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 hover:border-white/20"
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Customer Portal Login</span>
          </Link>
        </div>

        {/* Live Metrics Ticker Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto p-4 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
          <div className="text-center p-3 border-r border-white/10 last:border-0">
            <div className="text-xl sm:text-3xl font-black text-indigo-400">99.8%</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Inbox Delivery Rate</div>
          </div>
          <div className="text-center p-3 border-r border-white/10 last:border-0">
            <div className="text-xl sm:text-3xl font-black text-purple-400">10M+</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Daily Email Dispatches</div>
          </div>
          <div className="text-center p-3 border-r border-white/10 last:border-0">
            <div className="text-xl sm:text-3xl font-black text-pink-400">&lt; 5ms</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">API Dispatch Latency</div>
          </div>
          <div className="text-center p-3">
            <div className="text-xl sm:text-3xl font-black text-emerald-400">99.99%</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Uptime SLA Guarantee</div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Live Platform Console Demo Section ───────────────── */}
      <section id="demo" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold tracking-widest text-indigo-400 uppercase mb-2 block">Interactive Experience</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            See How SmartCampaign Powers Your Growth
          </h2>
        </div>

        {/* Interactive Tab Switcher */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 max-w-xl mx-auto mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveDemoTab('email')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'email'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Dispatches</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('sms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'sms'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>SMS Gateways</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('telegram')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'telegram'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Bot</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Heatmap Analytics</span>
          </button>
        </div>

        {/* Live Demo Window Mockup */}
        <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#0d1322] shadow-2xl relative">
          <div className="h-10 bg-[#090e1a] border-b border-white/10 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-4 py-1 rounded-md border border-white/10 truncate max-w-[200px] sm:max-w-none">
              https://app.{siteName.toLowerCase().replace(/\s+/g, '')}.today/{activeDemoTab}
            </div>
            <div className="text-xs text-indigo-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="hidden sm:inline">LIVE DEMO</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-left">
            {activeDemoTab === 'email' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Multi-Node SMTP Email Rotation Pool</h3>
                    <p className="text-xs text-slate-400">Load balanced across 5 SMTP IP nodes for 99.8% deliverability</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                    5 SMTP Nodes Healthy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Emails Sent Today</span>
                    <div className="text-2xl font-black text-white mt-1">452,890</div>
                    <div className="text-[11px] text-emerald-400 mt-1 font-bold">↑ 24% vs yesterday</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Unique Opens</span>
                    <div className="text-2xl font-black text-indigo-400 mt-1">193,830</div>
                    <div className="text-[11px] text-indigo-300 mt-1 font-bold">42.8% Open Rate</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Bounce Rate</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">0.12%</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Zero Spam Flags</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'sms' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Global SMS Gateway Router</h3>
                    <p className="text-xs text-slate-400">Twilio, BulkSMSBD, Vonage & Custom HTTP GET/POST API Connectors</p>
                  </div>
                  <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-lg">
                    SMS Gateway Online
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">SMS Dispatches</span>
                    <div className="text-2xl font-black text-sky-400 mt-1">98,400</div>
                    <div className="text-[11px] text-sky-300 mt-1 font-bold">100% Delivery Callback</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Active Sender ID</span>
                    <div className="text-2xl font-black text-white mt-1">BRAND_SMS</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">Custom Sender Tag</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Latency</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">1.2s</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Instant SMS Delivery</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'telegram' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Telegram Broadcast & Bot Listener</h3>
                    <p className="text-xs text-slate-400">Automated Subscriber Broadcasts, IMEI Checks & Server Notifications</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg">
                    Telegram Bot Listener Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Channel Broadcasts</span>
                    <div className="text-2xl font-black text-indigo-400 mt-1">34,120</div>
                    <div className="text-[11px] text-indigo-300 mt-1 font-bold">Instant Push</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">IMEI / Server Checks</span>
                    <div className="text-2xl font-black text-purple-400 mt-1">12,890</div>
                    <div className="text-[11px] text-purple-300 mt-1 font-bold">Automated Responses</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Subscriber Reach</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">100%</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Zero Drop Rate</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'analytics' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Live Click & Device Tracking Analytics</h3>
                    <p className="text-xs text-slate-400">Pixel-based tracking, device breakdown & location heatmaps</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold rounded-lg">
                    Real-Time Tracking Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Desktop Readers</span>
                    <div className="text-2xl font-black text-indigo-400 mt-1">68.4%</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">Chrome / Edge / Safari</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Mobile Readers</span>
                    <div className="text-2xl font-black text-purple-400 mt-1">31.6%</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">iOS / Android Devices</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 font-medium">Total Link Clicks</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">84,920</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">PDF Report Export Ready</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Core Platform Features ───────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-extrabold tracking-widest text-indigo-400 uppercase mb-3">Built for High Volume & High Deliverability</h2>
          <p className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Everything You Need To Execute Flawless Marketing Campaigns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-3xl bg-gradient-to-b ${feature.color} border backdrop-blur-xl hover:-translate-y-1.5 transition-all shadow-xl hover:shadow-indigo-500/10 group`}
            >
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 inline-block mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Omni-Channel Marketing Showcase ─────────────────────────────── */}
      <section id="omnichannel" className="py-20 bg-white/[0.01] border-y border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-left">
              <span className="px-3.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold inline-block">
                Omni-Channel Messaging Hub
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Combine Email, SMS & Telegram Into One Automation Engine
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Don't limit your customer outreach to just email. Engage leads across Telegram channels, automated SMS gateways (Twilio, BulkSMSBD, Vonage), and instant webhooks simultaneously.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 mt-1">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Multi-Node SMTP Email Dispatches</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Custom SMTP server rotation, HTML template builder & automated CSV contacts import.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 mt-1">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Global SMS Marketing Gateway</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Send promotional & transactional SMS with personalized template tags via Twilio or custom APIs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 mt-1">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Telegram Broadcasts & Bot Listener</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Automated Telegram bot notifications, IMEI/Server status alerts, and instant group broadcasts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Omni-Channel Graphic Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0b101c] border border-white/10 shadow-2xl relative text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Live Dispatch Routing Engine</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Online
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Email Dispatch Node #1</div>
                      <div className="text-[10px] text-slate-400">SMTP Host: smtp.smartcampaign.today</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    Active (100% Inbox)
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">SMS Gateway Node</div>
                      <div className="text-[10px] text-slate-400">Provider: Twilio / BulkSMS API</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Telegram Marketing Bot</div>
                      <div className="text-[10px] text-slate-400">Listener: Active Bot Worker</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                    Listening
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Plans Section ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold tracking-widest text-indigo-400 uppercase mb-3 block">Flexible SaaS Billing</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
            Transparent Pricing Plans For Every Scale
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            No hidden fees. Choose a plan tailored to your dispatch volume or start with our free trial.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-6 sm:p-8 rounded-3xl backdrop-blur-2xl transition-all flex flex-col justify-between relative ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-950/80 via-purple-950/50 to-[#0c1220] border-2 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.25)] scale-[1.03] z-20'
                  : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[10px] font-black tracking-wider uppercase shadow-lg shadow-indigo-500/30">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  {!plan.popular && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 min-h-[36px] mb-6 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mb-6 border-b border-white/10 pb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ month</span>
                  </div>
                  {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 block">
                      Billed annually (Save 20%)
                    </span>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-8 text-xs text-slate-300">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={plan.ctaLink}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-center transition-all shadow-lg ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-95 shadow-indigo-500/30'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10'
                }`}
              >
                {plan.ctaText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive FAQ Accordion ────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Got questions about SmartCampaign? We have answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white hover:text-indigo-300 transition-colors"
              >
                <span>{faq.question}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {openFaq === idx && (
                <div className="px-5 sm:px-6 pb-6 text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-4 text-left">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left z-10 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Supercharge Your Campaign Deliverability?
            </h2>
            <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed">
              Join thousands of marketers & developers delivering multi-channel campaigns with SmartCampaign.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full md:w-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 transition-all shadow-xl text-center"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/20 text-white font-bold text-xs transition-all text-center"
            >
              Sign In To Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#060a12] pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} className="h-8 object-contain" />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  <Send className="w-4 h-4" />
                </div>
              )}
              <span className="font-extrabold text-white text-base">{siteName}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modern SaaS email marketing, multi-node SMTP load balancer, bulk SMS gateway & Telegram automation suite.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Platform Modules</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li><a href="#features" className="hover:text-white transition-colors">SMTP Load Balancer</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">A/B Subject Testing</a></li>
              <li><a href="#omnichannel" className="hover:text-white transition-colors">Telegram Marketing Suite</a></li>
              <li><a href="#omnichannel" className="hover:text-white transition-colors">SMS Gateway Integrations</a></li>
              <li><a href="#demo" className="hover:text-white transition-colors">Click & Open Heatmaps</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-dark-400 font-medium">
              <li><Link to="/login" className="hover:text-white transition-colors">User Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register Account</Link></li>
              <li><Link to="/master_adm/login" className="hover:text-white transition-colors">Super Admin Terminal</Link></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Subscription Pricing</a></li>
              <li><a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">API Health Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Contact & Support</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>Email: <span className="text-white font-semibold">{supportEmail}</span></li>
              <li>SLA Uptime: <span className="text-emerald-400 font-semibold">99.99% Guaranteed</span></li>
              <li>Developer API: <span className="text-indigo-400 font-semibold">Dhru Fusion Compatible</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Copyright &copy; 2026 {siteName} / ASTRA IT, Inc. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-300 transition-colors">Terms of Service</a>
            <Link to="/master_adm/login" className="hover:text-indigo-400 transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
