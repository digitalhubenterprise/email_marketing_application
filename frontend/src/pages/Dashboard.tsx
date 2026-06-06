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
  ArrowUpRight,
  Palette,
  Shield,
  Settings,
  CheckCircle,
  RefreshCw
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
  const { token, user, refreshUser } = useAuth();
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
      status: "+14.2% this mo",
      icon: <Send size={16} className="text-brand-400" />,
      colorClass: "bg-brand-500/10 border-brand-500/20 text-brand-400",
      indicatorColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      glowBg: "radial-gradient(100px circle at 15% 50%, rgba(76, 110, 245, 0.12), transparent)"
    },
    {
      title: "Average Open Rate",
      value: `${stats?.avg_open_rate ?? 0}%`,
      status: "Industry Avg: 15%",
      icon: <Eye size={16} className="text-emerald-400" />,
      colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      indicatorColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      glowBg: "radial-gradient(100px circle at 15% 50%, rgba(16, 185, 129, 0.12), transparent)"
    },
    {
      title: "Average Click Rate",
      value: `${stats?.avg_click_rate ?? 0}%`,
      status: "+2.1% spike",
      icon: <MousePointerClick size={16} className="text-indigo-400" />,
      colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      indicatorColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      glowBg: "radial-gradient(100px circle at 15% 50%, rgba(99, 102, 241, 0.12), transparent)"
    },
    {
      title: "SMTP Server Nodes",
      value: stats?.smtp_health ? "Connected" : "Inactive",
      status: stats?.smtp_health ? "99.9% SLA" : "Action Required",
      icon: <Server size={16} className={stats?.smtp_health ? "text-emerald-400" : "text-amber-400"} />,
      colorClass: stats?.smtp_health 
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
        : "bg-amber-500/10 border-amber-500/20 text-amber-400",
      indicatorColor: stats?.smtp_health
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
      glowBg: stats?.smtp_health
        ? "radial-gradient(100px circle at 15% 50%, rgba(16, 185, 129, 0.12), transparent)"
        : "radial-gradient(100px circle at 15% 50%, rgba(245, 158, 11, 0.12), transparent)"
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl glass-panel hover:border-brand-500/30 dark:hover:border-dark-600 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 relative overflow-hidden group shadow-lg hover:shadow-xl dark:hover:shadow-brand-500/5"
            style={{ backgroundImage: c.glowBg }}
          >
            <div className="flex items-center relative z-10 min-w-0">
              <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6 shrink-0 ${c.colorClass}`}>
                {c.icon}
              </div>

              <div className="ml-2 sm:ml-3 flex flex-col justify-center min-w-0">
                <span className="text-[8px] sm:text-[9px] font-extrabold text-dark-300 dark:text-dark-400 uppercase tracking-widest block transition-colors duration-300 group-hover:text-dark-100 dark:group-hover:text-dark-300 truncate">
                  {c.title}
                </span>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-white tracking-tight select-none">
                    {c.value}
                  </span>
                  <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${c.indicatorColor}`} />
                  <span className="text-[8px] sm:text-[9px] text-dark-400 dark:text-dark-500 font-bold dark:font-semibold lowercase tracking-wide group-hover:text-dark-200 dark:group-hover:text-dark-400 transition-colors duration-300 truncate">
                    ({c.status})
                  </span>
                </div>
              </div>
            </div>
            
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-dark-800/60 border border-dark-700/50 text-dark-400 hover:text-dark-100 dark:hover:text-white hover:bg-dark-700/50 dark:hover:bg-dark-800 cursor-pointer transition-all duration-300 relative z-10 shrink-0 ml-2 hidden sm:flex">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-dark-700/30">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Campaign Performance Trend</h3>
              <p className="text-[10px] text-dark-400 mt-0.5">Sends, unique opens and clicks ratio</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
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

        <div className="glass-panel p-5 rounded-2xl border border-dark-700/30 flex flex-col justify-between gap-4">
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

            <div className="mt-4 p-3 bg-brand-500/5 rounded-xl border border-brand-500/15 text-[10px]">
              <p className="font-bold mb-0.5 text-brand-700 dark:text-brand-300">💡 SaaS Growth Tip:</p>
              <span className="text-brand-600 dark:text-brand-400 font-semibold leading-normal">
                Importing fresh, segmented contact groups can increase campaign open rates by over 14%. Try creating specialized lists.
              </span>
            </div>
          </div>

          <Link
            to="/lists"
            className="w-full py-3 bg-dark-900 hover:bg-dark-800 rounded-xl text-xs font-bold text-white border border-dark-700 text-center flex items-center justify-center gap-1.5 transition-colors"
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
            <table className="w-full text-left border-collapse min-w-[600px]">
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
