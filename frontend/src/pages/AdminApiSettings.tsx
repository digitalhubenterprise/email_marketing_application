import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Key,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  History,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Search,
  Download,
  Filter,
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react'

interface DhruLog {
  id: number;
  action: string;
  username: string | null;
  ip_address: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

interface SubscriptionPlan {
  id: number;
  tier: string;
  name: string;
  price: number;
  public_price: number;
  discount: number;
  quota: number;
  smtp_limit: number;
  validity: string;
  throttle: string;
  features: string[];
  created_at?: string;
}

interface ApiOrder {
  id: number;
  user_email: string;
  amount: number;
  currency: string;
  plan_tier: string;
  gateway: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function AdminApiSettings() {
  const [username, setUsername] = useState('dhru_user');
  const [accessKey, setAccessKey] = useState('dhru_key_123456');
  const [enabled, setEnabled] = useState(true);
  const [connectedIp, setConnectedIp] = useState('');

  const generateStrongKey = useCallback(() => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;
    
    let key = '';
    key += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    key += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    key += numbers.charAt(Math.floor(Math.random() * numbers.length));
    key += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 4; i < 25; i++) {
      key += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    const shuffledKey = key.split('').sort(() => 0.5 - Math.random()).join('');
    setAccessKey(shuffledKey);
  }, []);
  
  const [logs, setLogs] = useState<DhruLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'guide' | 'services' | 'orders' | 'logs'>('credentials');
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [updatingPlanTier, setUpdatingPlanTier] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<{[key: string]: string}>({});
  const [planPublicPrices, setPlanPublicPrices] = useState<{[key: string]: string}>({});
  const [planDiscounts, setPlanDiscounts] = useState<{[key: string]: string}>({});

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Search & Filter states
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Pagination states (15 items per page)
  const itemsPerPage = 15;
  const [ordersPage, setOrdersPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Modal inspection states
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [selectedLog, setSelectedLog] = useState<DhruLog | null>(null);
  
  const apiEndpointUrl = `${window.location.origin}/api/dhru`;

  const getToken = useCallback(() => localStorage.getItem('admin_token') || localStorage.getItem('token'), []);

  const fetchConfig = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/admin/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.api_listener_username || 'dhru_user');
        setAccessKey(data.api_listener_access_key || 'dhru_key_123456');
        setEnabled(data.api_listener_enabled !== false);
        setConnectedIp(data.api_listener_connected_ip || '');
      }
    } catch (err) {
      console.error('Failed to fetch API configurations:', err);
    }
  }, [getToken]);

  const fetchLogs = useCallback(async () => {
    const token = getToken();
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-logs', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch API integration logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [getToken]);

  const fetchPlans = useCallback(async () => {
    const token = getToken();
    setPlansLoading(true);
    try {
      let res = await fetch('/api/admin/plans', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        res = await fetch('/api/plans', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
      }
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
        const initialPrices: {[key: string]: string} = {};
        const initialPublicPrices: {[key: string]: string} = {};
        const initialDiscounts: {[key: string]: string} = {};
        if (Array.isArray(data)) {
          data.forEach((p: SubscriptionPlan) => {
            initialPrices[p.tier] = (p.price / 100).toFixed(2);
            initialPublicPrices[p.tier] = (p.public_price / 100).toFixed(2);
            initialDiscounts[p.tier] = (p.discount / 100).toFixed(2);
          });
        }
        setPlanPrices(prev => ({ ...initialPrices, ...prev }));
        setPlanPublicPrices(prev => ({ ...initialPublicPrices, ...prev }));
        setPlanDiscounts(prev => ({ ...initialDiscounts, ...prev }));
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    } finally {
      setPlansLoading(false);
    }
  }, [getToken]);

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-orders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      let data = res.ok ? await res.json() : [];
      if (!Array.isArray(data) || data.length === 0) {
        const fallbackRes = await fetch('/api/admin/payments?limit=1000', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch API orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [getToken]);

  const handleCreateSampleOrder = async () => {
    const token = getToken();
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-orders/sample', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error('Failed to create sample order:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCreateSampleLog = async () => {
    const token = getToken();
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-logs/sample', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        await fetchLogs();
      }
    } catch (err) {
      console.error('Failed to create sample log:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleUpdatePlanPrices = async (
    tier: string,
    priceInCents: number,
    publicPriceInCents: number,
    discountInCents: number
  ) => {
    const token = getToken();
    setUpdatingPlanTier(tier);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/plans/${tier}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          price: priceInCents,
          public_price: publicPriceInCents,
          discount: discountInCents
        })
      });
      if (res.ok) {
        setSaveSuccess(`Prices for ${tier} plan updated successfully.`);
        fetchPlans();
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || 'Failed to update plan prices.');
      }
    } catch (err) {
      setSaveError('Network communication error.');
      console.error(err);
    } finally {
      setUpdatingPlanTier(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          api_listener_username: username,
          api_listener_access_key: accessKey,
          api_listener_enabled: enabled,
          api_listener_connected_ip: connectedIp
        })
      });

      if (res.ok) {
        setSaveSuccess('API Listener configurations updated successfully.');
      } else {
        const data = await res.json();
        setSaveError(data.detail || 'Failed to update settings.');
      }
    } catch (err) {
      setSaveError('Network communication error.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetIp = async () => {
    const token = getToken();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/settings/dhru-reset-ip', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setConnectedIp('');
        setSaveSuccess('Allowed Client IP reset! The next authentic client request (e.g., accountinfo) will auto-bind the caller\'s IP.');
      } else {
        setSaveError('Failed to reset connected IP.');
      }
    } catch (err) {
      console.error('Failed to reset IP:', err);
      setSaveError('Network error resetting IP.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiEndpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-load on mount
  useEffect(() => {
    fetchConfig();
    fetchPlans();
    fetchOrders();
    fetchLogs();
  }, [fetchConfig, fetchPlans, fetchOrders, fetchLogs]);

  // Subtab switch effect with auto-refresh timer for logs
  useEffect(() => {
    let interval: any = null;
    if (activeSubTab === 'services') {
      fetchPlans();
    } else if (activeSubTab === 'orders') {
      fetchOrders();
    } else if (activeSubTab === 'logs') {
      fetchLogs();
      interval = setInterval(() => {
        fetchLogs();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSubTab, fetchPlans, fetchOrders, fetchLogs]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        !orderSearchTerm ||
        order.id.toString().includes(orderSearchTerm) ||
        (order.user_email && order.user_email.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
        (order.plan_tier && order.plan_tier.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
        (order.notes && order.notes.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
        (order.gateway && order.gateway.toLowerCase().includes(orderSearchTerm.toLowerCase()));

      const matchesStatus = 
        orderStatusFilter === 'all' || 
        order.status.toLowerCase() === orderStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearchTerm, orderStatusFilter]);

  // Memoized Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        !logSearchTerm ||
        log.id.toString().includes(logSearchTerm) ||
        (log.action && log.action.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        (log.username && log.username.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        (log.message && log.message.toLowerCase().includes(logSearchTerm.toLowerCase()));

      const matchesStatus = 
        logStatusFilter === 'all' || 
        log.status.toLowerCase() === logStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [logs, logSearchTerm, logStatusFilter]);

  // KPI Metrics Calculation
  const orderMetrics = useMemo(() => {
    const totalAmount = orders.reduce((sum, o) => {
      const val = typeof o.amount === 'number' && o.amount > 500 ? o.amount / 100 : Number(o.amount || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const paidCount = orders.filter(o => o.status === 'paid').length;
    const apiOrdersCount = orders.filter(o => o.gateway.toLowerCase().includes('dhru') || o.gateway.toLowerCase().includes('api')).length;
    return {
      totalCount: orders.length,
      totalRevenue: totalAmount.toFixed(2),
      paidCount,
      apiOrdersCount
    };
  }, [orders]);

  const logMetrics = useMemo(() => {
    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
    return {
      totalLogs: logs.length,
      successCount,
      failedCount,
      successRate
    };
  }, [logs]);

  // Export to CSV handlers
  const exportOrdersToCSV = useCallback(() => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Timestamp', 'User Email', 'Plan Tier', 'Amount (USD)', 'Currency', 'Gateway', 'Status', 'Notes'];
    const rows = filteredOrders.map(o => [
      o.id,
      `"${new Date(o.created_at).toLocaleString()}"`,
      `"${o.user_email}"`,
      `"${o.plan_tier}"`,
      typeof o.amount === 'number' && o.amount > 500 ? (o.amount / 100).toFixed(2) : Number(o.amount || 0).toFixed(2),
      `"${o.currency || 'USD'}"`,
      `"${o.gateway}"`,
      `"${o.status}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reseller_api_orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredOrders, orders.length]);

  const exportLogsToCSV = useCallback(() => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Action', 'API User', 'Client IP', 'Status', 'Message'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.action}"`,
      `"${l.username || ''}"`,
      `"${l.ip_address || ''}"`,
      `"${l.status}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dhru_api_diagnostic_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredLogs, logs.length]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {(saveSuccess || saveError) && (
        <div className="space-y-2 animate-fadeIn">
          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-500" />
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <AlertCircle size={16} className="text-rose-500" />
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap border-b border-slate-200/80 gap-2">
        <button
          onClick={() => setActiveSubTab('credentials')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'credentials'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Key size={14} />
          API Credentials
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'guide'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen size={14} />
          Setup Manual
        </button>
        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'services'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers size={14} />
          Services
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200">
            {plans.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'orders'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History size={14} />
          Order History
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-50 text-brand-600 border border-brand-100">
            {orders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'logs'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Terminal size={14} />
          Diagnostic Logs
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
            {logs.length}
          </span>
        </button>
      </div>

      {/* API Credentials Tab */}
      {activeSubTab === 'credentials' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                🔒 Listener Configuration
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Set credentials and network firewall rules for processing reseller API orders.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Listener Active</span>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="text-brand-500 hover:text-brand-600 transition-colors"
              >
                {enabled ? <ToggleRight size={32} className="text-brand-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">API Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">API Access Key</label>
                <button
                  type="button"
                  onClick={generateStrongKey}
                  className="text-[10px] text-brand-600 hover:text-brand-700 font-bold hover:underline"
                >
                  Generate Strong Key
                </button>
              </div>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Allowed Client IPs (Auto-Bound Firewall Restriction)
              </label>
              {connectedIp ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Bound IP: {connectedIp}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Unbound (Auto-binds Next Request)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={connectedIp}
                onChange={(e) => setConnectedIp(e.target.value)}
                placeholder="Unbound (Will automatically bind caller's IP e.g. 103.160.106.218 on next API request)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleResetIp}
                disabled={saving}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={saving ? 'animate-spin' : ''} />
                Reset Bound IP
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              💡 When bound, only requests matching this IP will be accepted. Click <strong>Reset Bound IP</strong> to clear it and allow the next authentic request (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-bold">accountinfo</code>) to auto-bind its IP!
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Live Webhook / Endpoint URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={apiEndpointUrl}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving Configurations...' : 'Save API Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Setup Manual Tab */}
      {activeSubTab === 'guide' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-6 text-xs text-slate-600">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              📖 Integration Guide & Dhru Fusion Parameters
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Follow these instructions to connect SmartCampaign with Dhru Fusion or custom reseller billing platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Globe size={14} className="text-brand-500" /> Endpoint URL
              </h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                In your reseller panel settings, configure the API Server URL to:
              </p>
              <code className="block p-2 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10.5px] break-all">
                {apiEndpointUrl}
              </code>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Key size={14} className="text-brand-500" /> Authentication Fields
              </h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Provide your API credentials in form-encoded POST or JSON payloads:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[10.5px] text-slate-700">
                <li><strong className="text-slate-900">username:</strong> {username}</li>
                <li><strong className="text-slate-900">apiaccesskey:</strong> {accessKey}</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Supported API Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-900 block font-mono text-brand-600">accountinfo</strong>
                <span className="text-slate-500">Verifies credentials and returns account balance status.</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-900 block font-mono text-brand-600">servicelist</strong>
                <span className="text-slate-500">Returns list of active subscription plans & prices.</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-900 block font-mono text-brand-600">placeimeiorder / orderservice</strong>
                <span className="text-slate-500">Processes subscription plan order & activates quota.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeSubTab === 'services' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                📦 Reseller Subscription Services & Pricing
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Configure wholesale credit pricing and retail public prices for reseller client catalogs.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPlans}
              disabled={plansLoading}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={plansLoading ? 'animate-spin text-brand-500' : ''} />
              Refresh Services
            </button>
          </div>

          {plansLoading && plans.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-500" />
              <span className="text-xs font-semibold text-slate-400">Loading reseller services...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                        Service ID #{plan.id}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">{plan.name}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      {plan.quota.toLocaleString()} Email/mo
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reseller Credit Price (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={planPrices[plan.tier] !== undefined ? planPrices[plan.tier] : (plan.price / 100).toFixed(2)}
                          onChange={(e) => setPlanPrices(prev => ({ ...prev, [plan.tier]: e.target.value }))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Public Retail Price (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={planPublicPrices[plan.tier] !== undefined ? planPublicPrices[plan.tier] : ((plan.public_price || 0) / 100).toFixed(2)}
                          onChange={(e) => setPlanPublicPrices(prev => ({ ...prev, [plan.tier]: e.target.value }))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const priceVal = planPrices[plan.tier] !== undefined ? planPrices[plan.tier] : (plan.price / 100).toFixed(2);
                          const publicVal = planPublicPrices[plan.tier] !== undefined ? planPublicPrices[plan.tier] : ((plan.public_price || 0) / 100).toFixed(2);
                          const discountVal = planDiscounts[plan.tier] !== undefined ? planDiscounts[plan.tier] : ((plan.discount || 0) / 100).toFixed(2);
                          
                          const priceCents = Math.round(parseFloat(priceVal) * 100);
                          const publicCents = Math.round(parseFloat(publicVal) * 100);
                          const discountCents = Math.round(parseFloat(discountVal) * 100);
                          
                          if (!isNaN(priceCents) && !isNaN(publicCents) && !isNaN(discountCents)) {
                            handleUpdatePlanPrices(plan.tier, priceCents, publicCents, discountCents);
                          }
                        }}
                        disabled={updatingPlanTier === plan.tier}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                      >
                        {updatingPlanTier === plan.tier ? 'Saving...' : 'Update Service Price'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order History Tab */}
      {activeSubTab === 'orders' && (() => {
        const totalOrdersPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
        const paginatedOrders = filteredOrders.slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage);
        return (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-5">
            {/* KPI Metrics Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ledger Revenue</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">${orderMetrics.totalRevenue} USD</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Orders</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{orderMetrics.paidCount} / {orderMetrics.totalCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <History size={20} />
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Reseller Orders</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{orderMetrics.apiOrdersCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity size={20} />
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Filters & Export */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearchTerm}
                    onChange={(e) => {
                      setOrderSearchTerm(e.target.value);
                      setOrdersPage(1);
                    }}
                    placeholder="Search by Email, Order ID, Plan Tier or Gateway..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {orderSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearchTerm('');
                        setOrdersPage(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <Filter size={12} className="text-slate-400 ml-1.5" />
                  {(['all', 'paid', 'pending'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setOrderStatusFilter(st);
                        setOrdersPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        orderStatusFilter === st
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportOrdersToCSV}
                  disabled={orders.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                >
                  <Download size={12} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleCreateSampleOrder}
                  disabled={ordersLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
                >
                  + Generate Test Order
                </button>
                <button
                  type="button"
                  onClick={fetchOrders}
                  disabled={ordersLoading}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={ordersLoading ? 'animate-spin text-brand-500' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Orders Data Table */}
            <div className="overflow-x-auto">
              {ordersLoading && orders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-brand-500" />
                  <span className="text-xs font-semibold text-slate-400">Fetching API orders...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center shadow-sm">
                    <History size={20} />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <h4 className="text-xs font-black text-slate-800">No Reseller API Orders Found</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {orderSearchTerm || orderStatusFilter !== 'all' 
                        ? 'No orders match your search criteria or status filter.'
                        : 'When external clients place orders via Dhru Fusion or HTTP API endpoints, orders will appear here automatically.'}
                    </p>
                  </div>
                  {!(orderSearchTerm || orderStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={handleCreateSampleOrder}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm"
                    >
                      Create Sample Test Order
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Customer Email</th>
                      <th className="p-3">Plan Tier</th>
                      <th className="p-3 text-right">Amount (USD)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Details / Notes</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 font-medium">
                    {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          #{order.id}
                        </td>
                        <td className="p-3 text-[10.5px] whitespace-nowrap text-slate-400">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-800 font-bold">
                          {order.user_email}
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            {order.plan_tier}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          ${typeof order.amount === 'number' && order.amount > 500 ? (order.amount / 100).toFixed(2) : Number(order.amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            order.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate" title={order.notes || ''}>
                          {order.notes || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <div>
                  Showing <span className="font-bold text-slate-900">{(ordersPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(ordersPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-slate-900">{filteredOrders.length}</span> entries
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrdersPage(prev => Math.max(prev - 1, 1))}
                    disabled={ordersPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all text-[11px]"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="px-3 py-1 bg-slate-100 rounded-xl font-mono text-[11px] font-bold text-slate-700">
                    Page {ordersPage} of {totalOrdersPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrdersPage(prev => Math.min(prev + 1, totalOrdersPages))}
                    disabled={ordersPage >= totalOrdersPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all text-[11px]"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Diagnostics Logs Tab */}
      {activeSubTab === 'logs' && (() => {
        const totalLogsPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
        const paginatedLogs = filteredLogs.slice((logsPage - 1) * itemsPerPage, logsPage * itemsPerPage);
        return (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-5">
            {/* KPI Metrics Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Diagnostic Events</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{logMetrics.totalLogs}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Terminal size={20} />
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Callback Rate</span>
                  <div className="text-lg font-black text-emerald-600 mt-0.5">{logMetrics.successRate}%</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Alerts / Failed</span>
                  <div className="text-lg font-black text-rose-600 mt-0.5">{logMetrics.failedCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Filters & Export */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={logSearchTerm}
                    onChange={(e) => {
                      setLogSearchTerm(e.target.value);
                      setLogsPage(1);
                    }}
                    placeholder="Search by Action, IP, Username, or Message..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {logSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogSearchTerm('');
                        setLogsPage(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <Filter size={12} className="text-slate-400 ml-1.5" />
                  {(['all', 'success', 'failed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setLogStatusFilter(st);
                        setLogsPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        logStatusFilter === st
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportLogsToCSV}
                  disabled={logs.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                >
                  <Download size={12} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleCreateSampleLog}
                  disabled={logsLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
                >
                  + Generate Test Event
                </button>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={logsLoading ? 'animate-spin text-brand-500' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Diagnostic Data Table */}
            <div className="overflow-x-auto">
              {logsLoading && logs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-brand-500" />
                  <span className="text-xs font-semibold text-slate-400">Fetching diagnostic events...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-sm">
                    <Terminal size={20} />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <h4 className="text-xs font-black text-slate-800">No Integration Logs Found</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {logSearchTerm || logStatusFilter !== 'all'
                        ? 'No logs match your search term or status filter.'
                        : 'API listener request logs and diagnostic event callbacks will be recorded here automatically when client requests are processed.'}
                    </p>
                  </div>
                  {!(logSearchTerm || logStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={handleCreateSampleLog}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm"
                    >
                      Generate Diagnostic Test Event
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">API User</th>
                      <th className="p-3">Client IP</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Details / Message</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 font-medium">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-[10.5px] whitespace-nowrap text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-brand-600">
                          {log.action}
                        </td>
                        <td className="p-3 text-slate-500 font-mono">
                          {log.username || '-'}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">
                          {log.ip_address || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            log.status === 'success' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate" title={log.message || ''}>
                          {log.message || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <div>
                  Showing <span className="font-bold text-slate-900">{(logsPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(logsPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-bold text-slate-900">{filteredLogs.length}</span> entries
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                    disabled={logsPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all text-[11px]"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="px-3 py-1 bg-slate-100 rounded-xl font-mono text-[11px] font-bold text-slate-700">
                    Page {logsPage} of {totalLogsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLogsPage(prev => Math.min(prev + 1, totalLogsPages))}
                    disabled={logsPage >= totalLogsPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all text-[11px]"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  #{selectedOrder.id}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Order Details</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Recorded at {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Email</span>
                <span className="font-bold text-slate-800 break-all">{selectedOrder.user_email}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Plan Tier</span>
                <span className="font-black text-brand-600 uppercase tracking-wider">{selectedOrder.plan_tier}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Amount Paid</span>
                <span className="font-black text-slate-900 text-sm">
                  ${typeof selectedOrder.amount === 'number' && selectedOrder.amount > 500 ? (selectedOrder.amount / 100).toFixed(2) : Number(selectedOrder.amount || 0).toFixed(2)} {selectedOrder.currency || 'USD'}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payment Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  selectedOrder.status === 'paid' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gateway & Notes</span>
              <p className="text-slate-700 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                <strong className="text-slate-900">Gateway:</strong> {selectedOrder.gateway}<br />
                <strong className="text-slate-900">Notes:</strong> {selectedOrder.notes || 'N/A'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  #{selectedLog.id}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Diagnostic Event Payload</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Logged at {new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">API Action</span>
                <span className="font-mono font-bold text-brand-600">{selectedLog.action}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Client IP Address</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.ip_address || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">API Username</span>
                <span className="font-mono text-slate-800">{selectedLog.username || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Execution Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  selectedLog.status === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {selectedLog.status}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log Message & Payload</span>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap break-all border border-slate-800">
                {selectedLog.message || 'No detailed message payload attached.'}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
