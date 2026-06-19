import React from 'react';
import logoImg from '../../assets/logo.svg';
import clsx from 'clsx';

export default function Logo({ compact = false, className = '' }) {
  return (
    <div className={clsx("flex items-center gap-3 select-none", className)}>
      <img
        src={logoImg}
        alt="Attend-Pro Logo"
        className="w-10 h-10 object-contain shrink-0 rounded-xl shadow-md shadow-blue-500/10 transition-all duration-200 hover:scale-105"
      />
      {!compact && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-slate-800 leading-tight">
            Attend<span className="text-blue-600">-Pro</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Attendance System
          </span>
        </div>
      )}
    </div>
  );
}
