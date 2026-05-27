import React, { useEffect, useState } from 'react'
import {
  Settings,
  Shield,
  Activity,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Mail,
  RefreshCw,
  Server
} from 'lucide-react'

interface SystemConfig {
  id: number;
  site_name: string;
  logo_url: string | null;
  support_email: string;
  maintenance_mode: boolean;
  global_send_rate_limit: number;
  default_from_email: string;
}

export default function AdminSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [siteName, setSiteName] = useState('SmartCampaign');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@smartcampaign.today');
  const [rateLimit, setRateLimit] = useState(1000);
  const [defaultFrom, setDefaultFrom] = useState('noreply@smartcampaign.today');

  const [saving, setSaving] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  const fetchConfig = async () => {
    setError(null);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSiteName(data.site_name);
        setLogoUrl(data.logo_url || '');
        setSupportEmail(data.support_email);
        setRateLimit(data.global_send_rate_limit);
        setDefaultFrom(data.default_from_email);
      } else {
        setError("Failed to fetch platform configuration settings.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection failure to configurations endpoints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          site_name: siteName,
          logo_url: logoUrl || null,
          support_email: supportEmail,
          global_send_rate_limit: rateLimit,
          default_from_email: defaultFrom
        })
      });
      if (res.ok) {
        alert("Platform settings updated successfully.");
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!config) return;
    const nextState = !config.maintenance_mode;
    const promptMsg = nextState
      ? "ACTIVATE GLOBAL MAINTENANCE MODE?\nStandard customers will be blocked immediately with 503 downtime responses."
      : "LIFT SYSTEM MAINTENANCE MODE?\nRestores all public user dashboards and sending processes immediately.";
    
    if (!confirm(promptMsg)) return;

    setTogglingMaintenance(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/settings/maintenance?enabled=${nextState}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Maintenance mode is now ${nextState ? "ENABLED" : "DISABLED"}.`);
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingMaintenance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        <p className="text-[10px] text-dark-400 mt-2 font-semibold">Loading system configs...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>{error || "Config fetch error."}</span>
        <button onClick={fetchConfig} className="ml-auto underline flex items-center gap-1 font-bold">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">System Settings & Controls</h2>
        <p className="text-xs text-dark-400 mt-0.5">Regulate platform throughput rates, branding controls, and global maintenance states.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Settings Form (2/3 width) */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b border-dark-800/40 pb-4">
            <Sliders size={18} className="text-brand-400" />
            <h3 className="font-extrabold text-sm text-white tracking-wide">Platform Configurations</h3>
          </div>

          <form onSubmit={handleUpdateSettings} className="space-y-5">
            {/* Site Name + Support Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Platform Site Name
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Support Email Address
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>
            </div>

            {/* Custom Logo URL */}
            <div>
              <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                Branding Logo Image Link (URL)
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://domain.com/assets/logo.png"
                className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            {/* Default Sender Email + Send Rate Limit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  Default System From Email
                </label>
                <input
                  type="text"
                  required
                  value={defaultFrom}
                  onChange={(e) => setDefaultFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-widest mb-1.5">
                  SMTP Sends Hourly Rate Limit (per user)
                </label>
                <input
                  type="number"
                  required
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-750/30 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl brand-gradient-bg text-white text-xs font-bold hover:opacity-95 shadow-md shadow-brand-500/10 transition-all ml-auto block"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                'Save Settings'
              )}
            </button>
          </form>
        </div>

        {/* Global Maintenance Mode Panel (1/3 width) */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-800/40 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-dark-800/40 pb-4">
              <Shield size={18} className="text-rose-400" />
              <h3 className="font-extrabold text-sm text-white tracking-wide">Emergency Kill-Switch</h3>
            </div>

            {config.maintenance_mode ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-2 animate-pulse">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-extrabold">
                  <AlertTriangle size={14} />
                  <span>MAINTENANCE MODE IS ON</span>
                </div>
                <p className="text-[10px] text-rose-300/80 leading-relaxed font-semibold">
                  Standard customers are fully blocked from viewing dashboards or requesting APIs. Background periodic dispatches are paused. Only administrator pathways bypassed.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold">
                  <CheckCircle size={14} />
                  <span>SaaS Systems Operational</span>
                </div>
                <p className="text-[10px] text-dark-400 leading-relaxed font-semibold">
                  Platform gateways are active. Standard customer routing is fully functional and periodic Celery beat dispatches are executing under rate limit parameters.
                </p>
              </div>
            )}

            <div className="p-3 bg-dark-900/60 border border-dark-800/40 rounded-xl text-[9px] text-dark-400 font-semibold space-y-1 bg-dark-900/30">
              <p>📌 Maintenance bypass criteria:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Super Admin Dashboard and Login (/admin/*)</li>
                <li>Transactional email open/click pixel tracking (/api/track/*)</li>
                <li>Uptime loadbalancer monitors (/api/health)</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleToggleMaintenance}
            disabled={togglingMaintenance}
            className={`w-full py-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-md duration-300 border flex items-center justify-center ${
              config.maintenance_mode
                ? 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-600/35 hover:border-emerald-600/60'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-rose-600/10'
            }`}
          >
            {togglingMaintenance ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : config.maintenance_mode ? (
              'Lift Maintenance Mode'
            ) : (
              'Activate Maintenance'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
