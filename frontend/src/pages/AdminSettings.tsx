import React, { useEffect, useState } from 'react'
import {
  Settings,
  Shield,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface SystemConfig {
  id: number;
  site_name: string;
  logo_url: string | null;
  support_email: string;
  maintenance_mode: boolean;
  global_send_rate_limit: number;
  default_from_email: string;
  announcement_active: boolean;
  announcement_message: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
  seo_meta_keywords?: string | null;
  default_from_name?: string | null;
  smtp_max_retries?: number | null;
  email_verification_required?: boolean | null;
  min_password_length?: number | null;
  max_login_attempts?: number | null;
  session_expiry_hours?: number | null;
  system_smtp_host?: string | null;
  system_smtp_port?: number | null;
  system_smtp_username?: string | null;
  system_smtp_security?: string | null;
  system_smtp_from_name?: string | null;
  system_smtp_from_email?: string | null;
  system_smtp_enabled?: boolean | null;
}

export default function AdminSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'branding' | 'throttling' | 'broadcast' | 'maintenance' | 'seo' | 'email_settings' | 'security'>('branding');

  const [siteName, setSiteName] = useState('SmartCampaign');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@smartcampaign.today');
  const [rateLimit, setRateLimit] = useState(1000);
  const [defaultFrom, setDefaultFrom] = useState('noreply@smartcampaign.today');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');

  const [seoTitle, setSeoTitle] = useState('SmartCampaign - Modern SaaS Email Marketing Platform');
  const [seoDescription, setSeoDescription] = useState('Create, personalize, monitor, and scale email marketing campaigns dynamically.');
  const [seoKeywords, setSeoKeywords] = useState('email marketing, smtp, celery, dispatch, saas');

  const [defaultFromName, setDefaultFromName] = useState('SmartCampaign Operations');
  const [smtpMaxRetries, setSmtpMaxRetries] = useState(3);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [sessionExpiryHours, setSessionExpiryHours] = useState(24);

  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(false);

  const [twoFactorEmailEnabled, setTwoFactorEmailEnabled] = useState(false);
  const [twoFactorTelegramEnabled, setTwoFactorTelegramEnabled] = useState(false);
  const [twoFactorMandatoryForAdmins, setTwoFactorMandatoryForAdmins] = useState(false);

  const [emailSubTab, setEmailSubTab] = useState<'email' | 'telegram'>('email');

  // System SMTP Setup state
  const [systemSmtpHost, setSystemSmtpHost] = useState('');
  const [systemSmtpPort, setSystemSmtpPort] = useState(587);
  const [systemSmtpUsername, setSystemSmtpUsername] = useState('');
  const [systemSmtpPassword, setSystemSmtpPassword] = useState('');
  const [systemSmtpSecurity, setSystemSmtpSecurity] = useState('TLS');
  const [systemSmtpFromName, setSystemSmtpFromName] = useState('');
  const [systemSmtpFromEmail, setSystemSmtpFromEmail] = useState('');
  const [systemSmtpEnabled, setSystemSmtpEnabled] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [smtpTestLogs, setSmtpTestLogs] = useState<string[]>([]);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<boolean | null>(null);

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpTestRecipient) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    setTestingSmtp(true);
    setSmtpTestSuccess(null);
    setSmtpTestLogs(["[Diagnostics] Connecting to SaaS API Gateway..."]);
    
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch(`/api/admin/settings/smtp/test?recipient_email=${encodeURIComponent(smtpTestRecipient)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSmtpTestSuccess(true);
        setSmtpTestLogs(data.logs || ["Diagnostic check completed successfully!"]);
      } else {
        setSmtpTestSuccess(false);
        setSmtpTestLogs(data.logs || [`Diagnostic check failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err: any) {
      setSmtpTestSuccess(false);
      setSmtpTestLogs(prev => [...prev, `❌ Network communication failure: ${err.message || 'Connection refused'}`]);
    } finally {
      setTestingSmtp(false);
    }
  };

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
        setSmtpTestRecipient(data.support_email || '');
        setRateLimit(data.global_send_rate_limit);
        setDefaultFrom(data.default_from_email);
        setAnnouncementActive(data.announcement_active || false);
        setAnnouncementMessage(data.announcement_message || '');
        setSeoTitle(data.seo_meta_title || '');
        setSeoDescription(data.seo_meta_description || '');
        setSeoKeywords(data.seo_meta_keywords || '');
        setDefaultFromName(data.default_from_name || 'SmartCampaign Operations');
        setSmtpMaxRetries(data.smtp_max_retries ?? 3);
        setEmailVerificationRequired(data.email_verification_required || false);
        setMinPasswordLength(data.min_password_length ?? 8);
        setMaxLoginAttempts(data.max_login_attempts ?? 5);
        setSessionExpiryHours(data.session_expiry_hours ?? 24);
        setTelegramBotToken(data.telegram_bot_token || '');
        setTelegramChatId(data.telegram_chat_id || '');
        setTelegramNotificationsEnabled(data.telegram_notifications_enabled || false);
        setTwoFactorEmailEnabled(data.two_factor_email_enabled || false);
        setTwoFactorTelegramEnabled(data.two_factor_telegram_enabled || false);
        setTwoFactorMandatoryForAdmins(data.two_factor_mandatory_for_admins || false);
        setSystemSmtpHost(data.system_smtp_host || '');
        setSystemSmtpPort(data.system_smtp_port ?? 587);
        setSystemSmtpUsername(data.system_smtp_username || '');
        setSystemSmtpPassword(''); // never pre-fill password from server
        setSystemSmtpSecurity(data.system_smtp_security || 'TLS');
        setSystemSmtpFromName(data.system_smtp_from_name || '');
        setSystemSmtpFromEmail(data.system_smtp_from_email || '');
        setSystemSmtpEnabled(data.system_smtp_enabled || false);
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
          default_from_email: defaultFrom,
          announcement_active: announcementActive,
          announcement_message: announcementMessage || null,
          seo_meta_title: seoTitle || null,
          seo_meta_description: seoDescription || null,
          seo_meta_keywords: seoKeywords || null,
          default_from_name: defaultFromName,
          smtp_max_retries: smtpMaxRetries,
          email_verification_required: emailVerificationRequired,
          min_password_length: minPasswordLength,
          max_login_attempts: maxLoginAttempts,
          session_expiry_hours: sessionExpiryHours,
          telegram_bot_token: telegramBotToken || '',
          telegram_chat_id: telegramChatId || '',
          telegram_notifications_enabled: telegramNotificationsEnabled,
          two_factor_email_enabled: twoFactorEmailEnabled,
          two_factor_telegram_enabled: twoFactorTelegramEnabled,
          two_factor_mandatory_for_admins: twoFactorMandatoryForAdmins,
          system_smtp_host: systemSmtpHost || null,
          system_smtp_port: systemSmtpPort,
          system_smtp_username: systemSmtpUsername || null,
          ...(systemSmtpPassword ? { system_smtp_password: systemSmtpPassword } : {}),
          system_smtp_security: systemSmtpSecurity,
          system_smtp_from_name: systemSmtpFromName || null,
          system_smtp_from_email: systemSmtpFromEmail || null,
          system_smtp_enabled: systemSmtpEnabled
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
        <p className="text-[10px] text-slate-500 mt-2 font-semibold">Loading system configs...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-500" />
        <span>{error || "Config fetch error."}</span>
        <button onClick={fetchConfig} className="ml-auto underline flex items-center gap-1 font-bold text-rose-850">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn text-slate-800 -mt-3">
      {/* Interactive One-Click Settings Module Navigation tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-t-2xl gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'branding'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          🎨 Site Branding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('throttling')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'throttling'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          ✉️ Notifications & Throttling
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'broadcast'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          📢 Broadcast Announcements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('seo')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'seo'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          🔍 SEO Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('email_settings')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'email_settings'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          📧 Email Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'security'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          🔒 Security Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === 'maintenance'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          🛡️ Maintenance Mode
        </button>
      </div>

      {/* Dynamic Content Panel */}
      <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] min-h-[340px]">
        {activeTab !== 'maintenance' ? (
          <form onSubmit={handleUpdateSettings} className="space-y-6 max-w-2xl">
            {activeTab === 'branding' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">🎨 Custom Identity & Branding Settings</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Reflected dynamically across user sidebars, headers, logins, and registrations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Platform Site Name (Branding Settings)
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Reflected dynamically across the app.</span>
                    <input
                      type="text"
                      required
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Support Email Address (Branding Settings)
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Support and help email reflected across pages.</span>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Branding Logo Image Link (URL)
                  </label>
                  <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Site logo reflected on Login/Register page and sidebars.</span>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://domain.com/assets/logo.png"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>
            )}

            {activeTab === 'throttling' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">✉️ System Notifications & Throttling Limits</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Configure origin dispatchers and throttle global campaigns rates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Default System From Email (Notifications)
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Welcome email, password reset এর default sender.</span>
                    <input
                      type="text"
                      required
                      value={defaultFrom}
                      onChange={(e) => setDefaultFrom(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Global Email Send Rate Limit (sends/hour per user)
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Throttling limits to protect SMTP against overload.</span>
                    <input
                      type="number"
                      required
                      value={rateLimit}
                      onChange={(e) => setRateLimit(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">📢 Broadcast Announcements</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Show critical notice banner to all users in dashboard (downtime notice, features etc.)</p>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="announcementActive"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="announcementActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Activate Announcement Banner (Show message to all users)
                    </label>
                    <p className="text-[9px] text-slate-400 font-semibold">Maintenance, new features or downtime alert will display dynamically.</p>
                  </div>
                </div>

                {announcementActive && (
                  <div className="animate-slideDown">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Announcement Message Broadcasted
                    </label>
                    <textarea
                      rows={3}
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="e.g., Scheduled platform maintenance on Friday at 2:00 AM UTC. Expect 15 mins of intermittent downtime."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">🔍 Search Engine Optimization (SEO) Settings</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Alter metadata tags injected dynamically into HTML DOM headers for search discovery.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Meta Title Tag (Page Title)
                  </label>
                  <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Displays as standard tab title in search result items.</span>
                  <input
                    type="text"
                    required
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Meta Description Tag
                  </label>
                  <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Summarizes site contents dynamically inside search listings snippet.</span>
                  <textarea
                    rows={3}
                    required
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Meta Keywords Tag (Comma separated)
                  </label>
                  <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Comma-separated marketing tags for discovery crawlers indexing.</span>
                  <input
                    type="text"
                    required
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>
            )}

            {activeTab === 'email_settings' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">📧 Email Settings</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Configure outbound email dispatches, verification policies, and retry counts.</p>
                </div>

                {/* Interactive sub-tabs for Email vs Telegram */}
                <div className="flex bg-slate-100/70 p-1 rounded-xl gap-1 max-w-sm border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setEmailSubTab('email')}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all text-center ${
                      emailSubTab === 'email'
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
                        : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    📧 Email Configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailSubTab('telegram')}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all text-center ${
                      emailSubTab === 'telegram'
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
                        : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    ✈️ Telegram Configuration
                  </button>
                </div>

                {emailSubTab === 'email' ? (
                  <div className="space-y-5 animate-fadeIn">

                    {/* SMTP Status Banner */}
                    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold border ${
                      systemSmtpEnabled && systemSmtpHost
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-amber-50 border-amber-100 text-amber-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${systemSmtpEnabled && systemSmtpHost ? 'bg-emerald-500' : 'bg-amber-400'} ${systemSmtpEnabled && systemSmtpHost ? 'animate-pulse' : ''}`} />
                      {systemSmtpEnabled && systemSmtpHost
                        ? `System SMTP Active — all alerts, OTPs, and login/register emails dispatch via ${systemSmtpHost}`
                        : 'System SMTP not configured — emails logged to console only. Configure below to enable real delivery.'}
                    </div>

                    {/* Enable / Disable Toggle */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="systemSmtpEnabled"
                        checked={systemSmtpEnabled}
                        onChange={(e) => setSystemSmtpEnabled(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="systemSmtpEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Enable System SMTP for Email Delivery
                        </label>
                        <p className="text-[9px] text-slate-400 font-semibold">When enabled, all platform alerts, OTP codes, welcome emails, and password resets send through this SMTP.</p>
                      </div>
                    </div>

                    {/* SMTP Connection */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-3">🔌 SMTP Connection</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">SMTP Host</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">e.g. smtp.gmail.com · smtp.mailgun.org · mail.example.com</span>
                          <input
                            type="text"
                            value={systemSmtpHost}
                            onChange={(e) => setSystemSmtpHost(e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Port</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">587 (TLS) · 465 (SSL) · 25</span>
                          <input
                            type="number"
                            value={systemSmtpPort}
                            onChange={(e) => setSystemSmtpPort(parseInt(e.target.value) || 587)}
                            placeholder="587"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Encryption / Security</label>
                        <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">TLS (STARTTLS) is recommended for port 587. SSL for port 465.</span>
                        <div className="flex gap-2">
                          {['TLS', 'SSL', 'NONE'].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setSystemSmtpSecurity(sec)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                                systemSmtpSecurity === sec
                                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                              }`}
                            >
                              {sec}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* SMTP Credentials */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-3">🔑 SMTP Credentials</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">SMTP Username</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Usually your email address or API key username.</span>
                          <input
                            type="text"
                            value={systemSmtpUsername}
                            onChange={(e) => setSystemSmtpUsername(e.target.value)}
                            placeholder="noreply@yourdomain.com"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">SMTP Password / App Password</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Leave blank to keep existing saved password.</span>
                          <input
                            type="password"
                            value={systemSmtpPassword}
                            onChange={(e) => setSystemSmtpPassword(e.target.value)}
                            placeholder="••••••••••••  (leave blank to keep existing)"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sender Identity */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-3">✉️ Sender Identity</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">From Name</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Display name recipients see in their inbox.</span>
                          <input
                            type="text"
                            value={systemSmtpFromName}
                            onChange={(e) => setSystemSmtpFromName(e.target.value)}
                            placeholder="SmartCampaign"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">From Email Address</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Reply-to / sender email shown to recipients.</span>
                          <input
                            type="email"
                            value={systemSmtpFromEmail}
                            onChange={(e) => setSystemSmtpFromEmail(e.target.value)}
                            placeholder="noreply@smartcampaign.today"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery Policy */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-3">⚙️ Delivery Policy</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">SMTP Max Retries</label>
                          <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Celery background delivery retry limit on failures.</span>
                          <input
                            type="number"
                            min={0}
                            value={smtpMaxRetries}
                            onChange={(e) => setSmtpMaxRetries(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                        <div className="flex items-start gap-3 pt-5">
                          <input
                            type="checkbox"
                            id="emailVerificationRequired"
                            checked={emailVerificationRequired}
                            onChange={(e) => setEmailVerificationRequired(e.target.checked)}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <label htmlFor="emailVerificationRequired" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                              Require Email Verification for Signup
                            </label>
                            <p className="text-[9px] text-slate-400 font-semibold">Enforce OTP confirmation before users access dashboards.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System SMTP Connection Diagnostic Panel */}
                    <div className="border-t border-slate-100 pt-5 mt-5">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                            🔌 System SMTP Diagnostic Test Console
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Validate your saved SMTP configuration by sending a real-time diagnostic message. Ensure you save changes above before running tests.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1 w-full">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              Recipient Test Email Address
                            </label>
                            <input
                              type="email"
                              value={smtpTestRecipient}
                              onChange={(e) => setSmtpTestRecipient(e.target.value)}
                              placeholder="admin@yourdomain.com"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleTestSmtp}
                            disabled={testingSmtp}
                            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {testingSmtp ? (
                              <>
                                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                                Testing...
                              </>
                            ) : (
                              "Run Diagnostic Test"
                            )}
                          </button>
                        </div>

                        {/* Live Log Stream Display */}
                        {smtpTestLogs.length > 0 && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                Live Connection Handshake Output
                              </span>
                              {smtpTestSuccess === true && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-md">
                                  Diagnostic Test Passed
                                </span>
                              )}
                              {smtpTestSuccess === false && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-100 rounded-md">
                                  Diagnostic Test Failed
                                </span>
                              )}
                            </div>
                            <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-950 font-mono text-[9px] text-slate-300 max-h-[220px] overflow-y-auto space-y-1 shadow-inner">
                              {smtpTestLogs.map((log, idx) => (
                                <div key={idx} className={log.includes("❌") || log.includes("failure") ? "text-rose-400" : log.includes("success") || log.includes("established") ? "text-emerald-400" : "text-slate-300"}>
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                          Telegram Bot Token
                        </label>
                        <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Secret bot API token provided by @BotFather.</span>
                        <input
                          type="password"
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                          Telegram Chat ID
                        </label>
                        <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">System notification target channel name or group chat ID.</span>
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          placeholder="e.g. -1001234567890 or @mychannel"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="telegramNotificationsEnabled"
                        checked={telegramNotificationsEnabled}
                        onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="telegramNotificationsEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Enable Telegram System Notifications
                        </label>
                        <p className="text-[9px] text-slate-400 font-semibold">Dispatch real-time platform updates, spam logs, and registration summaries to Telegram.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">🔒 Security Settings</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Set registration password rules, lockouts, and session expirations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Min Password Length
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Validation boundary for new passwords.</span>
                    <input
                      type="number"
                      required
                      min={6}
                      value={minPasswordLength}
                      onChange={(e) => setMinPasswordLength(parseInt(e.target.value) || 8)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Max Failed Logins
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Failed login attempts limit per IP.</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={maxLoginAttempts}
                      onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Session Expiry (Hours)
                    </label>
                    <span className="text-[9px] text-slate-400 block mb-1.5 font-semibold">Token expiration age for user sessions.</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={sessionExpiryHours}
                      onChange={(e) => setSessionExpiryHours(parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 tracking-wide">🛡️ Multi-Factor Authentication (2FA) Security Settings</h4>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Enforce extra layers of verification for identity protection during logins.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="twoFactorEmailEnabled"
                        checked={twoFactorEmailEnabled}
                        onChange={(e) => setTwoFactorEmailEnabled(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="twoFactorEmailEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Enable Email 2FA (One-Time Passcode)
                        </label>
                        <p className="text-[9px] text-slate-400 font-semibold">Verify logins using an OTP generated and sent to the user's registered email address.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="twoFactorTelegramEnabled"
                        checked={twoFactorTelegramEnabled}
                        onChange={(e) => setTwoFactorTelegramEnabled(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="twoFactorTelegramEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Enable Telegram 2FA (One-Time Passcode)
                        </label>
                        <p className="text-[9px] text-slate-400 font-semibold">Verify logins using an OTP dispatched through Telegram bot integrations.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="twoFactorMandatoryForAdmins"
                        checked={twoFactorMandatoryForAdmins}
                        onChange={(e) => setTwoFactorMandatoryForAdmins(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="twoFactorMandatoryForAdmins" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Make 2FA Enforced / Mandatory for Administrators
                        </label>
                        <p className="text-[9px] text-slate-400 font-semibold">Force all Super Admin and CRM agent logins to complete mandatory OTP verification checks.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl brand-gradient-bg text-white text-xs font-bold hover:opacity-95 shadow-md shadow-brand-500/10 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="max-w-2xl animate-fadeIn space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">🛡️ Global Maintenance Mode (Emergency Kill-Switch)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Safeguard systems or perform platform migrations by taking standard scopes offline.</p>
            </div>

            {config.maintenance_mode ? (
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2 text-rose-600 text-xs font-extrabold">
                  <AlertTriangle size={15} />
                  <span>MAINTENANCE MODE IS ON</span>
                </div>
                <p className="text-[10px] text-rose-500/90 leading-relaxed font-bold">
                  On করলে users login করতে পারবে না, beautiful glassmorphic downtime banner দেখবে। Admin bypass remains active.
                </p>
              </div>
            ) : (
              <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-extrabold">
                  <CheckCircle size={15} className="text-emerald-500" />
                  <span>SaaS Systems Operational</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  Platform gateways are active. Standard users can login, register, and run marketing campaigns freely.
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-[10px] text-slate-500 font-semibold space-y-1.5">
              <p className="text-slate-800 font-extrabold text-xs">📌 Maintenance bypass criteria:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Super Admin Dashboard and Login (/admin/*)</li>
                <li>Transactional email open/click pixel tracking (/api/track/*)</li>
                <li>Uptime loadbalancer monitors (/api/health)</li>
              </ul>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaintenance}
              className={`w-full py-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-md duration-200 border flex items-center justify-center ${
                config.maintenance_mode
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200 hover:border-emerald-300'
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
        )}
      </div>
    </div>
  );
}
