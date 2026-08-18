import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/common/Logo';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

/**
 * Super Admin Login Page.
 * Dedicated login endpoint for super administrators only.
 * Rejects staff credentials and redirects to /super-admin/dashboard.
 */
export default function SuperAdminLogin() {
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
        // Only allow super_admin role through this login
        if (response.role === 'super_admin') {
          navigate('/super-admin/dashboard', { replace: true });
        } else {
          setError('This portal is for Super Admins only. Staff members should use the Staff Login portal.');
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
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Centered login card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/40 p-8 flex flex-col gap-6 relative z-10 animate-fade-in">
        {/* Logo and Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                Administration Portal
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Super Admin Sign In
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
              Access the administration console to manage staff, classes, and students.
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
                placeholder="admin@college.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
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
                className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
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
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-violet-600/10 hover:shadow-lg hover:shadow-violet-600/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In as Admin</span>
            )}
          </button>
        </form>

        {/* Switch to Staff Login */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Staff member?{' '}
            <Link to="/staff/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Go to Staff Login →
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
