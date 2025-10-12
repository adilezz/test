/**
 * Delete Confirmation Modal
 * Better UX than native confirm() with thesis details
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  thesisTitle?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmer la suppression",
  message = "Cette action est irréversible.",
  thesisTitle,
  confirmText = "Supprimer",
  cancelText = "Annuler",
  danger = true
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {danger && <AlertTriangle className="w-6 h-6 text-red-600" />}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {thesisTitle && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-600 mb-1">Thèse à supprimer:</p>
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {thesisTitle}
              </p>
            </div>
          )}
          <p className="text-gray-700">{message}</p>
          {danger && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              ⚠️ Cette action ne peut pas être annulée.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

