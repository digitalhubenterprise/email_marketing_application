import React, { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'

// Layout imports
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'

// Lazily loaded page components for optimal route-based code-splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SMTPServers = lazy(() => import('./pages/SMTPServers'))
const ContactLists = lazy(() => import('./pages/ContactLists'))
const Templates = lazy(() => import('./pages/Templates'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Billing = lazy(() => import('./pages/Billing'))
const Wallet = lazy(() => import('./pages/Wallet'))
const TelegramMarketing = lazy(() => import('./pages/TelegramMarketing'))
const ManageSettings = lazy(() => import('./pages/ManageSettings'))
const SmsMarketing = lazy(() => import('./pages/SmsMarketing'))

// Administrative Portal pages imports
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminBilling = lazy(() => import('./pages/AdminBilling'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminAudits = lazy(() => import('./pages/AdminAudits'))
const AdminRegister = lazy(() => import('./pages/AdminRegister'))
const AdminCampaigns = lazy(() => import('./pages/AdminCampaigns'))
const AdminApiSettings = lazy(() => import('./pages/AdminApiSettings'))
const AdminBackups = lazy(() => import('./pages/AdminBackups'))


// Define AuthContext shape
interface AuthConfigType {
  site_name: string;
  company_name?: string | null;
  logo_url: string | null;
  dark_logo_url?: string | null;
  footer_logo_url?: string | null;
  footer_dark_logo_url?: string | null;
  favicon_url?: string | null;
  support_email: string;
  announcement_active: boolean;
  announcement_message: string | null;
  maintenance_mode: boolean;
  seo_meta_title?: string;
  seo_meta_description?: string;
  seo_meta_keywords?: string;
  default_from_name?: string;
  smtp_max_retries?: number;
  email_verification_required?: boolean;
  min_password_length?: number;
  max_login_attempts?: number;
  session_expiry_hours?: number;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_notifications_enabled?: boolean;
  two_factor_email_enabled?: boolean;
  two_factor_telegram_enabled?: boolean;
  two_factor_mandatory_for_admins?: boolean;
  payment_gateway_trc20?: string | null;
  payment_gateway_bep20?: string | null;
  payment_gateway_usdc_bep20?: string | null;
  payment_gateway_merchant_id?: string | null;
  payment_gateway_qr_code?: string | null;
  payment_gateway_trc20_enabled?: boolean | null;
  payment_gateway_bep20_enabled?: boolean | null;
  payment_gateway_usdc_bep20_enabled?: boolean | null;
  payment_gateway_merchant_enabled?: boolean | null;
}

interface AuthContextType {
  token: string | null;
  user: any | null;
  appConfig: AuthConfigType | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [appConfig, setAppConfig] = useState<AuthConfigType | null>(null);
  const [inMaintenance, setInMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshConfig = async () => {
    try {
      const response = await fetch("/api/auth/config");
      if (response.ok) {
        const configData = await response.json();
        setAppConfig(configData);
        if (configData.maintenance_mode) {
          setInMaintenance(true);
        } else {
          setInMaintenance(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch public config:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken("authenticated");
        localStorage.setItem("is_logged_in", "true");
      } else if (response.status === 503) {
        setInMaintenance(true);
      } else {
        // Session expired or unauthenticated guest — clear token without forcing redirect on public pages
        localStorage.removeItem("is_logged_in");
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Global Fetch Interceptor for 503 Maintenance Mode and 401 Admin/User Session Expirations
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const options = init || {};
      options.credentials = "include";

      const response = await originalFetch(input, options);

      // Handle Admin/User Session Expiration (401 Unauthorized)
      const requestUrl = typeof input === 'string' ? input : (input && typeof input === 'object' && 'url' in input ? (input as any).url : '');
      if (response.status === 401) {
        const currentPath = window.location.pathname;
        const isPublicPath = currentPath === '/' || currentPath === '/home' || currentPath === '/register' || currentPath === '/login';

        if (requestUrl.includes('/api/admin') || currentPath.startsWith('/master_adm')) {
          localStorage.removeItem("admin_logged_in");
          localStorage.removeItem("admin_email");
          localStorage.removeItem("admin_role");
          if (currentPath !== '/master_adm/login') {
            window.location.href = "/master_adm/login";
          }
        } else if (!isPublicPath) {
          // Only redirect to /login if unauthenticated user attempts to access protected routes
          localStorage.removeItem("is_logged_in");
          setToken(null);
          setUser(null);
          window.location.href = "/login";
        } else {
          // Public page (Landing Page / Register): clear user state smoothly
          localStorage.removeItem("is_logged_in");
          setToken(null);
          setUser(null);
        }
      }

      if (response.status === 403 && !window.location.pathname.startsWith('/master_adm')) {
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (body && body.detail === "SUBSCRIPTION_EXPIRED") {
            if (window.location.pathname !== '/billing' && window.location.pathname !== '/wallet') {
              window.location.href = "/billing?expired=true";
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (response.status === 503 && !window.location.pathname.startsWith('/master_adm')) {
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (body && body.maintenance === true) {
            setInMaintenance(true);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      return response;

    };

    // Load initial configurations
    const initApp = async () => {
      await refreshConfig();
      // Admin routes use a separate HttpOnly admin_token session. Do not probe
      // the user session here, otherwise its 401 handler redirects /admin/login
      // back to the customer login page.
      if (window.location.pathname.startsWith('/master_adm')) {
        setLoading(false);
      } else {
        await refreshUser();
      }
    };
    initApp();

    const handleChunkError = (e: ErrorEvent) => {
      const msg = e?.message || "";
      if (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed")
      ) {
        const reloaded = sessionStorage.getItem("chunk_reload_attempt");
        if (!reloaded) {
          sessionStorage.setItem("chunk_reload_attempt", "true");
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", handleChunkError);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleChunkError);
    };
  }, []);

  // Dynamically inject dynamic SEO meta parameters inside browser HTML headers
  useEffect(() => {
    // Update favicon based on config
    if (appConfig?.logo_url) {
      let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = appConfig.logo_url;
    }

    if (appConfig) {
      document.title = appConfig.seo_meta_title || appConfig.site_name || "SmartCampaign";
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', appConfig.seo_meta_description || "SaaS Dynamic Marketing Automation & Deliverability.");

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', appConfig.seo_meta_keywords || "email marketing, deliverability, Celery, SMTP dispatches");
    }
  }, [appConfig]);

  const login = async (newToken?: string) => {
    setToken(newToken || "authenticated");
    await refreshUser();
    navigate("/");
  };

  const logout = async () => {
    localStorage.removeItem("is_logged_in");
    setToken(null);
    setUser(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Full-screen Maintenance Downtime Overlay for standard platform pages
  if (inMaintenance && !window.location.pathname.startsWith('/master_adm')) {
    const siteLogo = appConfig?.logo_url;
    const siteName = appConfig?.site_name || "SmartCampaign";
    const supportEmail = appConfig?.support_email || "support@smartcampaign.today";

    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
        {/* Glowing gradients */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-500/5 rounded-full filter blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-[100px] animate-pulse delay-750" />

        <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10 border border-dark-700/50 shadow-2xl text-center space-y-6">
          {siteLogo ? (
            <img src={siteLogo} alt={siteName} className="h-12 mx-auto object-contain" />
          ) : (
            <div className="h-14 w-14 bg-rose-500/10 rounded-2xl mx-auto flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/5 font-black text-2xl">
              ⚠️
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white">{siteName} Under Scheduled Maintenance</h1>
            <p className="text-xs text-dark-400 max-w-sm mx-auto leading-relaxed">
              We are currently running critical systems updates to optimize campaign deliverability and SMTP dispatch rates. Standard services are temporarily paused.
            </p>
          </div>

          <div className="p-4 bg-dark-900/40 border border-dark-700/30 rounded-2xl text-left space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Downtime Safeguards Active</span>
            </div>
            <p className="text-[10px] text-dark-300 leading-relaxed font-semibold">
              All campaign dispatches, contacts, and SMTP servers are safely secured. Dispatch queues will process automatically as soon as normal systems operations resume.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a 
              href={`mailto:${supportEmail}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700/50 text-[11px] font-bold text-white transition-colors"
            >
              Contact Support
            </a>
            <button 
              onClick={() => { refreshConfig(); refreshUser(); }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl brand-gradient-bg hover:opacity-95 text-[11px] font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              Check Status Again
            </button>
          </div>

          <p className="text-[9px] text-dark-500">
            Need urgent assistance? Contact us at <span className="text-dark-400 font-bold">{supportEmail}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, appConfig, login, logout, loading, refreshUser, refreshConfig }}>
      <Suspense fallback={
        <div className="min-h-screen bg-dark-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      }>
        <Routes>
          {/* Public Landing Home Page */}
          <Route path="/home" element={<LandingPage />} />

          {/* Auth Public Routes */}
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />

          {/* Root Domain Route: LandingPage for guests, Layout for logged-in users */}
          <Route path="/" element={!token ? <LandingPage /> : <Layout />}>
            <Route index element={<Dashboard />} />
          </Route>

          {/* Protected User Dashboard Routes (Redirects unauthenticated users to /login) */}
          <Route path="/" element={token ? <Layout /> : <Navigate to="/login" replace />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="smtp" element={<SMTPServers />} />
            <Route path="lists" element={<ContactLists />} />
            <Route path="templates" element={<Templates />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="billing" element={<Billing />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="settings" element={<ManageSettings />} />
            <Route path="telegram-marketing" element={<TelegramMarketing />} />
            <Route path="sms-marketing" element={<SmsMarketing />} />
            <Route path="sms-marketing/numbers" element={<SmsMarketing defaultTab="numbers" />} />
            <Route path="sms-marketing/settings" element={<SmsMarketing defaultTab="settings" />} />
            <Route path="sms-marketing/templates" element={<SmsMarketing defaultTab="templates" />} />
            <Route path="telegram-marketing/imei" element={<TelegramMarketing defaultTab="imei" />} />
            <Route path="telegram-marketing/server" element={<TelegramMarketing defaultTab="server" />} />
            <Route path="telegram-marketing/remote" element={<TelegramMarketing defaultTab="remote" />} />
            <Route path="telegram-marketing/logs" element={<TelegramMarketing defaultTab="logs" />} />
            <Route path="telegram-marketing/settings" element={<TelegramMarketing defaultTab="settings" />} />
          </Route>

          {/* Super Admin Center Protected Routes */}
          <Route path="/master_adm/login" element={<AdminLogin />} />
          <Route path="/master_adm" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="register" element={<AdminRegister />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="api-settings" element={<AdminApiSettings />} />
            <Route path="backups" element={<AdminBackups />} />
            <Route path="audits" element={<AdminAudits />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthContext.Provider>
  );
}
