import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { Server, Plus, Trash2, Shield, Mail, CheckCircle2, XCircle, AlertCircle, Play } from 'lucide-react'

interface SMTPServer {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  security: string;
  from_name: string;
  from_email: string;
  is_active: boolean;
  created_at: string;
}

export default function SMTPServers() {
  const { token } = useAuth();
  const [servers, setServers] = useState<SMTPServer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState("TLS");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");

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
          from_email: fromEmail
        })
      });

      if (res.ok) {
        // Clear forms
        setName("");
        setHost("");
        setPort(587);
        setUsername("");
        setPassword("");
        setFromName("");
        setFromEmail("");
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
    <div className="space-y-5 animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">SMTP Portfolios</h2>
        <p className="text-xs text-dark-400 mt-0.5">Configure and test external SMTP nodes to send your dynamic campaigns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Creation Form Panel */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-dark-700/30">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-brand-400" />
            Add Custom SMTP Server
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Profile Name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Reseller SendGrid / Hostinger SMTP"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Sender Name</label>
                <input
                  type="text" required value={fromName} onChange={e => setFromName(e.target.value)}
                  placeholder="e.g. John from SmartCampaign"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">SMTP Host URL</label>
                <input
                  type="text" required value={host} onChange={e => setHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">SMTP Port</label>
                <input
                  type="number" required value={port} onChange={e => setPort(Number(e.target.value))}
                  placeholder="587"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">SMTP Username</label>
                <input
                  type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="you@smtpdomain.com"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Security protocol</label>
                <select
                  value={security} onChange={e => setSecurity(e.target.value)}
                  className="w-full px-3.5 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
                >
                  <option value="TLS">STARTTLS (Port 587)</option>
                  <option value="SSL">SSL/TLS (Port 465)</option>
                  <option value="NONE">NONE (Plain Text)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">SMTP Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Sender From Email</label>
                <input
                  type="email" required value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-600"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl flex items-start gap-2.5 border ${
                testResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {testResult.success ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
                <div className="text-[10px]">
                  <p className="font-bold">{testResult.success ? "Success" : "Handshake Failed"}</p>
                  <p className="mt-0.5">{testResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={testing || submitting || !host || !username || !password}
                onClick={handleTestConnection}
                className="px-4 py-3 bg-dark-900 hover:bg-dark-800 text-xs font-bold text-white rounded-xl border border-dark-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {testing ? "Testing Socket..." : "Verify Connection"}
                {!testing && <Play size={8} />}
              </button>

              <button
                type="submit"
                disabled={submitting || testing}
                className="flex-1 py-3 brand-gradient-bg hover:scale-[1.01] transition-transform text-xs font-bold text-white rounded-xl text-center shadow-lg shadow-brand-500/20 disabled:opacity-50"
              >
                {submitting ? "Saving Config..." : "Save SMTP Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Profiles Side Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-dark-700/30">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Server size={16} className="text-brand-400" />
            Configured Nodes ({servers.length})
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
            </div>
          ) : servers.length > 0 ? (
            <div className="space-y-3">
              {servers.map((s) => (
                <div key={s.id} className="p-3 bg-dark-900/60 rounded-xl border border-dark-700/40 space-y-2 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs">{s.name}</h4>
                      <p className="text-[10px] text-dark-400 font-medium mt-0.5">{s.host}:{s.port}</p>
                    </div>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 bg-dark-950 text-dark-400 hover:text-rose-400 border border-dark-700 rounded-md hover:bg-rose-500/5 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20">
                      <Shield size={8} />
                      {s.security}
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-dark-800 text-dark-300 rounded-md border border-dark-700">
                      <Mail size={8} />
                      {s.from_email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/30">
              <p className="text-[10px] text-dark-400">No SMTP profiles configured.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
