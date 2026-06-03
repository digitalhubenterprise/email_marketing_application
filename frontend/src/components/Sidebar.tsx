import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Server, 
  Users, 
  FileText, 
  Send, 
  CreditCard, 
  Wallet,
  LogOut,
  Sliders
} from 'lucide-react'
import { useAuth } from '../App'

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose = () => {} }: SidebarProps) {
  const { logout, user, appConfig } = useAuth();

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/smtp", icon: <Server size={20} />, label: "SMTP Servers" },
    { to: "/lists", icon: <Users size={20} />, label: "Contact Lists" },
    { to: "/templates", icon: <FileText size={20} />, label: "Email Templates" },
    { to: "/campaigns", icon: <Send size={20} />, label: "Campaigns" },
    { to: "/telegram-marketing/imei", icon: <Send size={20} className="rotate-[320deg]" />, label: "IMEI Service" },
    { to: "/telegram-marketing/server", icon: <Server size={20} />, label: "Server Service" },
    { to: "/telegram-marketing/remote", icon: <Sliders size={20} />, label: "Remote Service" },
    { to: "/billing", icon: <CreditCard size={20} />, label: "Billing & Plans" },
    { to: "/wallet", icon: <Wallet size={20} />, label: "Wallet" },
  ];

  return (
    <aside className={`
      w-64 bg-dark-800 border-r border-dark-700/50 flex flex-col h-screen fixed top-0 z-50
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0 lg:left-0 lg:z-40
    `}>
      {/* Platform Title Logo */}
      <div className="py-3.5 px-4 border-b border-dark-700/50 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          {appConfig?.logo_url ? (
            <img src={appConfig.logo_url} alt={appConfig.site_name} className="h-8 object-contain rounded-lg" />
          ) : (
            <div className="h-8 w-8 brand-gradient-bg rounded-lg flex items-center justify-center text-white shadow-md shadow-brand-500/20 font-bold text-base">
              {appConfig?.site_name?.substring(0, 1) || "S"}
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm text-white font-sans tracking-wide truncate max-w-[120px]">
              {appConfig?.site_name || "SmartCampaign"}
            </h1>
            <span className="text-[10px] text-brand-400 font-bold tracking-wider uppercase">SaaS V1.0</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden text-dark-400 hover:text-white p-1 rounded-md"
        >
          ✕
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200
              ${isActive 
                ? 'brand-gradient-bg text-white shadow-sm shadow-brand-500/10' 
                : 'text-dark-400 hover:text-white hover:bg-dark-700/30'}
            `}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User profile & logout footer */}
      <div className="p-3 border-t border-dark-700/50 space-y-2">
        <div className="flex items-center gap-2.5 px-1 py-0.5">
          <div className="h-8 w-8 rounded-full bg-brand-800 text-brand-300 font-bold flex items-center justify-center uppercase text-xs border border-brand-700">
            {user?.email?.substring(0, 2)}
          </div>
          <div className="truncate max-w-[140px]">
            <p className="text-xs font-bold text-white truncate">{user?.email}</p>
            <span className="text-[9px] text-brand-400 uppercase tracking-wider font-extrabold">
              {user?.subscription_tier} Plan
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 transition-colors border border-rose-500/20"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
