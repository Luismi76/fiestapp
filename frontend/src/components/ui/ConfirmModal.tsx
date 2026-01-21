'use client';

import { Fragment, useRef, useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
  requireDoubleConfirm?: boolean;
  doubleConfirmText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  requireDoubleConfirm = false,
  doubleConfirmText,
}: ConfirmModalProps) {
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const expectedText = doubleConfirmText || 'CONFIRMAR';
  const isDoubleConfirmValid = !requireDoubleConfirm || inputValue === expectedText;

  const handleConfirm = async () => {
    if (!isDoubleConfirmValid) return;
    await onConfirm();
  };

  const handleClose = () => {
    if (!isLoading) {
      setInputValue('');
      onClose();
    }
  };

  const icons = {
    danger: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    warning: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
        <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    info: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  };

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  if (!isOpen) return null;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          className={cn(
            'relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6',
            'animate-in zoom-in-95 duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          {icons[variant]}

          {/* Content */}
          <div className="mt-4 text-center">
            <h3
              id="modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h3>
            <div id="modal-description" className="mt-2 text-sm text-gray-600">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          </div>

          {/* Double confirm input */}
          {requireDoubleConfirm && (
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-2">
                Escribe <span className="font-mono font-semibold">{expectedText}</span> para confirmar:
              </label>
              <input
                ref={confirmInputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-center font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1',
                  inputValue === expectedText
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-gray-500'
                )}
                placeholder={expectedText}
                autoComplete="off"
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl',
                'bg-gray-100 text-gray-700 hover:bg-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || !isDoubleConfirmValid}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-white',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                buttonStyles[variant]
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

// Hook para manejar el estado del modal de confirmacion

interface UseConfirmModalOptions {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function useConfirmModal({ onConfirm, onCancel }: UseConfirmModalOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    onCancel?.();
  }, [onCancel]);

  const confirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm]);

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirm,
  };
}
