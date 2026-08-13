import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle, Sun, Moon } from 'lucide-react'

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

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('landing_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('landing_theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

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
            // ignore JSON error
          }
        }
        let errorMsg = "Invalid email or password.";
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
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'dark bg-[#0d0e1a] text-slate-100' : 'light bg-slate-50 text-slate-900'
    }`}>
      {/* Decorative Background Blur Nodes */}
      <div className={`absolute top-1/4 left-1/4 w-72 h-72 rounded-full filter blur-[100px] animate-pulse ${
        theme === 'dark' ? 'bg-brand-500/10' : 'bg-brand-500/5'
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full filter blur-[100px] animate-pulse delay-700 ${
        theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
      }`} />

      {/* Main Glass Card container */}
      <div className={`w-full max-w-sm p-7 rounded-3xl relative z-10 border shadow-2xl backdrop-blur-2xl transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#1a1c2e]/95 border-slate-700/80 text-white shadow-black/40'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/80'
      }`}>
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-xl border transition-all ${
            theme === 'dark'
              ? 'bg-[#0d0e1a] border-slate-700/80 text-amber-400 hover:bg-slate-800'
              : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200'
          }`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Top Header Badge Icon */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl brand-gradient-bg flex items-center justify-center text-white shadow-xl shadow-brand-500/30 mb-2">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <span className="w-2.5 h-1.5 rounded-full bg-brand-500 inline-block" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-black tracking-tight font-sans mb-1 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Welcome Back
          </h2>
          <p className={`text-xs font-medium ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Log in to your account to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 animate-headShake">
            <AlertCircle size={14} className="shrink-0" />
            <span className="leading-normal font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={emailVerifyRequired ? handleVerifyEmail : handleSubmit} className="space-y-4">
          {emailVerifyRequired ? (
            <div className={`flex flex-col gap-1.5 p-3 rounded-xl border animate-fadeIn ${
              theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-amber-50/50 border-amber-200'
            }`}>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider text-center">
                Verify Your Email
              </label>
              <p className={`text-[10px] text-center leading-normal mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                A verification OTP code was sent to <strong>{email}</strong>. Please enter the code below to complete your registration.
              </p>

              {resendSuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9.5px] rounded text-center font-bold">
                  Verification OTP code resent successfully!
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit OTP code"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-center text-xs font-mono focus:border-brand-500 focus:outline-none ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center mt-2 px-1">
                <button
                  type="button"
                  onClick={() => { setEmailVerifyRequired(false); setVerificationCode(""); }}
                  className={`text-[10px] font-semibold underline ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Back to Login
                </button>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendCode}
                  className="text-[10px] text-brand-500 hover:text-brand-600 font-bold disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend Code"}
                </button>
              </div>
            </div>
          ) : !mfaRequired ? (
            <>
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold text-left ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold text-left ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-medium focus:border-brand-500 focus:outline-none transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#0d0e1a] border-slate-700/80 text-white placeholder:text-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className={`flex items-center gap-2 cursor-pointer ${
                  theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}>
                  <input type="checkbox" className={`w-3.5 h-3.5 rounded text-brand-500 focus:ring-0 ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-700' : 'bg-slate-100 border-slate-300'
                  }`} />
                  <span>Remember me</span>
                </label>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-500 hover:text-brand-600 font-semibold transition-colors">
                  Forgot Password?
                </a>
              </div>
            </>
          ) : (
            <div className={`flex flex-col gap-1.5 p-3 rounded-xl border animate-fadeIn ${
              theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800' : 'bg-amber-50/50 border-amber-200'
            }`}>
              <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center">
                MFA Verification Required
              </label>
              <p className={`text-[9.5px] text-center leading-normal mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {mfaType === "2FA_EMAIL_REQUIRED"
                  ? "Please enter the 6-digit login OTP code sent to your email address."
                  : "Please enter the 6-digit verification code from Google Authenticator or your Telegram 2FA chat."}
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-center text-xs font-mono focus:border-brand-500 focus:outline-none ${
                    theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(""); setMfaType(null); }}
                className={`text-center text-[10px] font-semibold mt-1.5 underline ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Back to credentials
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 brand-gradient-bg text-white font-extrabold rounded-full text-xs shadow-xl shadow-brand-500/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? "Verifying..." : emailVerifyRequired ? "Verify & Activate" : mfaRequired ? "Confirm Login" : "Sign In"}
          </button>
        </form>

        {/* Social Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Or</span>
          <div className={`flex-1 h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
        </div>

        {/* Social Buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
            theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
            </svg>
          </button>

          <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
            theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}>
            <svg className={`w-4 h-4 fill-current ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.14-.56 2.8-1.36z"/>
            </svg>
          </button>

          <button type="button" onClick={() => alert("Social login coming soon")} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
            theme === 'dark' ? 'bg-[#0d0e1a] border-slate-800 text-slate-300 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}>
            <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
        </div>

        <div className={`text-center pt-3 border-t ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Don't have an account?{" "}
            <Link to="/register" className="text-brand-500 hover:text-brand-600 font-bold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
