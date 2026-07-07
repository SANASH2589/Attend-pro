import React from 'react';
import logoImg from '../../assets/branding/logo.png';
import clsx from 'clsx';

export interface LogoProps {
  compact?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export default function Logo({ compact = false, className = '', variant = 'light' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <div className={clsx("flex items-center gap-3 select-none", className)}>
      {isDark ? (
        // For dark backgrounds, wrap the logo image in a small white container to preserve original brand colors
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md shadow-blue-500/10 transition-all duration-200 hover:scale-105 shrink-0">
          <img
            src={logoImg}
            alt="Attend-Pro Logo"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        // Default presentation for light backgrounds
        <img
          src={logoImg}
          alt="Attend-Pro Logo"
          className="w-10 h-10 object-contain shrink-0 rounded-xl shadow-md shadow-blue-500/10 transition-all duration-200 hover:scale-105"
        />
      )}
      {!compact && (
        <div className="flex flex-col">
          <span className={clsx(
            "text-xl font-bold tracking-tight leading-tight",
            isDark ? "text-white" : "text-slate-800"
          )}>
            Attend<span className={isDark ? "text-blue-400" : "text-blue-600"}>-Pro</span>
          </span>
          <span className={clsx(
            "text-[10px] font-medium uppercase tracking-widest",
            isDark ? "text-slate-400" : "text-slate-400"
          )}>
            Attendance System
          </span>
        </div>
      )}
    </div>
  );
}
