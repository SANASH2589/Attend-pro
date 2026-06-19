import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Logo from '../../components/common/Logo';
import { Mail, Lock, Shield, Users, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // Get destination path from navigation state or default to admin dashboard
  const fromPath = location.state?.from?.pathname || '/admin/dashboard';

  // Automatically update placeholder values when tab switches to help guide users
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'admin') {
      setEmail('admin@attendpro.edu');
    } else {
      setEmail('staff@attendpro.edu');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please input a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must contain at least 4 characters.');
      return;
    }

    try {
      const response = await login(email, password);
      if (response.success) {
        // Redirect to protected dashboard or intended path
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/40 p-8 flex flex-col gap-6 relative">
      {/* Top Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Academic Console Sign In
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
            Welcome to Attend-Pro. Please authenticate to access your dashboard.
          </p>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl">
        <button
          type="button"
          onClick={() => handleTabChange('staff')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Faculty & Staff
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('admin')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Administrator
        </button>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Input fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <input
              type="email"
              required
              placeholder={activeTab === 'admin' ? 'admin@attendpro.edu' : 'faculty@attendpro.edu'}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <Link 
              to="/forgot-password" 
              className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors select-none"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* Show Password Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Remember me Checkbox */}
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 text-xs font-semibold text-slate-500 select-none cursor-pointer">
            Remember my session
          </label>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In as {activeTab === 'admin' ? 'Administrator' : 'Faculty'}</span>
          )}
        </button>
      </form>

      {/* Info notice */}
      <div className="border-t border-slate-100 pt-4 text-center">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Authorized personnel only. Sessions are monitored for security and administrative audits.
        </p>
      </div>
    </div>
  );
}
