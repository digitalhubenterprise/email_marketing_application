import React, { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  Moon
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
    const token = localStorage.getItem("admin_token");
    const email = localStorage.getItem("admin_email");
    const role = localStorage.getItem("admin_role");

    if (!token) {
      navigate("/admin/login");
    } else {
      setAdminEmail(email);
      setAdminRole(role);
    }
  }, [location, navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_role");
    navigate("/admin/login");
  };

  const menuItems = [
    { to: "/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/admin/users", icon: <Users size={18} />, label: "CRM Users Control" },
    { to: "/admin/campaigns", icon: <Activity size={18} />, label: "Campaign Monitoring" },
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Billing & Plans" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Settings & System" },
    { to: "/admin/audits", icon: <ShieldAlert size={18} />, label: "Audit Ledger" },
    { to: "/admin/register", icon: <UserPlus size={18} />, label: "Invite Admin" },
  ];

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
      <div className="flex-1 lg:pl-64 pl-0 flex flex-col min-h-screen relative overflow-x-hidden">
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

            <div className="h-6 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold">
              <Activity size={12} className="animate-pulse text-brand-500" />
              <span>Admin Center Active</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto animate-fadeIn bg-[#f4f6fa]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
