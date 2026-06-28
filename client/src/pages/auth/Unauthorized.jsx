import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function Unauthorized() {
  const { user, role } = useAuth();

  // Determine dashboard redirect path based on user role
  const getHomePath = () => {
    if (!user) return '/login';
    if (role === 'super_admin') return '/admin/dashboard';
    if (role === 'staff') return '/staff/dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center gap-6 relative z-10 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Access Denied</h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
            Your current academic credentials do not grant access permissions to this department block. Please sign in with an authorized profile.
          </p>
        </div>

        <Link
          to={getHomePath()}
          className="inline-flex items-center justify-center py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all duration-200"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
