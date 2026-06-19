import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
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
          <h2 className="text-lg font-bold text-slate-700 tracking-tight">Module Not Found</h2>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
            We searched the academic records but couldn't locate this page. It may have been moved, unassigned, or belongs to a different faculty block.
          </p>
        </div>

        <Link
          to="/admin/dashboard"
          className="inline-flex items-center justify-center py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all duration-200"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
