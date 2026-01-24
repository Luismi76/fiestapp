'use client';

import { ReactNode } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * MainLayout envuelve las paginas principales de la app.
 * Incluye:
 * - Header (visible en desktop md+)
 * - BottomNav (visible en movil < md)
 *
 * Uso:
 * ```tsx
 * <MainLayout>
 *   <div className="page">contenido...</div>
 * </MainLayout>
 * ```
 */
export default function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && <Header />}
      {/* Desktop: centered content with max-width, mobile-like experience */}
      {/* This creates a "phone frame" effect on large screens */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto md:my-4 md:shadow-xl md:rounded-2xl md:border md:border-gray-200 md:bg-white md:overflow-hidden"
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
