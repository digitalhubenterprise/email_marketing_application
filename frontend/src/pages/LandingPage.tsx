import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  KeyRound,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../App';

export default function LandingPage() {
  const { appConfig, login } = useAuth();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'email' | 'sms' | 'telegram' | 'analytics'>('email');

  // Theme (Dark / Light Mode) State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('landing_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('landing_theme', nextTheme);
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Modal Auth State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>('free');

  // Form Fields
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [websiteHp, setWebsiteHp] = useState('');
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
  const companyName = appConfig?.company_name || "SmartCampaign, Inc.";
  const siteLogo = appConfig?.logo_url;
  const siteDarkLogo = appConfig?.dark_logo_url;
  const activeHeaderLogo = theme === 'dark' ? (siteDarkLogo || siteLogo) : (siteLogo || siteDarkLogo);

  const footerLogo = appConfig?.footer_logo_url || siteLogo;
  const footerDarkLogo = appConfig?.footer_dark_logo_url || siteDarkLogo || footerLogo;
  const activeFooterLogo = theme === 'dark' ? (footerDarkLogo || footerLogo) : (footerLogo || footerDarkLogo);

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

  const closeModal = useCallback(() => {
    setAuthModalOpen(false);
    setError(null);
    setLoading(false);
    setVerifyEmailMode(false);
    setMfaRequired(false);
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
  }, [authModalOpen, closeModal]);

  const toggleFaq = useCallback((index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  }, []);

  const openLoginModal = useCallback(() => {
    setAuthMode('login');
    setError(null);
    setVerifyEmailMode(false);
    setMfaRequired(false);
    setAuthModalOpen(true);
  }, []);

  const openRegisterModal = useCallback((planTier: string = 'free') => {
    setAuthMode('register');
    setSelectedPlanTier(planTier);
    setError(null);
    setVerifyEmailMode(false);
    setMfaRequired(false);
    setAuthModalOpen(true);
  }, []);

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
        let errorMsg = "Invalid email or password.";
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (e) {
          errorMsg = `Server error (${response.status}). Please verify database connection.`;
        }
        setError(errorMsg);
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
        body: JSON.stringify({ email, password, phone_number: phoneNumber, website_hp: websiteHp })
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

  const activePlans = useMemo(() => {
    return dbPlans.length > 0 ? dbPlans : defaultPlans;
  }, [dbPlans]);

  const features = useMemo(() => [
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
  ], []);

  const faqs = useMemo(() => [
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
  ], []);

  return (
    <div className={`min-h-screen font-sans selection:bg-brand-500 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'dark bg-[#0d0e1a] text-slate-100' : 'light bg-slate-50 text-slate-900'
    }`}>
      {/* Background Glow Blurs (GPU Accelerated) */}
      <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full filter blur-[140px] animate-pulse pointer-events-none transform-gpu will-change-transform ${
        theme === 'dark' ? 'bg-brand-500/10' : 'bg-brand-500/5'
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full filter blur-[140px] animate-pulse delay-700 pointer-events-none transform-gpu will-change-transform ${
        theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
      }`} />

      {/* ─── Header / Top Navbar ─────────────────────────────────────────── */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0d0e1a]/85 border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {activeHeaderLogo ? (
              <img src={activeHeaderLogo} alt={siteName} loading="eager" decoding="async" className="h-10 object-contain rounded-xl" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 brand-gradient-bg rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                  {siteName.substring(0, 1) || "S"}
                </div>
                <span className={`text-lg font-black tracking-tight group-hover:text-brand-500 transition-colors font-sans ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {siteName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <nav className={`hidden lg:flex items-center gap-8 text-xs font-bold ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <a href="#features" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Features</a>
            <a href="#demo" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Live Console</a>
            <a href="#pricing" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Pricing Plans</a>
            <a href="#faq" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-[#1a1c2e] border-slate-700/80 text-amber-400 hover:bg-slate-800 hover:text-amber-300 shadow-md'
                  : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200 shadow-sm'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark and Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={openLoginModal}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all hidden sm:inline-flex ${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-slate-700/60'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => openRegisterModal('free')}
              className="px-5 py-2.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 active:scale-[0.98] transition-all hidden sm:inline-flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
 
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-[#1a1c2e] border-slate-700/80 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
              }`}
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
 
      {/* Mobile Drawer (placed outside header to avoid stacking context & filter rendering bugs) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fadeIn" 
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className={`fixed top-0 right-0 h-full w-[290px] max-w-[85vw] z-50 shadow-2xl p-6 flex flex-col justify-between animate-slideInRight border-l transition-all lg:hidden ${
            theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div>
              {/* Header of Drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/40 mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 brand-gradient-bg rounded-lg flex items-center justify-center text-white font-black text-sm">
                    {siteName.substring(0, 1) || "S"}
                  </div>
                  <span className="font-extrabold text-sm tracking-tight">{siteName}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-lg border transition-all ${
                    theme === 'dark' ? 'bg-[#1a1c2e] border-slate-700/80 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                  aria-label="Close Mobile Menu"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
 
              <nav className="flex flex-col space-y-3 text-xs font-bold">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-[#1a1c2e]' : 'hover:bg-slate-100'}`}
                >
                  Features
                </a>
                <a 
                  href="#demo" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-[#1a1c2e]' : 'hover:bg-slate-100'}`}
                >
                  Live Console Demo
                </a>
                <a 
                  href="#pricing" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-[#1a1c2e]' : 'hover:bg-slate-100'}`}
                >
                  Pricing Plans
                </a>
                <a 
                  href="#faq" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-[#1a1c2e]' : 'hover:bg-slate-100'}`}
                >
                  FAQ
                </a>
              </nav>
            </div>
 
            <div className="space-y-4">
              <div className={`pt-3.5 flex items-center justify-between border-t ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Appearance Theme</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1c2e] border-slate-700/80 text-amber-400'
                      : 'bg-slate-100 border-slate-300 text-indigo-600'
                  }`}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
 
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { setMobileMenuOpen(false); openLoginModal(); }}
                  className={`w-full py-3 rounded-xl text-xs font-bold text-center border ${
                    theme === 'dark' ? 'bg-[#1a1c2e] border-slate-700/80 text-white hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); openRegisterModal('free'); }}
                  className="w-full py-3 rounded-xl brand-gradient-bg text-xs font-extrabold text-white text-center shadow-lg shadow-brand-500/20"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold mb-5 animate-pulse shadow-lg ${
          theme === 'dark'
            ? 'bg-brand-500/10 border border-brand-500/20 text-brand-300 shadow-brand-500/5'
            : 'bg-brand-50 border border-brand-200 text-brand-700 shadow-brand-500/10'
        }`}>
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Next-Gen Smart-Campaign Marketing & Deliverability Platform</span>
        </div>

        <h1 className={`text-2xl sm:text-4xl lg:text-6xl font-black tracking-tight max-w-5xl mx-auto leading-[1.15] mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          Scale Your Email, SMS & Telegram Marketing With{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500">
            Instant Inbox Placement
          </span>
        </h1>

        <p className={`text-xs sm:text-sm lg:text-base max-w-2xl mx-auto font-medium leading-relaxed mb-6 ${
          theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Automate bulk campaign dispatches across multi-node SMTP load balancers, SMS gateways, and Telegram bots. Features real-time click heatmaps, automated A/B split testing, and crypto billing.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 w-full max-w-md sm:max-w-none mx-auto">
          <button
            onClick={() => openRegisterModal('free')}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl brand-gradient-bg text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
          >
            <span>Start Your Free 15-Day Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={openLoginModal}
            className={`w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              theme === 'dark'
                ? 'bg-[#1a1c2e] hover:bg-[#252845] border-slate-700/80 text-white'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-brand-500" />
            <span>Login Account</span>
          </button>
        </div>

        {/* Metrics Ticker - High Contrast Panel */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto p-3.5 sm:p-5 rounded-2xl border shadow-xl backdrop-blur-xl ${
          theme === 'dark' ? 'bg-[#1a1c2e]/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-slate-200/50'
        }`}>
          <div className={`text-center p-2.5 border-r last:border-0 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="text-lg sm:text-2xl font-black text-brand-500">99.8%</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Inbox Delivery Rate</div>
          </div>
          <div className={`text-center p-2.5 border-r last:border-0 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="text-lg sm:text-2xl font-black text-indigo-500">10M+</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Daily Email Dispatches</div>
          </div>
          <div className={`text-center p-2.5 border-r last:border-0 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div className="text-lg sm:text-2xl font-black text-purple-500">&lt; 5ms</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>API Dispatch Latency</div>
          </div>
          <div className="text-center p-2.5">
            <div className="text-lg sm:text-2xl font-black text-emerald-500">99.99%</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Uptime SLA Guarantee</div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Live Console Demo Section ────────────────────────── */}
      <section id="demo" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-extrabold tracking-widest text-brand-500 uppercase mb-1.5 block">Interactive Experience</span>
          <h2 className={`text-xl sm:text-3xl font-black tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            See How SmartCampaign Powers Your Growth
          </h2>
        </div>

        {/* Tab Switcher Container */}
        <div className={`flex items-center justify-center gap-2 p-2 rounded-2xl border max-w-2xl mx-auto mb-8 overflow-x-auto shadow-xl ${
          theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-slate-200/70 border-slate-300'
        }`}>
          <button
            onClick={() => setActiveDemoTab('email')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeDemoTab === 'email'
                ? 'brand-gradient-bg text-white shadow-md'
                : theme === 'dark' ? 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50' : 'text-slate-700 hover:text-slate-900 bg-transparent hover:bg-slate-300/50'
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
                : theme === 'dark' ? 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50' : 'text-slate-700 hover:text-slate-900 bg-transparent hover:bg-slate-300/50'
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
                : theme === 'dark' ? 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50' : 'text-slate-700 hover:text-slate-900 bg-transparent hover:bg-slate-300/50'
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
                : theme === 'dark' ? 'text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50' : 'text-slate-700 hover:text-slate-900 bg-transparent hover:bg-slate-300/50'
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
                    <h3 className="text-base font-bold text-white !text-white">Multi-Node SMTP Email Rotation Pool</h3>
                    <p className="text-xs text-slate-400">Load balanced across 5 SMTP IP nodes for 99.8% deliverability</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                    5 SMTP Nodes Healthy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#1a1c2e] border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Emails Sent Today</span>
                    <div className="text-2xl font-black text-white !text-white mt-1">452,890</div>
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
                    <h3 className="text-base font-bold text-white !text-white">Global SMS Gateway Router</h3>
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
                    <div className="text-2xl font-black text-white !text-white mt-1">BRAND_SMS</div>
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
                    <h3 className="text-base font-bold text-white !text-white">Telegram Broadcast & Bot Listener</h3>
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
                    <h3 className="text-base font-bold text-white !text-white">Live Click & Device Tracking Analytics</h3>
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
      <section id="features" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 600px' }} className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xs font-extrabold tracking-widest text-brand-500 uppercase mb-2">Built for High Volume & High Deliverability</h2>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Everything You Need To Execute Flawless Marketing Campaigns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`p-5 sm:p-6 rounded-2xl border transition-all hover:-translate-y-1 shadow-lg group ${
                theme === 'dark'
                  ? 'bg-[#1a1c2e]/90 border-slate-800/80 hover:border-brand-500/50'
                  : 'bg-white border-slate-200 hover:border-brand-400 shadow-slate-200/50'
              }`}
            >
              <div className={`p-3 rounded-xl border inline-block mb-4 group-hover:scale-105 transition-transform ${
                theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {feature.icon}
              </div>
              <h3 className={`text-base font-bold mb-2 group-hover:text-brand-500 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {feature.title}
              </h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Omni-Channel Marketing Showcase ─────────────────────────────── */}
      <section id="omnichannel" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 600px' }} className={`py-10 sm:py-14 border-y transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#121424]/60 border-slate-800/80' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4 text-left">
              <span className="px-3.5 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 text-xs font-extrabold inline-block">
                Omni-Channel Messaging Hub
              </span>
              <h2 className={`text-2xl sm:text-4xl font-black tracking-tight leading-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Combine Email, SMS & Telegram Into One Automation Engine
              </h2>
              <p className={`text-xs sm:text-sm leading-relaxed font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Don't limit your customer outreach to just email. Engage leads across Telegram channels, automated SMS gateways (Twilio, BulkSMSBD, Vonage), and instant webhooks simultaneously.
              </p>

              <div className="space-y-3 pt-2">
                <div className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Multi-Node SMTP Email Dispatches</h4>
                    <p className={`text-[11px] sm:text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Custom SMTP server rotation, HTML template builder & automated CSV contacts import.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Global SMS Marketing Gateway</h4>
                    <p className={`text-[11px] sm:text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Send promotional & transactional SMS with personalized template tags via Twilio or custom APIs.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Telegram Broadcasts & Bot Listener</h4>
                    <p className={`text-[11px] sm:text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Automated Telegram bot notifications, IMEI/Server status alerts, and instant group broadcasts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Omni-Channel Graphic Card */}
            <div className={`p-5 sm:p-7 rounded-2xl border shadow-xl relative text-left ${
              theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Live Dispatch Routing Engine</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  Online
                </span>
              </div>

              <div className="space-y-3">
                <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Email Dispatch Node #1</div>
                      <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Host: smtp.smartcampaign.today</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active (100% Inbox)
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>SMS Gateway Node</div>
                      <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Provider: Twilio / BulkSMS API</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Connected
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Telegram Marketing Bot</div>
                      <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Listener: Active Bot Worker</div>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    Listening
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Plans Section ────────────────────────────────────────── */}
      <section id="pricing" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 600px' }} className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <span className="text-xs font-extrabold tracking-widest text-brand-500 uppercase mb-2 block">Flexible SaaS Billing</span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Transparent Pricing Plans For Every Scale
          </h2>
          <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            No hidden fees. Choose a plan tailored to your dispatch volume or start with our free trial.
          </p>

          <div className={`mt-6 inline-flex items-center p-1 rounded-xl border shadow-lg ${
            theme === 'dark' ? 'bg-[#1a1c2e] border-slate-800' : 'bg-slate-200/80 border-slate-300'
          }`}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                billingCycle === 'monthly'
                  ? 'brand-gradient-bg text-white shadow-md'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'brand-gradient-bg text-white shadow-md'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] rounded-full border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {activePlans.map((plan, idx) => {
            const rawPrice = plan.monthlyPrice ?? plan.price ?? 0;
            const mPrice = rawPrice > 200 ? Math.round(rawPrice / 100) : rawPrice;
            const aPrice = plan.annualPrice ? (plan.annualPrice > 200 ? Math.round(plan.annualPrice / 100) : plan.annualPrice) : (mPrice > 0 ? Math.round(mPrice * 0.8) : 0);
            const currentPrice = billingCycle === 'monthly' ? mPrice : aPrice;
            const badgeText = plan.badge || (plan.popular ? "Most Popular" : plan.tier === 'free' ? "Free Trial" : plan.tier === 'business' ? "Best Value" : plan.tier === 'enterprise' ? "Unlimited" : null);
            const buttonText = plan.ctaText || plan.btnText || (plan.tier === 'free' ? "Get Started Free" : `Upgrade to ${plan.name}`);

            return (
              <div
                key={idx}
                className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  plan.popular
                    ? 'border-2 border-brand-500 shadow-[0_0_30px_rgba(79,70,229,0.25)] scale-[1.02] z-20 ' + (theme === 'dark' ? 'bg-[#1a1c2e]' : 'bg-white')
                    : theme === 'dark' ? 'bg-[#1a1c2e]/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xl shadow-slate-200/50'
                }`}
              >
                {plan.popular && badgeText && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full brand-gradient-bg text-white text-[10px] font-black tracking-wider uppercase shadow-md">
                    {badgeText}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    {!plan.popular && badgeText && (
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        theme === 'dark' ? 'bg-[#0d0e1a] text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {badgeText}
                      </span>
                    )}
                  </div>

                  <p className={`text-[11px] sm:text-xs min-h-[32px] mb-4 leading-relaxed ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {plan.description || `${plan.name} package tier`}
                  </p>

                  <div className={`mb-5 border-b pb-5 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl sm:text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        ${currentPrice}
                      </span>
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>/ month</span>
                    </div>
                    {billingCycle === 'annual' && mPrice > 0 && (
                      <span className="text-[10px] text-emerald-500 font-bold mt-1 block">
                        Billed annually (Save 20%)
                      </span>
                    )}
                  </div>

                  <ul className={`space-y-2.5 mb-6 text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {(plan.features || []).map((feat: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => openRegisterModal(plan.tier)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all shadow-lg ${
                    plan.popular
                      ? 'brand-gradient-bg text-white hover:opacity-95 shadow-brand-500/20'
                      : theme === 'dark'
                      ? 'bg-[#252845] hover:bg-[#30334f] text-white border border-slate-700/80'
                      : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                  }`}
                >
                  {buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Interactive FAQ Accordion ────────────────────────────────────── */}
      <section id="faq" style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 600px' }} className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Got questions about SmartCampaign? We have answers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`rounded-xl border overflow-hidden transition-colors ${
                theme === 'dark' ? 'bg-[#1a1c2e]/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <button
                onClick={() => toggleFaq(idx)}
                className={`w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm transition-colors ${
                  theme === 'dark' ? 'text-white hover:text-brand-300' : 'text-slate-900 hover:text-brand-600'
                }`}
              >
                <span className="font-bold">{faq.question}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-brand-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                )}
              </button>

              {openFaq === idx && (
                <div className={`px-4 sm:px-5 pb-5 text-xs leading-relaxed border-t pt-3 text-left ${
                  theme === 'dark' ? 'text-slate-300 border-slate-800/80' : 'text-slate-600 border-slate-200'
                }`}>
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
              Login Account
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className={`border-t pt-10 pb-8 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-300 ${
        theme === 'dark' ? 'border-slate-800/80 bg-[#0d0e1a] text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1 space-y-4 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2">
              {activeFooterLogo ? (
                <img src={activeFooterLogo} alt={siteName} loading="lazy" decoding="async" className="h-8 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 brand-gradient-bg rounded-xl flex items-center justify-center text-white font-bold">
                    {siteName.substring(0, 1) || "S"}
                  </div>
                  <span className={`font-extrabold text-base font-sans ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{siteName}</span>
                </div>
              )}
            </div>
            <p className="text-xs leading-relaxed text-center md:text-left">
              {appConfig?.seo_meta_description || "Modern SaaS email marketing, multi-node SMTP load balancer, bulk SMS gateway & Telegram automation suite."}
            </p>
          </div>

          <div className="col-span-1">
            <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Platform Modules</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><a href="#features" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>SMTP Load Balancer</a></li>
              <li><a href="#omnichannel" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Telegram Marketing Suite</a></li>
              <li><a href="#omnichannel" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>SMS Gateway Integrations</a></li>
              <li><a href="#demo" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Click & Open Heatmaps</a></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Quick Links</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><button onClick={openLoginModal} className={`text-left transition-colors ${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}>Sign In</button></li>
              <li><button onClick={() => openRegisterModal('free')} className={`text-left transition-colors ${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}>Register Account</button></li>
              <li><a href="#pricing" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>Subscription Pricing</a></li>
              <li><a href="/api/health" target="_blank" rel="noreferrer" className={theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-slate-900 transition-colors'}>API Health Status</a></li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Contact & Support</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>Email: <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supportEmail}</span></li>
              <li>SLA Uptime: <span className="text-emerald-500 font-semibold">99.99% Guaranteed</span></li>
              <li>Developer API: <span className="text-indigo-500 font-semibold">Dhru Fusion Compatible</span></li>
            </ul>
          </div>
        </div>

        <div className={`max-w-7xl mx-auto pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
          theme === 'dark' ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}>
          <div className="text-center sm:text-left">
            Copyright &copy; 2026 {siteName} / {companyName}. All rights reserved.
          </div>
          <div className="flex justify-center sm:justify-start gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Terms of Service</a>
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
          <div className={`relative z-10 w-full max-w-sm p-7 rounded-3xl border shadow-2xl backdrop-blur-2xl animate-scaleUp text-left my-8 transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-[#1a1c2e]/95 border-slate-700/80 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/80'
          }`}>
            {/* Close Button (X) */}
            <button
              onClick={closeModal}
              className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${
                theme === 'dark' ? 'bg-[#0d0e1a] text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              aria-label="Close modal"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {/* Header Badge Icon */}
            {authMode === 'login' ? (
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl brand-gradient-bg flex items-center justify-center text-white shadow-xl shadow-brand-500/30 mb-2">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />
                  <span className="w-2.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mb-4">
                <div className={`relative w-14 h-14 rounded-full border flex items-center justify-center shadow-xl mb-1 ${
                  theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}>
                  <svg className="w-7 h-7 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className={`absolute top-0 right-0 w-4 h-4 rounded-full brand-gradient-bg flex items-center justify-center text-white text-[10px] font-black border-2 shadow-md ${
                    theme === 'dark' ? 'border-[#1a1c2e]' : 'border-white'
                  }`}>
                    +
                  </div>
                </div>
              </div>
            )}

            {/* Header Titles */}
            <div className="text-center mb-5">
              <h2 className={`text-2xl font-black tracking-tight font-sans mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {authMode === 'login' ? 'Log in to your account to continue.' : 'Sign up to get started with your dashboard.'}
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-start gap-2.5 animate-headShake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-normal">{error}</span>
              </div>
            )}

            {/* ─── EMAIL VERIFICATION MODE ─── */}
            {verifyEmailMode ? (
              <form onSubmit={handleModalVerifyEmailSubmit} className="space-y-4">
                <div className="text-center py-2">
                  <KeyRound className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                  <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Enter Verification Code</h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    A verification OTP code was sent to <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{email}</span>.
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className={`w-full px-4 py-3 rounded-2xl border font-mono text-center tracking-widest text-lg focus:border-brand-500 focus:outline-none ${
                      theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full brand-gradient-bg text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyEmailMode(false)}
                  className={`w-full text-center text-xs font-bold pt-2 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  ← Back to Login
                </button>
              </form>
            ) : authMode === 'login' ? (
              /* ─── LOGIN FORM ─── */
              <form onSubmit={handleModalLoginSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                      theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                        theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}>
                    <input type="checkbox" className={`w-3.5 h-3.5 rounded text-brand-500 focus:ring-0 ${theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700' : 'bg-slate-100 border-slate-300'}`} />
                    <span>Remember me</span>
                  </label>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-500 hover:text-brand-600 font-semibold transition-colors">
                    Forgot Password?
                  </a>
                </div>

                {mfaRequired && (
                  <div>
                    <label className="block text-xs font-bold text-amber-500 mb-1">Two-Factor Auth (2FA) Code</label>
                    <input
                      type="text"
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="Enter 6-digit 2FA code"
                      className={`w-full px-4 py-3 rounded-2xl border font-mono text-center tracking-widest text-sm focus:outline-none ${
                        theme === 'dark' ? 'bg-[#0d0e1a] border-amber-500/50 text-white' : 'bg-amber-50/60 border-amber-300 text-slate-900'
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full brand-gradient-bg text-xs font-extrabold text-white shadow-xl shadow-brand-500/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                {/* Social Divider */}
                <div className="my-4 flex items-center gap-3">
                  <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Or</span>
                  <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>

                {/* Social Buttons */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
                    </svg>
                  </button>

                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className={`w-4 h-4 fill-current ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.14-.56 2.8-1.36z"/>
                    </svg>
                  </button>

                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                </div>

                <div className={`pt-2 text-center text-xs border-t ${theme === 'dark' ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-200'}`}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(null); }}
                    className="text-brand-500 font-bold hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            ) : (
              /* ─── REGISTER FORM ─── */
              <form onSubmit={handleModalRegisterSubmit} className="space-y-3.5">
                {/* Hidden Anti-Bot Honeypot Trap */}
                <input
                  type="text"
                  name="website_hp"
                  value={websiteHp}
                  onChange={(e) => setWebsiteHp(e.target.value)}
                  className="hidden absolute opacity-0 pointer-events-none -z-50"
                  tabIndex={-1}
                  autoComplete="off"
                />
                {selectedPlanTier !== 'free' && (
                  <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-between">
                    <span>Selected Plan: <span className="uppercase font-black">{selectedPlanTier}</span></span>
                    <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full">Trial Included</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                      theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                      theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                        theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={`block text-xs font-semibold text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                        theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full brand-gradient-bg text-xs font-extrabold text-white shadow-xl shadow-brand-500/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>

                {/* Social Divider */}
                <div className="my-4 flex items-center gap-3">
                  <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Or</span>
                  <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>

                {/* Social Buttons */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
                    </svg>
                  </button>

                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className={`w-4 h-4 fill-current ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.14-.56 2.8-1.36z"/>
                    </svg>
                  </button>

                  <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}>
                    <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                </div>

                <div className={`pt-2 text-center text-xs border-t ${theme === 'dark' ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-200'}`}>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-brand-500 font-bold hover:underline"
                  >
                    Sign In
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
