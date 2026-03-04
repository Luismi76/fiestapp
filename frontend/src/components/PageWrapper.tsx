'use client';

import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  /** Si es true, no aplica fondo gris en desktop */
  noBg?: boolean;
}

/**
 * PageWrapper centra el contenido en desktop con efecto "phone frame".
 * Usar para páginas que NO necesitan Header/BottomNav (ej: páginas de detalle).
 * Para páginas con navegación, usar MainLayout.
 */
export default function PageWrapper({ children, noBg = false }: PageWrapperProps) {
  return (
    <div className={`min-h-screen ${noBg ? '' : 'md:bg-[var(--surface-warm)]'}`}>
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto md:my-4 md:shadow-2xl md:rounded-2xl md:overflow-hidden md:border md:border-gray-200">
        {children}
      </div>
    </div>
  );
}
