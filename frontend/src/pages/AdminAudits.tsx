import React, { useEffect, useState } from 'react'
import {
  ShieldAlert,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Eye,
  MousePointerClick,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react'

interface AuditLog {
  id: number;
  admin_email: string;
  action_type: string;
  target_entity: string | null;
  details: string | null;
  created_at: string;
}

interface UserLog {
  id: number;
  campaign_name: string;
  user_email: string;
  email: string;
  status: string;
  opened: boolean;
  clicked: boolean;
  error_message: string | null;
  updated_at: string;
}

export default function AdminAudits() {
  // Left side: Admin Audits
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit] = useState(15);
  const [adminEmail, setAdminEmail] = useState('');
  const [actionType, setActionType] = useState('');

  // Right side: Users Audits
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(15);
  const [userTotal, setUserTotal] = useState(0);

  const fetchAdminLogs = async () => {
    setAdminLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: adminPage.toString(),
        limit: adminLimit.toString()
      });
      if (adminEmail) params.append('admin_email', adminEmail);
      if (actionType) params.append('action_type', actionType);

      const res = await fetch(`/api/admin/audits?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchUserLogs = async () => {
    setUserLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: userLimit.toString()
      });

      const res = await fetch(`/api/admin/user-logs?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserLogs(data.logs);
        setUserTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminLogs();
  }, [adminPage, actionType]);

  useEffect(() => {
    fetchUserLogs();
  }, [userPage]);

  const handleAdminSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPage(1);
    fetchAdminLogs();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Platform Audit Trails Center</h2>
          <p className="text-xs text-dark-400 mt-0.5">Dual-Ledger Dashboard tracking administrator interventions and live user campaign dispatches.</p>
        </div>

        <button
          onClick={() => {
            setAdminPage(1);
            setUserPage(1);
            fetchAdminLogs();
            fetchUserLogs();
          }}
          className="px-3.5 py-1.5 border border-dark-700/40 rounded-xl bg-dark-800/40 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 hover:border-dark-600 hover:bg-dark-750"
        >
          <RefreshCw size={13} className={adminLoading || userLoading ? "animate-spin" : ""} />
          Reload All Logs
        </button>
      </div>

      {/* Main Dual Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ==================== LEFT SIDE: ADMIN AUDIT LOGS ==================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400" />
              Administrative Audit Logs
            </h3>
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 border border-rose-500/25 rounded">
              Immutable Records
            </span>
          </div>

          {/* Quick Filters */}
          <form onSubmit={handleAdminSearch} className="glass-panel rounded-2xl p-4 border border-dark-800/40 grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[8px] font-black text-dark-400 uppercase tracking-widest mb-1">
                Admin Email
              </label>
              <input
                type="text"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Search admin..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-750/30 text-white text-[10px] focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[8px] font-black text-dark-400 uppercase tracking-widest mb-1">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value);
                  setAdminPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-dark-900 border border-dark-750/30 text-white text-[10px] focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">All Actions</option>
                <option value="login">login</option>
                <option value="register_admin">register_admin</option>
                <option value="bypass_verification">bypass_verification</option>
                <option value="suspend_user">suspend_user</option>
                <option value="unsuspend_user">unsuspend_user</option>
                <option value="delete_user_hard">delete_user_hard</option>
                <option value="plan_override">plan_override</option>
                <option value="payment_marked_paid">payment_marked_paid</option>
                <option value="payment_refunded">payment_refunded</option>
                <option value="toggle_maintenance">toggle_maintenance</option>
              </select>
            </div>
          </form>

          {/* Admin Logs Table */}
          <div className="glass-panel rounded-2xl border border-dark-800/40 overflow-hidden flex flex-col justify-between min-h-[480px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-800/40 text-[9px] font-extrabold text-dark-400 uppercase tracking-wider bg-dark-900/20">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                      </td>
                    </tr>
                  ) : adminLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-dark-500 font-semibold">
                        No admin interventions logged.
                      </td>
                    </tr>
                  ) : (
                    adminLogs.map((log) => {
                      let badgeClasses = "bg-dark-800/50 text-dark-400 border-dark-700/40";
                      if (log.action_type.includes("suspend") || log.action_type.includes("delete")) {
                        badgeClasses = "bg-rose-500/10 text-rose-400 border-rose-500/15";
                      } else if (log.action_type.includes("paid")) {
                        badgeClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
                      } else if (log.action_type.includes("maintenance")) {
                        badgeClasses = "bg-amber-500/10 text-amber-400 border-amber-500/15";
                      } else if (log.action_type.includes("login")) {
                        badgeClasses = "bg-brand-500/10 text-brand-400 border-brand-500/15";
                      }

                      return (
                        <tr key={log.id} className="border-b border-dark-800/30 text-[11px] font-semibold text-dark-200">
                          <td className="py-3 px-3 text-dark-400">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3 text-white font-bold max-w-[120px] truncate">{log.admin_email}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded-md ${badgeClasses}`}>
                              {log.action_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-dark-300 max-w-[180px] truncate" title={log.details || ''}>{log.details}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-dark-800/40 flex items-center justify-between text-[11px] bg-dark-900/10">
              <span className="text-dark-500">Admin activities feed</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={adminPage <= 1}
                  onClick={() => setAdminPage(p => p - 1)}
                  className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center font-bold"
                >
                  <ChevronLeft size={10} />
                </button>
                <span className="text-white font-extrabold">Page {adminPage}</span>
                <button
                  disabled={adminLogs.length < adminLimit}
                  onClick={() => setAdminPage(p => p + 1)}
                  className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center font-bold"
                >
                  <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT SIDE: USERS AUDIT LOGS ==================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Mail size={16} className="text-brand-400 animate-pulse" />
              Users Activity Dispatches
            </h3>
            <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 border border-brand-500/25 rounded">
              Live SaaS Outputs
            </span>
          </div>

          {/* Quick Stats Banner instead of form */}
          <div className="glass-panel rounded-2xl p-4 border border-dark-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-brand-400 animate-pulse" />
              <span className="text-[10px] font-bold text-dark-300">Total System Sends Tracked:</span>
            </div>
            <span className="text-xs font-black text-white font-mono bg-dark-900 px-3 py-1 rounded-xl border border-dark-800">
              {userTotal} dispatches
            </span>
          </div>

          {/* User Logs Table */}
          <div className="glass-panel rounded-2xl border border-dark-800/40 overflow-hidden flex flex-col justify-between min-h-[480px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-800/40 text-[9px] font-extrabold text-dark-400 uppercase tracking-wider bg-dark-900/20">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">User (Sender)</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                      </td>
                    </tr>
                  ) : userLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-dark-500 font-semibold">
                        No user dispatches logged.
                      </td>
                    </tr>
                  ) : (
                    userLogs.map((log) => {
                      let statusBadge = (
                        <span className="text-[8px] font-black uppercase text-dark-400 bg-dark-800 border border-dark-700/50 px-1 py-0.2 rounded">
                          pending
                        </span>
                      );
                      if (log.status === 'sent') {
                        statusBadge = (
                          <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                            sent
                          </span>
                        );
                      } else if (log.status === 'failed' || log.status === 'bounced') {
                        statusBadge = (
                          <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.2 rounded" title={log.error_message || ''}>
                            failed
                          </span>
                        );
                      }

                      return (
                        <tr key={log.id} className="border-b border-dark-800/30 text-[11px] font-semibold text-dark-200">
                          <td className="py-3 px-3 text-dark-400">
                            {new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3 text-white font-bold max-w-[100px] truncate" title={log.user_email}>{log.user_email}</td>
                          <td className="py-3 px-3 text-white max-w-[120px] truncate" title={log.email}>{log.email}</td>
                          <td className="py-3 px-3 text-dark-400 max-w-[100px] truncate" title={log.campaign_name}>{log.campaign_name}</td>
                          <td className="py-3 px-3 text-right flex items-center justify-end gap-1.5 mt-2.5">
                            {log.opened && <span title="Opened Email"><Eye size={10} className="text-teal-400" /></span>}
                            {log.clicked && <span title="Clicked Link"><MousePointerClick size={10} className="text-brand-400" /></span>}
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-dark-800/40 flex items-center justify-between text-[11px] bg-dark-900/10">
              <span className="text-dark-500">Live dispatch outputs</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage(p => p - 1)}
                  className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center font-bold"
                >
                  <ChevronLeft size={10} />
                </button>
                <span className="text-white font-extrabold">Page {userPage}</span>
                <button
                  disabled={userLogs.length < userLimit}
                  onClick={() => setUserPage(p => p + 1)}
                  className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center font-bold"
                >
                  <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
