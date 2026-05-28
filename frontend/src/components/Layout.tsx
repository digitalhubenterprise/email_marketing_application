import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../App'
import { Mail, CheckCircle, Megaphone, X } from 'lucide-react'

export default function Layout() {
  const { user, appConfig } = useAuth();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  
  // Calculate remaining quota percentage
  const quotaUsed = user?.quota_sent || 0;
  const quotaLimit = user?.quota_limit || 1000;
  const quotaPercent = Math.min((quotaUsed / quotaLimit) * 100, 100);

  return (
    <div className="flex min-h-screen bg-dark-950">
      {/* Side bar */}
      <Sidebar />

      {/* Main pane content */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-dark-400">Current Scope:</span>
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
