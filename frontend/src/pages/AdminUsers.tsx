import React, { useEffect, useState } from 'react'
import {
  Search,
  UserCheck,
  UserMinus,
  Trash2,
  Sliders,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Mail,
  ChevronLeft,
  ChevronRight,
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
  const [sortDate, setSortDate] = useState('desc');
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'campaigns' | 'payments'>('campaigns');
  const [drawerTab, setDrawerTab] = useState<'details' | 'logs' | 'financial' | 'actions'>('details');

  // Financial page/tab states
  const [txType, setTxType] = useState<'add_fund' | 'rebate' | 'overdrive'>('add_fund');
  const [txAmount, setTxAmount] = useState('0');
  const [txPlanTier, setTxPlanTier] = useState('pro');
  const [txStatus, setTxStatus] = useState<'pending' | 'paid'>('paid');
  const [txDueDays, setTxDueDays] = useState('30');
  const [txCustomDate, setTxCustomDate] = useState('');
  const [txCustomDays, setTxCustomDays] = useState('');
  const [txGateway, setTxGateway] = useState('Stripe');
  const [txId, setTxId] = useState('');
  const [txFees, setTxFees] = useState('0');
  const [txValidity, setTxValidity] = useState('0');
  const [txAdminNote, setTxAdminNote] = useState('');
  const [txUserNote, setTxUserNote] = useState('');
  const [txSendMail, setTxSendMail] = useState(false);
  const [submittingFinancial, setSubmittingFinancial] = useState(false);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTier, setOverrideTier] = useState('pro');
  const [overrideQuota, setOverrideQuota] = useState(10000);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendAmount, setExtendAmount] = useState(5000);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [tempUserEmail, setTempUserEmail] = useState('');

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
      if (sortDate) params.append('sort_date', sortDate);

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
  }, [page, tier, status, sortDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm("Reset user password and generate a secure temporary password?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTempPassword(data.temp_password);
        setTempUserEmail(data.email);
        setShowResetModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImpersonate = async (userId: number) => {
    if (!confirm("Impersonate customer session? An audit log entry will be recorded.")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        window.open("/", "_blank");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserClick = async (userId: number) => {
    setDetailsLoading(true);
    setDrawerTab('details');
    // Reset financial states
    setTxType('add_fund');
    setTxAmount('0');
    setTxStatus('paid');
    setTxDueDays('30');
    setTxCustomDate('');
    setTxCustomDays('');
    setTxGateway('Stripe');
    setTxId('');
    setTxFees('0');
    setTxValidity('0');
    setTxAdminNote('');
    setTxUserNote('');
    setTxSendMail(false);

    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
        setTxPlanTier(data.subscription_tier || 'pro');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFinancialSubmit = async () => {
    if (!selectedUser) return;
    const rawAmount = parseInt(txAmount, 10);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    const amountVal = txType === 'rebate' ? -rawAmount : rawAmount;

    setSubmittingFinancial(true);
    const token = localStorage.getItem("admin_token");
    
    // Calculate due days display string
    let dueDaysStr = txStatus === 'pending' ? txDueDays : 'N/A';
    if (txStatus === 'pending') {
      if (txDueDays === 'custom_date') {
        dueDaysStr = `Date: ${txCustomDate}`;
      } else if (txDueDays === 'custom_days') {
        dueDaysStr = `${txCustomDays} days`;
      }
    }

    // Build structured notes
    const formattedNotes = `User Note: ${txUserNote || 'N/A'} | Admin Note: ${txAdminNote || 'N/A'} | TXID: ${txId || 'N/A'} | Fees: ${txFees || '0'} | Validity: ${txValidity === '0' ? 'Lifetime' : txValidity + ' days'} | Due: ${dueDaysStr} | Mail: ${txSendMail ? 'Yes' : 'No'}`;

    try {
      const payload = {
        user_email: selectedUser.email,
        amount: amountVal,
        currency: "USD",
        plan_tier: txPlanTier,
        gateway: txGateway,
        status: txStatus,
        action_type: txType,
        notes: formattedNotes
      };

      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Financial transaction recorded successfully.");
        // Refresh selected user data to reload payments list and update current balance
        await handleUserClick(selectedUser.id);
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "Failed to record transaction."}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit financial transaction.");
    } finally {
      setSubmittingFinancial(false);
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
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
    <>
      <div className="space-y-2 animate-fadeIn text-slate-800">
      {/* Directory Filter Cockpit */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end -mt-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="md:col-span-2">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Search Users Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by customer email address..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>
        </form>

        {/* Tier */}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Subscription Tier
          </label>
          <select
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
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
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Client Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
          >
            <option value="">All Status</option>
            <option value="active">Active Tiers</option>
            <option value="suspended">Suspended Profiles</option>
          </select>
        </div>

        {/* Date Sorting */}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Sort Joined Date
          </label>
          <select
            value={sortDate}
            onChange={(e) => {
              setSortDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
          >
            <option value="desc">Newest Joined</option>
            <option value="asc">Oldest Joined</option>
          </select>
        </div>

        {/* Export Button */}
        <div className="flex justify-end h-full items-end pb-0.5">
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.015)] h-[36px]"
          >
            <FileSpreadsheet size={13} />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Directory Content - Full Width Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between min-h-[450px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
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
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-bold">
                    No customer profiles matched standard queries.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleUserClick(u.id)}
                    className={`border-b border-slate-100 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50/50 transition-colors duration-150 ${selectedUser?.id === u.id ? 'bg-brand-50/50 border-l-2 border-l-brand-500' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-extrabold text-slate-950 max-w-[200px] truncate">{u.email}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-bold">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        u.subscription_tier === 'free' ? 'bg-slate-100 text-slate-700 border-slate-350' : 'bg-brand-50 text-brand-700 border-brand-200'
                      }`}>
                        {u.subscription_tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded">Active</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-rose-800 bg-rose-50 border border-rose-250 px-1.5 py-0.5 rounded">Suspended</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-900 font-bold">
                      {u.quota_sent} / <span className="text-slate-950 font-black">{u.quota_limit}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200/50 flex items-center justify-between text-xs bg-slate-50/50">
          <span className="text-slate-700 font-bold">Showing <span className="font-black text-slate-950">{users.length}</span> of <span className="font-black text-slate-950">{total}</span> records</span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-bold text-slate-900 px-2 py-0.5 bg-white rounded border border-slate-200">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Drawer Panel */}
      {(selectedUser || detailsLoading) && (
        <>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[42] animate-fadeIn" 
            onClick={() => {
              if (!detailsLoading) setSelectedUser(null);
            }} 
          />
          
          {/* Drawer container */}
          <div className="absolute top-0 right-0 bottom-0 w-full md:w-3/4 bg-white shadow-2xl z-[45] border-l border-slate-200 flex flex-col justify-between p-6 animate-slideInRight text-slate-800">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedUser(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
            >
              <X size={18} />
            </button>

            {detailsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
                <p className="text-[10px] text-slate-400 mt-2 font-semibold animate-pulse">Gathering client stats...</p>
              </div>
            ) : selectedUser ? (
              <div className="flex-1 flex flex-col h-full justify-between overflow-y-auto pr-1">
                {/* Profile Card Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3 mt-2 pr-8">
                    <div className="truncate pr-2">
                      <h3 className="font-black text-sm text-slate-950 truncate" title={selectedUser.email}>{selectedUser.email}</h3>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">ID Ref: {selectedUser.id}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                      selectedUser.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {selectedUser.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>

                  {/* Horizontal Interactive Sliding Menu */}
                  <div className="flex border-b border-slate-200 mt-2 mb-4 gap-6 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    <button
                      onClick={() => setDrawerTab('details')}
                      className={`pb-2 transition-all relative ${
                        drawerTab === 'details' ? 'text-brand-600 border-b-2 border-brand-500 font-extrabold' : 'hover:text-slate-700'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setDrawerTab('logs')}
                      className={`pb-2 transition-all relative ${
                        drawerTab === 'logs' ? 'text-brand-600 border-b-2 border-brand-500 font-extrabold' : 'hover:text-slate-700'
                      }`}
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => setDrawerTab('financial')}
                      className={`pb-2 transition-all relative ${
                        drawerTab === 'financial' ? 'text-brand-600 border-b-2 border-brand-500 font-extrabold' : 'hover:text-slate-700'
                      }`}
                    >
                      Financial
                    </button>
                    <button
                      onClick={() => setDrawerTab('actions')}
                      className={`pb-2 transition-all relative ${
                        drawerTab === 'actions' ? 'text-brand-600 border-b-2 border-brand-500 font-extrabold' : 'hover:text-slate-700'
                      }`}
                    >
                      Administrative Actions
                    </button>
                  </div>

                  {/* Tab Body Contents */}
                  <div className="flex-1">
                    {drawerTab === 'details' && (
                      <div className="space-y-5 py-2 animate-fadeIn">
                        {/* Sub Stats counts */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 p-2 border border-slate-200/60 rounded-xl">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">SMTP Nodes</span>
                            <span className="text-xs font-black text-slate-900">{selectedUser.stats.smtp_count}</span>
                          </div>
                          <div className="bg-slate-50 p-2 border border-slate-200/60 rounded-xl">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Contacts</span>
                            <span className="text-xs font-black text-slate-900">{selectedUser.stats.lists_count}</span>
                          </div>
                          <div className="bg-slate-50 p-2 border border-slate-200/60 rounded-xl">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Campaigns</span>
                            <span className="text-xs font-black text-slate-900">{selectedUser.stats.campaigns_count}</span>
                          </div>
                        </div>

                        {/* Quota Gauge */}
                        <div className="bg-slate-50/50 p-3.5 border border-slate-150 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>Monthly Dispatch Vol:</span>
                            <span className="text-slate-900 font-mono font-extrabold">{selectedUser.quota_sent} / {selectedUser.quota_limit}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300/10">
                            <div className="h-full bg-brand-500" style={{ width: `${Math.min((selectedUser.quota_sent / selectedUser.quota_limit) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {drawerTab === 'logs' && (
                      <div className="space-y-4 py-2 animate-fadeIn">
                        {/* mini tabs Campaigns vs Payments */}
                        <div className="bg-slate-100 p-0.5 rounded-lg flex gap-1 mb-2.5">
                          <button
                            onClick={() => setDetailTab('campaigns')}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                              detailTab === 'campaigns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-450 hover:text-slate-750'
                            }`}
                          >
                            Campaigns
                          </button>
                          <button
                            onClick={() => setDetailTab('payments')}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                              detailTab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-450 hover:text-slate-755'
                            }`}
                          >
                            Payments History
                          </button>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-0.5">
                          {detailTab === 'campaigns' ? (
                            !selectedUser.campaigns || selectedUser.campaigns.length === 0 ? (
                              <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No campaigns launched yet.</p>
                            ) : (
                              selectedUser.campaigns.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[11px] font-semibold text-slate-700">
                                  <div className="truncate pr-2 max-w-[280px]">
                                    <span className="block font-black text-slate-900 truncate" title={c.name}>{c.name}</span>
                                    <span className="text-[9px] text-slate-450">{new Date(c.created_at).toLocaleDateString()} · {c.sent_count}/{c.total_recipients}</span>
                                  </div>
                                  <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.2 rounded border shrink-0 ${
                                    c.status === 'sent' ? 'bg-emerald-50 text-emerald-600 border-emerald-150' : 'bg-amber-50 text-amber-600 border-amber-150'
                                  }`}>
                                    {c.status}
                                  </span>
                                </div>
                              ))
                            )
                          ) : (
                            !selectedUser.payments || selectedUser.payments.length === 0 ? (
                              <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No payment transactions recorded.</p>
                            ) : (
                              selectedUser.payments.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[11px] font-semibold text-slate-700">
                                  <div className="truncate pr-2">
                                    <span className="block font-black text-slate-900">${p.amount} · <span className="uppercase text-[8.5px] text-brand-600 font-black">{p.gateway}</span></span>
                                    <span className="text-[9px] text-slate-455">{new Date(p.created_at).toLocaleDateString()} · {p.plan_tier}</span>
                                  </div>
                                  <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.2 rounded border shrink-0 ${
                                    p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-150' : 'bg-amber-50 text-amber-600 border-amber-150'
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>
                              ))
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {drawerTab === 'financial' && (() => {
                      const paidPayments = selectedUser.payments || [];
                      const currentBalance = 25.40 + paidPayments
                        .filter((p: any) => p.status === 'paid' && p.notes && !p.notes.startsWith("[OVERDRIVE]"))
                        .reduce((sum: number, p: any) => sum + p.amount, 0);

                      return (
                        <div className="space-y-4 py-2 animate-fadeIn text-slate-800">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Financial Actions</h4>
                          
                          {/* Transaction Type Selector */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              Transaction Type
                            </label>
                            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setTxType('add_fund')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  txType === 'add_fund'
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Add Credit
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxType('rebate')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  txType === 'rebate'
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Rebate Credit
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxType('overdrive')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  txType === 'overdrive'
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Overdrive
                              </button>
                            </div>
                          </div>

                          {/* Amount and Target Plan Tier */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                {txType === 'overdrive' ? 'Overdrive Amount' : txType === 'rebate' ? 'Rebate Amount' : 'Add Amount'} (USD)
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={txAmount}
                                onChange={(e) => setTxAmount(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Target Plan Tier
                              </label>
                              <select
                                value={txPlanTier}
                                onChange={(e) => setTxPlanTier(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="business">Business</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </div>
                          </div>

                          {/* Real-time Overdrive calculation display */}
                          <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-xl space-y-1.5 text-xs text-slate-600 font-medium">
                            <div className="flex justify-between items-center">
                              <span>Credit (Current Balance):</span>
                              <span className="font-mono font-bold text-slate-900">${currentBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span>{txType === 'rebate' ? 'Deduct Amount' : 'Put Amount'}:</span>
                              <span className={`font-mono font-bold ${txType === 'rebate' ? 'text-rose-600' : 'text-brand-600'}`}>
                                {txType === 'rebate' ? '-' : '+'}${(parseFloat(txAmount) || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t border-slate-200/80 my-2 pt-2 flex justify-between items-center text-slate-900 font-bold">
                              <span>Total Balance:</span>
                              <span className="font-mono text-sm text-emerald-600">
                                ${(currentBalance + (txType === 'rebate' ? -(parseFloat(txAmount) || 0) : (parseFloat(txAmount) || 0))).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Invoice & Status Selection */}
                          <div className={`grid grid-cols-1 ${txStatus === 'pending' ? 'md:grid-cols-2' : ''} gap-4`}>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Invoice Status
                              </label>
                              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setTxStatus('pending')}
                                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    txStatus === 'pending'
                                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Generate Invoice
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTxStatus('paid')}
                                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    txStatus === 'paid'
                                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Paid
                                </button>
                              </div>
                            </div>

                            {txStatus === 'pending' && (
                              <div className="animate-fadeIn">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                  Due Days
                                </label>
                                <select
                                  value={txDueDays}
                                  onChange={(e) => setTxDueDays(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                                >
                                  <option value="1">1 Day</option>
                                  <option value="2">2 Days</option>
                                  <option value="5">5 Days</option>
                                  <option value="7">7 Days</option>
                                  <option value="15">15 Days</option>
                                  <option value="30">30 Days</option>
                                  <option value="custom_date">Custom Date</option>
                                  <option value="custom_days">Custom Days</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Custom date/days input */}
                          {txStatus === 'pending' && txDueDays === 'custom_date' && (
                            <div className="animate-fadeIn">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Custom Due Date
                              </label>
                              <input
                                type="date"
                                required
                                value={txCustomDate}
                                onChange={(e) => setTxCustomDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          )}

                          {txStatus === 'pending' && txDueDays === 'custom_days' && (
                            <div className="animate-fadeIn">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Custom Due Days
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={txCustomDays}
                                onChange={(e) => setTxCustomDays(e.target.value)}
                                placeholder="Enter days..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          )}

                          {/* Payment Gateway and Transaction ID */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Payment Gateway
                              </label>
                              <select
                                value={txGateway}
                                onChange={(e) => setTxGateway(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              >
                                <option value="Stripe">Stripe</option>
                                <option value="bKash">bKash</option>
                                <option value="Nagad">Nagad</option>
                                <option value="Rocket">Rocket</option>
                                <option value="Binance Pay">Binance Pay</option>
                                <option value="USDT TRC20">USDT TRC20</option>
                                <option value="USDT BEP20">USDT BEP20</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Transaction ID
                              </label>
                              <input
                                type="text"
                                value={txId}
                                onChange={(e) => setTxId(e.target.value)}
                                placeholder="Enter transaction reference ID..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          </div>

                          {/* Fees and Validity */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Fees (USD)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={txFees}
                                onChange={(e) => setTxFees(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Credit Balance Validity
                              </label>
                              <input
                                type="number"
                                min="0"
                                required
                                value={txValidity}
                                onChange={(e) => setTxValidity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                              <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                                0 - (Life Time) , # - No of days
                              </span>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              Admin Note
                            </label>
                            <textarea
                              value={txAdminNote}
                              onChange={(e) => setTxAdminNote(e.target.value)}
                              placeholder="Internal administrative note..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              User Note
                            </label>
                            <textarea
                              value={txUserNote}
                              onChange={(e) => setTxUserNote(e.target.value)}
                              placeholder="Notes visible to the user..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold font-sans"
                            />
                          </div>

                          {/* Mail Notification */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="sendMail"
                              checked={txSendMail}
                              onChange={(e) => setTxSendMail(e.target.checked)}
                              className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4 bg-slate-50 border-slate-300"
                            />
                            <label htmlFor="sendMail" className="text-xs font-bold text-slate-700 select-none">
                              Send Financial Information Via Mail
                            </label>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="button"
                            onClick={handleFinancialSubmit}
                            disabled={submittingFinancial}
                            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {submittingFinancial ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                Adding...
                              </>
                            ) : (
                              'Add'
                            )}
                          </button>
                        </div>
                      );
                    })()}

                    {drawerTab === 'actions' && (
                      <div className="space-y-3 py-2 animate-fadeIn">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Administrative Actions</h4>

                        {/* Toggle Suspensions */}
                        {selectedUser.is_active ? (
                          <button
                            onClick={() => handleSuspend(selectedUser.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold transition-all duration-200"
                          >
                            <span className="flex items-center gap-2"><UserMinus size={14} /> Suspend User Account</span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rose-200/20 px-1.5 py-0.2 border border-rose-200 rounded">Ban</span>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleUnsuspend(selectedUser.id)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-emerald-600 text-xs font-bold transition-all duration-200"
                            >
                              <span className="flex items-center gap-2"><UserCheck size={14} /> Lift Account Suspension</span>
                              <span className="text-[9px] uppercase tracking-wider font-extrabold bg-emerald-200/20 px-1.5 py-0.2 border border-emerald-200 rounded">Unban</span>
                            </button>

                            <button
                              onClick={() => handleBypassActivation(selectedUser.id)}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all"
                            >
                              Bypass Email Verification
                            </button>
                          </div>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(selectedUser.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all duration-200"
                        >
                          <Mail size={14} className="text-amber-500" />
                          Reset User Password (On Behalf)
                        </button>

                        {/* Impersonate Session */}
                        <button
                          onClick={() => handleImpersonate(selectedUser.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl text-brand-700 text-xs font-bold transition-all duration-200"
                        >
                          <Sliders size={14} className="text-brand-500 animate-pulse" />
                          Impersonate Session (Log In)
                        </button>

                        {/* Override Limit */}
                        <button
                          onClick={() => {
                            setOverrideTier(selectedUser.subscription_tier);
                            setOverrideQuota(selectedUser.quota_limit);
                            setShowOverrideModal(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all duration-200"
                        >
                          <Sliders size={14} className="text-brand-500" />
                          Override Plan Limits & Tier
                        </button>

                        {/* Extend Quotas */}
                        <button
                          onClick={() => setShowExtendModal(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all duration-200"
                        >
                          <PlusCircle size={14} className="text-indigo-500" />
                          Extend Emails Sending Quota
                        </button>

                        {/* GDPR Delete */}
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold transition-all"
                        >
                          <Trash2 size={14} />
                          GDPR Hard-Delete Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* OVERRIDE PLAN MODAL */}
      {showOverrideModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                Override Subscription limits
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Select Subscription Tier
                </label>
                <select
                  value={overrideTier}
                  onChange={(e) => setOverrideTier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="business">business</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Monthly Emails Sending Limit
                </label>
                <input
                  type="number"
                  required
                  value={overrideQuota}
                  onChange={(e) => setOverrideQuota(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel Override
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 brand-gradient-bg text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <PlusCircle size={16} className="text-indigo-500" />
                Extend Customer Quota
              </h3>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Quota Expansion volume (+ emails)
                </label>
                <input
                  type="number"
                  required
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">This will be added directly on top of their current capacity limits.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel Extension
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/10"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-rose-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <h3 className="font-extrabold text-sm text-rose-600 flex items-center gap-2">
                <AlertTriangle size={16} />
                GDPR Hard-Delete Confirmation
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Warning! You are about to perform a <span className="text-rose-600 font-extrabold">GDPR Hard Delete</span> for user:
                <br />
                <span className="text-slate-800 font-extrabold font-mono block mt-1.5 p-2 bg-slate-50 rounded border border-slate-200 truncate">
                  {selectedUser.email}
                </span>
              </p>

              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-semibold space-y-1.5">
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
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
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

      {/* PASSWORD RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Mail size={16} className="text-amber-500" />
                Temporary Password Generated
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                A new temporary password has been successfully generated for user:
                <span className="block font-black text-slate-900 font-mono mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded truncate select-all">
                  {tempUserEmail}
                </span>
              </p>

              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                <span className="block text-[10px] font-black text-amber-800 uppercase tracking-wider">Secure Temporary Password:</span>
                <div className="flex items-center justify-between bg-white border border-amber-200 p-2.5 rounded-lg">
                  <span className="font-mono text-sm font-black text-slate-900 select-all">{tempPassword}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      alert("Temporary password copied to clipboard!");
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                <span className="text-amber-600 font-bold">Important:</span> Copy this temporary password and share it securely with the user. The user will be required to change their password once they log back in.
              </p>

              <button
                onClick={() => setShowResetModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
