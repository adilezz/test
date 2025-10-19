import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'success' | 'loading';
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'search':
        return {
          iconColor: 'text-primary-400',
          iconBg: 'bg-primary-100',
          titleColor: 'text-neutral-900',
          descriptionColor: 'text-neutral-600'
        };
      case 'error':
        return {
          iconColor: 'text-error-400',
          iconBg: 'bg-error-100',
          titleColor: 'text-neutral-900',
          descriptionColor: 'text-neutral-600'
        };
      case 'success':
        return {
          iconColor: 'text-success-400',
          iconBg: 'bg-success-100',
          titleColor: 'text-neutral-900',
          descriptionColor: 'text-neutral-600'
        };
      case 'loading':
        return {
          iconColor: 'text-accent-400',
          iconBg: 'bg-accent-100',
          titleColor: 'text-neutral-900',
          descriptionColor: 'text-neutral-600'
        };
      default:
        return {
          iconColor: 'text-neutral-400',
          iconBg: 'bg-neutral-100',
          titleColor: 'text-neutral-900',
          descriptionColor: 'text-neutral-600'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {Icon && (
        <div className={`mb-8 p-6 rounded-2xl ${styles.iconBg} shadow-soft`}>
          <Icon className={`w-20 h-20 ${styles.iconColor} mx-auto animate-bounce-gentle`} />
        </div>
      )}
      <h3 className={`h4 ${styles.titleColor} mb-4`}>{title}</h3>
      {description && (
        <p className={`text-lg ${styles.descriptionColor} mb-8 max-w-lg leading-relaxed font-medium`}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary btn-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

