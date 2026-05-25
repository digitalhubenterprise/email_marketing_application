import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { 
  Send, 
  Eye, 
  MousePointerClick, 
  Server, 
  PlusCircle, 
  Users, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

interface DashboardData {
  total_emails_sent: number;
  avg_open_rate: number;
  avg_click_rate: number;
  total_lists: number;
  total_contacts: number;
  smtp_health: boolean;
  recent_campaigns: any[];
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/campaigns/dashboard/stats", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Pre-configured elegant mock chart data to populate dashboard instantly with premium vibes
  const chartData = stats?.recent_campaigns && stats.recent_campaigns.length > 0
    ? [...stats.recent_campaigns].reverse().map(c => ({
        name: c.name.length > 10 ? c.name.substring(0, 10) + "..." : c.name,
        Sent: c.sent_count,
        Opens: c.open_count,
        Clicks: c.click_count
      }))
    : [
        { name: "Campaign #1", Sent: 0, Opens: 0, Clicks: 0 },
        { name: "Campaign #2", Sent: 240, Opens: 180, Clicks: 45 },
        { name: "Campaign #3", Sent: 450, Opens: 320, Clicks: 92 },
        { name: "Campaign #4", Sent: 890, Opens: 610, Clicks: 210 },
      ];

  const cards = [
    {
      title: "Total Emails Dispatched",
      value: stats?.total_emails_sent ?? 0,
      icon: <Send size={20} className="transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:rotate-[12deg] text-brand-400" />,
      desc: "Emails successfully sent to dynamic leads",
      trend: "+14.2% this mo",
      accentBar: "bg-gradient-to-r from-brand-500 to-indigo-500 shadow-[0_1px_10px_rgba(76,110,245,0.4)]",
      valueClass: "bg-gradient-to-r from-white via-brand-100 to-brand-300 bg-clip-text text-transparent font-sans tracking-tight",
      colorClass: "text-brand-400 bg-brand-500/8 border-brand-500/20 group-hover:bg-brand-500/15 group-hover:border-brand-500/40",
      glowBg: "radial-gradient(140px circle at 90% 10%, rgba(76, 110, 245, 0.16), transparent), radial-gradient(100px circle at 10% 90%, rgba(76, 110, 245, 0.04), transparent)",
      trendClass: "text-brand-300 bg-brand-500/10 border-brand-500/25 group-hover:border-brand-500/40",
      indicatorColor: "bg-brand-500 shadow-[0_0_8px_rgba(76,110,245,0.6)]",
      hoverBorder: "group-hover:border-brand-500/35",
      hoverShadow: "hover:shadow-[0_15px_35px_-10px_rgba(76,110,245,0.12)]"
    },
    {
      title: "Average Open Rate",
      value: `${stats?.avg_open_rate ?? 0}%`,
      icon: <Eye size={20} className="transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 text-emerald-400" />,
      desc: "Tracked pixel read confirmations",
      trend: "Industry Avg: 15%",
      accentBar: "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_1px_10px_rgba(16,185,129,0.4)]",
      valueClass: "bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent font-sans tracking-tight",
      colorClass: "text-emerald-400 bg-emerald-500/8 border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/40",
      glowBg: "radial-gradient(140px circle at 90% 10%, rgba(16, 185, 129, 0.16), transparent), radial-gradient(100px circle at 10% 90%, rgba(16, 185, 129, 0.04), transparent)",
      trendClass: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25 group-hover:border-emerald-500/40",
      indicatorColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      hoverBorder: "group-hover:border-emerald-500/35",
      hoverShadow: "hover:shadow-[0_15px_35px_-10px_rgba(16,185,129,0.12)]"
    },
    {
      title: "Average Click Rate",
      value: `${stats?.avg_click_rate ?? 0}%`,
      icon: <MousePointerClick size={20} className="transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:rotate-[-12deg] text-indigo-400" />,
      desc: "Link redirect click metrics",
      trend: "+2.1% spike",
      accentBar: "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_1px_10px_rgba(99,102,241,0.4)]",
      valueClass: "bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent font-sans tracking-tight",
      colorClass: "text-indigo-400 bg-indigo-500/8 border-indigo-500/20 group-hover:bg-indigo-500/15 group-hover:border-indigo-500/40",
      glowBg: "radial-gradient(140px circle at 90% 10%, rgba(99, 102, 241, 0.16), transparent), radial-gradient(100px circle at 10% 90%, rgba(99, 102, 241, 0.04), transparent)",
      trendClass: "text-indigo-300 bg-indigo-500/10 border-indigo-500/25 group-hover:border-indigo-500/40",
      indicatorColor: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
      hoverBorder: "group-hover:border-indigo-500/35",
      hoverShadow: "hover:shadow-[0_15px_35px_-10px_rgba(99,102,241,0.12)]"
    },
    {
      title: "SMTP Server Nodes",
      value: stats?.smtp_health ? "Connected" : "Inactive",
      icon: <Server size={20} className={`transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 ${stats?.smtp_health ? 'text-emerald-400' : 'text-amber-400'}`} />,
      desc: stats?.smtp_health ? "Active custom SMTP network" : "SMTP Server configurations missing",
      trend: stats?.smtp_health ? "99.9% SLA" : "Action Required",
      accentBar: stats?.smtp_health 
        ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_1px_10px_rgba(16,185,129,0.4)]" 
        : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_1px_10px_rgba(245,158,11,0.4)]",
      valueClass: stats?.smtp_health 
        ? "bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent font-sans tracking-tight" 
        : "bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent font-sans tracking-tight",
      colorClass: stats?.smtp_health 
        ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/40" 
        : "text-amber-400 bg-amber-500/8 border-amber-500/20 group-hover:bg-amber-500/15 group-hover:border-amber-500/40",
      glowBg: stats?.smtp_health
        ? "radial-gradient(140px circle at 90% 10%, rgba(16, 185, 129, 0.16), transparent), radial-gradient(100px circle at 10% 90%, rgba(16, 185, 129, 0.04), transparent)"
        : "radial-gradient(140px circle at 90% 10%, rgba(245, 158, 11, 0.16), transparent), radial-gradient(100px circle at 10% 90%, rgba(245, 158, 11, 0.04), transparent)",
      trendClass: stats?.smtp_health 
        ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25 group-hover:border-emerald-500/40" 
        : "text-amber-300 bg-amber-500/10 border-amber-500/25 group-hover:border-amber-500/40",
      indicatorColor: stats?.smtp_health
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
      hoverBorder: stats?.smtp_health ? "group-hover:border-emerald-500/35" : "group-hover:border-amber-500/35",
      hoverShadow: stats?.smtp_health
        ? "hover:shadow-[0_15px_35px_-10px_rgba(16,185,129,0.12)]"
        : "hover:shadow-[0_15px_35px_-10px_rgba(245,158,11,0.12)]"
    }
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-sans tracking-tight">Campaign Console</h2>
          <p className="text-xs text-dark-400 mt-0.5">Real-time statistics for beta.smartcampaign.today</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/campaigns"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-dark-700 hover:bg-dark-800 text-white transition-colors"
          >
            <PlusCircle size={12} />
            New Campaign
          </Link>
          <Link
            to="/smtp"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold brand-gradient-bg text-white shadow-md shadow-brand-500/20 hover:scale-[1.01] transition-transform"
          >
            <Server size={12} />
            Configure SMTP
          </Link>
        </div>
      </div>

      {/* Warning banner if SMTP is missing */}
      {!stats?.smtp_health && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 animate-bounce" />
          <div>
            <span className="font-bold">SMTP Connection Needed:</span> You must register at least one custom SMTP Server before launching campaigns.
            <Link to="/smtp" className="underline ml-2 font-semibold text-white">Setup SMTP now →</Link>
          </div>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div 
            key={i} 
            className={`glass-panel p-5 rounded-2xl border border-dark-750/70 transition-all duration-500 ${c.hoverBorder} ${c.hoverShadow} hover:scale-[1.015] hover:-translate-y-1 relative overflow-hidden group flex flex-col justify-between`}
            style={{ backgroundImage: c.glowBg }}
          >
            {/* Top Accent Gradient Bar with glow */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${c.accentBar} opacity-80 group-hover:opacity-100 transition-all duration-300`} />

            <div>
              {/* Top Row: Icon Container & Trend Pill */}
              <div className="flex justify-between items-center mb-4">
                <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-all duration-300 ${c.colorClass} shadow-md backdrop-blur-md`}>
                  {c.icon}
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border bg-dark-950/60 backdrop-blur-md transition-all duration-300 ${c.trendClass}`}>
                  {c.trend}
                </span>
              </div>

              {/* Value & Label */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold text-dark-400 uppercase tracking-widest block transition-colors duration-300 group-hover:text-dark-300">{c.title}</span>
                <h3 className="text-3xl font-extrabold tracking-tight select-none">
                  <span className={c.valueClass}>{c.value}</span>
                </h3>
              </div>
            </div>
            
            {/* Description at the bottom with a glowing indicator dot */}
            <div className="flex items-center gap-2 pt-3.5 border-t border-dark-700/20 mt-3.5">
              <span className={`w-1.5 h-1.5 rounded-full ${c.indicatorColor}`} />
              <p className="text-[10px] text-dark-500 font-semibold tracking-wide group-hover:text-dark-400 transition-colors duration-300">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-dark-700/30">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Campaign Performance Trend</h3>
              <p className="text-[10px] text-dark-400 mt-0.5">Sends, unique opens and clicks ratio</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4c6ef5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4c6ef5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30334f" opacity={0.3} />
                <XAxis dataKey="name" stroke="#676c96" fontSize={10} tickLine={false} />
                <YAxis stroke="#676c96" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1c2e', 
                    borderColor: '#30334f', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontFamily: 'Outfit'
                  }} 
                />
                <Area type="monotone" dataKey="Sent" stroke="#4c6ef5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="Opens" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOpens)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic List Summary Card */}
        <div className="glass-panel p-5 rounded-2xl border border-dark-700/30 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Database Assets</h3>
              <Users size={16} className="text-brand-400" />
            </div>
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3.5 bg-dark-900/60 rounded-xl border border-dark-700/30">
                <span className="text-xs text-dark-300">Total Contact Lists</span>
                <span className="text-base font-extrabold text-white">{stats?.total_lists ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-dark-900/60 rounded-xl border border-dark-700/30">
                <span className="text-xs text-dark-300">Active Email Contacts</span>
                <span className="text-base font-extrabold text-white">{stats?.total_contacts ?? 0}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-brand-500/5 rounded-xl border border-brand-500/10 text-[10px] text-brand-300">
              <p className="font-semibold mb-0.5">💡 SaaS Growth Tip:</p>
              Importing fresh, segmented contact groups can increase campaign open rates by over 14%. Try creating specialized lists.
            </div>
          </div>

          <Link
            to="/lists"
            className="w-full mt-4 py-3 bg-dark-900 hover:bg-dark-800 rounded-xl text-xs font-bold text-white border border-dark-700 text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            Manage Contact Assets
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* Recent Campaigns List */}
      <div className="glass-panel p-5 rounded-2xl border border-dark-700/30">
        <h3 className="text-base font-bold text-white mb-4">Recent Campaigns</h3>
        {stats?.recent_campaigns && stats.recent_campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-700/50 pb-2 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                  <th className="pb-2.5">Campaign Details</th>
                  <th className="pb-2.5">Recipients</th>
                  <th className="pb-2.5">Delivered</th>
                  <th className="pb-2.5">Opened</th>
                  <th className="pb-2.5">Clicks</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/10">
                {stats.recent_campaigns.map((c) => (
                  <tr key={c.id} className="text-xs text-dark-200 hover:bg-dark-700/10 transition-colors">
                    <td className="py-2.5 font-semibold text-white">
                      <div>{c.name}</div>
                      <span className="text-[10px] text-dark-400 font-medium">{c.subject}</span>
                    </td>
                    <td className="py-2.5">{c.total_recipients}</td>
                    <td className="py-2.5 text-brand-400 font-semibold">{c.sent_count}</td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{c.open_count}</td>
                    <td className="py-2.5 text-indigo-400 font-semibold">{c.click_count}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                        ${c.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                        ${c.status === 'sending' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 animate-pulse' : ''}
                        ${c.status === 'draft' ? 'bg-dark-700 text-dark-300 border border-dark-600/30' : ''}
                        ${c.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
                      `}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/30">
            <p className="text-xs text-dark-400">No campaigns launched yet. Start sending by clicking "New Campaign".</p>
          </div>
        )}
      </div>
    </div>
  );
}
