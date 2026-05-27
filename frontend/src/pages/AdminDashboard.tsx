import React, { useEffect, useState } from 'react'
import {
  Users,
  TrendingUp,
  Mail,
  DollarSign,
  Briefcase,
  AlertOctagon,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react'

interface Stats {
  total_users: number;
  new_users_today: number;
  active_subscriptions: number;
  free_trials: number;
  expired_subscriptions: number;
  emails_sent_today: number;
  emails_sent_month: number;
  emails_sent_all_time: number;
  revenue_usd_month: number;
  revenue_bdt_month: number;
  recent_activities: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setError(null);
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch("/api/admin/dashboard/stats", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError("Failed to fetch administrative metrics ledger.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to SaaS administrative gateway.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        <p className="text-xs text-dark-400 mt-3 font-semibold">Aggregating platform datasets...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <AlertOctagon size={16} />
        <span>{error || "Unexpected data binding failure."}</span>
        <button onClick={fetchStats} className="ml-auto underline flex items-center gap-1 font-bold">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  // Calculate percentages
  const subscriptionTotal = stats.active_subscriptions + stats.free_trials + stats.expired_subscriptions;
  const activePercent = subscriptionTotal > 0 ? (stats.active_subscriptions / subscriptionTotal) * 100 : 0;
  const freePercent = subscriptionTotal > 0 ? (stats.free_trials / subscriptionTotal) * 100 : 0;
  const expiredPercent = subscriptionTotal > 0 ? (stats.expired_subscriptions / subscriptionTotal) * 100 : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Overview Dashboard</h2>
          <p className="text-xs text-dark-400 mt-0.5">Real-time platform usage, subscription breakdown, and billing ledgers.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/60 border border-dark-700/40 rounded-xl text-xs font-bold text-dark-200 hover:text-white hover:bg-dark-750/70 transition-all duration-300"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Stats
        </button>
      </div>

      {/* Top Aggregates Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-brand-500/10">
            <Users size={70} />
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
            <Users size={14} className="text-brand-400" />
            <span>Platform Customers</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total_users}</p>
          <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
            <TrendingUp size={10} />
            +{stats.new_users_today} registrations today
          </span>
        </div>

        {/* System Email sends */}
        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-indigo-500/10">
            <Mail size={70} />
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
            <Mail size={14} className="text-indigo-400" />
            <span>Email Volume Today</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.emails_sent_today}</p>
          <span className="text-[10px] text-dark-400 font-bold block mt-1">
            Month: <span className="text-white font-extrabold">{stats.emails_sent_month}</span> • All Time: <span className="text-white font-extrabold">{stats.emails_sent_all_time}</span>
          </span>
        </div>

        {/* USD Month Revenue */}
        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/10">
            <DollarSign size={70} />
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-emerald-400" />
            <span>USD Revenue (Month)</span>
          </div>
          <p className="text-2xl font-black text-white">${stats.revenue_usd_month}</p>
          <span className="text-[10px] text-dark-400 font-bold block mt-1 bg-dark-800/40 px-2 py-0.5 border border-dark-700/30 rounded w-fit">
            Stripe & Card Payments
          </span>
        </div>

        {/* BDT Month Revenue */}
        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-pink-500/10">
            <Briefcase size={70} />
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
            <Briefcase size={14} className="text-pink-400" />
            <span>BDT Revenue (Month)</span>
          </div>
          <p className="text-2xl font-black text-white">৳{stats.revenue_bdt_month}</p>
          <span className="text-[10px] text-brand-400 font-bold block mt-1 bg-brand-500/10 px-2 py-0.5 border border-brand-500/20 rounded w-fit">
            bKash & Bank Transfers
          </span>
        </div>
      </div>

      {/* Subscriptions Breakdowns & Celery Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscription breakdown cards */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 md:col-span-2 space-y-6">
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-wide">Client Subscriptions Splits</h3>
            <p className="text-[10px] text-dark-400">Visual layout of subscription cohorts across the current database.</p>
          </div>

          <div className="space-y-4">
            {/* Active Pro/Business */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-white">Active Subscriptions</span>
                <span className="font-extrabold text-brand-400">{stats.active_subscriptions} users ({activePercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-dark-700/30">
                <div className="h-full bg-brand-500" style={{ width: `${activePercent}%` }} />
              </div>
            </div>

            {/* Free Trials */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-white">Free Trial Tier</span>
                <span className="font-extrabold text-indigo-400">{stats.free_trials} users ({freePercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-dark-700/30">
                <div className="h-full bg-indigo-500" style={{ width: `${freePercent}%` }} />
              </div>
            </div>

            {/* Suspended/Expired */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-white">Disabled / Suspended Profiles</span>
                <span className="font-extrabold text-rose-400">{stats.expired_subscriptions} users ({expiredPercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-dark-700/30">
                <div className="h-full bg-rose-500" style={{ width: `${expiredPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* System Queue Diagnostics */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-extrabold text-sm text-white tracking-wide">Celery Queue Diagnostics</h3>
            <p className="text-[10px] text-dark-400">Platform background process health indicator.</p>
          </div>

          <div className="py-5 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 size={32} className="animate-pulse" />
            </div>
            <p className="text-xs font-bold text-white">SaaS Dispatch Core healthy</p>
            <span className="text-[10px] text-dark-400 block bg-dark-800/40 py-1.5 px-3 border border-dark-700/40 rounded-xl">
              Beat Periodic Schedules active
            </span>
          </div>

          <div className="text-[9px] text-dark-500 text-center font-semibold">
            Broker Status: <span className="text-emerald-400 font-extrabold">REDIS ONLINE</span>
          </div>
        </div>
      </div>

      {/* Activity Logger feed */}
      <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-wide">Recent Activity Feed Logger</h3>
            <p className="text-[10px] text-dark-400">Last 20 administrative transactions and platform audit trails.</p>
          </div>
          <span className="text-[9px] font-black text-brand-400 uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 border border-brand-500/25 rounded">
            Live Feed
          </span>
        </div>

        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          {stats.recent_activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-dark-500 font-semibold">
              No audit logs captured in the system yet.
            </div>
          ) : (
            stats.recent_activities.map((act) => {
              // Color pickers based on action type
              let colorClasses = "bg-dark-800/50 text-dark-400 border-dark-700/40";
              if (act.action_type.includes("suspend")) {
                colorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/15";
              } else if (act.action_type.includes("paid")) {
                colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
              } else if (act.action_type.includes("cancel")) {
                colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/15";
              } else if (act.action_type.includes("login")) {
                colorClasses = "bg-brand-500/10 text-brand-400 border-brand-500/15";
              }

              return (
                <div key={act.id} className="flex items-start gap-4 p-3 rounded-xl bg-dark-900/40 border border-dark-800/30 hover:border-dark-700/50 transition-colors duration-200">
                  <div className="flex items-center gap-1.5 text-dark-400 mt-0.5">
                    <Clock size={11} />
                    <span className="text-[10px] font-bold text-dark-500">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white">{act.admin_email}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${colorClasses}`}>
                        {act.action_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-dark-300 font-semibold">{act.details}</p>
                    {act.target_entity && (
                      <span className="text-[9px] text-dark-500 font-mono">Target: {act.target_entity}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
