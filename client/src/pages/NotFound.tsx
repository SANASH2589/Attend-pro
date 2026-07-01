import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  const { user, role } = useAuth();

  // Determine standard redirection path based on active session role
  const getHomePath = () => {
    if (!user) return '/staff/login';
    if (role === 'super_admin') return '/super-admin/dashboard';
    if (role === 'staff') return '/staff/dashboard';
    return '/staff/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center gap-6 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-slate-700 tracking-tight">Page Not Found</h2>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
            The page you are looking for does not exist, has been moved, or you do not have permission to view it.
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
