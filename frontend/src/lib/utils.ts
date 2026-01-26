import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

/**
 * Combina clases de Tailwind de forma inteligente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Construye la URL completa para cualquier archivo subido
 * Si es una URL relativa del servidor (/uploads/...), añade el base URL
 * Si es una URL absoluta (http/https), la devuelve tal cual
 */
export function getUploadUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  if (url.startsWith('/uploads')) {
    return `${API_BASE}${url}`;
  }

  return url;
}

/**
 * Construye la URL completa para un avatar
 */
export function getAvatarUrl(avatar: string | undefined | null): string | undefined {
  return getUploadUrl(avatar);
}

/**
 * Formatea una fecha relativa (hace X minutos, etc.)
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;

  return then.toLocaleDateString('es-ES');
}

/**
 * Formatea tiempo relativo en formato compacto (Ahora, 2h, 3d, etc.)
 * Usado principalmente en listas de mensajes y matches
 */
export function formatTimeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Ahora';
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Formatea una fecha en formato corto (15 ene, 23 mar, etc.)
 */
export function formatDateShort(date: string | Date | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formatea una fecha en formato largo (15 de enero de 2024)
 */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha para mostrar en transacciones/wallet
 */
export function formatTransactionDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
