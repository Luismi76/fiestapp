'use client';

import { ReactNode } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  hideHeader?: boolean;
}

/**
 * MainLayout - Responsive layout
 * - Móvil: BottomNav fijo, contenido full-width
 * - Desktop: Header con navegación, contenido con max-width centrado
 */
export default function MainLayout({ children, hideNav = false, hideHeader = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header: visible en desktop */}
      {!hideNav && !hideHeader && <Header />}

      {/* Main content: responsive width */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className="w-full max-w-7xl mx-auto"
      >
        {children}
      </main>

      {/* BottomNav: visible solo en móvil (CSS lo oculta en md+) */}
      {!hideNav && <BottomNav />}
    </div>
  );
}
