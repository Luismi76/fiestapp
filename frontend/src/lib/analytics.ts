/**
 * Google Analytics 4 Integration
 *
 * Este modulo proporciona utilidades para tracking de eventos en GA4.
 *
 * Configuracion:
 * 1. Crear una propiedad GA4 en https://analytics.google.com
 * 2. Obtener el Measurement ID (formato: G-XXXXXXXXXX)
 * 3. Configurar la variable de entorno NEXT_PUBLIC_GA_MEASUREMENT_ID
 */

// ID de medicion de GA4 (configurar en .env.local)
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Verificar si estamos en produccion y tenemos GA configurado
export const isGAEnabled = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    !!GA_MEASUREMENT_ID &&
    process.env.NODE_ENV === 'production'
  );
};

// Verificar si el usuario actual es admin (no trackear admins)
const isAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role === 'admin';
    }
  } catch {
    return false;
  }
  return false;
};

// Tipo para window con gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Envia un pageview a GA4
 */
export const pageview = (url: string) => {
  if (!isGAEnabled() || isAdmin()) return;

  window.gtag?.('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  });
};

/**
 * Envia un evento personalizado a GA4
 */
export const event = (
  action: string,
  params?: {
    category?: string;
    label?: string;
    value?: number;
    [key: string]: unknown;
  },
) => {
  if (!isGAEnabled() || isAdmin()) return;

  window.gtag?.('event', action, {
    event_category: params?.category,
    event_label: params?.label,
    value: params?.value,
    ...params,
  });
};

// ============================================
// Eventos predefinidos para FiestApp
// ============================================

/**
 * Eventos de autenticacion
 */
export const trackSignUp = (method: string = 'email') => {
  event('sign_up', {
    category: 'engagement',
    method,
  });
};

export const trackLogin = (method: string = 'email') => {
  event('login', {
    category: 'engagement',
    method,
  });
};

export const trackLogout = () => {
  event('logout', {
    category: 'engagement',
  });
};

/**
 * Eventos de experiencias
 */
export const trackExperienceView = (experienceId: string, experienceTitle: string) => {
  event('view_item', {
    category: 'experience',
    label: experienceTitle,
    item_id: experienceId,
  });
};

export const trackExperienceCreate = (experienceId: string) => {
  event('experience_created', {
    category: 'experience',
    item_id: experienceId,
  });
};

export const trackExperienceSearch = (searchTerm: string, resultsCount: number) => {
  event('search', {
    category: 'experience',
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

export const trackExperienceFilter = (filters: Record<string, unknown>) => {
  event('experience_filter', {
    category: 'experience',
    ...filters,
  });
};

/**
 * Eventos de matches
 */
export const trackMatchRequest = (experienceId: string) => {
  event('match_requested', {
    category: 'match',
    item_id: experienceId,
  });
};

export const trackMatchAccepted = (matchId: string) => {
  event('match_accepted', {
    category: 'match',
    item_id: matchId,
  });
};

export const trackMatchRejected = (matchId: string) => {
  event('match_rejected', {
    category: 'match',
    item_id: matchId,
  });
};

export const trackMatchCompleted = (matchId: string) => {
  event('match_completed', {
    category: 'match',
    item_id: matchId,
  });
};

/**
 * Eventos de pagos/wallet
 */
export const trackWalletTopup = (amount: number, method: string) => {
  event('purchase', {
    category: 'wallet',
    value: amount,
    currency: 'EUR',
    payment_method: method,
  });
};

export const trackCheckoutBegin = (amount: number) => {
  event('begin_checkout', {
    category: 'wallet',
    value: amount,
    currency: 'EUR',
  });
};

/**
 * Eventos de engagement
 */
export const trackMessageSent = (matchId: string) => {
  event('message_sent', {
    category: 'engagement',
    item_id: matchId,
  });
};

export const trackReviewSubmitted = (experienceId: string, rating: number) => {
  event('review_submitted', {
    category: 'engagement',
    item_id: experienceId,
    rating,
  });
};

export const trackFavoriteAdded = (experienceId: string) => {
  event('add_to_wishlist', {
    category: 'engagement',
    item_id: experienceId,
  });
};

export const trackFavoriteRemoved = (experienceId: string) => {
  event('remove_from_wishlist', {
    category: 'engagement',
    item_id: experienceId,
  });
};

export const trackShareExperience = (experienceId: string, method: string) => {
  event('share', {
    category: 'engagement',
    item_id: experienceId,
    method,
  });
};

/**
 * Eventos de conversion
 */
export const trackConversion = (conversionType: string, value?: number) => {
  event('conversion', {
    category: 'conversion',
    conversion_type: conversionType,
    value,
    currency: 'EUR',
  });
};

/**
 * Eventos de errores
 */
export const trackError = (errorType: string, errorMessage: string) => {
  event('exception', {
    category: 'error',
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
  });
};

/**
 * Eventos de perfil
 */
export const trackProfileComplete = () => {
  event('profile_completed', {
    category: 'engagement',
  });
};

export const trackProfileUpdate = () => {
  event('profile_updated', {
    category: 'engagement',
  });
};

/**
 * Eventos de referidos
 */
export const trackReferralShare = (method: string) => {
  event('referral_shared', {
    category: 'referral',
    method,
  });
};

export const trackReferralSignup = () => {
  event('referral_signup', {
    category: 'referral',
  });
};
