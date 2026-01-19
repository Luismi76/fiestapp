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
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
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
};

export const festivalsApi = {
  getAll: async (): Promise<Festival[]> => {
    const response = await api.get<Festival[]>('/festivals');
    return response.data;
  },

  getById: async (id: string): Promise<Festival> => {
    const response = await api.get<Festival>(`/festivals/${id}`);
    return response.data;
  },

  create: async (data: { name: string; city: string; description?: string }): Promise<Festival> => {
    const response = await api.post<Festival>('/festivals', data);
    return response.data;
  },

  seed: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post<{ message: string; count: number }>('/festivals/seed');
    return response.data;
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
  getTransactions: async (page = 1, limit = 20): Promise<WalletTransactionsResponse> => {
    const response = await api.get<WalletTransactionsResponse>(`/wallet/transactions?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Verificar si puede operar
  canOperate: async (): Promise<{ canOperate: boolean; requiredAmount: number }> => {
    const response = await api.get('/wallet/can-operate');
    return response.data;
  },
};

export const favoritesApi = {
  // Obtener favoritos del usuario
  getFavorites: async (): Promise<Experience[]> => {
    const response = await api.get<Experience[]>('/favorites');
    return response.data;
  },

  // Obtener solo IDs de favoritos
  getFavoriteIds: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/favorites/ids');
    return response.data;
  },

  // Verificar si una experiencia es favorita
  isFavorite: async (experienceId: string): Promise<{ isFavorite: boolean }> => {
    const response = await api.get<{ isFavorite: boolean }>(`/favorites/${experienceId}/check`);
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
    if (isFavorite) {
      await api.delete(`/favorites/${experienceId}`);
    } else {
      await api.post(`/favorites/${experienceId}`);
    }
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
  revenue: number;
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

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminUsersResponse extends PaginatedResponse<AdminUser> {
  users: AdminUser[];
}

export interface AdminExperiencesResponse extends PaginatedResponse<AdminExperience> {
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

export interface ReportsResponse extends PaginatedResponse<Report> {
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
};

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

  setUserRole: async (userId: string, role: 'user' | 'admin'): Promise<void> => {
    await api.post(`/admin/users/${userId}/role`, { role });
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
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
};

export default api;
