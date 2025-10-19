import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ 
  id,
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
  };

  const colors = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    info: 'bg-info-50 border-info-200 text-info-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800'
  };

  const iconColors = {
    success: 'text-success-500',
    error: 'text-error-500',
    info: 'text-info-500',
    warning: 'text-warning-500'
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`
        ${colors[type]}
        border rounded-2xl shadow-moroccan p-6 mb-3 min-w-[360px] max-w-lg
        flex items-start space-x-4 backdrop-blur-sm
      `}
    >
      <div className={`p-2 rounded-xl ${iconColors[type].replace('text-', 'bg-').replace('-500', '-100')} flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColors[type]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif font-semibold text-base">{title}</p>
        {message && (
          <p className="text-sm mt-2 opacity-90 font-medium leading-relaxed">{message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-2 hover:bg-black/10 rounded-xl transition-all duration-300 focus-moroccan"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Toast;

