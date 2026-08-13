import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Radio,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../App';

export default function LandingPage() {
  const { appConfig, login } = useAuth();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'email' | 'sms' | 'telegram' | 'analytics'>('email');

  // Modal Auth State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>('free');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verification & 2FA state
  const [verifyEmailMode, setVerifyEmailMode] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const siteName = appConfig?.site_name || "SmartCampaign";
  const companyName = appConfig?.company_name || "ASTRA IT, Inc.";
  const siteLogo = appConfig?.logo_url;
  const footerLogo = appConfig?.footer_logo_url || appConfig?.logo_url;
  const faviconUrl = appConfig?.favicon_url;
  const supportEmail = appConfig?.support_email || "support@smartcampaign.today";

  // Dynamic Favicon Update
  useEffect(() => {
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  // Dynamic Real-time Subscription Plans from Database
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchPublicPlans = async () => {
      try {
        const res = await fetch("/api/auth/plans");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDbPlans(data);
          }
        }
      } catch (err) {
        console.error("Failed loading subscription plans from database", err);
      }
    };
    fetchPublicPlans();
  }, []);

  // ESC Key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && authModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const openLoginModal = () => {
    setAuthMode('login');
    setError(null);
    setVerifyEmailMode(false);
    setMfaRequired(false);
    setAuthModalOpen(true);
  };

  const openRegisterModal = (planTier: string = 'free') => {
    setAuthMode('register');
    setSelectedPlanTier(planTier);
    setError(null);
    setVerifyEmailMode(false);
    setMfaRequired(false);
    setAuthModalOpen(true);
  };

  const closeModal = () => {
    setAuthModalOpen(false);
    setError(null);
    setLoading(false);
    setVerifyEmailMode(false);
    setMfaRequired(false);
  };

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pw)) return "Password must contain at least one digit.";
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(pw)) return "Password must contain at least one special character.";
    return null;
  };

  // Submit Login inside Modal
  const handleModalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };
      if (mfaRequired && mfaCode) {
        headers["X-2FA-Code"] = mfaCode.trim();
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: headers,
        body: params
      });

      if (response.ok) {
        const data = await response.json();
        closeModal();
        await login(data.access_token);
      } else {
        if (response.status === 401) {
          const clone = response.clone();
          try {
            const data = await clone.json();
            if (data && (data.detail === "2FA_REQUIRED" || data.detail === "2FA_EMAIL_REQUIRED")) {
              setMfaRequired(true);
              setLoading(false);
              return;
            }
            if (data && data.detail === "EMAIL_VERIFICATION_REQUIRED") {
              setVerifyEmailMode(true);
              setLoading(false);
              return;
            }
          } catch (err) {
            // ignore JSON error
          }
        }
        const errData = await response.json();
        setError(errData.detail || "Invalid email or password.");
      }
    } catch (err) {
      setError("Network connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Register inside Modal
  const handleModalRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const regResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (regResponse.ok) {
        let isVerified = true;
        try {
          const regData = await regResponse.clone().json();
          if (regData && regData.email_verified === false) {
            isVerified = false;
          }
        } catch (e) {
          // ignore
        }

        if (!isVerified) {
          setVerifyEmailMode(true);
          setLoading(false);
          return;
        }

        // Auto Login user
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);

        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          closeModal();
          await login(loginData.access_token);
        } else {
          setAuthMode('login');
          setError("Account created successfully! Please sign in.");
        }
      } else {
        const errData = await regResponse.json();
        if (errData && errData.detail) {
          if (typeof errData.detail === "string") {
            setError(errData.detail);
          } else if (Array.isArray(errData.detail)) {
            setError(errData.detail.map((err: any) => err.msg).join(", "));
          } else {
            setError("Registration failed.");
          }
        } else {
          setError("Registration failed.");
        }
      }
    } catch (err) {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Verification Code inside Modal
  const handleModalVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-signup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        closeModal();
        await login(data.access_token);
      } else {
        const err = await res.json();
        setError(err.detail || "Invalid verification code.");
      }
    } catch (err) {
      setError("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const defaultPlans = [
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
      ctaText: "Get Started Free"
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
      ctaText: "Start Standard Plan"
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
      ctaText: "Scale With Premium"
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
      ctaText: "Contact Enterprise"
    }
  ];

  const activePlans = dbPlans.length > 0 ? dbPlans : defaultPlans;

  const features = [
    {
      icon: <Server className="w-6 h-6 text-brand-400" />,
      title: "Multi-Node SMTP Load Balancing",
      description: "Rotate dispatches seamlessly across unlimited custom SMTP nodes to maximize inbox placement and maintain peak IP sender reputation."
    },
    {
      icon: <Send className="w-6 h-6 text-indigo-400" />,
      title: "Automated A/B Subject Testing",
      description: "Test multiple subject lines simultaneously. SmartCampaign automatically calculates open rate conversion and dispatches the winner."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-sky-400" />,
      title: "Telegram & SMS Omni-Channel",
      description: "Reach customers on their favorite messaging apps. Integrated bulk SMS gateways (Twilio, BulkSMSBD, Vonage) and Telegram Bot tools."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-400" />,
      title: "Real-Time Tracking & Heatmaps",
      description: "Track opens, clicks, device types, geolocation, and unsubscribes live as campaign dispatches process through Celery workers."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Instant API & Dhru Fusion Sync",
      description: "Full developer API suite compatible with Dhru Fusion, custom webhooks, and automated background job processing."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: "Bank-Grade Encryption & Crypto",
      description: "AES-256 encrypted SMTP credentials, rate limiting protection, JWT authentication, and TRC20/BEP20 crypto payments."
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
    <div className="dark min-h-screen bg-[#0d0e1a] text-slate-100 font-sans selection:bg-brand-500 selection:text-white relative overflow-x-hidden">
      {/* Background Glow Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full filter blur-[140px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-[140px] animate-pulse delay-700 pointer-events-none" />

      {/* ─── Header / Top Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0d0e1a]/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="h-10 object-contain rounded-xl" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 brand-gradient-bg rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                  {siteName.substring(0, 1) || "S"}
                </div>
                <span className="text-lg font-black tracking-tight text-white group-hover:text-brand-400 transition-colors font-sans">
                  {siteName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Console</a>
            <a href="#omnichannel" className="hover:text-white transition-colors">Omni-Channel</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={openLoginModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/60 transition-all hidden sm:inline-flex"
            >
              Sign In
            </button>
            <button
              onClick={() => openRegisterModal('free')}
              className="px-5 py-2.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#1a1c2e] border border-slate-700/80 text-slate-300 hover:text-white transition-all"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden backdrop-blur-2xl bg-[#0d0e1a]/95 border-b border-slate-800/80 px-4 pt-4 pb-6 space-y-4 animate-slideDown">
            <nav className="flex flex-col space-y-3 text-xs font-bold text-slate-200">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-[#1a1c2e] transition-colors"
              >
                Features
              </a>
              <a 
                href="#demo" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-[#1a1c2e] transition-colors"
              >
                Live Console Demo
              </a>
              <a 
                href="#omnichannel" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-[#1a1c2e] transition-colors"
              >
                Omni-Channel Engine
              </a>
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-[#1a1c2e] transition-colors"
              >
                Pricing Plans
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-[#1a1c2e] transition-colors"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); openLoginModal(); }}
                className="w-full py-3 rounded-xl bg-[#1a1c2e] border border-slate-700/80 text-xs font-bold text-white text-center"
              >
                Customer Sign In
              </button>
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
      <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[11px] sm:text-xs font-extrabold mb-5 animate-pulse shadow-lg shadow-brand-500/5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Next-Gen Smart-Campaign Marketing & Deliverability Platform</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.15] mb-4">
          Scale Your Email, SMS & Telegram Marketing With{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400">
            Instant Inbox Placement
          </span>
        </h1>

        <p className="text-xs sm:text-sm lg:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed mb-6">
          Automate bulk campaign dispatches across multi-node SMTP load balancers, SMS gateways, and Telegram bots. Features real-time click heatmaps, automated A/B split testing, and crypto billing.
        </p>

        {/* CTA Buttons - High Contrast Dark & Gradient Styling */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 w-full max-w-md sm:max-w-none mx-auto">
          <button
            onClick={() => openRegisterModal('free')}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl brand-gradient-bg text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
          >
            <span>Start Your Free 30-Day Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={openLoginModal}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-[#1a1c2e] hover:bg-[#252845] border border-slate-700/80 text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-2 hover:border-slate-600 shadow-lg"
          >
            <Lock className="w-4 h-4 text-brand-400" />
            <span>Customer Portal Login</span>
          </button>
        </div>

        {/* Metrics Ticker - High Contrast Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto p-3.5 sm:p-5 rounded-2xl bg-[#1a1c2e]/90 border border-slate-800 shadow-xl backdrop-blur-xl">
          <div className="text-center p-2.5 border-r border-slate-800/80 last:border-0">
            <div className="text-lg sm:text-2xl font-black text-brand-400">99.8%</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Inbox Delivery Rate</div>
          </div>
          <div className="text-center p-2.5 border-r border-slate-800/80 last:border-0">
            <div className="text-lg sm:text-2xl font-black text-indigo-400">10M+</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Daily Email Dispatches</div>
          </div>
          <div className="text-center p-2.5 border-r border-slate-800/80 last:border-0">
            <div className="text-lg sm:text-2xl font-black text-purple-400">&lt; 5ms</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">API Dispatch Latency</div>
          </div>
          <div className="text-center p-2.5">
            <div className="text-lg sm:text-2xl font-black text-emerald-400">99.99%</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Uptime SLA Guarantee</div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Live Console Demo Section ────────────────────────── */}
      <section id="demo" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-extrabold tracking-widest text-brand-400 uppercase mb-1.5 block">Interactive Experience</span>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            See How SmartCampaign Powers Your Growth
          </h2>
        </div>

        {/* High-Contrast Tab Switcher Container */}
        <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-[#1a1c2e] border border-slate-800 max-w-2xl mx-auto mb-8 overflow-x-auto shadow-xl">
          <button
            onClick={() => setActiveDemoTab('email')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'email'
                ? 'brand-gradient-bg text-white shadow-md'
                : 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Dispatches</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('sms')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'sms'
                ? 'brand-gradient-bg text-white shadow-md'
                : 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>SMS Gateways</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('telegram')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'telegram'
                ? 'brand-gradient-bg text-white shadow-md'
                : 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Bot</span>
          </button>

          <button
            onClick={() => setActiveDemoTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'analytics'
                ? 'brand-gradient-bg text-white shadow-md'
                : 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Heatmap Analytics</span>
          </button>
        </div>

        {/* Live Demo Window Container */}
        <div className="rounded-3xl overflow-hidden bg-[#121424] border border-slate-800 shadow-2xl relative text-left">
          <div className="h-10 bg-[#0d0e1a] border-b border-slate-800 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="text-[10px] font-mono text-slate-400 bg-[#1a1c2e] px-4 py-1 rounded-md border border-slate-800 truncate max-w-[200px] sm:max-w-none">
              https://smartcampaign.today/{activeDemoTab}
            </div>
            <div className="text-xs text-brand-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="hidden sm:inline">LIVE DEMO</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {activeDemoTab === 'email' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Multi-Node SMTP Email Rotation Pool</h3>
                    <p className="text-xs text-slate-400">Load balanced across 5 SMTP IP nodes for 99.8% deliverability</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                    5 SMTP Nodes Healthy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Emails Sent Today</span>
                    <div className="text-2xl font-black text-white mt-1">452,890</div>
                    <div className="text-[11px] text-emerald-400 mt-1 font-bold">↑ 24% vs yesterday</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Unique Opens</span>
                    <div className="text-2xl font-black text-brand-400 mt-1">193,830</div>
                    <div className="text-[11px] text-brand-300 mt-1 font-bold">42.8% Open Rate</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Bounce Rate</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">0.12%</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Zero Spam Flags</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'sms' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Global SMS Gateway Router</h3>
                    <p className="text-xs text-slate-400">Twilio, BulkSMSBD, Vonage & Custom HTTP GET/POST API Connectors</p>
                  </div>
                  <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-lg">
                    SMS Gateway Online
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">SMS Dispatches</span>
                    <div className="text-2xl font-black text-sky-400 mt-1">98,400</div>
                    <div className="text-[11px] text-sky-300 mt-1 font-bold">100% Delivery Callback</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Active Sender ID</span>
                    <div className="text-2xl font-black text-white mt-1">BRAND_SMS</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">Custom Sender Tag</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Latency</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">1.2s</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Instant SMS Delivery</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'telegram' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Telegram Broadcast & Bot Listener</h3>
                    <p className="text-xs text-slate-400">Automated Subscriber Broadcasts, IMEI Checks & Server Notifications</p>
                  </div>
                  <span className="px-3 py-1 bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-bold rounded-lg">
                    Telegram Bot Listener Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Channel Broadcasts</span>
                    <div className="text-2xl font-black text-brand-400 mt-1">34,120</div>
                    <div className="text-[11px] text-brand-300 mt-1 font-bold">Instant Push</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">IMEI / Server Checks</span>
                    <div className="text-2xl font-black text-purple-400 mt-1">12,890</div>
                    <div className="text-[11px] text-purple-300 mt-1 font-bold">Automated Responses</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Subscriber Reach</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">100%</div>
                    <div className="text-[11px] text-emerald-300 mt-1 font-bold">Zero Drop Rate</div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'analytics' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Live Click & Device Tracking Analytics</h3>
                    <p className="text-xs text-slate-400">Pixel-based tracking, device breakdown & location heatmaps</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold rounded-lg">
                    Real-Time Tracking Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Desktop Readers</span>
                    <div className="text-2xl font-black text-brand-400 mt-1">68.4%</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">Chrome / Edge / Safari</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Mobile Readers</span>
                    <div className="text-2xl font-black text-purple-400 mt-1">31.6%</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-bold">iOS / Android Devices</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
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
      <section id="features" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xs font-extrabold tracking-widest text-brand-400 uppercase mb-2">Built for High Volume & High Deliverability</h2>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Everything You Need To Execute Flawless Marketing Campaigns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-[#1a1c2e]/90 border border-slate-800/80 hover:border-brand-500/50 transition-all hover:-translate-y-1 shadow-lg group"
            >
              <div className="p-3 rounded-xl bg-[#0d0e1a] border border-slate-800 inline-block mb-4 group-hover:scale-105 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
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
      <section id="omnichannel" className="py-10 sm:py-14 bg-[#121424]/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4 text-left">
              <span className="px-3.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-extrabold inline-block">
                Omni-Channel Messaging Hub
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Combine Email, SMS & Telegram Into One Automation Engine
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Don't limit your customer outreach to just email. Engage leads across Telegram channels, automated SMS gateways (Twilio, BulkSMSBD, Vonage), and instant webhooks simultaneously.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#1a1c2e] border border-slate-800">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Multi-Node SMTP Email Dispatches</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Custom SMTP server rotation, HTML template builder & automated CSV contacts import.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#1a1c2e] border border-slate-800">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Global SMS Marketing Gateway</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Send promotional & transactional SMS with personalized template tags via Twilio or custom APIs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#1a1c2e] border border-slate-800">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Telegram Broadcasts & Bot Listener</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Automated Telegram bot notifications, IMEI/Server status alerts, and instant group broadcasts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Omni-Channel Graphic Card */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#1a1c2e] border border-slate-800 shadow-xl relative text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Live Dispatch Routing Engine</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  Online
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0d0e1a] border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Email Dispatch Node #1</div>
                      <div className="text-[10px] text-slate-400">SMTP Host: smtp.smartcampaign.today</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active (100% Inbox)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0d0e1a] border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">SMS Gateway Node</div>
                      <div className="text-[10px] text-slate-400">Provider: Twilio / BulkSMS API</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0d0e1a] border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Telegram Marketing Bot</div>
                      <div className="text-[10px] text-slate-400">Listener: Active Bot Worker</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    Listening
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Plans Section ────────────────────────────────────────── */}
      <section id="pricing" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <span className="text-xs font-extrabold tracking-widest text-brand-400 uppercase mb-2 block">Flexible SaaS Billing</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Transparent Pricing Plans For Every Scale
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            No hidden fees. Choose a plan tailored to your dispatch volume or start with our free trial.
          </p>

          <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-[#1a1c2e] border border-slate-800 shadow-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                billingCycle === 'monthly'
                  ? 'brand-gradient-bg text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'brand-gradient-bg text-white shadow-md'
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {activePlans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-5 sm:p-6 rounded-2xl bg-[#1a1c2e]/90 border transition-all flex flex-col justify-between relative ${
                plan.popular
                  ? 'border-2 border-brand-500 shadow-[0_0_30px_rgba(79,70,229,0.25)] scale-[1.02] z-20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full brand-gradient-bg text-white text-[10px] font-black tracking-wider uppercase shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-white">{plan.name}</h3>
                  {!plan.popular && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#0d0e1a] text-slate-300 border border-slate-700">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] sm:text-xs text-slate-400 min-h-[32px] mb-4 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mb-5 border-b border-slate-800 pb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-white">
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

                <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
                  {(plan.features || []).map((feat: string, fIdx: number) => (
                    <li key={fIdx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button: High contrast text on dark background */}
              <button
                onClick={() => openRegisterModal(plan.tier)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all shadow-lg ${
                  plan.popular
                    ? 'brand-gradient-bg text-white hover:opacity-95 shadow-brand-500/20'
                    : 'bg-[#252845] hover:bg-[#30334f] text-white border border-slate-700/80'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive FAQ Accordion ────────────────────────────────────── */}
      <section id="faq" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Got questions about SmartCampaign? We have answers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#1a1c2e]/90 border border-slate-800 overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white hover:text-brand-300 transition-colors"
              >
                <span className="text-white font-bold">{faq.question}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-brand-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {openFaq === idx && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 text-left">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-6 sm:p-10 rounded-2xl brand-gradient-bg relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-2 text-center md:text-left z-10 max-w-2xl">
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Ready to Supercharge Your Campaign Deliverability?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
              Join thousands of marketers & developers delivering multi-channel campaigns with SmartCampaign.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full md:w-auto">
            <button
              onClick={() => openRegisterModal('free')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-slate-950 font-extrabold text-xs hover:bg-slate-100 transition-all shadow-xl text-center"
            >
              Create Free Account
            </button>
            <button
              onClick={openLoginModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0b0c16]/50 hover:bg-[#0b0c16]/75 border border-white/30 text-white font-bold text-xs transition-all text-center"
            >
              Sign In To Portal
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-[#0d0e1a] pt-10 pb-8 px-4 sm:px-6 lg:px-8 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {footerLogo ? (
                <img src={footerLogo} alt={siteName} className="h-8 object-contain" />
              ) : siteLogo ? (
                <img src={siteLogo} alt={siteName} className="h-8 object-contain" />
              ) : (
                <div className="h-8 w-8 brand-gradient-bg rounded-xl flex items-center justify-center text-white font-bold">
                  {siteName.substring(0, 1) || "S"}
                </div>
              )}
              <span className="font-extrabold text-white text-base font-sans">{siteName}</span>
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
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li><button onClick={openLoginModal} className="hover:text-white transition-colors text-left">User Sign In</button></li>
              <li><button onClick={() => openRegisterModal('free')} className="hover:text-white transition-colors text-left">Register Account</button></li>
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

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Copyright &copy; 2026 {siteName} / {companyName}. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-300 transition-colors">Terms of Service</a>
            <Link to="/master_adm/login" className="hover:text-brand-400 transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>

      {/* ─── INTERACTIVE AUTH POPUP MODAL ─────────────────────────────────── */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0" 
            onClick={closeModal}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-sm bg-[#1a1c2e] border border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-2xl animate-scaleUp text-left my-8">
            {/* Close Button (X) */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#0d0e1a] text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 brand-gradient-bg rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
                  {siteName.substring(0, 1) || "S"}
                </div>
                <span className="font-extrabold text-white text-sm">{siteName} Portal</span>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0d0e1a] border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'login'
                      ? 'brand-gradient-bg text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'register'
                      ? 'brand-gradient-bg text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-4.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-start gap-2.5 animate-headShake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{error}</span>
              </div>
            )}

            {/* ─── EMAIL VERIFICATION MODE ─── */}
            {verifyEmailMode ? (
              <form onSubmit={handleModalVerifyEmailSubmit} className="space-y-4">
                <div className="text-center py-2">
                  <KeyRound className="w-10 h-10 text-brand-400 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-white">Enter Verification Code</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    A verification OTP code was sent to <span className="text-white font-semibold">{email}</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-white font-mono text-center tracking-widest text-lg focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyEmailMode(false)}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-white pt-2"
                >
                  ← Back to Login
                </button>
              </form>
            ) : authMode === 'login' ? (
              /* ─── LOGIN FORM ─── */
              <form onSubmit={handleModalLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mfaRequired && (
                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1.5">Two-Factor Auth (2FA) Code</label>
                    <input
                      type="text"
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="Enter 6-digit 2FA code"
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e1a] border border-amber-500/50 text-white font-mono text-center tracking-widest text-sm focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-slate-400">
                  New to {siteName}?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(null); }}
                    className="text-brand-400 font-bold hover:underline"
                  >
                    Create a free account
                  </button>
                </div>
              </form>
            ) : (
              /* ─── REGISTER FORM ─── */
              <form onSubmit={handleModalRegisterSubmit} className="space-y-4">
                {selectedPlanTier !== 'free' && (
                  <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold flex items-center justify-between">
                    <span>Selected Plan: <span className="uppercase text-white">{selectedPlanTier}</span></span>
                    <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full">Trial Included</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 chars, 1 uppercase, 1 symbol"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0d0e1a] border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Start Trial</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-slate-400">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-brand-400 font-bold hover:underline"
                  >
                    Sign in to your account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
