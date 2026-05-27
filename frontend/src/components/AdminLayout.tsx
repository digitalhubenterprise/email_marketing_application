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
  AlertCircle
} from 'lucide-react'

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);

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
    { to: "/admin/billing", icon: <CreditCard size={18} />, label: "Billing & Plans" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Settings & System" },
    { to: "/admin/audits", icon: <ShieldAlert size={18} />, label: "Audit Ledger" },
    { to: "/admin/register", icon: <UserPlus size={18} />, label: "Invite Admin" },
  ];

  return (
    <div className="flex min-h-screen bg-dark-950 text-dark-100 font-sans">
      {/* Admin Sidebar Navigation */}
      <aside className="w-64 bg-dark-900/90 border-r border-dark-800/40 flex flex-col h-screen fixed left-0 top-0 z-40 backdrop-blur-xl">
        <div className="py-4 px-5 border-b border-dark-800/40 flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Shield size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide">SmartCampaign</h1>
            <span className="text-[9px] text-brand-400 font-black tracking-widest uppercase bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Navigation Sidebar Link Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300
                ${isActive
                  ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10 scale-[1.02]'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/45'}
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card details */}
        <div className="p-4 border-t border-dark-800/40 bg-dark-900/40 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-brand-900/70 border border-brand-500/30 text-brand-300 font-black flex items-center justify-center uppercase text-xs">
              {adminEmail ? adminEmail.substring(0, 2) : "AD"}
            </div>
            <div className="truncate max-w-[145px]">
              <p className="text-xs font-bold text-white truncate">{adminEmail || "Administrator"}</p>
              <span className="text-[9px] text-brand-400 uppercase tracking-widest font-black bg-brand-500/10 px-1 py-0.2 rounded">
                {adminRole || "Support"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 transition-all border border-rose-500/25 duration-300"
          >
            <LogOut size={13} />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Admin Section Body Content */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <header className="h-16 bg-dark-950/40 backdrop-blur-md border-b border-dark-800/40 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-dark-400">Environment Node:</span>
            <span className="text-xs font-extrabold text-white px-2 py-0.5 bg-dark-800/80 rounded-md border border-dark-700/50 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-brand-400" />
              SaaS-Master-Controller
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="text-[10px] font-bold text-dark-400 hover:text-white px-2.5 py-1 bg-dark-800/40 border border-dark-700/30 rounded-lg transition-all"
            >
              Go to Standard Dashboard
            </Link>

            <div className="h-6 w-[1px] bg-dark-800/60" />

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/5 border border-brand-500/15 text-brand-400 text-xs font-bold">
              <Activity size={12} className="animate-pulse" />
              <span>Admin Center Active</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto animate-fadeIn bg-dark-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
