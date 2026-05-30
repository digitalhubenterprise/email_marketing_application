import React, { useState } from 'react'
import { Shield, Mail, Lock, Key, Award, AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('support');
  const [inviteToken, setInviteToken] = useState(''); // Secure empty token default
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/register?invite_token=${inviteToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password,
          role: role
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`New Admin Profile successfully created. Email: ${email}, Role: ${role}.`);
        setEmail('');
        setPassword('');
      } else {
        setError(data.detail || "Registration denied. Verify invitation key validity.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach administrative sign-up gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50/20">
      <div className="w-full max-w-xl animate-scaleUp text-slate-800">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="mx-auto h-11 w-11 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20 mb-3">
            <Shield size={20} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Onboard Administrator</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Secure Super Admin Onboarding Portal</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />

          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-8 w-8 bg-brand-50 border border-brand-100 text-brand-600 rounded-lg flex items-center justify-center">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">Administrative Onboarding desk</h3>
              <p className="text-[10px] text-slate-500 font-semibold">All signups file immediate, permanent audit entries.</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold flex items-center gap-2">
              <CheckCircle size={14} className="flex-shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invitation secret */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Key size={11} className="text-brand-500" /> Platform signup Invitation secret
              </label>
              <input
                type="text"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-mono font-semibold shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Mail size={11} className="text-brand-500" /> Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="moderator@smartcampaign.today"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                />
              </div>

              {/* Admin password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Lock size={11} className="text-brand-500" /> Admin Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                />
              </div>
            </div>

            {/* Admin Role */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Award size={11} className="text-brand-500" /> Administrative Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="support">support (Support & Quota adjuster)</option>
                <option value="moderator">moderator (Campaigns monitors & Cancellations)</option>
                <option value="master_admin">master_admin (Full configurations control)</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl brand-gradient-bg text-white text-xs font-bold hover:opacity-95 shadow-lg shadow-brand-500/10 transition-all flex items-center justify-center pt-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                'Onboard Administrator'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
