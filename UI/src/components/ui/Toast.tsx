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
  } as const;

  const iconColors = {
    success: 'text-success-600',
    error: 'text-error-600',
    info: 'text-info-600',
    warning: 'text-warning-600'
  } as const;

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`
        ${colors[type]}
        border rounded-lg shadow-lg p-4 mb-2 min-w-[320px] max-w-md
        flex items-start space-x-3
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && (
          <p className="text-sm mt-1 opacity-90">{message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Toast;

