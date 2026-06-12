import React, { useEffect, useState, Suspense } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { httpRequest } from '../utils/HttpClient';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ShieldAlert,
  UserPlus,
  LogOut,
  Shield,
  Activity,
  CheckCircle2,
  Menu,
  Sun,
  Moon,
  Key,
  Database
} from 'lucide-react'
import { useAuth } from '../App'

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const { appConfig } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [verifying, setVerifying] = useState(true);

  const fetchMaintenanceMode = async () => {
    try {
      const data = await httpRequest<{maintenance_mode: boolean}>("/api/admin/settings");
      setMaintenanceMode(data.maintenance_mode);
    } catch (err) {
      console.error("Failed to fetch maintenance mode:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const data = await httpRequest<{email: string; role: string}>("/api/admin/verify");
        setAdminEmail(data.email);
        setAdminRole(data.role);
        setVerifying(false);
        fetchMaintenanceMode();
      } catch (err) {
        console.error("Session verification failed:", err);
        localStorage.removeItem("admin_logged_in");
        localStorage.removeItem("admin_email");
        localStorage.removeItem("admin_role");
        navigate("/admin/login");
      }
    };

    const loggedIn = localStorage.getItem("admin_logged_in");
    if (!loggedIn) {
      navigate("/admin/login");
    } else {
      checkAdminSession();
    }
  }, [location, navigate]);

  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode;
    const confirmMsg = nextState
      ? "ACTIVATE GLOBAL MAINTENANCE MODE?\nStandard customers will be blocked immediately with 503 downtime responses."
      : "LIFT SYSTEM MAINTENANCE MODE?\nRestores all public user dashboards and sending processes immediately.";
    
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaintenance(true);
    try {
      await httpRequest(`/api/admin/settings/maintenance?enabled=${nextState}`, { method: 'POST' });
      setMaintenanceMode(nextState);
      alert(`System is now ${nextState ? "OFFLINE (Maintenance)" : "ONLINE"}.`);
    } catch (err) {
      console.error(err);
      alert("Network communication error.");
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_role");
    try {
      await httpRequest("/api/admin/logout", { method: "POST" });
    } catch (e) {
      console.error("Admin logout failed:", e);
    }
    navigate("/admin/login");
  };

  const menuItems = [
    { to: "/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/admin/users", icon: <Users size={18} />, label: "Members" },
    { to: "/admin/campaigns", icon: <Activity size={18} />, label: "Campaign Monitoring" },
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Financial Review" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Settings" },
    { to: "/admin/api-settings", icon: <Key size={18} />, label: "API Settings" },
    { to: "/admin/backups", icon: <Database size={18} />, label: "Remote Backups" },
    { to: "/admin/audits", icon: <ShieldAlert size={18} />, label: "Audit Ledger" },
    { to: "/admin/register", icon: <UserPlus size={18} />, label: "Invite Admin" },
  ];

  if (verifying) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f6fa] text-slate-800 font-sans relative overflow-x-hidden">
      {/* Dim overlay backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* Admin Sidebar Navigation (Premium crisp white background) */}
      <aside className={`
        w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed top-0 z-50
        transition-transform duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.015)]
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:left-0 lg:z-40
      `}>
        <div className="py-4 px-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {appConfig?.logo_url ? (
              <img src={appConfig.logo_url} alt={appConfig.site_name} className="h-9 object-contain rounded-lg" />
            ) : (
              <div className="h-9 w-9 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                <Shield size={19} className="animate-pulse" />
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 tracking-wide truncate max-w-[100px]">
                {appConfig?.site_name || "SmartCampaign"}
              </h1>
              <span className="text-[9px] text-brand-600 font-black tracking-widest uppercase bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                Admin Portal
              </span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-900 p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Navigation Sidebar Link Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/15 scale-[1.01]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card details */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-brand-100 border border-brand-200 text-brand-600 font-black flex items-center justify-center uppercase text-xs">
              {adminEmail ? adminEmail.substring(0, 2) : "AD"}
            </div>
            <div className="truncate max-w-[145px]">
              <p className="text-xs font-bold text-slate-900 truncate">{adminEmail || "Administrator"}</p>
              <span className="text-[9px] text-brand-600 uppercase tracking-widest font-black bg-brand-50 px-1 py-0.2 rounded border border-brand-100">
                {adminRole || "Support"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border border-rose-200 duration-200"
          >
            <LogOut size={13} />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Admin Section Body Content */}
      <div className="flex-1 lg:pl-64 pl-0 flex flex-col min-h-screen relative overflow-x-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_24px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-50 rounded-lg transition-colors mr-1"
              aria-label="Toggle Admin Menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Environment Node:</span>
            <span className="text-xs font-extrabold text-slate-800 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-brand-500" />
              SaaS-Master-Controller
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg transition-all"
            >
              Go to Standard Dashboard
            </Link>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all shadow-sm flex items-center justify-center"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            </button>

            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaintenance}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                maintenanceMode
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-emerald-50 border-emerald-250 text-emerald-600 hover:bg-emerald-100'
              }`}
              title={maintenanceMode ? "System is Offline (Maintenance). Click to go Online." : "System is Online. Click to go Offline (Maintenance)."}
            >
              <div className={`h-2 w-2 rounded-full ${maintenanceMode ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
              <span>{maintenanceMode ? "Offline" : "Online"}</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold">
              <Activity size={12} className="animate-pulse text-brand-500" />
              <span>Admin Center Active</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto animate-fadeIn bg-[#f4f6fa] flex flex-col justify-between min-w-0 overflow-x-hidden">
          <div className="flex-1 pb-4">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>

          {/* Footer */}
          <footer className="mt-8">
            <div className="px-5 py-4 bg-white/60 dark:bg-dark-900/40 backdrop-blur-md border-t border-x border-slate-200 dark:border-dark-800/80 rounded-t-2xl sm:rounded-t-3xl rounded-b-none flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-slate-500 dark:text-dark-300 font-semibold shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
              <div>
                Copyright &copy; 2025 ASTRA IT, Inc. All Rights Reserved.
              </div>
              <div className="flex gap-4 sm:gap-6">
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Privacy Policy</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Terms of Service</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Report a Vulnerability</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
