import React, { useEffect, useState } from 'react'
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
  DollarSign
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

  const generateStrongKey = () => {
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
  };
  
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
  
  const apiEndpointUrl = `${window.location.origin}/api/dhru`;

  const fetchConfig = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
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
  };

  const fetchLogs = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch API integration logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPlans = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setPlansLoading(true);
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        const initialPrices: {[key: string]: string} = {};
        const initialPublicPrices: {[key: string]: string} = {};
        const initialDiscounts: {[key: string]: string} = {};
        data.forEach((p: SubscriptionPlan) => {
          initialPrices[p.tier] = (p.price / 100).toFixed(2);
          initialPublicPrices[p.tier] = (p.public_price / 100).toFixed(2);
          initialDiscounts[p.tier] = (p.discount / 100).toFixed(2);
        });
        setPlanPrices(prev => ({ ...initialPrices, ...prev }));
        setPlanPublicPrices(prev => ({ ...initialPublicPrices, ...prev }));
        setPlanDiscounts(prev => ({ ...initialDiscounts, ...prev }));
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setOrdersLoading(true);
    try {
      let res = await fetch('/api/admin/settings/dhru-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch('/api/admin/payments?gateway=DhruFusionAPI&limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch API orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCreateSampleOrder = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-orders/sample', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dhru-logs/sample', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setUpdatingPlanTier(tier);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/plans/${tier}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  useEffect(() => {
    fetchConfig();
    fetchPlans();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (activeSubTab === 'orders') {
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
  }, [activeSubTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          api_listener_username: username,
          api_listener_access_key: accessKey,
          api_listener_enabled: enabled,
          api_listener_connected_ip: connectedIp
        })
      });

      if (res.ok) {
        setSaveSuccess('API connection credentials updated successfully.');
        fetchConfig();
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || 'Failed to update credentials.');
      }
    } catch (err) {
      setSaveError('Network communication error.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiEndpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="flex border-b border-slate-200/80 gap-2">
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
        </button>
      </div>

      {/* Contents based on tab */}
      {activeSubTab === 'credentials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Main Credentials Config */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                ⚙️ Listener Credentials
              </h3>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="flex items-center gap-1.5 focus:outline-none"
              >
                {enabled ? (
                  <ToggleRight size={32} className="text-brand-500 transition-colors" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300 transition-colors" />
                )}
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  {enabled ? 'Active' : 'Disabled'}
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Endpoint URL display */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Dhru API Endpoint URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiEndpointUrl}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-mono font-semibold"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200/70 text-slate-600 rounded-xl transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-medium">
                  Provide this callback URL when configuring the API provider in your Dhru Fusion administration panel.
                </p>
              </div>

              {/* Username, Key & Connected IP fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    API Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    placeholder="Enter API username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    API Access Key
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold font-mono"
                      placeholder="Enter API key"
                    />
                    <button
                      type="button"
                      onClick={generateStrongKey}
                      className="px-3 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0"
                      title="Generate a 25-character strong key"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Connected IP (Optional lock)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={connectedIp}
                      onChange={(e) => setConnectedIp(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold font-mono"
                      placeholder="e.g. 192.168.1.1"
                    />
                    <button
                      type="button"
                      onClick={() => setConnectedIp('')}
                      className="px-3 py-2.5 bg-rose-600 text-white hover:bg-rose-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0"
                      title="Clear / Reset Connected IP lock"
                    >
                      Reset IP
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 brand-gradient-bg hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    'Save API Settings'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Stats / Info side card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
              💡 Integration Basics
            </h3>
            <div className="space-y-4 text-xs leading-relaxed text-slate-600">
              <div className="flex gap-2">
                <Globe size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px]">Dhru Fusion Compatible</h4>
                  <p className="text-[10.5px] mt-0.5 text-slate-500">
                    Conforms strictly to standard HTTP callback listener protocols for IMEI and Server reseller actions.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Layers size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px]">Automated Account Creation</h4>
                  <p className="text-[10.5px] mt-0.5 text-slate-500">
                    If an email address ordered does not exist, an account is auto-generated and login credentials are automatically dispatched to the customer.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <HelpCircle size={18} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px]">Instant Upgrades</h4>
                  <p className="text-[10.5px] mt-0.5 text-slate-500">
                    Existing users get upgraded in real-time, receiving quota expansions instantly on payment clearance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Guide Tab */}
      {activeSubTab === 'guide' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-6">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4">
            📖 Reseller Integration Manual (Dhru Fusion)
          </h3>

          <div className="space-y-4 max-w-4xl text-xs text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide mb-1.5">
                Step 1: Create a Supplier / API Provider
              </h4>
              <p>
                In your Dhru Fusion administration panel, navigate to <strong>Settings &gt; API Settings</strong> or <strong>Suppliers &gt; Manage Suppliers</strong>. 
                Click on <strong>Add New Supplier</strong> or <strong>API Provider</strong>.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500">
                <li>Choose "Other Script" or standard Custom listener.</li>
                <li>Enter the API URL: <code className="bg-slate-100 p-0.5 px-1 rounded font-mono text-[10px] text-brand-600">{apiEndpointUrl}</code></li>
                <li>Enter the configured API Username and API Access Key.</li>
              </ul>
            </div>

            <div className="pt-2">
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide mb-1.5">
                Step 2: Sync and Map Subscription Products
              </h4>
              <p>
                Fetch the service list from this API provider inside Dhru Fusion. It will dynamically return the subscription plans synced from this SaaS system database:
              </p>
              <table className="w-full text-left border-collapse mt-3 border border-slate-100 text-[10.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="p-2.5">Dhru Service ID</th>
                    <th className="p-2.5">SaaS Plan Tier</th>
                    <th className="p-2.5">System Name</th>
                    <th className="p-2.5">Base Cost Credit</th>
                  </tr>
                </thead>
                <tbody className="text-slate-500 font-medium">
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 font-mono">1</td>
                    <td className="p-2.5">free</td>
                    <td className="p-2.5">Starter Plan</td>
                    <td className="p-2.5">$4.99</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 font-mono">2</td>
                    <td className="p-2.5">pro</td>
                    <td className="p-2.5">Standard Plan</td>
                    <td className="p-2.5">$11.99</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 font-mono">3</td>
                    <td className="p-2.5">business</td>
                    <td className="p-2.5">Premium Plan</td>
                    <td className="p-2.5">$24.99</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 font-mono">4</td>
                    <td className="p-2.5">enterprise</td>
                    <td className="p-2.5">Enterprise Plan</td>
                    <td className="p-2.5">$59.99</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide mb-1.5">
                Step 3: Setup Client Fields for Ordering
              </h4>
              <p>
                Configure the order item page on your reseller website. Since this API needs to know which user account to activate or create, 
                you must collect the customer's email address. In your Dhru Fusion service setup:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500">
                <li>Instruct users to enter their registered account email address in the <strong>IMEI</strong> input field.</li>
                <li>Alternatively, create a required custom field labeled <strong>email</strong>. The listener will scan both locations to capture it.</li>
              </ul>
            </div>
          </div>
        </div>
      )}


      {/* Services Tab */}
      {activeSubTab === 'services' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] gap-4 animate-fadeIn">
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                📦 API Services & Subscriptions
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                Sync plans, view parameters and update reseller pricing for automatic activation
              </p>
            </div>
            <button
              onClick={fetchPlans}
              disabled={plansLoading}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={plansLoading ? 'animate-spin text-brand-500' : ''} />
              Sync Plans
            </button>
          </div>

          {plansLoading && plans.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
              <RefreshCw size={24} className="animate-spin text-brand-500" />
              <span className="text-xs font-semibold text-slate-400">Loading catalog services...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
              No subscription plans found in the system.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fadeIn">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100">
                        Tier: {plan.tier}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        ID: {plan.id}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{plan.name} Plan</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        API Sync Service Product
                      </p>
                    </div>
                    <div className="space-y-1 text-slate-500 text-xs font-semibold pt-2 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>Email Quota:</span>
                        <span className="text-slate-800 font-bold">{plan.quota.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SMTP Nodes:</span>
                        <span className="text-slate-800 font-bold">{plan.smtp_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Validity:</span>
                        <span className="text-slate-800 font-bold">{plan.validity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interval:</span>
                        <span className="text-slate-800 font-bold">{plan.throttle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">
                        API Cost Price (USD)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={planPrices[plan.tier] !== undefined ? planPrices[plan.tier] : (plan.price / 100).toFixed(2)}
                          onChange={(e) => setPlanPrices({ ...planPrices, [plan.tier]: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold focus:outline-none focus:bg-white focus:border-brand-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">
                        Public Cost Price (USD)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={planPublicPrices[plan.tier] !== undefined ? planPublicPrices[plan.tier] : ((plan.public_price || 0) / 100).toFixed(2)}
                          onChange={(e) => setPlanPublicPrices({ ...planPublicPrices, [plan.tier]: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold focus:outline-none focus:bg-white focus:border-brand-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">
                        Discount (USD)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={planDiscounts[plan.tier] !== undefined ? planDiscounts[plan.tier] : ((plan.discount || 0) / 100).toFixed(2)}
                          onChange={(e) => setPlanDiscounts({ ...planDiscounts, [plan.tier]: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold focus:outline-none focus:bg-white focus:border-brand-500 transition-all"
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
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        {updatingPlanTier === plan.tier ? 'Saving...' : 'Update Prices'}
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
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                🛒 Reseller API Order History
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Real-time transaction log of subscription plans purchased via Dhru Fusion or external HTTP GET/POST API clients.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                Refresh Orders
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {ordersLoading && orders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-brand-500" />
                <span className="text-xs font-semibold text-slate-400">Fetching API orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center shadow-sm">
                  <History size={20} />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="text-xs font-black text-slate-800">No Reseller API Orders Yet</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    When external clients place orders via Dhru Fusion or HTTP API endpoints, orders will appear here automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSampleOrder}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm"
                >
                  Create Sample Test Order
                </button>
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
                  </tr>
                </thead>
                <tbody className="text-slate-600 font-medium">
                  {orders.map((order) => (
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
                      <td className="p-3 text-[11px] text-slate-500 max-w-sm truncate" title={order.notes || ''}>
                        {order.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Diagnostics Logs Tab */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                📋 Webhook & Integration Diagnostic Logs
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Audit trail of incoming HTTP GET/POST API listener requests, credentials authentication & IP validation checks.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                Refresh Logs
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {logsLoading && logs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-brand-500" />
                <span className="text-xs font-semibold text-slate-400">Fetching diagnostic events...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-sm">
                  <Terminal size={20} />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="text-xs font-black text-slate-800">No Integration Logs Recorded</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    API listener request logs and diagnostic event callbacks will be recorded here automatically when client requests are processed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSampleLog}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm"
                >
                  Generate Diagnostic Test Event
                </button>
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
                  </tr>
                </thead>
                <tbody className="text-slate-600 font-medium">
                  {logs.map((log) => (
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
                      <td className="p-3 text-[11px] text-slate-500 max-w-sm truncate" title={log.message || ''}>
                        {log.message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
