import React, { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { 
  Shield, CheckCircle, RefreshCw, Lock, 
  User, Mail, EyeOff, Eye, AlertCircle, Settings, Send,
  Globe, Phone, MapPin, Languages, Briefcase
} from 'lucide-react'

export default function ManageSettings() {
  const { token, user, refreshUser } = useAuth();

  // User profile details state
  const [username, setUsername] = useState(user?.username || "");
  const [company, setCompany] = useState(user?.company || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [country, setCountry] = useState(user?.country || "");
  const [address, setAddress] = useState(user?.address || "");
  const [language, setLanguage] = useState(user?.language || "English");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Synchronize state when the user object is fetched/changed
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setCompany(user.company || "");
      setPhone(user.phone_number || "");
      setCountry(user.country || "");
      setAddress(user.address || "");
      setLanguage(user.language || "English");
      setTimezone(user.timezone || "UTC");
    }
  }, [user]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await fetch("/api/auth/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          company,
          phone_number: phone,
          country,
          address,
          language,
          timezone
        })
      });
      if (res.ok) {
        setProfileSuccess(true);
        await refreshUser();
      } else {
        const err = await res.json();
        setProfileError(err.detail || "Failed to update profile details.");
      }
    } catch (err) {
      console.error(err);
      setProfileError("Connection failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        setPasswordError(err.detail || "Failed to update password. Verify current password is correct.");
      }
    } catch (err) {
      setPasswordError("Connection failed.");
    } finally {
      setChangingPassword(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-dark-700/20 font-sans">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings size={18} className="text-brand-400 shrink-0" />
            <span>Manage Settings</span>
          </h2>
          <p className="text-[10px] text-dark-400 mt-0.5">Customize your user profile details, update password security, and enforce MFA protection</p>
        </div>
      </div>

      {/* Account Settings & MFA Security Center */}
      <div className="glass-panel p-5 rounded-2xl border border-dark-700/30 grid grid-cols-1 md:grid-cols-2 gap-5 shadow-lg font-sans">
        {/* Left Column: Profile & Password */}
        <div className="space-y-5">
          {/* Profile Details Card */}
          <div className="p-4 bg-dark-900/40 border border-dark-800 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <User size={15} className="text-brand-400" />
              <span>Profile Details</span>
            </h3>
            <p className="text-[10px] text-dark-400">View and update your personal account information.</p>

            {profileSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle size={12} className="shrink-0" />
                <span>Profile details updated successfully!</span>
              </div>
            )}

            {profileError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-1.5 animate-headShake">
                <AlertCircle size={12} className="shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Username / Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <User size={13} />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Enter name"
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Mail size={13} />
                    </span>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ""}
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950/40 border border-dark-850 rounded-lg text-xs text-dark-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Company</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Briefcase size={13} />
                    </span>
                    <input
                      type="text"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Phone size={13} />
                    </span>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Country</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Globe size={13} />
                    </span>
                    <input
                      type="text"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      placeholder="e.g. United States"
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <MapPin size={13} />
                    </span>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="123 Street name"
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Language</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Languages size={13} />
                    </span>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 text-white rounded-lg text-xs cursor-pointer focus:outline-none focus:border-brand-500"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Timezone</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                      <Globe size={13} />
                    </span>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-dark-800 text-white rounded-lg text-xs cursor-pointer focus:outline-none focus:border-brand-500"
                    >
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                      <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2 brand-gradient-bg hover:opacity-95 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? "Saving Profile..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="p-4 bg-dark-900/40 border border-dark-800 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Lock size={15} className="text-amber-400" />
              <span>Change Password</span>
            </h3>
            <p className="text-[10px] text-dark-400">Keep your account secure by modifying your password periodically.</p>

            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle size={12} className="shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            {passwordError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-1.5 animate-headShake">
                <AlertCircle size={12} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Lock size={13} />
                  </span>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Lock size={13} />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Lock size={13} />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-600 focus:border-brand-500 focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
              >
                {changingPassword ? "Updating Password..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: 2FA Verification Protection */}
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
                  className="w-full py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-rose-500/20 cursor-pointer"
                >
                  Disable Google 2FA
                </button>
              ) : (
                <div className="space-y-3">
                  {mfaSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5">
                      <CheckCircle size={12} className="shrink-0" />
                      <span>Google 2FA activated successfully!</span>
                    </div>
                  )}

                  {!setup2faSecret ? (
                    <button
                      type="button" onClick={handleSetup2FA} disabled={loading2fa}
                      className="w-full py-2 brand-gradient-bg hover:opacity-95 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 cursor-pointer"
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
                          className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded-md text-center text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button" onClick={() => { setSetup2faSecret(null); setSetup2faQr(null); }}
                          className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded text-[9.5px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 brand-gradient-bg text-white rounded text-[9.5px] font-bold cursor-pointer"
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
                  <Send size={12} className="text-sky-400 shrink-0" />
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
                    className="w-full py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-rose-500/20 cursor-pointer"
                  >
                    Disable Telegram 2FA
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {telegramSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-1.5">
                      <CheckCircle size={12} className="shrink-0" />
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
                            className="flex-1 px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-md text-xs text-white font-mono placeholder:text-dark-650 focus:outline-none focus:border-brand-500"
                          />
                          <button
                            type="submit" disabled={telegramLoading}
                            className="px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-[10.5px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
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
                          className="w-full px-2 py-1.5 bg-dark-950 border border-dark-800 rounded-md text-center text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button" onClick={() => setTelegramSecret(null)}
                          className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded text-[9.5px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 brand-gradient-bg text-white rounded text-[9.5px] font-bold cursor-pointer"
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
