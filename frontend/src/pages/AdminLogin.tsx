import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (e) {
          setError("Failed to parse server response.");
          setLoading(false);
          return;
        }
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_email', data.email || email);
        localStorage.setItem('admin_role', data.role || (email === 'admin@gmail.com' ? 'master_admin' : 'support'));
        navigate('/admin');
      } else {
        let errorMsg = 'Access Denied: Invalid credentials.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            if (typeof errData.detail === "string") {
              errorMsg = errData.detail;
            } else if (Array.isArray(errData.detail)) {
              errorMsg = errData.detail.map((err: any) => err.msg).join(", ");
            } else {
              errorMsg = String(errData.detail);
            }
          }
        } catch (e) {
          errorMsg = `Server error (${response.status}).`;
        }
        setError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure. Verify backend API health.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50/20">
      <div className="w-full max-w-md animate-scaleUp text-slate-800">
        {/* Title branding */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/25 mb-4">
            <Shield size={24} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin console</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Restrictive Platform Management Terminal</p>
        </div>

        {/* Panel Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500" />

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2 animate-slideUp">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Administrator Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all font-semibold shadow-sm"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Credential Security Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all font-semibold shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl brand-gradient-bg text-white text-xs font-bold hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center shadow-lg shadow-brand-500/10"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Footnote */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-400 font-semibold">
            SmartCampaign Server-Core Auth Gate • Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
