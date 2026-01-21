'use client';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

/**
 * Enlace para saltar al contenido principal.
 * Mejora la accesibilidad permitiendo a usuarios de teclado
 * saltar directamente al contenido sin pasar por la navegacion.
 */
export function SkipLink({ href = '#main-content', children = 'Saltar al contenido principal' }: SkipLinkProps) {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  );
}
