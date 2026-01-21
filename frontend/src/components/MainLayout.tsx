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
    <>
      {!hideNav && <Header />}
      <main id="main-content" role="main" tabIndex={-1}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </>
  );
}
