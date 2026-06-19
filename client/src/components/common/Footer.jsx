import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-200/60 bg-white">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium text-slate-400">
        <div>
          Attend-Pro &copy; 2026
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>Smart Attendance Management System</span>
          <span>&bull;</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
