import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Reusable Overlay Modal with Escape key listener and body scroll locking.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer
}: ModalProps) {
  // Listen for Escape key events and toggle scroll lock on mount/unmount
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Backdrop Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      {/* Modal Viewport Window */}
      <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header Title Bar */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close modal dialog"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-600 text-sm">
          {children}
        </div>

        {/* Action Button Footer Slot */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
