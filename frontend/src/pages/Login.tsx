import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaType, setMfaType] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [emailVerifyRequired, setEmailVerifyRequired] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { login, appConfig } = useAuth()

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-signup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        await login(data.access_token);
      } else {
        const err = await res.json();
        setError(err.detail || "Invalid verification code.");
      }
    } catch (err) {
      setError("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    setResendSuccess(false);
    try {
      const res = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to resend code.");
      }
    } catch (err) {
      setError("Resend request failed.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Form encoding for OAuth2PasswordRequestForm
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };
      if (mfaRequired && mfaCode) {
        headers["X-2FA-Code"] = mfaCode.trim();
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: headers,
        body: params
      });

      if (response.ok) {
        const data = await response.json();
        await login(data.access_token);
      } else {
        if (response.status === 401) {
          const clone = response.clone();
          try {
            const data = await clone.json();
            if (data && (data.detail === "2FA_REQUIRED" || data.detail === "2FA_EMAIL_REQUIRED")) {
              setMfaRequired(true);
              setMfaType(data.detail);
              setLoading(false);
              return;
            }
            if (data && data.detail === "EMAIL_VERIFICATION_REQUIRED") {
              setEmailVerifyRequired(true);
              setLoading(false);
              return;
            }
          } catch (err) {
            // ignore JSON parse error, proceed to standard logic
          }
        }

        let errorMsg = "Incorrect email or password";
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
          errorMsg = `Server error (${response.status}). Please try again later.`;
        }
        setError(errorMsg);
      }
    } catch (err) {
      setError("Network connection issue. Please check API server status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Blur Nodes */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-500/5 rounded-full filter blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/5 rounded-full filter blur-[100px] animate-pulse delay-700" />

      {/* Main Glass Card container */}
      <div className="w-full max-w-sm glass-panel p-6 rounded-2xl relative z-10 border border-dark-700/50 shadow-2xl">
        <div className="text-center mb-6">
          {appConfig?.logo_url ? (
            <img src={appConfig.logo_url} alt={appConfig.site_name} className="h-10 mx-auto object-contain mb-3" />
          ) : (
            <div className="h-10 w-10 brand-gradient-bg rounded-xl mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30 font-black text-xl mb-3">
              {appConfig?.site_name?.substring(0, 1) || "S"}
            </div>
          )}
          <h2 className="text-xl font-extrabold text-white tracking-tight font-sans">
            Welcome to {appConfig?.site_name || "SmartCampaign"}
          </h2>
          <p className="text-[11px] text-dark-400 mt-1">Log in to manage your smart campaigns</p>
        </div>

        {error && (
          <div className="mb-4.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-headShake">
            <AlertCircle size={14} className="shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <form onSubmit={emailVerifyRequired ? handleVerifyEmail : handleSubmit} className="space-y-4">
          {emailVerifyRequired ? (
            <div className="flex flex-col gap-1.5 p-3 bg-dark-900/40 border border-dark-800 rounded-xl animate-fadeIn">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider text-center">
                Verify Your Email
              </label>
              <p className="text-[10px] text-dark-400 text-center leading-normal mb-2">
                A verification OTP code was sent to <strong>{email}</strong>. Please enter the code below to complete your registration.
              </p>

              {resendSuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] rounded text-center">
                  Verification OTP code resent successfully!
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit OTP code"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-dark-950 border border-dark-800 rounded-xl text-center text-xs text-white font-mono placeholder:text-dark-650 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center mt-2 px-1">
                <button
                  type="button"
                  onClick={() => { setEmailVerifyRequired(false); setVerificationCode(""); }}
                  className="text-[10px] text-dark-500 hover:text-dark-300 font-semibold underline"
                >
                  Back to Login
                </button>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendCode}
                  className="text-[10px] text-brand-400 hover:text-brand-300 font-bold disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend Code"}
                </button>
              </div>
            </div>
          ) : !mfaRequired ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-[10px] text-brand-400 hover:text-brand-300 font-bold">Forgot?</a>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Lock size={13} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-600"
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
            </>
          ) : (
            <div className="flex flex-col gap-1.5 p-3 bg-dark-900/40 border border-dark-800 rounded-xl animate-fadeIn">
              <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider text-center">
                MFA Verification Required
              </label>
              <p className="text-[9.5px] text-dark-400 text-center leading-normal mb-1">
                {mfaType === "2FA_EMAIL_REQUIRED"
                  ? "Please enter the 6-digit login OTP code sent to your email address."
                  : "Please enter the 6-digit verification code from Google Authenticator or your Telegram 2FA chat."}
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-dark-950 border border-dark-800 rounded-xl text-center text-xs text-white font-mono placeholder:text-dark-655 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(""); setMfaType(null); }}
                className="text-center text-[10px] text-dark-500 hover:text-dark-300 font-semibold mt-1.5 underline"
              >
                Back to credentials
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-50 mt-1"
          >
            {loading ? "Verifying..." : emailVerifyRequired ? "Verify & Activate" : mfaRequired ? "Confirm Login" : "Sign In to Dashboard"}
            {!loading && (emailVerifyRequired ? <CheckCircle size={13} /> : <ArrowRight size={13} />)}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-dark-700/30">
          <p className="text-[11px] text-dark-400">
            Don't have an account yet?{" "}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">
              Create free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
