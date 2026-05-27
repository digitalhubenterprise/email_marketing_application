import React, { useEffect, useState } from 'react'
import {
  Search,
  Filter,
  UserCheck,
  UserMinus,
  Trash2,
  Sliders,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Mail,
  Server,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react'

interface User {
  id: number;
  email: string;
  is_active: boolean;
  subscription_tier: string;
  quota_limit: number;
  quota_sent: number;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected user detail
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Modals / Action states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTier, setOverrideTier] = useState('pro');
  const [overrideQuota, setOverrideQuota] = useState(10000);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendAmount, setExtendAmount] = useState(5000);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) params.append('search', search);
      if (tier) params.append('tier', tier);
      if (status) params.append('status', status);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, tier, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleUserClick = async (userId: number) => {
    setDetailsLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBypassActivation = async (userId: number) => {
    if (!confirm("Bypass email verification and activate account?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Account force-activated successfully.");
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          handleUserClick(userId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspend = async (userId: number) => {
    if (!confirm("Suspend customer login credentials?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Account suspended successfully.");
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          handleUserClick(userId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsuspend = async (userId: number) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Account suspension lifted.");
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          handleUserClick(userId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/plan?tier=${overrideTier}&quota_limit=${overrideQuota}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Subscription plan overridden successfully.");
        setShowOverrideModal(false);
        fetchUsers();
        handleUserClick(selectedUser.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/extend?quota_add=${extendAmount}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("SMTP sends quota extended.");
        setShowExtendModal(false);
        fetchUsers();
        handleUserClick(selectedUser.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHardDelete = async () => {
    if (!selectedUser) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("GDPR Compliance Hard-Delete processed completely.");
        setShowDeleteModal(false);
        setSelectedUser(null);
        setPage(1);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;
    
    // Prepare headers and lines
    const headers = ["ID", "Email Address", "Subscription Tier", "Active Status", "Quota Limit", "Quota Sent", "Joined Date"];
    const rows = users.map(u => [
      u.id,
      u.email,
      u.subscription_tier.toUpperCase(),
      u.is_active ? "ACTIVE" : "SUSPENDED",
      u.quota_limit,
      u.quota_sent,
      new Date(u.created_at).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SaaS_Customers_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">CRM Users Management</h2>
          <p className="text-xs text-dark-400 mt-0.5">Control subscriptions, manual activation bypass, suspensions, and data compliance.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 hover:text-white hover:bg-emerald-500/20 transition-all"
        >
          <FileSpreadsheet size={13} />
          Export to CSV
        </button>
      </div>

      {/* Directory Filter Cockpit */}
      <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="md:col-span-2">
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Search Users Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by customer email address..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-all font-semibold"
            />
          </div>
        </form>

        {/* Tier */}
        <div>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Subscription Tier
          </label>
          <select
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 transition-all font-semibold"
          >
            <option value="">All Tiers</option>
            <option value="free">Free Tier</option>
            <option value="pro">Pro Plan</option>
            <option value="business">Business Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Client Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 transition-all font-semibold"
          >
            <option value="">All Status</option>
            <option value="active">Active Tiers</option>
            <option value="suspended">Suspended Profiles</option>
          </select>
        </div>
      </div>

      {/* Database Directory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table List (2/3 width) */}
        <div className="glass-panel rounded-2xl border border-dark-800/40 lg:col-span-2 overflow-hidden flex flex-col justify-between min-h-[450px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800/40 text-[10px] font-extrabold text-dark-400 uppercase tracking-wider bg-dark-900/20">
                  <th className="py-3 px-4">User Identity</th>
                  <th className="py-3 px-4">Joined At</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quota Capacity</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-dark-500 font-semibold">
                      No customer profiles matched standard queries.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => handleUserClick(u.id)}
                      className={`border-b border-dark-800/30 text-xs font-semibold text-dark-200 cursor-pointer hover:bg-dark-800/35 transition-colors duration-150 ${selectedUser?.id === u.id ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white max-w-[200px] truncate">{u.email}</td>
                      <td className="py-3.5 px-4 text-dark-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          u.subscription_tier === 'free' ? 'bg-dark-800 text-dark-400 border-dark-700/50' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        }`}>
                          {u.subscription_tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">Suspended</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-dark-300">
                        {u.quota_sent} / <span className="text-white font-extrabold">{u.quota_limit}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-dark-800/40 flex items-center justify-between text-xs bg-dark-900/10">
            <span className="text-dark-400">Showing <span className="font-extrabold text-white">{users.length}</span> of <span className="font-extrabold text-white">{total}</span> records</span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold text-white px-2 py-0.5 bg-dark-750 rounded border border-dark-700/60">
                Page {page} of {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Customer Panel (1/3 width) */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 flex flex-col min-h-[450px]">
          {detailsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
              <p className="text-[10px] text-dark-400 mt-2 font-semibold">Gathering client stats...</p>
            </div>
          ) : !selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-dark-500 space-y-2 py-10">
              <Sliders size={28} className="text-dark-600 animate-pulse" />
              <h4 className="font-bold text-xs text-dark-400">No profile selected</h4>
              <p className="text-[10px] text-dark-500 max-w-[200px]">Click any user in the directory table to open administrative actions.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Profile Card Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between border-b border-dark-800/40 pb-3">
                  <div className="truncate pr-2">
                    <h3 className="font-black text-sm text-white truncate">{selectedUser.email}</h3>
                    <span className="text-[9px] text-dark-500 font-semibold block mt-0.5">ID Ref: {selectedUser.id}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    selectedUser.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {selectedUser.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Sub Stats counts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-dark-900/40 p-2 border border-dark-800/40 rounded-xl">
                    <span className="block text-[9px] font-bold text-dark-400 uppercase tracking-wide">SMTP Nodes</span>
                    <span className="text-xs font-black text-white">{selectedUser.stats.smtp_count}</span>
                  </div>
                  <div className="bg-dark-900/40 p-2 border border-dark-800/40 rounded-xl">
                    <span className="block text-[9px] font-bold text-dark-400 uppercase tracking-wide">Contacts</span>
                    <span className="text-xs font-black text-white">{selectedUser.stats.lists_count}</span>
                  </div>
                  <div className="bg-dark-900/40 p-2 border border-dark-800/40 rounded-xl">
                    <span className="block text-[9px] font-bold text-dark-400 uppercase tracking-wide">Campaigns</span>
                    <span className="text-xs font-black text-white">{selectedUser.stats.campaigns_count}</span>
                  </div>
                </div>

                {/* Quota Gauge */}
                <div className="bg-dark-900/20 p-3.5 border border-dark-800/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-dark-400">
                    <span>Monthly Dispatch Vol:</span>
                    <span className="text-white font-mono">{selectedUser.quota_sent} / {selectedUser.quota_limit}</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden border border-dark-700/20">
                    <div className="h-full bg-brand-500" style={{ width: `${Math.min((selectedUser.quota_sent / selectedUser.quota_limit) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Administrative Actions Trigger Cockpit */}
              <div className="space-y-2 border-t border-dark-800/40 pt-4">
                <h4 className="text-[10px] font-black text-dark-400 uppercase tracking-wider mb-2">Administrative Actions</h4>

                {/* Toggle Suspensions */}
                {selectedUser.is_active ? (
                  <button
                    onClick={() => handleSuspend(selectedUser.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-rose-400 text-xs font-bold transition-all duration-300"
                  >
                    <span className="flex items-center gap-2"><UserMinus size={14} /> Suspend User Account</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rose-500/10 px-1.5 py-0.2 border border-rose-500/20 rounded">Ban</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUnsuspend(selectedUser.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-bold transition-all duration-300"
                    >
                      <span className="flex items-center gap-2"><UserCheck size={14} /> Lift Account Suspension</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold bg-emerald-500/10 px-1.5 py-0.2 border border-emerald-500/20 rounded">Unban</span>
                    </button>

                    <button
                      onClick={() => handleBypassActivation(selectedUser.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-800 hover:bg-dark-750 border border-dark-700/40 rounded-xl text-white text-xs font-bold transition-all"
                    >
                      Bypass Email Verification
                    </button>
                  </div>
                )}

                {/* Override Limit */}
                <button
                  onClick={() => {
                    setOverrideTier(selectedUser.subscription_tier);
                    setOverrideQuota(selectedUser.quota_limit);
                    setShowOverrideModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-dark-800/60 hover:bg-dark-750 border border-dark-700/40 rounded-xl text-white text-xs font-bold transition-all duration-300"
                >
                  <Sliders size={14} className="text-brand-400" />
                  Override Plan Limits & Tier
                </button>

                {/* Extend Quotas */}
                <button
                  onClick={() => setShowExtendModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-dark-800/60 hover:bg-dark-750 border border-dark-700/40 rounded-xl text-white text-xs font-bold transition-all duration-300"
                >
                  <PlusCircle size={14} className="text-indigo-400" />
                  Extend Emails Sending Quota
                </button>

                {/* GDPR Delete */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold transition-all"
                >
                  <Trash2 size={14} />
                  GDPR Hard-Delete Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERRIDE PLAN MODAL */}
      {showOverrideModal && selectedUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-dark-800/50 relative animate-scaleUp">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />
            <div className="p-6 border-b border-dark-800/40 flex items-center justify-between bg-dark-900/30">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Sliders size={16} className="text-brand-400" />
                Override Subscription limits
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-dark-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Select Subscription Tier
                </label>
                <select
                  value={overrideTier}
                  onChange={(e) => setOverrideTier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="business">business</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Monthly Emails Sending Limit
                </label>
                <input
                  type="number"
                  required
                  value={overrideQuota}
                  onChange={(e) => setOverrideQuota(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2.5 border border-dark-700/40 rounded-xl text-xs font-bold text-dark-400 hover:text-white"
                >
                  Cancel Override
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 brand-gradient-bg rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-500/10"
                >
                  Commit Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND QUOTA MODAL */}
      {showExtendModal && selectedUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-dark-800/50 relative animate-scaleUp">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
            <div className="p-6 border-b border-dark-800/40 flex items-center justify-between bg-dark-900/30">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <PlusCircle size={16} className="text-indigo-400" />
                Extend Customer Quota
              </h3>
              <button onClick={() => setShowExtendModal(false)} className="text-dark-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Quota Expansion volume (+ emails)
                </label>
                <input
                  type="number"
                  required
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
                <span className="text-[9px] text-dark-500 font-semibold block mt-1">This will be added directly on top of their current capacity limits.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="flex-1 py-2.5 border border-dark-700/40 rounded-xl text-xs font-bold text-dark-400 hover:text-white"
                >
                  Cancel Extension
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg"
                >
                  Extend Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GDPR DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-rose-500/35 relative animate-scaleUp">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500" />
            <div className="p-6 border-b border-dark-800/40 flex items-center justify-between bg-rose-500/5">
              <h3 className="font-extrabold text-sm text-rose-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                GDPR Hard-Delete Confirmation
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-dark-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-dark-300 font-semibold leading-relaxed">
                Warning! You are about to perform a <span className="text-rose-400 font-extrabold">GDPR Hard Delete</span> for user:
                <br />
                <span className="text-white font-extrabold font-mono block mt-1.5 p-2 bg-dark-900 rounded border border-dark-800/50 truncate">
                  {selectedUser.email}
                </span>
              </p>

              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-400 font-semibold space-y-1.5">
                <p>This action is irreversible and will permanently delete:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>User profile details and login credentials</li>
                  <li>All connected SMTP and Sender accounts</li>
                  <li>All uploaded Contact Lists and Contacts</li>
                  <li>All designed templates and folders</li>
                  <li>All campaigns history, reports, and delivery logs</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 border border-dark-700/40 rounded-xl text-xs font-bold text-dark-400 hover:text-white"
                >
                  Abort Action
                </button>
                <button
                  onClick={handleHardDelete}
                  className="flex-1 py-2.5 bg-rose-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-600/10"
                >
                  Confirm Hard-Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
