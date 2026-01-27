import axios from 'axios';
import {
  AuthResponse,
  LoginData,
  RegisterData,
  RegisterResponse,
  User,
  VerifyEmailResponse,
  ResendVerificationResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from '@/types/auth';
import {
  Experience,
  ExperienceDetail,
  ExperiencesResponse,
  CreateExperienceData,
  UpdateExperienceData,
  ExperienceFilters,
  Festival,
  OccupancyResponse,
} from '@/types/experience';
import {
  Match,
  MatchDetail,
  CreateMatchData,
  MatchStats,
  Message,
  MatchStatus,
} from '@/types/match';
import {
  Review,
  ReviewsResponse,
  CreateReviewData,
  UpdateReviewData,
  CanReviewResponse,
} from '@/types/review';
import {
  UserPublicProfile,
  UserFullProfile,
  UpdateProfileData,
} from '@/types/user';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ============================================
// UTILIDADES
// ============================================

/**
 * Construye URLSearchParams a partir de un objeto de filtros
 * Ignora valores undefined, null y strings vacíos
 */
function buildQueryParams(filters?: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  return params;
}

/**
 * Toggle genérico para recursos (favoritos, alertas, etc.)
 * Si isActive es true, elimina el recurso (DELETE), sino lo crea (POST)
 */
async function toggleResource(endpoint: string, isActive: boolean): Promise<void> {
  if (isActive) {
    await api.delete(endpoint);
  } else {
    await api.post(endpoint);
  }
}

export const authApi = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const response = await api.get<VerifyEmailResponse>(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<ResendVerificationResponse> => {
    const response = await api.post<ResendVerificationResponse>('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<ResetPasswordResponse> => {
    const response = await api.post<ResetPasswordResponse>('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};

export const experiencesApi = {
  getAll: async (filters?: ExperienceFilters): Promise<ExperiencesResponse> => {
    const params = buildQueryParams(filters as Record<string, unknown>);
    const response = await api.get<ExperiencesResponse>(`/experiences?${params}`);
    return response.data;
  },

  getById: async (id: string): Promise<ExperienceDetail> => {
    const response = await api.get<ExperienceDetail>(`/experiences/${id}`);
    return response.data;
  },

  getMy: async (): Promise<Experience[]> => {
    const response = await api.get<Experience[]>('/experiences/my');
    return response.data;
  },

  create: async (data: CreateExperienceData): Promise<Experience> => {
    const response = await api.post<Experience>('/experiences', data);
    return response.data;
  },

  update: async (id: string, data: UpdateExperienceData): Promise<Experience> => {
    const response = await api.put<Experience>(`/experiences/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/experiences/${id}`);
  },

  togglePublished: async (id: string): Promise<Experience> => {
    const response = await api.patch<Experience>(`/experiences/${id}/toggle-published`);
    return response.data;
  },

  getOccupancy: async (id: string): Promise<OccupancyResponse> => {
    const response = await api.get<OccupancyResponse>(`/experiences/${id}/occupancy`);
    return response.data;
  },

  getCities: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/experiences/cities');
    return response.data;
  },

  // Calcular precio grupal
  calculatePrice: async (
    id: string,
    participants: number
  ): Promise<GroupPriceResult> => {
    const response = await api.get<GroupPriceResult>(
      `/experiences/${id}/calculate-price?participants=${participants}`
    );
    return response.data;
  },

  // Obtener precios grupales
  getGroupPricing: async (id: string): Promise<GroupPricingTier[]> => {
    const response = await api.get<GroupPricingTier[]>(
      `/experiences/${id}/group-pricing`
    );
    return response.data;
  },

  // Establecer precios grupales (para hosts)
  setGroupPricing: async (
    id: string,
    tiers: GroupPricingTier[]
  ): Promise<void> => {
    await api.post(`/experiences/${id}/group-pricing`, { tiers });
  },

  // Actualizar precios grupales (para hosts)
  updateGroupPricing: async (
    id: string,
    tiers: GroupPricingTier[]
  ): Promise<void> => {
    await api.put(`/experiences/${id}/group-pricing`, { tiers });
  },

  // Actualizar límites de participantes (para hosts)
  updateParticipantLimits: async (
    id: string,
    minParticipants: number,
    maxParticipants?: number | null
  ): Promise<void> => {
    await api.patch(`/experiences/${id}/participant-limits`, {
      minParticipants,
      maxParticipants,
    });
  },
};

// Group Pricing types
export interface GroupPriceResult {
  pricePerPerson: number;
  totalPrice: number;
  discount: number;
  tier: 'individual' | 'small_group' | 'large_group';
  originalPricePerPerson: number;
  savings: number;
}

export interface GroupPricingTier {
  minPeople: number;
  maxPeople: number | null;
  pricePerPerson: number;
}

// Calendar types
export interface CalendarFestival {
  id: string;
  name: string;
  city: string;
  startDate: string | null;
  endDate: string | null;
  region: string | null;
  festivalType: string | null;
  imageUrl: string | null;
  experienceCount: number;
}

export interface FestivalByMonth {
  month: number;
  monthName: string;
  festivals: CalendarFestival[];
}

export const festivalsApi = {
  getAll: async (): Promise<Festival[]> => {
    const response = await api.get<Festival[]>('/festivals');
    return response.data;
  },

  getById: async (id: string): Promise<Festival> => {
    const response = await api.get<Festival>(`/festivals/${id}`);
    return response.data;
  },

  create: async (data: { name: string; city: string; description?: string; startDate?: string; endDate?: string }): Promise<Festival> => {
    const response = await api.post<Festival>('/festivals', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; city?: string; description?: string; startDate?: string; endDate?: string }): Promise<Festival> => {
    const response = await api.put<Festival>(`/festivals/${id}`, data);
    return response.data;
  },

  seed: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post<{ message: string; count: number }>('/festivals/seed');
    return response.data;
  },

  // =============================================
  // CALENDARIO
  // =============================================

  // Obtener datos del calendario
  getCalendar: async (
    year?: number,
    filters?: { region?: string; type?: string; city?: string }
  ): Promise<FestivalByMonth[]> => {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.city) params.append('city', filters.city);

    const path = year ? `/festivals/calendar/${year}` : '/festivals/calendar';
    const response = await api.get<FestivalByMonth[]>(`${path}?${params}`);
    return response.data;
  },

  // Obtener regiones disponibles
  getRegions: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/festivals/regions');
    return response.data;
  },

  // Obtener tipos disponibles
  getTypes: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/festivals/types');
    return response.data;
  },

  // Obtener ciudades disponibles
  getCities: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/festivals/cities');
    return response.data;
  },

  // Obtener URL de Google Calendar para un festival
  getGoogleCalendarUrl: async (festivalId: string): Promise<{ url: string }> => {
    const response = await api.get<{ url: string }>(`/festivals/${festivalId}/google-calendar`);
    return response.data;
  },

  // Obtener URL de descarga iCal
  getICalUrl: (festivalId?: string, filters?: { region?: string; type?: string; city?: string }): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    if (festivalId) {
      return `${baseUrl}/festivals/${festivalId}/ical`;
    }
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.city) params.append('city', filters.city);
    return `${baseUrl}/festivals/ical?${params}`;
  },
};

export const matchesApi = {
  // Crear solicitud de match
  create: async (data: CreateMatchData): Promise<Match> => {
    const response = await api.post<Match>('/matches', data);
    return response.data;
  },

  // Obtener solicitudes recibidas (soy host)
  getReceived: async (status?: MatchStatus): Promise<Match[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<Match[]>(`/matches/received${params}`);
    return response.data;
  },

  // Obtener mis solicitudes (soy requester)
  getSent: async (status?: MatchStatus): Promise<Match[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<Match[]>(`/matches/sent${params}`);
    return response.data;
  },

  // Obtener detalle de un match
  getById: async (id: string): Promise<MatchDetail> => {
    const response = await api.get<MatchDetail>(`/matches/${id}`);
    return response.data;
  },

  // Aceptar solicitud
  accept: async (id: string, startDate?: string, endDate?: string): Promise<Match> => {
    const response = await api.patch<Match>(`/matches/${id}/accept`, { startDate, endDate });
    return response.data;
  },

  // Rechazar solicitud
  reject: async (id: string): Promise<Match> => {
    const response = await api.patch<Match>(`/matches/${id}/reject`);
    return response.data;
  },

  // Cancelar solicitud
  cancel: async (id: string): Promise<Match> => {
    const response = await api.patch<Match>(`/matches/${id}/cancel`);
    return response.data;
  },

  // Marcar como completado
  complete: async (id: string): Promise<Match> => {
    const response = await api.patch<Match>(`/matches/${id}/complete`);
    return response.data;
  },

  // Enviar mensaje
  sendMessage: async (matchId: string, content: string): Promise<Message> => {
    const response = await api.post<Message>(`/matches/${matchId}/messages`, { content });
    return response.data;
  },

  // Obtener estadísticas
  getStats: async (): Promise<MatchStats> => {
    const response = await api.get<MatchStats>('/matches/stats');
    return response.data;
  },

  // Contar mensajes no leídos
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<number>('/matches/unread-count');
    return response.data;
  },
};

export const reviewsApi = {
  // Crear reseña
  create: async (data: CreateReviewData): Promise<Review> => {
    const response = await api.post<Review>('/reviews', data);
    return response.data;
  },

  // Obtener reseñas de una experiencia
  getByExperience: async (experienceId: string, page = 1, limit = 10): Promise<ReviewsResponse> => {
    const response = await api.get<ReviewsResponse>(
      `/reviews/experience/${experienceId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Obtener reseñas recibidas por un usuario
  getReceivedByUser: async (userId: string, page = 1, limit = 10): Promise<ReviewsResponse> => {
    const response = await api.get<ReviewsResponse>(
      `/reviews/user/${userId}/received?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Obtener mis reseñas recibidas
  getMyReceived: async (page = 1, limit = 10): Promise<ReviewsResponse> => {
    const response = await api.get<ReviewsResponse>(
      `/reviews/my/received?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Obtener reseñas que he escrito
  getMyWritten: async (page = 1, limit = 10): Promise<ReviewsResponse> => {
    const response = await api.get<ReviewsResponse>(
      `/reviews/my/written?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Verificar si puedo dejar reseña
  canReview: async (experienceId: string): Promise<CanReviewResponse> => {
    const response = await api.get<CanReviewResponse>(`/reviews/can-review/${experienceId}`);
    return response.data;
  },

  // Obtener una reseña por ID
  getById: async (id: string): Promise<Review> => {
    const response = await api.get<Review>(`/reviews/${id}`);
    return response.data;
  },

  // Actualizar reseña
  update: async (id: string, data: UpdateReviewData): Promise<Review> => {
    const response = await api.put<Review>(`/reviews/${id}`, data);
    return response.data;
  },

  // Eliminar reseña
  delete: async (id: string): Promise<void> => {
    await api.delete(`/reviews/${id}`);
  },
};

export interface HostStats {
  summary: {
    totalExperiences: number;
    publishedExperiences: number;
    totalRequests: number;
    completedExperiences: number;
    completionRate: number;
    avgRating: number;
    totalFavorites: number;
  };
  experiences: {
    id: string;
    title: string;
    city: string;
    type: string;
    price: number | null;
    published: boolean;
    totalRequests: number;
    totalReviews: number;
    totalFavorites: number;
    avgRating: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    cancelled: number;
  }[];
  recentActivity: {
    id: string;
    status: string;
    createdAt: string;
    experience: { id: string; title: string };
    requester: { id: string; name: string; avatar: string | null };
  }[];
  monthlyStats: Record<string, number>;
}

export const usersApi = {
  // Obtener perfil público de un usuario
  getPublicProfile: async (userId: string): Promise<UserPublicProfile> => {
    const response = await api.get<UserPublicProfile>(`/users/${userId}`);
    return response.data;
  },

  // Obtener mi perfil completo
  getMyProfile: async (): Promise<UserFullProfile> => {
    const response = await api.get<UserFullProfile>('/users/me');
    return response.data;
  },

  // Actualizar mi perfil
  updateProfile: async (data: UpdateProfileData): Promise<UserFullProfile> => {
    const response = await api.put<UserFullProfile>('/users/me', data);
    return response.data;
  },

  // Obtener estadísticas de anfitrión
  getHostStats: async (): Promise<HostStats> => {
    const response = await api.get<HostStats>('/users/me/stats');
    return response.data;
  },
};

export const uploadsApi = {
  // Subir avatar
  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const response = await axios.post<{ avatar: string }>(
      `${API_URL}/uploads/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data;
  },

  // Eliminar avatar
  deleteAvatar: async (): Promise<void> => {
    await api.delete('/uploads/avatar');
  },

  // Subir fotos de experiencia
  uploadExperiencePhotos: async (experienceId: string, files: File[]): Promise<{ photos: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const response = await axios.post<{ photos: string[] }>(
      `${API_URL}/uploads/experiences/${experienceId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data;
  },

  // Eliminar foto de experiencia
  deleteExperiencePhoto: async (experienceId: string, photoUrl: string): Promise<void> => {
    await api.delete(`/uploads/experiences/${experienceId}/photos`, {
      data: { photoUrl },
    });
  },

  // Reordenar fotos de experiencia
  reorderExperiencePhotos: async (experienceId: string, photos: string[]): Promise<{ photos: string[] }> => {
    const response = await api.put<{ photos: string[] }>(
      `/uploads/experiences/${experienceId}/photos/reorder`,
      { photos }
    );
    return response.data;
  },
};

export interface PaymentStatus {
  requiresPayment: boolean;
  amount: number | null;
  status: string | null;
  paymentStatus: string | null;
}

// Wallet types
export interface WalletInfo {
  balance: number;
  canOperate: boolean;
  platformFee: number;
  minTopUp: number;
  operationsAvailable: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  otherUserId: string | null;
  otherUser: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const walletApi = {
  // Obtener información del monedero
  getWallet: async (): Promise<WalletInfo> => {
    const response = await api.get<WalletInfo>('/wallet');
    return response.data;
  },

  // Crear intención de recarga
  createTopUp: async (amount?: number): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    const response = await api.post('/wallet/topup', { amount });
    return response.data;
  },

  // Confirmar recarga
  confirmTopUp: async (paymentIntentId: string): Promise<void> => {
    await api.post('/wallet/topup/confirm', { paymentIntentId });
  },

  // Obtener historial de transacciones
  getTransactions: async (page = 1, limit = 20, type?: string): Promise<WalletTransactionsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.append('type', type);
    const response = await api.get<WalletTransactionsResponse>(`/wallet/transactions?${params}`);
    return response.data;
  },

  // Verificar si puede operar
  canOperate: async (): Promise<{ canOperate: boolean; requiredAmount: number }> => {
    const response = await api.get('/wallet/can-operate');
    return response.data;
  },
};

// Favorites types
export interface FavoriteExperience extends Experience {
  savedAt: string;
  hasAlert: boolean;
  favoriteId: string;
}

export interface FavoriteFestival extends Festival {
  savedAt: string;
  experienceCount: number;
}

export interface AllFavoritesResponse {
  experiences: FavoriteExperience[];
  festivals: FavoriteFestival[];
  counts: {
    experiences: number;
    festivals: number;
    total: number;
  };
}

export interface AlertStatus {
  experienceId: string;
  experienceTitle: string;
  alertEnabled: boolean;
  lastNotified: string | null;
}

export const favoritesApi = {
  // =============================================
  // EXPERIENCIAS FAVORITAS
  // =============================================

  // Obtener favoritos del usuario (experiencias)
  getFavorites: async (): Promise<FavoriteExperience[]> => {
    const response = await api.get<FavoriteExperience[]>('/favorites');
    return response.data;
  },

  // Obtener solo IDs de favoritos
  getFavoriteIds: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/favorites/ids');
    return response.data;
  },

  // Verificar si una experiencia es favorita
  isFavorite: async (experienceId: string): Promise<{ isFavorite: boolean; hasAlert: boolean }> => {
    const response = await api.get<{ isFavorite: boolean; hasAlert: boolean }>(`/favorites/${experienceId}/check`);
    return response.data;
  },

  // Anadir a favoritos
  addFavorite: async (experienceId: string): Promise<void> => {
    await api.post(`/favorites/${experienceId}`);
  },

  // Eliminar de favoritos
  removeFavorite: async (experienceId: string): Promise<void> => {
    await api.delete(`/favorites/${experienceId}`);
  },

  // Toggle favorito
  toggleFavorite: async (experienceId: string, isFavorite: boolean): Promise<void> => {
    await toggleResource(`/favorites/${experienceId}`, isFavorite);
  },

  // =============================================
  // FESTIVALES FAVORITOS
  // =============================================

  // Obtener festivales favoritos
  getFestivalFavorites: async (): Promise<FavoriteFestival[]> => {
    const response = await api.get<FavoriteFestival[]>('/favorites/festivals');
    return response.data;
  },

  // Obtener IDs de festivales favoritos
  getFestivalFavoriteIds: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/favorites/festivals/ids');
    return response.data;
  },

  // Verificar si un festival es favorito
  isFestivalFavorite: async (festivalId: string): Promise<{ isFavorite: boolean }> => {
    const response = await api.get<{ isFavorite: boolean }>(`/favorites/festivals/${festivalId}/check`);
    return response.data;
  },

  // Anadir festival a favoritos
  addFestivalFavorite: async (festivalId: string): Promise<void> => {
    await api.post(`/favorites/festivals/${festivalId}`);
  },

  // Eliminar festival de favoritos
  removeFestivalFavorite: async (festivalId: string): Promise<void> => {
    await api.delete(`/favorites/festivals/${festivalId}`);
  },

  // Toggle festival favorito
  toggleFestivalFavorite: async (festivalId: string, isFavorite: boolean): Promise<void> => {
    await toggleResource(`/favorites/festivals/${festivalId}`, isFavorite);
  },

  // =============================================
  // ALERTAS DE DISPONIBILIDAD
  // =============================================

  // Obtener estado de todas las alertas
  getAlertsStatus: async (): Promise<AlertStatus[]> => {
    const response = await api.get<AlertStatus[]>('/favorites/alerts');
    return response.data;
  },

  // Activar alerta de disponibilidad
  enableAlert: async (experienceId: string): Promise<void> => {
    await api.post(`/favorites/${experienceId}/alert`);
  },

  // Desactivar alerta de disponibilidad
  disableAlert: async (experienceId: string): Promise<void> => {
    await api.delete(`/favorites/${experienceId}/alert`);
  },

  // Toggle alerta
  toggleAlert: async (experienceId: string, hasAlert: boolean): Promise<void> => {
    await toggleResource(`/favorites/${experienceId}/alert`, hasAlert);
  },

  // =============================================
  // COMBINADO
  // =============================================

  // Obtener todo (experiencias + festivales)
  getAllFavorites: async (): Promise<AllFavoritesResponse> => {
    const response = await api.get<AllFavoritesResponse>('/favorites/all');
    return response.data;
  },
};

export const paymentsApi = {
  // Crear Payment Intent
  createPaymentIntent: async (matchId: string): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    const response = await api.post(`/payments/create-intent/${matchId}`);
    return response.data;
  },

  // Obtener estado del pago
  getPaymentStatus: async (matchId: string): Promise<PaymentStatus> => {
    const response = await api.get<PaymentStatus>(`/payments/status/${matchId}`);
    return response.data;
  },

  // Liberar pago al anfitrión
  releasePayment: async (matchId: string): Promise<void> => {
    await api.post(`/payments/release/${matchId}`);
  },
};

// Admin types
export interface AdminDashboardStats {
  users: {
    total: number;
    verified: number;
    unverified: number;
  };
  experiences: {
    total: number;
    published: number;
    drafts: number;
  };
  matches: {
    total: number;
    accepted: number;
    completed: number;
  };
  reviews: number;
  revenue: {
    platformCommissions: number;  // Ingresos reales de la plataforma (comisiones 1.5€)
    agreementsClosed: number;     // Numero de acuerdos cerrados
    userTopups: number;           // Total recargado por usuarios
    topupsCount: number;          // Numero de recargas
    totalWalletBalance: number;   // Saldo total en monederos
  };
  recentUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    verified: boolean;
  }[];
  recentExperiences: {
    id: string;
    title: string;
    city: string;
    published: boolean;
    createdAt: string;
    host: { name: string };
  }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  city: string | null;
  createdAt: string;
  _count: {
    experiences: number;
    matchesAsHost: number;
    matchesAsRequester: number;
  };
}

export interface AdminExperience {
  id: string;
  title: string;
  city: string;
  type: string;
  price: number | null;
  published: boolean;
  createdAt: string;
  host: { id: string; name: string; email: string };
  festival: { name: string };
  _count: {
    matches: number;
    reviews: number;
  };
}

export interface PaginatedResponse {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminUsersResponse extends PaginatedResponse {
  users: AdminUser[];
}

export interface AdminExperiencesResponse extends PaginatedResponse {
  experiences: AdminExperience[];
}

// Reports types
export interface Report {
  id: string;
  reporterId: string;
  reportedType: 'user' | 'experience' | 'match';
  reportedId: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  reporter?: { id: string; name: string; email: string };
  reportedEntity?: unknown;
}

export interface ReportsResponse extends PaginatedResponse {
  reports: Report[];
}

export interface ReportStats {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  total: number;
}

export interface CreateReportData {
  reportedType: 'user' | 'experience' | 'match';
  reportedId: string;
  reason: 'spam' | 'inappropriate' | 'fraud' | 'harassment' | 'other';
  description?: string;
}

export const reportsApi = {
  // Create a report
  create: async (data: CreateReportData): Promise<Report> => {
    const response = await api.post<Report>('/reports', data);
    return response.data;
  },

  // Get my reports
  getMyReports: async (): Promise<Report[]> => {
    const response = await api.get<Report[]>('/reports/my');
    return response.data;
  },

  // Admin: Get all reports
  getAll: async (
    page = 1,
    limit = 20,
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  ): Promise<ReportsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await api.get<ReportsResponse>(`/reports/admin?${params}`);
    return response.data;
  },

  // Admin: Get stats
  getStats: async (): Promise<ReportStats> => {
    const response = await api.get<ReportStats>('/reports/admin/stats');
    return response.data;
  },

  // Admin: Update report status
  updateStatus: async (
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string
  ): Promise<Report> => {
    const response = await api.put<Report>(`/reports/admin/${reportId}`, {
      status,
      adminNotes,
    });
    return response.data;
  },

  // Admin: Get reports with advanced filters
  getAdvanced: async (
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      reportedType?: string;
      reason?: string;
      priority?: 'low' | 'medium' | 'high';
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ReportsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.reportedType) params.append('reportedType', filters.reportedType);
      if (filters.reason) params.append('reason', filters.reason);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
    }
    const response = await api.get<ReportsResponse>(`/reports/admin/advanced?${params}`);
    return response.data;
  },

  // Admin: Get report detail
  getDetail: async (reportId: string): Promise<Report & { context?: unknown; templates?: unknown }> => {
    const response = await api.get(`/reports/admin/${reportId}/detail`);
    return response.data;
  },

  // Admin: Resolve report with action
  resolve: async (
    reportId: string,
    resolution: {
      status: 'resolved' | 'dismissed';
      action?: 'none' | 'warning' | 'strike' | 'ban' | 'remove_content';
      templateKey?: string;
      customMessage?: string;
      adminNotes?: string;
    }
  ): Promise<Report> => {
    const response = await api.post<Report>(`/reports/admin/${reportId}/resolve`, resolution);
    return response.data;
  },

  // Admin: Get advanced stats
  getAdvancedStats: async (days = 30): Promise<{
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    byReason: { reason: string; count: number }[];
    avgResolutionHours: number;
    dailyTrends: { date: string; count: number }[];
  }> => {
    const response = await api.get(`/reports/admin/stats/advanced?days=${days}`);
    return response.data;
  },
};

// Badges types
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sortOrder: number;
}

export interface UserBadge {
  id: string;
  earnedAt: string;
  badge: Badge;
}

export interface UserReputation {
  verified: boolean;
  memberSince: string;
  totalExperiences: number;
  completedAsHost: number;
  completedAsRequester: number;
  totalReviews: number;
  avgRating: number;
  badges: {
    code: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }[];
}

export const badgesApi = {
  // Obtener todos los badges disponibles
  getAllBadges: async (): Promise<Badge[]> => {
    const response = await api.get<Badge[]>('/badges');
    return response.data;
  },

  // Obtener mis badges
  getMyBadges: async (): Promise<UserBadge[]> => {
    const response = await api.get<UserBadge[]>('/badges/my');
    return response.data;
  },

  // Obtener badges de un usuario
  getUserBadges: async (userId: string): Promise<UserBadge[]> => {
    const response = await api.get<UserBadge[]>(`/badges/user/${userId}`);
    return response.data;
  },

  // Obtener reputacion de un usuario
  getUserReputation: async (userId: string): Promise<UserReputation> => {
    const response = await api.get<UserReputation>(`/badges/reputation/${userId}`);
    return response.data;
  },

  // Obtener mi reputacion
  getMyReputation: async (): Promise<UserReputation> => {
    const response = await api.get<UserReputation>('/badges/reputation/my');
    return response.data;
  },

  // Verificar y asignar badges pendientes
  checkBadges: async (): Promise<{ message: string; awarded: string[] }> => {
    const response = await api.post<{ message: string; awarded: string[] }>('/badges/check');
    return response.data;
  },
};

// Chart data types
export interface ChartDataPoint {
  month: string;
  count?: number;
  revenue?: number;
}

export interface MatchesStats {
  completed: number;
  cancelled: number;
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
  completionRate: number;
  cancellationRate: number;
}

export interface ConversionStats {
  totalUsers: number;
  newUsersLast30Days: number;
  usersWithMatches: number;
  usersWithCompletedMatches: number;
  registrationToMatchRate: number;
  matchToCompletionRate: number;
}

export interface ActiveUsersStats {
  activeUsers: number;
  period: string;
}

export interface TopExperience {
  id: string;
  title: string;
  city: string;
  avgRating: number;
  hostName: string;
  festivalName: string | null;
  reviewCount: number;
  completedMatches: number;
}

export interface TopHost {
  id: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  city: string | null;
  experienceCount: number;
  completedMatches: number;
  avgRating: number;
  reviewCount: number;
}

export interface AdminUserAdvanced extends AdminUser {
  strikes: number;
  bannedAt: string | null;
  banReason: string | null;
  totalMatches: number;
  walletBalance: number;
  _count: {
    experiences: number;
    matchesAsHost: number;
    matchesAsRequester: number;
    reviewsGiven: number;
  };
}

export interface AdminUsersAdvancedResponse extends PaginatedResponse {
  users: AdminUserAdvanced[];
}

export interface UserFilters {
  search?: string;
  verified?: boolean;
  banned?: boolean;
  hasStrikes?: boolean;
  role?: 'user' | 'admin';
  dateFrom?: string;
  dateTo?: string;
  orderBy?: 'createdAt' | 'name' | 'email' | 'matches' | 'revenue';
  orderDir?: 'asc' | 'desc';
}

export const adminApi = {
  // Dashboard stats
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await api.get<AdminDashboardStats>('/admin/dashboard');
    return response.data;
  },

  // Users management
  getUsers: async (page = 1, limit = 20, search?: string): Promise<AdminUsersResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const response = await api.get<AdminUsersResponse>(`/admin/users?${params}`);
    return response.data;
  },

  getUsersAdvanced: async (page = 1, limit = 20, filters?: UserFilters): Promise<AdminUsersAdvancedResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.verified !== undefined) params.append('verified', String(filters.verified));
      if (filters.banned !== undefined) params.append('banned', String(filters.banned));
      if (filters.hasStrikes) params.append('hasStrikes', 'true');
      if (filters.role) params.append('role', filters.role);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.orderBy) params.append('orderBy', filters.orderBy);
      if (filters.orderDir) params.append('orderDir', filters.orderDir);
    }
    const response = await api.get<AdminUsersAdvancedResponse>(`/admin/users/advanced?${params}`);
    return response.data;
  },

  setUserRole: async (userId: string, role: 'user' | 'admin'): Promise<void> => {
    await api.post(`/admin/users/${userId}/role`, { role });
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },

  addStrike: async (userId: string, reason: string): Promise<{ strikes: number; banned: boolean }> => {
    const response = await api.post(`/admin/users/${userId}/strike`, { reason });
    return response.data;
  },

  removeStrike: async (userId: string): Promise<{ strikes: number }> => {
    const response = await api.delete(`/admin/users/${userId}/strike`);
    return response.data;
  },

  banUser: async (userId: string, reason: string): Promise<void> => {
    await api.post(`/admin/users/${userId}/ban`, { reason });
  },

  unbanUser: async (userId: string): Promise<void> => {
    await api.post(`/admin/users/${userId}/unban`);
  },

  bulkVerifyUsers: async (userIds: string[]): Promise<number> => {
    const response = await api.post('/admin/users/bulk/verify', { userIds });
    return response.data;
  },

  bulkBanUsers: async (userIds: string[], reason: string): Promise<number> => {
    const response = await api.post('/admin/users/bulk/ban', { userIds, reason });
    return response.data;
  },

  // Experiences management
  getExperiences: async (
    page = 1,
    limit = 20,
    status?: 'all' | 'published' | 'draft'
  ): Promise<AdminExperiencesResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await api.get<AdminExperiencesResponse>(`/admin/experiences?${params}`);
    return response.data;
  },

  toggleExperiencePublished: async (experienceId: string): Promise<void> => {
    await api.post(`/admin/experiences/${experienceId}/toggle-published`);
  },

  deleteExperience: async (experienceId: string): Promise<void> => {
    await api.delete(`/admin/experiences/${experienceId}`);
  },

  // Impersonate user (login as)
  impersonateUser: async (userId: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`/admin/users/${userId}/impersonate`);
    return response.data;
  },

  // Chart data
  getUsersChartData: async (months = 12): Promise<ChartDataPoint[]> => {
    const response = await api.get<ChartDataPoint[]>(`/admin/charts/users?months=${months}`);
    return response.data;
  },

  getRevenueChartData: async (months = 12): Promise<ChartDataPoint[]> => {
    const response = await api.get<ChartDataPoint[]>(`/admin/charts/revenue?months=${months}`);
    return response.data;
  },

  // Stats
  getMatchesStats: async (): Promise<MatchesStats> => {
    const response = await api.get<MatchesStats>('/admin/stats/matches');
    return response.data;
  },

  getConversionStats: async (): Promise<ConversionStats> => {
    const response = await api.get<ConversionStats>('/admin/stats/conversion');
    return response.data;
  },

  getActiveUsersStats: async (days = 7): Promise<ActiveUsersStats> => {
    const response = await api.get<ActiveUsersStats>(`/admin/stats/active-users?days=${days}`);
    return response.data;
  },

  // Top rankings
  getTopExperiences: async (limit = 10): Promise<TopExperience[]> => {
    const response = await api.get<TopExperience[]>(`/admin/top/experiences?limit=${limit}`);
    return response.data;
  },

  getTopHosts: async (limit = 10): Promise<TopHost[]> => {
    const response = await api.get<TopHost[]>(`/admin/top/hosts?limit=${limit}`);
    return response.data;
  },
};

// Search types
export interface AutocompleteExperience {
  id: string;
  title: string;
  city: string;
  type: string;
  avgRating: number;
  photo: string | null;
  category: 'experience';
}

export interface AutocompleteFestival {
  id: string;
  name: string;
  city: string;
  imageUrl: string | null;
  experienceCount: number;
  category: 'festival';
}

export interface AutocompleteCity {
  name: string;
  category: 'city';
}

export interface AutocompleteResult {
  experiences: AutocompleteExperience[];
  festivals: AutocompleteFestival[];
  cities: AutocompleteCity[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: Record<string, unknown> | null;
  searchedAt: string;
}

export interface PopularSearch {
  query: string;
  count: number;
}

export const searchApi = {
  // Autocompletado
  autocomplete: async (query: string, limit = 10): Promise<AutocompleteResult> => {
    const response = await api.get<AutocompleteResult>(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },

  // Busquedas populares
  getPopularSearches: async (limit = 10): Promise<PopularSearch[]> => {
    const response = await api.get<PopularSearch[]>(`/search/popular?limit=${limit}`);
    return response.data;
  },

  // Historial de busquedas del usuario
  getHistory: async (limit = 10): Promise<SearchHistoryItem[]> => {
    const response = await api.get<SearchHistoryItem[]>(`/search/history?limit=${limit}`);
    return response.data;
  },

  // Guardar busqueda
  saveSearch: async (query: string, filters?: Record<string, unknown>): Promise<void> => {
    await api.post('/search/history', { query, filters });
  },

  // Limpiar historial
  clearHistory: async (): Promise<void> => {
    await api.delete('/search/history');
  },

  // Eliminar una busqueda
  deleteSearch: async (searchId: string): Promise<void> => {
    await api.delete(`/search/history/${searchId}`);
  },
};

// Quick Replies types
export interface QuickReply {
  id: string;
  text: string;
  emoji: string | null;
  sortOrder: number;
  isDefault?: boolean;
}

export interface QuickRepliesResponse {
  userReplies: QuickReply[];
  defaultReplies: QuickReply[];
}

export const quickRepliesApi = {
  // Obtener todas las respuestas rapidas (usuario + predeterminadas)
  getAll: async (): Promise<QuickRepliesResponse> => {
    const response = await api.get<QuickRepliesResponse>('/quick-replies');
    return response.data;
  },

  // Obtener solo las del usuario
  getUserReplies: async (): Promise<QuickReply[]> => {
    const response = await api.get<QuickReply[]>('/quick-replies/user');
    return response.data;
  },

  // Obtener predeterminadas
  getDefaults: async (): Promise<QuickReply[]> => {
    const response = await api.get<QuickReply[]>('/quick-replies/defaults');
    return response.data;
  },

  // Crear nueva
  create: async (text: string, emoji?: string): Promise<QuickReply> => {
    const response = await api.post<QuickReply>('/quick-replies', { text, emoji });
    return response.data;
  },

  // Actualizar
  update: async (id: string, data: { text?: string; emoji?: string | null }): Promise<QuickReply> => {
    const response = await api.put<QuickReply>(`/quick-replies/${id}`, data);
    return response.data;
  },

  // Eliminar
  delete: async (id: string): Promise<void> => {
    await api.delete(`/quick-replies/${id}`);
  },

  // Reordenar
  reorder: async (replyIds: string[]): Promise<void> => {
    await api.post('/quick-replies/reorder', { replyIds });
  },
};

// Chat/Voice types
export interface VoiceUploadResponse {
  url: string;
  duration: number;
}

export const chatApi = {
  // Subir mensaje de voz
  uploadVoice: async (file: Blob, matchId: string): Promise<VoiceUploadResponse> => {
    const formData = new FormData();
    // Append with explicit type to ensure proper Content-Type in the form part
    const audioFile = new File([file], 'voice.webm', { type: file.type || 'audio/webm' });
    formData.append('audio', audioFile);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // IMPORTANT: Do NOT set Content-Type header manually for FormData
    // Axios/browser will automatically set it with the correct boundary
    const response = await axios.post<VoiceUploadResponse>(
      `${API_URL}/chat/voice/${matchId}`,
      formData,
      {
        headers: {
          // Let axios set Content-Type automatically for FormData
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data;
  },

  // Traducir mensaje (via REST para casos sin WebSocket)
  translateMessage: async (
    messageId: string,
    targetLang: string
  ): Promise<{ translatedText: string; detectedLanguage?: string }> => {
    const response = await api.post(`/chat/translate/${messageId}`, { targetLang });
    return response.data;
  },
};

// Notifications types
export type NotificationType = 'match_request' | 'match_accepted' | 'match_rejected' | 'match_completed' | 'match_cancelled' | 'new_message' | 'new_review' | 'system' | 'warning' | 'strike';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const notificationsApi = {
  // Obtener notificaciones del usuario
  getAll: async (
    page = 1,
    limit = 20,
    options?: { unreadOnly?: boolean; type?: NotificationType }
  ): Promise<NotificationsResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.type) params.append('type', options.type);
    const response = await api.get<NotificationsResponse>(`/notifications?${params}`);
    return response.data;
  },

  // Obtener conteo de no leídas
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
    return response.data;
  },

  // Marcar como leída
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  // Marcar todas como leídas
  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  // Eliminar notificación
  delete: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },
};

export default api;
