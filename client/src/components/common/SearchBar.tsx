import React from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

export default function SearchBar({ 
  placeholder = "Search records...", 
  value = "", 
  onChange, 
  className = "" 
}: SearchBarProps) {
  return (
    <div className={clsx("relative w-full max-w-md", className)}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="h-5 w-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 transition-all duration-200"
      />
    </div>
  );
}
