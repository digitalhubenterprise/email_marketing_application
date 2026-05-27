import React, { useEffect, useState } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Bookmark,
  CheckCircle,
  XCircle,
  PlusCircle,
  Eye,
  AlertCircle,
  X,
  User,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Payment {
  id: number;
  user_id: number | null;
  user_email: string;
  amount: number;
  currency: string;
  plan_tier: string;
  gateway: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function AdminBilling() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');

  // Selected payment detail (offline mark paid drawer)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Manual payment creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAmount, setNewAmount] = useState(1200);
  const [newCurrency, setNewCurrency] = useState('BDT');
  const [newTier, setNewTier] = useState('pro');
  const [newGateway, setNewGateway] = useState('bKash');
  const [newNotes, setNewNotes] = useState('');

  // Revenue analytics aggregates
  const [usdMonth, setUsdMonth] = useState(0);
  const [bdtMonth, setBdtMonth] = useState(0);

  const fetchPayments = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (status) params.append('status', status);
      if (gateway) params.append('gateway', gateway);

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }

      // Also refresh dashboard stats in background to get revenues
      const statsRes = await fetch("/api/admin/dashboard/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setUsdMonth(statsData.revenue_usd_month);
        setBdtMonth(statsData.revenue_bdt_month);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, status, gateway]);

  const handleMarkPaid = async (paymentId: number) => {
    if (!confirm("Confirm receipt of funds and activate user quotas?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Transaction successfully marked paid. User limits upgraded.");
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRefunded = async (paymentId: number) => {
    if (!confirm("Record offline refund and downgrade client limits back to free trial?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Transaction successfully refunded. Quotas downgraded.");
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_email: newEmail,
          amount: newAmount,
          currency: newCurrency,
          plan_tier: newTier,
          gateway: newGateway,
          notes: newNotes
        })
      });
      if (res.ok) {
        alert("Manual transaction recorded as pending.");
        setShowCreateModal(false);
        setNewEmail('');
        setNewNotes('');
        fetchPayments();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "Failed to create payment log."}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">SaaS Cash Desk & Ledgers</h2>
          <p className="text-xs text-dark-400 mt-0.5">Audit transaction invoices, manually verify bKash/Bank payments, and log refunds.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 brand-gradient-bg rounded-xl text-xs font-bold text-white hover:opacity-95 shadow-md shadow-brand-500/10 transition-all"
        >
          <Plus size={14} />
          Record Offline Transfer
        </button>
      </div>

      {/* Revenue analytis cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-dark-400 uppercase tracking-wide">USD monthly Revenue</span>
            <p className="text-xl font-black text-white">${usdMonth}</p>
          </div>
          <div className="absolute top-0 right-0 p-2 text-[8px] font-extrabold text-emerald-400/30 bg-emerald-500/5 border-l border-b border-emerald-500/10 rounded-bl-lg uppercase tracking-wider">
            Stripe gateway
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 relative overflow-hidden flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-dark-400 uppercase tracking-wide">BDT monthly Revenue</span>
            <p className="text-xl font-black text-white">৳{bdtMonth}</p>
          </div>
          <div className="absolute top-0 right-0 p-2 text-[8px] font-extrabold text-brand-400/30 bg-brand-500/5 border-l border-b border-brand-500/10 rounded-bl-lg uppercase tracking-wider">
            bKash & Bank
          </div>
        </div>
      </div>

      {/* Directory Filter Panel */}
      <div className="glass-panel rounded-2xl p-5 border border-dark-800/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Status filter */}
        <div>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Transaction Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="paid">paid (Verified)</option>
            <option value="pending">pending (Hold)</option>
            <option value="failed">failed (Aborted)</option>
            <option value="refunded">refunded (Credited)</option>
          </select>
        </div>

        {/* Gateway filter */}
        <div>
          <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-widest mb-1.5">
            Billing Gateway
          </label>
          <select
            value={gateway}
            onChange={(e) => {
              setGateway(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
          >
            <option value="">All Gateways</option>
            <option value="bKash">bKash</option>
            <option value="Stripe">Stripe</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={() => {
            setPage(1);
            fetchPayments();
          }}
          className="px-4 py-2 border border-dark-700/40 hover:border-dark-600 rounded-xl bg-dark-800/40 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
        >
          <Activity size={13} />
          Reload Transactions
        </button>
      </div>

      {/* Database Billing Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className="glass-panel rounded-2xl border border-dark-800/40 lg:col-span-2 overflow-hidden flex flex-col justify-between min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800/40 text-[10px] font-extrabold text-dark-400 uppercase tracking-wider bg-dark-900/20">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-dark-500 font-semibold">
                      No matching billing logs found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className={`border-b border-dark-800/30 text-xs font-semibold text-dark-200 cursor-pointer hover:bg-dark-800/35 transition-colors ${selectedPayment?.id === p.id ? 'bg-brand-500/5' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-400">#INV-{p.id}</td>
                      <td className="py-3.5 px-4 text-white max-w-[160px] truncate">{p.user_email}</td>
                      <td className="py-3.5 px-4 text-dark-400">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-bold text-dark-300">{p.gateway}</td>
                      <td className="py-3.5 px-4 font-extrabold text-white">
                        {p.currency === 'USD' ? '$' : '৳'}{p.amount}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'paid' && (
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">paid</span>
                        )}
                        {p.status === 'pending' && (
                          <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">pending</span>
                        )}
                        {p.status === 'failed' && (
                          <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">failed</span>
                        )}
                        {p.status === 'refunded' && (
                          <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">refunded</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple pagination */}
          <div className="p-4 border-t border-dark-800/40 flex items-center justify-between text-xs bg-dark-900/10">
            <span className="text-dark-400">Ledger page navigator</span>
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
                disabled={payments.length < limit}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700/40 text-dark-400 hover:text-white disabled:opacity-50 flex items-center gap-1 font-bold"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Offline verification drawer */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 flex flex-col min-h-[400px]">
          {!selectedPayment ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-dark-500 space-y-2 py-10">
              <CreditCard size={28} className="text-dark-600 animate-pulse" />
              <h4 className="font-bold text-xs text-dark-400">No invoice selected</h4>
              <p className="text-[10px] text-dark-500 max-w-[200px]">Select any transaction log in the directory to verify offline balance upgrades.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-dark-800/40 pb-3">
                  <div>
                    <h3 className="font-black text-sm text-white font-mono">Invoice #INV-{selectedPayment.id}</h3>
                    <span className="text-[9px] text-dark-500 font-semibold mt-0.5 block">Recorded: {new Date(selectedPayment.created_at).toLocaleString()}</span>
                  </div>
                  <button onClick={() => setSelectedPayment(null)} className="text-dark-400 hover:text-white">
                    <X size={15} />
                  </button>
                </div>

                {/* Transfer Info */}
                <div className="space-y-3 bg-dark-900/40 p-4 border border-dark-800/40 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-400 font-bold">Billing Account:</span>
                    <span className="text-white font-extrabold truncate max-w-[150px]">{selectedPayment.user_email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-400 font-bold">Requested tier:</span>
                    <span className="text-brand-400 font-black uppercase tracking-wider">{selectedPayment.plan_tier}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-400 font-bold">Billing Gateway:</span>
                    <span className="text-white font-bold">{selectedPayment.gateway}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-dark-800/50 pt-2">
                    <span className="text-dark-400 font-extrabold">Gross Amount:</span>
                    <span className="text-white font-black text-sm">
                      {selectedPayment.currency === 'USD' ? '$' : '৳'}{selectedPayment.amount}
                    </span>
                  </div>
                </div>

                {/* Transaction notes */}
                {selectedPayment.notes && (
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Verification receipts & notes</span>
                    <p className="text-[10px] text-dark-200 bg-dark-900/60 p-3 border border-dark-750/30 rounded-xl leading-relaxed font-semibold">
                      {selectedPayment.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action desk buttons */}
              <div className="space-y-2.5">
                {selectedPayment.status === 'pending' && (
                  <div className="space-y-2">
                    {/* Mark Paid */}
                    <button
                      onClick={() => handleMarkPaid(selectedPayment.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-xs font-bold transition-all shadow-lg"
                    >
                      <CheckCircle size={14} />
                      Mark Transaction Paid
                    </button>

                    <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-[9px] text-brand-400 font-semibold leading-relaxed">
                      💡 Approving credits quota automatically:
                      <br />• Pro: 10,000 sends limit
                      <br />• Business: 50,000 sends limit
                      <br />• Enterprise: 100,000 sends limit
                    </div>
                  </div>
                )}

                {selectedPayment.status === 'paid' && (
                  <button
                    onClick={() => handleMarkRefunded(selectedPayment.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold transition-all"
                  >
                    <XCircle size={14} />
                    Record manual Refund
                  </button>
                )}

                {selectedPayment.status === 'refunded' && (
                  <div className="text-center py-2 text-[10px] text-indigo-400 font-bold bg-indigo-500/5 border border-indigo-500/10 rounded-xl uppercase">
                    Refunded Ledger Closed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECORD OFFLINE TRANSFER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-dark-800/50 relative animate-scaleUp">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />
            <div className="p-6 border-b border-dark-800/40 flex items-center justify-between bg-dark-900/30">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <PlusCircle size={16} className="text-brand-400" />
                Record Offline Transaction Log
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-dark-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Customer Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                    Amount Value
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                    Currency Unit
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                    Plan Tier
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="pro">Pro Plan</option>
                    <option value="business">Business Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                    Gateway Method
                  </label>
                  <select
                    value={newGateway}
                    onChange={(e) => setNewGateway(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Transaction Notes & Details
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="bKash TRX ID: 8XJ092K12D or Bank Receipt details..."
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-dark-700/40 rounded-xl text-xs font-bold text-dark-400 hover:text-white"
                >
                  Cancel Record
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 brand-gradient-bg rounded-xl text-xs font-bold text-white shadow-lg"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
