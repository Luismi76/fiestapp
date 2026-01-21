'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

type InputProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Input accesible con label, hint y error.
 * Incluye asociaciones ARIA correctas.
 */
export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, id, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={cn('space-y-1.5', className)}>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
          {required && <span className="sr-only">(obligatorio)</span>}
        </label>

        {hint && (
          <p id={hintId} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            error && errorId,
            hint && hintId
          ) || undefined}
          aria-required={required}
          className={cn(
            'input w-full',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

/**
 * Textarea accesible con label, hint y error.
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, id, ...props }, ref) => {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={cn('space-y-1.5', className)}>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
          {required && <span className="sr-only">(obligatorio)</span>}
        </label>

        {hint && (
          <p id={hintId} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            error && errorId,
            hint && hintId
          ) || undefined}
          aria-required={required}
          className={cn(
            'input w-full min-h-[120px] resize-y',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

/**
 * Wrapper para grupo de campos con leyenda.
 */
interface FieldsetProps {
  legend: string;
  children: ReactNode;
  className?: string;
}

export function Fieldset({ legend, children, className }: FieldsetProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <legend className="text-base font-semibold text-gray-900 mb-4">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Texto solo visible para lectores de pantalla.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
