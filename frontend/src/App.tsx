import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SMTPServers from './pages/SMTPServers'
import ContactLists from './pages/ContactLists'
import Templates from './pages/Templates'
import Campaigns from './pages/Campaigns'
import Billing from './pages/Billing'
import Wallet from './pages/Wallet'
import TelegramMarketing from './pages/TelegramMarketing'

// Administrative Portal pages imports
import AdminLayout from './components/AdminLayout'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminBilling from './pages/AdminBilling'
import AdminSettings from './pages/AdminSettings'
import AdminAudits from './pages/AdminAudits'
import AdminRegister from './pages/AdminRegister'
import AdminCampaigns from './pages/AdminCampaigns'

// Define AuthContext shape
interface AuthConfigType {
  site_name: string;
  logo_url: string | null;
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
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
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
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${currentToken}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 503) {
        // Under maintenance - let fetch interceptor handle or manually flag
        setInMaintenance(true);
      } else {
        // Token expired/invalid
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  // Global Fetch Interceptor for 503 Maintenance Mode detection
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 503 && !window.location.pathname.startsWith('/admin')) {
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
      await refreshUser();
    };
    initApp();

    return () => {
      window.fetch = originalFetch;
    };
  }, [token]);

  // Dynamically inject dynamic SEO meta parameters inside browser HTML headers
  useEffect(() => {
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

  const login = async (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    await refreshUser();
    navigate("/");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Full-screen Maintenance Downtime Overlay for standard platform pages
  if (inMaintenance && !window.location.pathname.startsWith('/admin')) {
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
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />

        {/* Authenticated routes */}
        <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="smtp" element={<SMTPServers />} />
          <Route path="lists" element={<ContactLists />} />
          <Route path="templates" element={<Templates />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="billing" element={<Billing />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="telegram-marketing" element={<TelegramMarketing />} />
        </Route>

        {/* Super Admin Center Protected Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audits" element={<AdminAudits />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}
