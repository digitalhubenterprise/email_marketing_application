import React, { useState, useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../App'
import { Mail, CheckCircle, Megaphone, X, AlertCircle, Menu, Sun, Moon } from 'lucide-react'

export default function Layout() {
  const { user, appConfig } = useAuth();
  const currentYear = new Date().getFullYear();
  const siteName = appConfig?.site_name || 'SmartCampaign';

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
    <div className="flex min-h-screen bg-dark-950 relative overflow-x-hidden z-0">
      {/* Ambient background glow blobs - Only visible in dark mode */}
      <div className="hidden dark:block absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-brand-500/8 blur-[150px] pointer-events-none -z-10" />
      <div className="hidden dark:block absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none -z-10" />
      <div className="hidden dark:block absolute top-[40%] left-[30%] w-[35vw] h-[35vw] rounded-full bg-emerald-500/3 blur-[120px] pointer-events-none -z-10" />

      {/* Side bar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} />

      {/* Dim overlay backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* Main pane content */}
      <div className="flex-1 lg:pl-64 pl-0 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
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
          <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 text-white px-3 sm:px-6 py-2.5 text-xs font-bold flex items-start sm:items-center justify-between gap-2 border-b border-brand-500/30 animate-slideDown shadow-lg relative z-40">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="flex h-5 items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black animate-pulse">
                <Megaphone size={10} /> Broadcast
              </span>
              <span className="tracking-wide text-slate-100 font-semibold break-words">{appConfig.announcement_message}</span>
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
        <header className="min-h-14 bg-dark-950/80 backdrop-blur-md border-b border-dark-700 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-dark-400 hover:text-dark-100 dark:hover:text-white p-1 hover:bg-dark-700/50 dark:hover:bg-dark-800 rounded-lg transition-colors mr-1"
              aria-label="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-medium text-dark-400 hidden sm:inline">Current Scope:</span>
            <span className="text-xs font-semibold text-dark-100 dark:text-white px-2 py-0.5 bg-dark-800 rounded-md border border-dark-700/50 hidden sm:inline-block">
              beta.smartcampaign.today
            </span>
          </div>

          {/* Quota Indicators */}
          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-dark-700/50 bg-dark-800 text-dark-400 hover:text-dark-100 hover:bg-dark-750 transition-all shadow-sm shrink-0"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            <div className="h-6 w-[1px] bg-dark-700/40" />

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-dark-400">
                <Mail size={10} className="text-brand-400 shrink-0" />
                <span className="hidden md:inline">Monthly Email Quota:</span>
                <span className="font-semibold text-dark-100 dark:text-white">{quotaUsed} / {quotaLimit}</span>
              </div>
              <div className="w-40 h-1 bg-dark-800 rounded-full overflow-hidden border border-dark-700/30 hidden sm:block">
                <div 
                  className="h-full brand-gradient-bg transition-all duration-500" 
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>

            <div className="h-6 w-[1px] bg-dark-700/40 hidden sm:block" />

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold hidden sm:flex shrink-0">
              <CheckCircle size={10} />
              <span>All Systems Active</span>
            </div>
          </div>
        </header>

        {/* Dynamic page component */}
        <main className="flex-1 p-3.5 sm:p-5 overflow-y-auto flex flex-col justify-between min-w-0 overflow-x-hidden">
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
            <div className="px-5 py-4 bg-dark-900/40 backdrop-blur-md border-t border-x border-dark-700/50 dark:border-dark-800/80 rounded-t-2xl sm:rounded-t-3xl rounded-b-none flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-dark-450 dark:text-dark-300 font-semibold shadow-md">
              <div>
                © {currentYear} {siteName}. All rights reserved.
              </div>
              <div className="flex gap-4 sm:gap-6">
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Privacy Policy</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Terms of Service</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Report a Vulnerability</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
