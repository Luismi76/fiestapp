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
 * - Móvil: BottomNav fijo, contenido con padding-bottom automático
 * - Desktop: Header con navegación, contenido con max-width centrado
 *
 * El padding inferior para el BottomNav se gestiona aquí de forma centralizada.
 * Las páginas NO deben añadir su propio pb-* para compensar el BottomNav.
 * Si una página tiene una barra fija inferior, usar la clase .fixed-bottom-bar
 * y añadir pb-20 extra en el contenido para esa barra.
 */
export default function MainLayout({ children, hideNav = false, hideHeader = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--surface-warm)]">
      {/* Header: visible en desktop */}
      {!hideNav && !hideHeader && <Header />}

      {/* Main content: responsive width, pt-16 on desktop for fixed header */}
      {/* pb-[--bottom-nav-height] on mobile for BottomNav, pb-0 on desktop */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={[
          'w-full max-w-7xl mx-auto px-0 md:px-4 lg:px-6',
          !hideNav && !hideHeader ? 'md:pt-16' : '',
          !hideNav ? 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] md:pb-0' : '',
        ].filter(Boolean).join(' ')}
      >
        {children}
      </main>

      {/* BottomNav: visible solo en móvil (CSS lo oculta en md+) */}
      {!hideNav && <BottomNav />}
    </div>
  );
}
