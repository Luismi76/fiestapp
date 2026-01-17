const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

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
