import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/40 p-8 flex flex-col gap-6 relative">
      {/* Top Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
            Enter your registered institutional email to request a credentials reset link.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="space-y-6 text-center py-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800">Reset Link Sent</h3>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
              If an account is registered with <strong className="text-slate-600 font-bold">{email}</strong>, you will receive instructions shortly.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      ) : (
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
                placeholder="professor@attendpro.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Reset Link Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-200 cursor-pointer"
          >
            Send Reset Instructions
          </button>

          {/* Back Link */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
