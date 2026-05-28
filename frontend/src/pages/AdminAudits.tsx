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
  MousePointerClick
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
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');

  // Left side: Admin Audits
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(10);
  const [adminEmail, setAdminEmail] = useState('');
  const [actionType, setActionType] = useState('');

  // Right side: Users Audits
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
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
  }, [adminPage, actionType, adminLimit]);

  useEffect(() => {
    fetchUserLogs();
  }, [userPage, userLimit]);

  const handleAdminSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPage(1);
    fetchAdminLogs();
  };

  return (
    <div className="space-y-2 animate-fadeIn text-slate-800">
      {/* Header Tab Selector & Action Row */}
      <div className="flex items-center justify-between -mt-3">
        {/* Horizontal Pill Tab Selector (Exact matching of user's image style!) */}
        <div className="bg-white/90 border border-slate-200/60 p-1.5 rounded-full w-fit flex items-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <button
            onClick={() => setActiveTab('admin')}
            className={`${
              activeTab === 'admin'
                ? 'bg-[#4c6ef5] text-white shadow-lg shadow-[#4c6ef5]/20 font-black'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50 font-bold'
            } px-5 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200`}
          >
            <ShieldAlert size={14} className={activeTab === 'admin' ? 'text-white animate-pulse' : 'text-slate-400'} />
            <span>Administrative Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('user')}
            className={`${
              activeTab === 'user'
                ? 'bg-[#4c6ef5] text-white shadow-lg shadow-[#4c6ef5]/20 font-black'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50 font-bold'
            } px-5 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200`}
          >
            <Mail size={14} className={activeTab === 'user' ? 'text-white animate-pulse' : 'text-slate-400'} />
            <span>Users Activity Dispatches</span>
          </button>
        </div>

        <button
          onClick={() => {
            setAdminPage(1);
            setUserPage(1);
            fetchAdminLogs();
            fetchUserLogs();
          }}
          className="px-3.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-350 shadow-sm"
        >
          <RefreshCw size={13} className={adminLoading || userLoading ? "animate-spin text-brand-500" : "text-slate-500"} />
          Reload All Logs
        </button>
      </div>

      {/* Tab Contents */}
      <div className="animate-fadeIn">
        {activeTab === 'admin' ? (
          /* ==================== ADMIN AUDIT LOGS ==================== */
          <div className="space-y-3 max-w-6xl">
            {/* Quick Filters */}
            <form onSubmit={handleAdminSearch} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Admin Email
                </label>
                <input
                  type="text"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Search admin..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => {
                    setActionType(e.target.value);
                    setAdminPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
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
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between min-h-[480px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/50 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Admin Operator</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
                        </td>
                      </tr>
                    ) : adminLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-400 font-bold">
                          No admin interventions logged.
                        </td>
                      </tr>
                    ) : (
                      adminLogs.map((log) => {
                        let badgeClasses = "bg-slate-100 text-slate-600 border-slate-200";
                        if (log.action_type.includes("suspend") || log.action_type.includes("delete")) {
                          badgeClasses = "bg-rose-50 text-rose-600 border-rose-100";
                        } else if (log.action_type.includes("paid")) {
                          badgeClasses = "bg-emerald-50 text-emerald-600 border-emerald-100";
                        } else if (log.action_type.includes("maintenance")) {
                          badgeClasses = "bg-amber-50 text-amber-600 border-amber-100";
                        } else if (log.action_type.includes("login")) {
                          badgeClasses = "bg-brand-50 text-brand-600 border-brand-100";
                        }

                        return (
                          <tr key={log.id} className="border-b border-slate-100 text-xs font-semibold text-slate-700">
                            <td className="py-3.5 px-4 text-slate-550 font-bold">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-900 font-extrabold">{log.admin_email}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${badgeClasses}`}>
                                {log.action_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-800 font-semibold" title={log.details || ''}>{log.details}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200/50 flex items-center justify-between text-xs bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-semibold">Admin activities feed</span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="text-[11px] font-medium">Show:</span>
                    <select
                      value={adminLimit}
                      onChange={(e) => {
                        setAdminLimit(Number(e.target.value));
                        setAdminPage(1);
                      }}
                      className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 font-bold text-[11px] focus:outline-none focus:border-brand-500"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="300">300</option>
                      <option value="500">500</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={adminPage <= 1}
                    onClick={() => setAdminPage(p => p - 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center font-bold shadow-sm"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span className="text-slate-900 font-extrabold px-2">Page {adminPage}</span>
                  <button
                    disabled={adminLogs.length < adminLimit}
                    onClick={() => setAdminPage(p => p + 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center font-bold shadow-sm"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== USERS AUDIT LOGS ==================== */
          <div className="space-y-3 max-w-6xl">
            {/* Quick Stats Banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#4c6ef5] animate-pulse" />
                <span className="text-xs font-bold text-slate-650">Total System Sends Tracked:</span>
              </div>
              <span className="text-sm font-black text-slate-950 font-mono bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
                {userTotal.toLocaleString()} dispatches
              </span>
            </div>

            {/* User Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between min-h-[480px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/50 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Dispatch Timestamp</th>
                      <th className="py-3 px-4">Sender Account</th>
                      <th className="py-3 px-4">Recipient Address</th>
                      <th className="py-3 px-4">Campaign Context</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4c6ef5] mx-auto" />
                        </td>
                      </tr>
                    ) : userLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-bold">
                          No user dispatches logged.
                        </td>
                      </tr>
                    ) : (
                      userLogs.map((log) => {
                        let statusBadge = (
                          <span className="text-[8.5px] font-black uppercase text-slate-600 bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded font-black">
                            pending
                          </span>
                        );
                        if (log.status === 'sent') {
                          statusBadge = (
                            <span className="text-[8.5px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded font-black">
                              sent
                            </span>
                          );
                        } else if (log.status === 'failed' || log.status === 'bounced') {
                          statusBadge = (
                            <span className="text-[8.5px] font-black uppercase text-rose-800 bg-rose-50 border border-rose-250 px-1.5 py-0.5 rounded font-black" title={log.error_message || ''}>
                              failed
                            </span>
                          );
                        }

                        return (
                          <tr key={log.id} className="border-b border-slate-100 text-xs font-semibold text-slate-700">
                            <td className="py-3.5 px-4 text-slate-550 font-bold">
                              {new Date(log.updated_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-950 font-black" title={log.user_email}>{log.user_email}</td>
                            <td className="py-3.5 px-4 text-slate-900 font-bold" title={log.email}>{log.email}</td>
                            <td className="py-3.5 px-4 text-slate-800" title={log.campaign_name}>{log.campaign_name}</td>
                            <td className="py-3.5 px-4 text-right flex items-center justify-end gap-1.5 mt-2.5">
                              {log.opened && <span title="Opened Email" className="cursor-pointer"><Eye size={12} className="text-teal-600" /></span>}
                              {log.clicked && <span title="Clicked Link" className="cursor-pointer"><MousePointerClick size={12} className="text-[#4c6ef5]" /></span>}
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
              <div className="p-4 border-t border-slate-200/50 flex items-center justify-between text-xs bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-semibold">Live dispatch outputs</span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="text-[11px] font-medium">Show:</span>
                    <select
                      value={userLimit}
                      onChange={(e) => {
                        setUserLimit(Number(e.target.value));
                        setUserPage(1);
                      }}
                      className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 font-bold text-[11px] focus:outline-none focus:border-brand-500"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="300">300</option>
                      <option value="500">500</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(p => p - 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center font-bold shadow-sm"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span className="text-slate-900 font-extrabold px-2">Page {userPage}</span>
                  <button
                    disabled={userLogs.length < userLimit}
                    onClick={() => setUserPage(p => p + 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center font-bold shadow-sm"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
