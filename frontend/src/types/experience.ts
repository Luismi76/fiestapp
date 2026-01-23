export type ExperienceType = 'pago' | 'intercambio' | 'ambos';

export interface Host {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  city?: string;
}

export interface Festival {
  id: string;
  name: string;
  city: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
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
  price?: number;
  type: ExperienceType;
  photos: string[];
  highlights?: string[];
  capacity: number;
  minParticipants?: number;
  maxParticipants?: number | null;
  groupPricing?: GroupPricingTier[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  hostId: string;
  festivalId: string;
  host: Host;
  festival: Festival;
  avgRating?: number;
  _count?: {
    reviews: number;
    matches: number;
  };
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

export interface CreateExperienceData {
  title: string;
  description: string;
  festivalId: string;
  city: string;
  price?: number;
  type: ExperienceType;
  photos?: string[];
  highlights?: string[];
  capacity?: number;
  minParticipants?: number;
  maxParticipants?: number | null;
  groupPricing?: GroupPricingTier[];
  availability?: string[];
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
}
