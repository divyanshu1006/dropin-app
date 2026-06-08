import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

export function NotificationModal({
  isOpen,
  message,
  title = "Connection Notice",
  onClose
}: NotificationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop fade & blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/25 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 15, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative bg-white/95 backdrop-blur-xl border border-slate-200/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl overflow-hidden text-center z-10"
          >
            {/* Ambient decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-24 w-24 bg-orange-100/40 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button Top Right */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
              aria-label="Close Alert"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Beautiful Icon Indicator */}
            <div className="mx-auto h-12 w-12 bg-orange-50 border border-orange-100/50 rounded-2xl flex items-center justify-center text-orange-500 mb-4 select-none shadow-3xs relative">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>

            {/* Texts */}
            <h4 className="font-sans font-extrabold text-slate-900 text-lg tracking-tight leading-tight mb-2">
              {title}
            </h4>
            
            <p className="font-sans text-xs text-slate-500 font-medium leading-relaxed px-1 mb-5">
              {message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Acknowledge
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default NotificationModal;
