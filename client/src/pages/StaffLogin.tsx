import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/common/Logo';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserCheck } from 'lucide-react';

/**
 * Staff Login Page.
 * Dedicated login endpoint for staff/faculty members only.
 * Rejects super_admin credentials and redirects to /staff/dashboard.
 */
export default function StaffLogin() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      const response = await login(email, password);
      if (response.success) {
        // Only allow staff role through this login
        if (response.role === 'staff') {
          navigate('/staff/dashboard', { replace: true });
        } else {
          setError('This portal is for Staff members only. Administrators should use the Admin Login portal.');
        }
      } else {
        setError(response.error || 'Invalid credentials or login failed.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Centered login card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/40 p-8 flex flex-col gap-6 relative z-10 animate-fade-in">
        {/* Logo and Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Staff Portal
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Staff Sign In
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
              Enter your credentials to access your attendance dashboard.
            </p>
          </div>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                placeholder="email@college.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Switch to Admin Login */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Administrator?{' '}
            <Link to="/super-admin/login" className="text-violet-600 hover:text-violet-700 font-semibold">
              Go to Admin Login →
            </Link>
          </p>
        </div>

        {/* Footer notice */}
        <div className="text-center">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Authorized personnel only. Sessions are monitored for security and administrative audits.
          </p>
        </div>
      </div>
    </div>
  );
}
