import React, { useEffect, useState } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Bookmark,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

interface AuditLog {
  id: number;
  admin_email: string;
  action_type: string;
  target_entity: string | null;
  details: string | null;
  created_at: string;
}

export default function AdminAudits() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [adminEmail, setAdminEmail] = useState('');
  const [actionType, setActionType] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (adminEmail) params.append('admin_email', adminEmail);
      if (actionType) params.append('action_type', actionType);

      const res = await fetch(`/api/admin/audits?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Platform Audit Trail</h2>
          <p className="text-xs text-dark-400 mt-0.5">Immutable, read-only system log capturing all high-privilege administrative actions.</p>
        </div>

        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded border border-rose-500/25 flex items-center gap-1.5">
          <ShieldAlert size={12} className="animate-pulse" />
          Append-Only Ledger
        </span>
      </div>

      {/* Query Filters */}
      <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Search admin */}
        <form onSubmit={handleSearchSubmit}>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Admin Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500">
              <User size={14} />
            </span>
            <input
              type="text"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Search by admin email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>
        </form>

        {/* Action Type */}
        <div>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Action Type Filter
          </label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
          >
            <option value="">All Action Types</option>
            <option value="login">login (Session start)</option>
            <option value="register_admin">register_admin (Admin created)</option>
            <option value="bypass_verification">bypass_verification (Force-activated)</option>
            <option value="suspend_user">suspend_user (Account suspend)</option>
            <option value="unsuspend_user">unsuspend_user (Suspension lifted)</option>
            <option value="delete_user_hard">delete_user_hard (GDPR Hard-Delete)</option>
            <option value="plan_override">plan_override (Tier override)</option>
            <option value="payment_marked_paid">payment_marked_paid (Offline verified)</option>
            <option value="payment_refunded">payment_refunded (Log manual refund)</option>
            <option value="toggle_maintenance">toggle_maintenance (Maintenance mode toggle)</option>
          </select>
        </div>

        {/* Reload */}
        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          className="px-4 py-2 border border-dark-700/40 rounded-xl bg-dark-800/40 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 hover:border-dark-600"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Reload Audit Trail
        </button>
      </div>

      {/* Audit Log list */}
      <div className="glass-panel rounded-2xl border border-dark-800/40 overflow-hidden flex flex-col justify-between min-h-[450px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-800/40 text-[10px] font-extrabold text-dark-400 uppercase tracking-wider bg-dark-900/20">
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4 text-right">Activity Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-dark-500 font-semibold">
                    No administrative audit events recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let colorClasses = "bg-dark-800/50 text-dark-400 border-dark-700/40";
                  if (log.action_type.includes("suspend") || log.action_type.includes("delete")) {
                    colorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/15";
                  } else if (log.action_type.includes("paid")) {
                    colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
                  } else if (log.action_type.includes("maintenance")) {
                    colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/15";
                  } else if (log.action_type.includes("login")) {
                    colorClasses = "bg-brand-500/10 text-brand-400 border-brand-500/15";
                  }

                  return (
                    <tr key={log.id} className="border-b border-dark-800/30 text-xs font-semibold text-dark-200">
                      <td className="py-3.5 px-4 font-mono text-dark-500">#AUD-{log.id}</td>
                      <td className="py-3.5 px-4 text-dark-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold">{log.admin_email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${colorClasses}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-dark-400 truncate max-w-[120px]">{log.target_entity || "—"}</td>
                      <td className="py-3.5 px-4 text-right text-white font-medium max-w-[250px] truncate">{log.details || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination navigations */}
        <div className="p-4 border-t border-dark-800/40 flex items-center justify-between text-xs bg-dark-900/10">
          <span className="text-dark-400">Security Ledger page navigator</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center gap-1 font-bold"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="text-white font-extrabold px-2">Page {page}</span>
            <button
              disabled={logs.length < limit}
              onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center gap-1 font-bold"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
