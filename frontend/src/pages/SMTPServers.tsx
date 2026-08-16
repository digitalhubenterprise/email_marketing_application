import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Server, Plus, Trash2, Shield, Mail, CheckCircle2, 
  XCircle, AlertCircle, Play, Eye, EyeOff, User, 
  Lock, Globe, Hash, RefreshCw, Sparkles
} from 'lucide-react'

interface SMTPServer {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  security: string;
  from_name: string;
  from_email: string;
  daily_send_limit: number;
  is_active: boolean;
  created_at: string;
}

export default function SMTPServers() {
  const { token } = useAuth();
  const [servers, setServers] = useState<SMTPServer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [dailySendLimit, setDailySendLimit] = useState(500);
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState("TLS");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/smtp", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [token]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/smtp/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          host,
          port: Number(port),
          username,
          password,
          security,
          from_email: fromEmail
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: "Network connection refused." });
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          host,
          port: Number(port),
          username,
          password,
          security,
          from_name: fromName,
          from_email: fromEmail,
          daily_send_limit: Number(dailySendLimit),
          is_active: isActive
        })
      });

      if (res.ok) {
        // Clear forms
        setName("");
        setDailySendLimit(500);
        setHost("");
        setPort(587);
        setUsername("");
        setPassword("");
        setFromName("");
        setFromEmail("");
        setIsActive(true);
        setTestResult(null);
        await fetchServers();
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to create SMTP config.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this SMTP profile?")) return;
    try {
      const res = await fetch(`/api/smtp/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchServers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
        {/* Creation Form Panel */}
        <div className="lg:col-span-2 glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3.5 flex items-center gap-2">
            <Plus size={14} className="text-brand-400 shrink-0" />
            <span>Add SMTP Server</span>
          </h3>

          <form onSubmit={handleCreate} className="space-y-3">
            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-2">
                <AlertCircle size={12} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Server Name & Daily Send Limit */}
            <div className="grid grid-cols-1 large-android:grid-cols-12 gap-3">
              <div className="large-android:col-span-8 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Server Name *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Server size={13} />
                  </div>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. My SMTP #1"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="large-android:col-span-4 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Daily Send Limit *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Sparkles size={13} />
                  </div>
                  <input
                    type="number" required min="1" value={dailySendLimit} onChange={e => setDailySendLimit(Number(e.target.value))}
                    placeholder="500"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: SMTP Host & Port */}
            <div className="grid grid-cols-1 large-android:grid-cols-12 gap-3">
              <div className="large-android:col-span-9 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">SMTP Host *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Globe size={13} />
                  </div>
                  <input
                    type="text" required value={host} onChange={e => setHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="large-android:col-span-3 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Port *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Hash size={13} />
                  </div>
                  <input
                    type="number" required value={port} onChange={e => setPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Encryption & SMTP Username */}
            <div className="grid grid-cols-1 large-android:grid-cols-12 gap-3">
              <div className="large-android:col-span-4 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Encryption</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Shield size={13} />
                  </div>
                  <select
                    value={security} onChange={e => setSecurity(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-dark-950 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                    <option value="NONE">NONE</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              <div className="large-android:col-span-8 flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">SMTP Username *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </div>
                  <input
                    type="text" required value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="you@smtpdomain.com"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: SMTP Password & From Name */}
            <div className="grid grid-cols-1 large-android:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">SMTP Password *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Lock size={13} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">From Name *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <User size={13} />
                  </div>
                  <input
                    type="text" required value={fromName} onChange={e => setFromName(e.target.value)}
                    placeholder="John from SmartCampaign"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: From Email */}
            <div className="flex flex-col gap-1">
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">From Email *</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                  <Mail size={13} />
                </div>
                <input
                  type="email" required value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-slate-800 dark:text-white placeholder:text-dark-600 transition-all duration-200"
                />
              </div>
            </div>

            {/* Row 6: Active in Rotation Checkbox */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isActiveRotation"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-dark-700 text-brand-500 focus:ring-brand-500 bg-dark-950/45 cursor-pointer accent-brand-500"
              />
              <label htmlFor="isActiveRotation" className="text-[10px] font-bold text-dark-300 uppercase tracking-wider cursor-pointer select-none">
                Active (include in rotation)
              </label>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-lg flex items-start gap-2 border ${
                testResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              } animate-fadeIn`}>
                {testResult.success ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <XCircle size={13} className="shrink-0 mt-0.5" />}
                <div className="text-[10px]">
                  <p className="font-bold">{testResult.success ? "Connection Verified" : "Handshake Failed"}</p>
                  <p className="mt-0.5 leading-relaxed text-dark-300">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col large-android:flex-row gap-2 pt-2">
              <button
                type="button"
                disabled={testing || submitting || !host || !username || !password}
                onClick={handleTestConnection}
                className="px-4 py-2 bg-dark-950/20 dark:bg-dark-950/60 hover:bg-dark-900/10 dark:hover:bg-dark-900 text-xs font-bold text-slate-700 dark:text-white rounded-lg border border-dark-700/60 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group w-full large-android:w-auto"
              >
                {testing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-brand-400" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Play size={10} className="text-brand-400 group-hover:translate-x-0.5 transition-transform" />
                    <span>Verify Server Socket</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={submitting || testing}
                className="flex-1 py-2 brand-gradient-bg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-xs font-bold text-white rounded-lg text-center shadow-md shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Adding Server...</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>Add Server</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Profiles Side Panel */}
        <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20 w-full">
          <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-dark-700/20">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Server size={14} className="text-brand-400 shrink-0" />
              <span>Configured Nodes ({servers.length})</span>
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-dark-900/60 border border-dark-700/30 rounded-md shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_rgba(76,110,245,0.6)] animate-pulse" />
              <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">Rotation Enabled</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="animate-spin text-brand-500" size={18} />
            </div>
          ) : servers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {servers.map((s) => (
                <div 
                  key={s.id} 
                  className="p-3 bg-dark-900/40 rounded-xl border border-dark-700/30 hover:border-brand-500/30 transition-all duration-300 relative group overflow-hidden flex flex-col gap-2"
                >
                  {/* Glass subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-dark-950/80 border border-dark-700/50 text-brand-400">
                        <Server size={13} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs tracking-tight">{s.name}</h4>
                        <p className="text-[10px] text-dark-400 font-medium mt-0.5">{s.host}:{s.port}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 bg-dark-950 text-dark-400 hover:text-rose-455 border border-dark-700/50 rounded-lg hover:bg-rose-500/10 transition-all hover:scale-105"
                      title="Delete SMTP node"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider relative z-10 pt-1.5 border-t border-dark-700/20">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${
                      s.is_active 
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-dark-800 text-dark-400 border-dark-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.is_active ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-dark-500'}`} />
                      {s.is_active ? 'Active' : 'Inactive'}
                    </div>

                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                      <Sparkles size={8} />
                      <span>{s.daily_send_limit}/day</span>
                    </div>
                    
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20">
                      <Shield size={8} />
                      {s.security}
                    </div>
                    
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-dark-950/45 dark:bg-dark-850 text-slate-500 dark:text-dark-300 rounded-md border border-dark-750/30 max-w-[100px] truncate" title={s.from_email}>
                      <Mail size={8} />
                      <span className="truncate">{s.from_email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/20 flex flex-col items-center justify-center gap-2 animate-fadeIn">
              <div className="h-9 w-9 rounded-full bg-dark-950/80 border border-dark-700/40 flex items-center justify-center text-dark-500">
                <Server size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">No SMTP nodes</p>
                <p className="text-[10px] text-slate-450 dark:text-dark-500 mt-0.5 max-w-[180px] mx-auto leading-normal">Configure a server on the left to start dispatching templates.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
