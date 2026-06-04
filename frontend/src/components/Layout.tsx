import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../App'
import { Mail, CheckCircle, Megaphone, X, AlertCircle, Menu, Sun, Moon } from 'lucide-react'

export default function Layout() {
  const { user, appConfig } = useAuth();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
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
  
  // Calculate remaining quota percentage
  const quotaUsed = user?.quota_sent || 0;
  const quotaLimit = user?.quota_limit || 1000;
  const quotaPercent = Math.min((quotaUsed / quotaLimit) * 100, 100);
  const isNudgeActive = quotaPercent >= 80;

  return (
    <div className="flex min-h-screen bg-dark-950 relative overflow-x-hidden">
      {/* Side bar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Dim overlay backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* Main pane content */}
      <div className="flex-1 lg:pl-64 pl-0 flex flex-col min-h-screen">
        {/* 80% Quota Alert Box */}
        {isNudgeActive && (
          <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center justify-between shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="animate-pulse shrink-0" />
              <span><strong>Quota Capacity Nudge:</strong> You have consumed {quotaPercent.toFixed(1)}% of your monthly email sends quota. Upgrade your plan now to prevent campaigns pause.</span>
            </div>
            <a href="/billing" className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition-all shrink-0">Upgrade Plan</a>
          </div>
        )}

        {/* Global Broadcast Announcement Banner */}
        {appConfig?.announcement_active && appConfig.announcement_message && !announcementDismissed && (
          <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b border-brand-500/30 animate-slideDown shadow-lg relative z-40">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black animate-pulse">
                <Megaphone size={10} /> Broadcast
              </span>
              <span className="tracking-wide text-slate-100 font-semibold">{appConfig.announcement_message}</span>
            </div>
            <button 
              onClick={() => setAnnouncementDismissed(true)}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md shrink-0"
              title="Dismiss Announcement"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top navbar */}
        <header className="h-14 bg-dark-950/80 backdrop-blur-md border-b border-dark-700/30 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-dark-400 hover:text-white p-1 hover:bg-dark-800 rounded-lg transition-colors mr-1"
              aria-label="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-medium text-dark-400 hidden sm:inline">Current Scope:</span>
            <span className="text-xs font-semibold text-white px-2 py-0.5 bg-dark-800 rounded-md border border-dark-700/50">
              beta.smartcampaign.today
            </span>
          </div>

          {/* Quota Indicators */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-[10px] text-dark-400">
                <Mail size={10} className="text-brand-400" />
                <span>Monthly Email Quota:</span>
                <span className="font-semibold text-white">{quotaUsed} / {quotaLimit}</span>
              </div>
              <div className="w-40 h-1 bg-dark-800 rounded-full overflow-hidden border border-dark-700/30">
                <div 
                  className="h-full brand-gradient-bg transition-all duration-500" 
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-dark-700/50 bg-dark-800 text-dark-400 hover:text-dark-100 hover:bg-dark-750 transition-all shadow-sm"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            <div className="h-6 w-[1px] bg-dark-700/40" />

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              <CheckCircle size={10} />
              <span>All Systems Active</span>
            </div>
          </div>
        </header>

        {/* Dynamic page component */}
        <main className="flex-1 p-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
