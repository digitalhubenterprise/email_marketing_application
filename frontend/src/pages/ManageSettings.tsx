import React, { useState } from 'react'
import { useAuth } from '../App'
import { 
  Palette, Shield, CheckCircle, RefreshCw, Lock, 
  User, Mail, EyeOff, Eye, AlertCircle, Settings, Send
} from 'lucide-react'

export default function ManageSettings() {
  const { token, user, refreshUser } = useAuth();

  // Account brand settings state
  const [brandPrimary, setBrandPrimary] = useState(user?.brand_primary_color || "#4c6ef5");
  const [brandSecondary, setBrandSecondary] = useState(user?.brand_secondary_color || "#fab005");
  const [brandFont, setBrandFont] = useState(user?.brand_font_family || "Inter");
  const [notificationSettings, setNotificationSettings] = useState(user?.notification_settings || "all");
  const [savingSettings, setSavingSettings] = useState(false);

  // 2FA state
  const [setup2faSecret, setSetup2faSecret] = useState<string | null>(null);
  const [setup2faQr, setSetup2faQr] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loading2fa, setLoading2fa] = useState(false);

  // Telegram 2FA state
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
  const [telegramSecret, setTelegramSecret] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSuccess, setTelegramSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/auth/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          brand_primary_color: brandPrimary,
          brand_secondary_color: brandSecondary,
          brand_font_family: brandFont,
          notification_settings: notificationSettings
        })
      });
      if (res.ok) {
        alert("Account style configurations saved successfully!");
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSetup2FA = async () => {
    setLoading2fa(true);
    setMfaError(null);
    setMfaSuccess(false);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSetup2faSecret(data.secret);
        setSetup2faQr(data.provision_url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading2fa(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ code: mfaCode, secret: setup2faSecret })
      });
      if (res.ok) {
        setMfaSuccess(true);
        setSetup2faSecret(null);
        setSetup2faQr(null);
        setMfaCode("");
        await refreshUser();
      } else {
        const err = await res.json();
        setMfaError(err.detail || "2FA verification failed. Check authorization token code.");
      }
    } catch (err) {
      setMfaError("Connection failed.");
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to disable Multi-Factor Authentication? Your account security will be reduced.")) return;
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("2FA protection successfully removed.");
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetupTelegram2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramChatId.trim()) {
      setTelegramError("Please enter a valid Chat ID.");
      return;
    }
    setTelegramLoading(true);
    setTelegramError(null);
    setTelegramSuccess(false);
    try {
      const res = await fetch("/api/auth/2fa/telegram/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ telegram_chat_id: telegramChatId.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramSecret(data.secret);
      } else {
        const err = await res.json();
        setTelegramError(err.detail || "Failed to setup Telegram 2FA. Verify bot token is configured.");
      }
    } catch (err) {
      setTelegramError("Connection failed.");
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleEnableTelegram2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramError(null);
    try {
      const res = await fetch("/api/auth/2fa/telegram/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: telegramCode.trim(),
          secret: telegramSecret,
          telegram_chat_id: telegramChatId.trim()
        })
      });
      if (res.ok) {
        setTelegramSuccess(true);
        setTelegramSecret(null);
        setTelegramCode("");
        setTelegramChatId("");
        await refreshUser();
      } else {
        const err = await res.json();
        setTelegramError(err.detail || "Telegram verification code is invalid.");
      }
    } catch (err) {
      setTelegramError("Connection failed.");
    }
  };

  const handleDisableTelegram2FA = async () => {
    if (!confirm("Are you sure you want to disable Telegram 2FA protection? Your account security will be reduced.")) return;
    try {
      const res = await fetch("/api/auth/2fa/telegram/disable", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Telegram 2FA protection successfully removed.");
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-dark-700/20">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings size={18} className="text-brand-400 shrink-0" />
            <span>Manage Settings</span>
          </h2>
          <p className="text-[10px] text-dark-400 mt-0.5">Customize your mailing profiles, primary styling, and enforce MFA security protection</p>
        </div>
      </div>

      {/* Account Settings & MFA Security Center */}
      <div className="glass-panel p-5 rounded-2xl border border-dark-700/30 grid grid-cols-1 md:grid-cols-2 gap-5 shadow-lg">
        {/* Style & Preferences */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5">
            <Palette size={16} className="text-brand-400" />
            <span>Profile Customizations</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div className="grid grid-cols-1 xs-mid:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Primary Color</label>
                <div className="flex items-center gap-2 bg-dark-950 p-1.5 border border-dark-800 rounded-lg">
                  <input
                    type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)}
                    className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded"
                  />
                  <span className="text-[10px] font-mono text-dark-300">{brandPrimary}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Secondary Color</label>
                <div className="flex items-center gap-2 bg-dark-950 p-1.5 border border-dark-800 rounded-lg">
                  <input
                    type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)}
                    className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded"
                  />
                  <span className="text-[10px] font-mono text-dark-300">{brandSecondary}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xs-mid:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Default Font Family</label>
                <select
                  value={brandFont} onChange={e => setBrandFont(e.target.value)}
                  className="bg-dark-950 border border-dark-800 text-white rounded-lg p-2 text-xs cursor-pointer focus:outline-none focus:border-brand-500"
                >
                  <option value="Inter">Inter (Classic)</option>
                  <option value="Outfit">Outfit (Premium Rounded)</option>
                  <option value="Roboto">Roboto (Sleek Tech)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Notification settings</label>
                <select
                  value={notificationSettings} onChange={e => setNotificationSettings(e.target.value)}
                  className="bg-dark-950 border border-dark-800 text-white rounded-lg p-2 text-xs cursor-pointer focus:outline-none focus:border-brand-500"
                >
                  <option value="all">Deliveries & Quotas</option>
                  <option value="deliveries">System Alerts Only</option>
                  <option value="none">No Alerts</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 brand-gradient-bg hover:opacity-95 text-white font-bold rounded-lg text-xs transition-all w-full flex items-center justify-center gap-2"
            >
              {savingSettings ? "Saving configurations..." : "Save Style Preferences"}
            </button>
          </form>
        </div>

        {/* 2FA Verification Protection */}
        <div className="space-y-5 border-t md:border-t-0 md:border-l border-dark-700/30 pt-4 md:pt-0 md:pl-5">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5">
            <Shield size={16} className="text-amber-400" />
            <span>MFA Security Settings</span>
          </h3>

          <p className="text-[10px] text-dark-400 leading-normal">
            Safeguard your mailing lists, campaigns, and private SMTP settings by enforcing dual-channel multi-factor authentication.
          </p>

          <div className="space-y-4">
            {/* Google Authenticator Card */}
            <div className="p-4 bg-dark-900/40 border border-dark-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">Google Authenticator</span>
                {user?.two_factor_enabled ? (
                  <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                ) : (
                  <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded bg-dark-850 text-dark-400 border border-dark-700">Inactive</span>
                )}
              </div>
              <p className="text-[10px] text-dark-400">Generate verification codes using standard TOTP applications like Google Authenticator or Authy.</p>
              
              {user?.two_factor_enabled ? (
                <button
                  type="button" onClick={handleDisable2FA}
                  className="w-full py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-rose-500/20"
                >
                  Disable Google 2FA
                </button>
              ) : (
                <div className="space-y-3">
                  {mfaSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5">
                      <CheckCircle size={12} />
                      <span>Google 2FA activated successfully!</span>
                    </div>
                  )}

                  {!setup2faSecret ? (
                    <button
                      type="button" onClick={handleSetup2FA} disabled={loading2fa}
                      className="w-full py-2 brand-gradient-bg hover:opacity-95 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      {loading2fa ? "Provisioning..." : "Link Google Authenticator"}
                    </button>
                  ) : (
                    <form onSubmit={handleEnable2FA} className="space-y-2.5 p-3 bg-dark-950/40 border border-dark-800 rounded-lg">
                      {mfaError && (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] rounded">
                          {mfaError}
                        </div>
                      )}

                      <div className="flex flex-col items-center text-center space-y-1">
                        <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest">Scan QR Code</span>
                        <div className="h-36 w-36 bg-white p-2.5 rounded-lg flex items-center justify-center border border-dark-800 shadow-md">
                          {setup2faQr ? (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup2faQr)}`}
                              alt="Google Authenticator QR Code"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="h-full w-full bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:6px_6px] opacity-75 border border-slate-900 rounded" />
                          )}
                        </div>
                        <span className="text-[8px] text-dark-500 select-all font-mono mt-1 break-all font-semibold">Secret: {setup2faSecret}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-bold text-dark-400">Authenticator Code</label>
                        <input
                          type="text" required value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded-md text-center text-xs text-white font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button" onClick={() => { setSetup2faSecret(null); setSetup2faQr(null); }}
                          className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded text-[9.5px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 brand-gradient-bg text-white rounded text-[9.5px] font-bold"
                        >
                          Verify & Enable
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Telegram 2FA Card */}
            <div className="p-4 bg-dark-900/40 border border-dark-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Send size={12} className="text-sky-400" />
                  <span>Telegram 2FA</span>
                </span>
                {user?.two_factor_telegram_enabled ? (
                  <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                ) : (
                  <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded bg-dark-850 text-dark-400 border border-dark-700">Inactive</span>
                )}
              </div>
              <p className="text-[10px] text-dark-400">Receive authentication codes directly to your Telegram chat window when logging in or executing key tasks.</p>
              
              {user?.two_factor_telegram_enabled ? (
                <div className="space-y-2">
                  <div className="text-[9.5px] text-dark-300 bg-dark-950/60 p-2 rounded-lg border border-dark-800/40">
                    <span className="font-bold text-dark-400 uppercase tracking-wider block text-[8px] mb-0.5">Linked Chat ID</span>
                    <span className="font-mono text-white select-all">{user?.telegram_chat_id}</span>
                  </div>
                  <button
                    type="button" onClick={handleDisableTelegram2FA}
                    className="w-full py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-rose-500/20"
                  >
                    Disable Telegram 2FA
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {telegramSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5">
                      <CheckCircle size={12} />
                      <span>Telegram 2FA activated successfully!</span>
                    </div>
                  )}

                  {!telegramSecret ? (
                    <form onSubmit={handleSetupTelegram2FA} className="space-y-2">
                      {telegramError && (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] rounded">
                          {telegramError}
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-bold text-dark-400">Telegram Chat ID</label>
                        <div className="flex gap-2">
                          <input
                            type="text" required value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)}
                            placeholder="e.g. 58392019"
                            className="flex-1 px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-md text-xs text-white font-mono placeholder:text-dark-600"
                          />
                          <button
                            type="submit" disabled={telegramLoading}
                            className="px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-[10.5px] font-bold transition-colors disabled:opacity-50 font-semibold"
                          >
                            {telegramLoading ? "Sending..." : "Send Code"}
                          </button>
                        </div>
                      </div>
                      <p className="text-[8.5px] text-dark-500 leading-normal">
                        To find your Chat ID, message <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">@userinfobot</a>, then start a chat with our platform bot to receive the verification OTP.
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={handleEnableTelegram2FA} className="space-y-2.5 p-3 bg-dark-950/40 border border-dark-800 rounded-lg">
                      {telegramError && (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] rounded">
                          {telegramError}
                        </div>
                      )}

                      <div className="p-2 bg-amber-500/5 border border-amber-500/15 text-amber-400 text-[9px] rounded-lg leading-normal">
                        A verification code has been dispatched to Telegram Chat ID: <strong>{telegramChatId}</strong>.
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-bold text-dark-400">Telegram Verification Code</label>
                        <input
                          type="text" required value={telegramCode} onChange={e => setTelegramCode(e.target.value)}
                          placeholder="6-digit OTP code"
                          className="w-full px-2 py-1.5 bg-dark-950 border border-dark-800 rounded-md text-center text-xs text-white font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button" onClick={() => setTelegramSecret(null)}
                          className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded text-[9.5px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 brand-gradient-bg text-white rounded text-[9.5px] font-bold"
                        >
                          Verify & Activate
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
