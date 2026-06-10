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
  CheckCircle2
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

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse text-slate-800">
      {/* Title block skeleton */}
      <div className="flex justify-between items-center animate-fadeIn">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
          <div className="h-3 w-28 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
        </div>
        <div className="h-9 w-24 bg-slate-200 dark:bg-dark-700/50 rounded-xl"></div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 animate-fadeIn" style={{ animationDelay: '50ms' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-dark-900 rounded-2xl p-5 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] h-28 space-y-3">
            <div className="h-3 w-28 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-dark-700/50 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Splits and Queue Diagnostics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] md:col-span-2 space-y-6 h-60">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
            <div className="h-2.5 w-60 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
          </div>
          <div className="space-y-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-32 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
                <div className="h-2 w-full bg-slate-100 dark:bg-dark-800/40 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4 h-60 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
            <div className="h-2.5 w-48 bg-slate-200 dark:bg-dark-700/50 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 w-full bg-slate-100 dark:bg-dark-800/40 rounded-xl"></div>
            <div className="h-8 w-full bg-slate-100 dark:bg-dark-800/40 rounded-xl"></div>
          </div>
          <div className="h-3 w-24 bg-slate-200 dark:bg-dark-700/50 rounded mx-auto mt-2"></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(true);

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

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch("/api/admin/dashboard/diagnostics", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to fetch systems diagnostics:", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDiagnostics();
  }, []);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2">
        <AlertOctagon size={16} className="text-rose-500" />
        <span>{error || "Unexpected data binding failure."}</span>
        <button onClick={fetchStats} className="ml-auto underline flex items-center gap-1 font-bold text-rose-800">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const subscriptionTotal = stats.active_subscriptions + stats.free_trials + stats.expired_subscriptions;
  const activePercent = subscriptionTotal > 0 ? (stats.active_subscriptions / subscriptionTotal) * 100 : 0;
  const freePercent = subscriptionTotal > 0 ? (stats.free_trials / subscriptionTotal) * 100 : 0;
  const expiredPercent = subscriptionTotal > 0 ? (stats.expired_subscriptions / subscriptionTotal) * 100 : 0;

  return (
    <div className="space-y-8 text-slate-800">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between opacity-0 animate-fadeIn" style={{ animationDelay: '30ms' }}>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Plan Billing <span className="text-brand-500">Overview</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            Cluster Status: <span className="text-emerald-600 font-bold">Healthy</span>
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
            fetchDiagnostics();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Sync Cluster
        </button>
      </div>

      {/* Top Aggregates Metrics Row */}
      <div 
        className="grid grid-cols-1 md:grid-cols-4 gap-5 opacity-0 animate-fadeIn"
        style={{ animationDelay: '100ms' }}
      >
        {/* Total Users */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-5 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 text-brand-500/5">
            <Users size={70} />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Users size={14} className="text-brand-500" />
            <span>Platform Customers</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total_users}</p>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1 mt-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 px-2 py-0.5 rounded-full w-fit">
            <TrendingUp size={10} />
            +{stats.new_users_today} today
          </span>
        </div>

        {/* System Email sends */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-5 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 text-indigo-500/5">
            <Mail size={70} />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Mail size={14} className="text-indigo-500" />
            <span>Emails Sent Today</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.emails_sent_today}</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-1">
            Month: <span className="text-slate-900 dark:text-slate-200 font-extrabold">{stats.emails_sent_month}</span> • Total: <span className="text-slate-900 dark:text-slate-200 font-extrabold">{stats.emails_sent_all_time}</span>
          </span>
        </div>

        {/* USD Month Revenue */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-5 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/5">
            <DollarSign size={70} />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-emerald-500" />
            <span>USD Revenue (Month)</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">${stats.revenue_usd_month}</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-1 bg-slate-50 dark:bg-dark-800 px-2 py-0.5 border border-slate-200 dark:border-dark-700 rounded w-fit">
            Stripe gateway
          </span>
        </div>

        {/* BDT Month Revenue */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-5 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 text-pink-500/5">
            <Briefcase size={70} />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Briefcase size={14} className="text-pink-500" />
            <span>Additional Revenue (Month)</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">${stats.revenue_bdt_month}</p>
          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold block mt-1 bg-brand-50 dark:bg-brand-950/20 px-2 py-0.5 border border-brand-100 dark:border-brand-900/35 rounded w-fit">
            bKash & offline
          </span>
        </div>
      </div>

      {/* Subscriptions Breakdowns & Celery Gauges */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-0 animate-fadeIn"
        style={{ animationDelay: '180ms' }}
      >
        {/* Subscription breakdown cards */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] md:col-span-2 space-y-6 hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.005] transition-all duration-300">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">Client Subscriptions Splits</h3>
            <p className="text-[10px] text-slate-400">Visual layout of subscription cohorts across the current database.</p>
          </div>

          <div className="space-y-4">
            {/* Active Pro/Business */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Active Subscriptions</span>
                <span className="font-extrabold text-brand-600 dark:text-brand-400">{stats.active_subscriptions} users ({activePercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                <div className="h-full bg-brand-500" style={{ width: `${activePercent}%` }} />
              </div>
            </div>

            {/* Free Trials */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Free Trial Tier</span>
                <span className="font-extrabold text-indigo-500 dark:text-indigo-400">{stats.free_trials} users ({freePercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                <div className="h-full bg-indigo-500" style={{ width: `${freePercent}%` }} />
              </div>
            </div>

            {/* Suspended/Expired */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Disabled / Expended Profiles</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">{stats.expired_subscriptions} users ({expiredPercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                <div className="h-full bg-rose-500" style={{ width: `${expiredPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* System Queue Diagnostics */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4 flex flex-col justify-between hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.005] transition-all duration-300">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide flex items-center gap-1.5">
              <span>Celery Cluster Diagnostics</span>
              {diagnostics && diagnostics.celery.status === 'online' ? (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              ) : (
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </h3>
            <p className="text-[10px] text-slate-400">Real-time background dispatch system health.</p>
          </div>

          {loadingDiagnostics ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500"></span>
            </div>
          ) : !diagnostics ? (
            <div className="text-[10px] text-slate-400 text-center py-6">
              Diagnostics unavailable.
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Redis status line */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Redis Broker</span>
                <span className={`font-bold ${diagnostics.redis.status === 'online' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diagnostics.redis.status === 'online' ? `ONLINE (${diagnostics.redis.ping_latency_ms}ms)` : 'OFFLINE'}
                </span>
              </div>

              {/* Active workers */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Active Workers</span>
                <span className="font-extrabold text-slate-800">
                  {diagnostics.celery.workers.length} nodes
                </span>
              </div>

              {/* Registered tasks count */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Registered Tasks</span>
                <span className="font-bold text-slate-800">
                  {diagnostics.celery.registered_tasks_count} tasks
                </span>
              </div>

              {/* System environment context */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150 text-[9px] text-slate-500 font-mono space-y-0.5">
                <div>Python: {diagnostics.system.python_version}</div>
                <div>OS: {diagnostics.system.os}</div>
                <div>Process PID: {diagnostics.system.process_id}</div>
              </div>
            </div>
          )}

          <div className="text-[9px] text-slate-400 text-center font-semibold pt-1">
            Broker Engine: <span className="text-indigo-600 font-bold">Redis Cluster</span>
          </div>
        </div>
      </div>

      {/* Activity Logger feed */}
      <div 
        className="bg-white dark:bg-dark-900 rounded-2xl p-6 border border-slate-200/60 dark:border-dark-700/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 opacity-0 animate-fadeIn hover:border-brand-500/20 dark:hover:border-dark-600/50 hover:scale-[1.002] transition-all duration-300"
        style={{ animationDelay: '260ms' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">Recent Activity Feed Logger</h3>
            <p className="text-[10px] text-slate-400">Last 20 administrative transactions and platform audit trails.</p>
          </div>
          <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider bg-brand-50 px-2 py-0.5 border border-brand-100 rounded">
            Live Feed
          </span>
        </div>

        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          {stats.recent_activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-bold">
              No audit logs captured in the system yet.
            </div>
          ) : (
            stats.recent_activities.map((act) => {
              let badgeClasses = "bg-slate-100 text-slate-600 border-slate-200";
              if (act.action_type.includes("suspend")) {
                badgeClasses = "bg-rose-50 text-rose-600 border-rose-100";
              } else if (act.action_type.includes("paid")) {
                badgeClasses = "bg-emerald-50 text-emerald-600 border-emerald-100";
              } else if (act.action_type.includes("cancel")) {
                badgeClasses = "bg-amber-50 text-amber-600 border-amber-100";
              } else if (act.action_type.includes("login")) {
                badgeClasses = "bg-brand-50 text-brand-600 border-brand-100";
              }

              return (
                <div key={act.id} className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-150 hover:bg-slate-100/50 transition-colors duration-150">
                  <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                    <Clock size={11} />
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{act.admin_email}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${badgeClasses}`}>
                        {act.action_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-semibold">{act.details}</p>
                    {act.target_entity && (
                      <span className="text-[9px] text-slate-400 font-mono">Target: {act.target_entity}</span>
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
