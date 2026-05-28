import React, { useEffect, useState } from 'react'
import {
  CreditCard,
  Plus,
  DollarSign,
  CheckCircle,
  XCircle,
  PlusCircle,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Check,
  CheckCircle2,
  Globe,
  Settings,
  HelpCircle
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
  const [activeTab, setActiveTab] = useState<'billing' | 'subscription'>('billing');

  // Billing Tab States
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAmount, setNewAmount] = useState(1200);
  const [newCurrency, setNewCurrency] = useState('BDT');
  const [newTier, setNewTier] = useState('pro');
  const [newGateway, setNewGateway] = useState('bKash');
  const [newNotes, setNewNotes] = useState('');

  const [usdMonth, setUsdMonth] = useState(0);
  const [bdtMonth, setBdtMonth] = useState(0);

  // Subscription Tab States
  const [plans, setPlans] = useState([
    {
      tier: 'free',
      name: 'Starter',
      price: 499,
      quota: 5000,
      smtpLimit: 1,
      validity: '30 Days',
      throttle: '60s update interval',
      features: [
        'Contacts: 1,000',
        'Sends/mo: 5,000',
        'SMTP nodes: 1',
        'Team seats: 1',
        'Campaign create + send',
        'CSV import',
        '5 starter templates',
        'Basic analytics',
        'Unsubscribe handling'
      ]
    },
    {
      tier: 'pro',
      name: 'Standard',
      price: 1199,
      quota: 50000,
      smtpLimit: 3,
      validity: '30 Days',
      throttle: '45s update interval',
      features: [
        'Contacts: 10,000',
        'Sends/mo: 50,000',
        'SMTP nodes: 3',
        'Team seats: 3',
        'All Starter features',
        'Scheduled sending',
        '20+ templates',
        'Advanced analytics',
        'Mobile preview',
        'Duplicate campaign'
      ]
    },
    {
      tier: 'business',
      name: 'Premium',
      price: 2499,
      quota: 200000,
      smtpLimit: 5,
      validity: '30 Days',
      throttle: '30s update interval',
      features: [
        'Contacts: 50,000',
        'Sends/mo: 200,000',
        'SMTP nodes: 5',
        'Team seats: 10',
        'All Standard features',
        'A/B subject testing',
        'Custom unsubscribe page',
        'Campaign export (PDF)'
      ]
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price: 5999,
      quota: 999999999,
      smtpLimit: 999999,
      validity: '30 Days',
      throttle: '15s update interval',
      features: [
        'Contacts: Unlimited',
        'Sends/mo: Unlimited',
        'SMTP nodes: Unlimited',
        'Team seats: Unlimited',
        'All Premium features',
        'Full API access',
        'Multi-client manage',
        'Custom invoice'
      ]
    }
  ]);

  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editQuota, setEditQuota] = useState(0);
  const [editSmtpLimit, setEditSmtpLimit] = useState(0);
  const [editContacts, setEditContacts] = useState('');
  const [editTeamSeats, setEditTeamSeats] = useState('');
  const [editFeaturesText, setEditFeaturesText] = useState('');

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
    if (activeTab === 'billing') {
      fetchPayments();
    }
  }, [page, status, gateway, activeTab]);

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

  const handleEditPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const customFeaturesArray = editFeaturesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const updatedFeatures = [
      `Contacts: ${editContacts}`,
      `Sends/mo: ${editQuota === 999999999 ? 'Unlimited' : editQuota.toLocaleString()}`,
      `SMTP nodes: ${editSmtpLimit === 999999 ? 'Unlimited' : editSmtpLimit}`,
      `Team seats: ${editTeamSeats}`,
      ...customFeaturesArray
    ];

    const updated = plans.map(p => {
      if (p.tier === selectedPlan.tier) {
        return {
          ...p,
          name: editName,
          price: editPrice,
          quota: editQuota,
          smtpLimit: editSmtpLimit,
          features: updatedFeatures
        };
      }
      return p;
    });

    setPlans(updated);
    alert(`Plan '${editName}' parameters successfully updated in system catalogs.`);
    setSelectedPlan(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* Top Header Tab Selector Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${
              activeTab === 'billing'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Billing
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${
              activeTab === 'subscription'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Subscription
          </button>
        </div>

        {activeTab === 'billing' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 brand-gradient-bg rounded-xl text-xs font-bold text-white hover:opacity-95 shadow-md shadow-brand-500/10 transition-all self-end md:self-auto"
          >
            <Plus size={14} />
            Record Offline Transfer
          </button>
        )}
      </div>

      {/* ==================== TAB 1: BILLING LEDGER ==================== */}
      {activeTab === 'billing' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Revenue Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">USD monthly Revenue</span>
                <p className="text-xl font-black text-slate-900">${usdMonth}</p>
              </div>
              <div className="absolute top-0 right-0 p-2 text-[8px] font-extrabold text-emerald-600 bg-emerald-50 border-l border-b border-emerald-100 rounded-bl-lg uppercase tracking-wider">
                Stripe gateway
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                <CreditCard size={20} className="text-brand-500" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Additional monthly Revenue</span>
                <p className="text-xl font-black text-slate-900">${bdtMonth}</p>
              </div>
              <div className="absolute top-0 right-0 p-2 text-[8px] font-extrabold text-brand-600 bg-brand-50 border-l border-b border-brand-100 rounded-bl-lg uppercase tracking-wider">
                bKash & Bank
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Transaction Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="paid">paid (Verified)</option>
                <option value="pending">pending (Hold)</option>
                <option value="failed">failed (Aborted)</option>
                <option value="refunded">refunded (Credited)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Billing Gateway
              </label>
              <select
                value={gateway}
                onChange={(e) => {
                  setGateway(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">All Gateways</option>
                <option value="bKash">bKash</option>
                <option value="Stripe">Stripe</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <button
              onClick={() => {
                setPage(1);
                fetchPayments();
              }}
              className="px-4 py-2 border border-slate-200/80 hover:border-slate-350 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <Activity size={13} className="text-slate-500" />
              Reload Transactions
            </button>
          </div>

          {/* Table List Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] lg:col-span-2 overflow-hidden flex flex-col justify-between min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
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
                        <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-bold">
                          No matching billing logs found.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPayment(p)}
                          className={`border-b border-slate-100 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50/50 transition-colors ${selectedPayment?.id === p.id ? 'bg-brand-50/30 font-bold border-l-2 border-l-brand-500' : ''}`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-600">#INV-{p.id}</td>
                          <td className="py-3.5 px-4 text-slate-900 max-w-[160px] truncate">{p.user_email}</td>
                          <td className="py-3.5 px-4 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{p.gateway}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                             ${p.amount}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {p.status === 'paid' && (
                              <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">paid</span>
                            )}
                            {p.status === 'pending' && (
                              <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded animate-pulse">pending</span>
                            )}
                            {p.status === 'failed' && (
                              <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">failed</span>
                            )}
                            {p.status === 'refunded' && (
                              <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">refunded</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Simple pagination */}
              <div className="p-4 border-t border-slate-200/50 flex items-center justify-between text-xs bg-slate-50/50">
                <span className="text-slate-500 font-semibold">Ledger page navigator</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 font-bold shadow-sm"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span className="text-slate-900 font-extrabold px-2">Page {page}</span>
                  <button
                    disabled={payments.length < limit}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 font-bold shadow-sm"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Offline verifications drawer */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col min-h-[400px]">
              {!selectedPayment ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-10">
                  <CreditCard size={28} className="text-slate-300 animate-pulse" />
                  <h4 className="font-bold text-xs text-slate-500">No invoice selected</h4>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">Select any transaction log in the directory to verify offline balance upgrades.</p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-black text-sm text-slate-900 font-mono">Invoice #INV-{selectedPayment.id}</h3>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Recorded: {new Date(selectedPayment.created_at).toLocaleString()}</span>
                      </div>
                      <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-650">
                        <X size={15} />
                      </button>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Billing Account:</span>
                        <span className="text-slate-800 font-extrabold truncate max-w-[150px]">{selectedPayment.user_email}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Requested tier:</span>
                        <span className="text-brand-600 font-black uppercase tracking-wider">{selectedPayment.plan_tier}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Billing Gateway:</span>
                        <span className="text-slate-800 font-bold">{selectedPayment.gateway}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
                        <span className="text-slate-500 font-extrabold">Gross Amount:</span>
                        <span className="text-slate-900 font-black text-sm">
                          ${selectedPayment.amount}
                        </span>
                      </div>
                    </div>

                    {selectedPayment.notes && (
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verification receipts & notes</span>
                        <p className="text-[10px] text-slate-700 bg-slate-50 p-3 border border-slate-200/80 rounded-xl leading-relaxed font-semibold">
                          {selectedPayment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {selectedPayment.status === 'pending' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleMarkPaid(selectedPayment.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/10"
                        >
                          <CheckCircle size={14} />
                          Mark Transaction Paid
                        </button>

                        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-[9px] text-brand-600 font-semibold leading-relaxed">
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
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold transition-all"
                      >
                        <XCircle size={14} />
                        Record manual Refund
                      </button>
                    )}

                    {selectedPayment.status === 'refunded' && (
                      <div className="text-center py-2 text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded-xl uppercase">
                        Refunded Ledger Closed
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: SUBSCRIPTIONS CONTROL (EXPRESSCRON HIGH-FIDELITY LAYOUT) ==================== */}
      {activeTab === 'subscription' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Currently Active Tier Title Bar */}
          <div className="bg-brand-600 text-white rounded-3xl p-3 px-6 shadow-md border border-brand-700/30 flex items-center justify-center font-black tracking-widest text-[10px] uppercase shadow-lg shadow-brand-500/10">
            Currently Active Subscription plans Catalog
          </div>

          {/* Side-by-Side 4 Pricing Cards Grid (Exact matching of image style!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.tier}
                className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.035)] transition-all duration-300 relative overflow-hidden group hover:border-slate-350 min-h-[460px]"
              >
                <div className="space-y-5">
                  {/* Active Package Banner */}
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Active Package
                    </span>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                      {p.name}
                      {p.price > 0 && <span className="text-sm">🏆</span>}
                    </h3>
                  </div>

                  {/* Pricing Rate Tag */}
                  <div className="pb-4 border-b border-slate-100 flex items-baseline">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">${p.price}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2 block">
                      PER MONTH
                    </span>
                  </div>

                  {/* Everything you need for this tier list */}
                  <div className="space-y-3.5 pt-2">
                    <span className="block text-[9px] font-black text-slate-900 uppercase tracking-widest">
                      Everything you need for this tier:
                    </span>
                    <ul className="space-y-2.5">
                      {p.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-[11px] font-bold text-slate-600">
                          <span className="h-4 w-4 bg-emerald-50 border border-emerald-250 rounded-full flex items-center justify-center text-emerald-600 text-[10px] mt-0.5 flex-shrink-0 font-extrabold">
                            ✓
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Edit Parameters Trigger */}
                <button
                  onClick={() => {
                    setSelectedPlan(p);
                    setEditName(p.name);
                    setEditPrice(p.price);
                    setEditQuota(p.quota);
                    setEditSmtpLimit(p.smtpLimit);
                    
                    const contactsLine = p.features.find(f => f.startsWith('Contacts:')) || 'Contacts: 1,000';
                    setEditContacts(contactsLine.replace('Contacts:', '').trim());

                    const teamSeatsLine = p.features.find(f => f.startsWith('Team seats:')) || 'Team seats: 1';
                    setEditTeamSeats(teamSeatsLine.replace('Team seats:', '').trim());

                    const customFeatures = p.features.filter(f => 
                      !f.startsWith('Contacts:') && 
                      !f.startsWith('Sends/mo:') && 
                      !f.startsWith('SMTP nodes:') && 
                      !f.startsWith('Team seats:')
                    );
                    setEditFeaturesText(customFeatures.join('\n'));
                  }}
                  className="w-full mt-6 py-2 px-3 bg-slate-50 border border-slate-200 text-slate-700 hover:text-white hover:bg-brand-500 hover:border-brand-500 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group-hover:bg-slate-100"
                >
                  <Sliders size={12} />
                  Adjust Parameters
                </button>
              </div>
            ))}
          </div>

          {/* Catalog Footnote Info */}
          <div className="p-4 bg-brand-50 border border-brand-100 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block text-xs font-extrabold text-brand-800">Dynamic SaaS Plan parameters synchronization:</span>
              <p className="text-[10px] text-brand-600 leading-relaxed font-semibold">
                Adjusting these pricing matrices modifies the global parameters saved in platform database catalogs. Standard users registering or upgrading will dynamically checkout under these modified rates. Active subscribed customers retain their respective billing quotas boundaries until their monthly billing cycle renovates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RECORD OFFLINE TRANSFER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <PlusCircle size={16} className="text-brand-500" />
                Record Offline Transaction Log
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Customer Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Amount Value
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Currency Unit
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="BDT">BDT ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Plan Tier
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="pro">Pro Plan</option>
                    <option value="business">Business Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Gateway Method
                  </label>
                  <select
                    value={newGateway}
                    onChange={(e) => setNewGateway(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Transaction Notes & Details
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="bKash TRX ID: 8XJ092K12D or Bank Receipt details..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel Record
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 brand-gradient-bg text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST PLAN PARAMETERS MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                Adjust '{selectedPlan.name}' Catalog Parameters
              </h3>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-slate-650">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditPlanSubmit} className="p-6 space-y-3.5 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Monthly Price ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Allowed Sends Limit
                  </label>
                  <input
                    type="number"
                    required
                    value={editQuota}
                    onChange={(e) => setEditQuota(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    SMTP Servers Cap
                  </label>
                  <input
                    type="number"
                    required
                    value={editSmtpLimit}
                    onChange={(e) => setEditSmtpLimit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Contacts Cap
                  </label>
                  <input
                    type="text"
                    required
                    value={editContacts}
                    onChange={(e) => setEditContacts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Team Seats Cap
                  </label>
                  <input
                    type="text"
                    required
                    value={editTeamSeats}
                    onChange={(e) => setEditTeamSeats(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Custom Marketing Features (one per line)
                </label>
                <textarea
                  rows={4}
                  required
                  value={editFeaturesText}
                  onChange={(e) => setEditFeaturesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm resize-none"
                  placeholder="A/B subject testing&#10;Custom unsubscribe page"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 brand-gradient-bg text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10"
                >
                  Commit Catalog Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
