'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Snap points as percentages of viewport height (e.g., [0.5, 0.9] = 50%, 90%) */
  snapPoints?: number[];
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Footer content (buttons, etc.) */
  footer?: React.ReactNode;
  /** Additional class for the sheet container */
  className?: string;
}

/**
 * Mobile-optimized BottomSheet component with:
 * - Drag handle for visual affordance
 * - Swipe down to close gesture
 * - Snap points support
 * - Backdrop blur effect
 * - Safe area padding for iOS
 * - Single internal scroll
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.9],
  showCloseButton = true,
  footer,
  className = '',
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsClosing(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 200);
  }, [onClose]);

  // Touch handlers for drag-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow dragging down (positive diff)
    if (diff > 0) {
      setDragY(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // If dragged more than 100px down, close the sheet
    if (dragY > 100) {
      handleClose();
    } else {
      // Snap back
      setDragY(0);
    }
  }, [dragY, handleClose]);

  // Calculate max height from snap points
  const maxHeight = `${snapPoints[snapPoints.length - 1] * 100}vh`;

  // Don't render anything if not mounted or not open (and not closing)
  if (!mounted || (!isOpen && !isClosing)) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop ${isOpen && !isClosing ? 'open' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        className={`bottom-sheet ${isOpen && !isClosing ? 'open' : ''} ${className}`}
        style={{
          maxHeight,
          transform: `translateY(${isOpen && !isClosing ? dragY : '100%'}px)`,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          className="touch-target cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="bottom-sheet-header">
            {title ? (
              <h2 id="bottom-sheet-title" className="bottom-sheet-title">
                {title}
              </h2>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="bottom-sheet-close"
                aria-label="Cerrar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="bottom-sheet-footer">
            {footer}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}
