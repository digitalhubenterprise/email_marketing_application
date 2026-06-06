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
  ToggleRight
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

export default function AdminApiSettings() {
  const [username, setUsername] = useState('dhru_user');
  const [accessKey, setAccessKey] = useState('dhru_key_123456');
  const [enabled, setEnabled] = useState(true);
  
  const [logs, setLogs] = useState<DhruLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'guide' | 'logs'>('credentials');
  
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

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

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
          api_listener_enabled: enabled
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
      {/* Title Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] gap-4 animate-fadeIn">
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
            🔑 Reseller API Integration & Settings
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Configure credentials and monitor order webhooks for Dhru Fusion compatibility
          </p>
        </div>
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 self-start md:self-auto">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {saveSuccess}
          </div>
        )}
        {saveError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 self-start md:self-auto">
            <AlertCircle size={14} className="text-rose-500" />
            {saveError}
          </div>
        )}
      </div>

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

              {/* Username & Key fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <input
                    type="text"
                    required
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    placeholder="Enter API key"
                  />
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

      {/* Diagnostics Logs Tab */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fadeIn space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              📋 Webhook & Integration Logs
            </h3>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold tracking-wide transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin text-brand-500' : ''} />
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            {logsLoading && logs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-brand-500" />
                <span className="text-xs font-semibold text-slate-400">Fetching diagnostic events...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                No API requests recorded yet. Initiate requests from your billing client to see diagnostics here.
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
