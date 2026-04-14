export type ExperienceType = 'pago' | 'intercambio' | 'ambos';

export interface Category {
  id: string;
  name: string;
  slug: string;
  group: 'fiesta' | 'local';
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface Host {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  city?: string;
  avgResponseTimeHours?: number | null;
  hasPartner?: boolean;
  hasFriends?: boolean;
  hasChildren?: boolean;
  childrenAges?: string;
}

export interface Festival {
  id: string;
  name: string;
  city: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  status?: 'ACTIVE' | 'CANCELLED' | 'POSTPONED';
  _count?: {
    experiences: number;
  };
}

export interface GroupPricingTier {
  minPeople: number;
  maxPeople: number | null;
  pricePerPerson: number;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  city: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  type: ExperienceType;
  category?: Category;
  categoryId?: string;
  photos: string[];
  highlights?: string[];
  idealFor?: string[];
  capacity: number;
  minParticipants?: number;
  maxParticipants?: number | null;
  groupPricing?: GroupPricingTier[];
  cancellationPolicy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE';
  depositEnabled?: boolean;
  depositPercentage?: number;
  balanceDaysBefore?: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  hostId: string;
  festivalId?: string;
  host: Host;
  festival?: Festival;
  avgRating?: number;
  _count?: {
    reviews: number;
    matches: number;
  };
  /** Solo presente en la respuesta de POST /experiences cuando se guarda como borrador por falta de Stripe Connect. */
  savedAsDraft?: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ExperienceDetail extends Experience {
  reviews?: Review[];
  availability?: (Date | string)[];
}

export interface ExperiencesResponse {
  data: Experience[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type CancellationPolicy = 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE';

export interface CreateExperienceData {
  title: string;
  description: string;
  festivalId?: string;
  categoryId: string;
  city: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  type: ExperienceType;
  photos?: string[];
  highlights?: string[];
  capacity?: number;
  minParticipants?: number;
  maxParticipants?: number | null;
  groupPricing?: GroupPricingTier[];
  availability?: string[];
  idealFor?: string[];
  cancellationPolicy?: CancellationPolicy;
  depositEnabled?: boolean;
  depositPercentage?: number;
  balanceDaysBefore?: number;
}

export interface DateOccupancy {
  date: string;
  booked: number;
  capacity: number;
  status: 'available' | 'partial' | 'full';
}

export interface OccupancyResponse {
  capacity: number;
  dates: DateOccupancy[];
}

export interface UpdateExperienceData extends Partial<CreateExperienceData> {
  published?: boolean;
  highlights?: string[];
}

export type SortBy = 'newest' | 'price_asc' | 'price_desc' | 'rating';

export interface ExperienceFilters {
  festivalId?: string;
  city?: string;
  type?: ExperienceType;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: SortBy;
  page?: number;
  limit?: number;
  hostHasPartner?: boolean;
  hostHasFriends?: boolean;
  hostHasChildren?: boolean;
  idealFor?: string[];
}
