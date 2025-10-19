/**
 * Collapsible Section Component
 * For organizing long forms into expandable sections
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  subtitle?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  subtitle,
  required,
  icon
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-primary-100 rounded-moroccan overflow-hidden bg-white shadow-soft">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon && <div className="text-primary-700">{icon}</div>}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>{title}</span>
              {required && <span className="text-error-600 text-sm">*</span>}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="text-gray-400">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-6 py-4 border-t border-primary-100 bg-primary-50/30">
          {children}
        </div>
      )}
    </div>
  );
};

