'use client';

import { useState } from 'react';

interface ReasonModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  warningMessage?: string;
  submitLabel: string;
  submitLoadingLabel?: string;
  placeholder?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'default';
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export default function ReasonModal({
  isOpen,
  title,
  description,
  warningMessage,
  submitLabel,
  submitLoadingLabel = 'Procesando...',
  placeholder = 'Escribe el motivo...',
  isLoading = false,
  variant = 'default',
  onSubmit,
  onClose,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const buttonColors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    default: 'bg-primary hover:bg-primary/90',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
        />

        {warningMessage && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            {warningMessage}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 ${buttonColors[variant]}`}
          >
            {isLoading ? submitLoadingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
