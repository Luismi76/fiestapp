import { Experience } from './experience';
import { Review } from './review';

export interface UserPublicProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  city?: string;
  age?: number;
  hasPartner?: boolean;
  hasChildren?: boolean;
  childrenAges?: string;
  verified: boolean;
  createdAt: string;
  avgRating: number;
  _count: {
    experiences: number;
    reviewsReceived: number;
  };
  experiences: (Experience & { avgRating: number })[];
  reviews: Review[];
}

export interface UserFullProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  bio?: string;
  city?: string;
  avatar?: string;
  hasPartner?: boolean;
  hasChildren?: boolean;
  childrenAges?: string;
  verified: boolean;
  createdAt: string;
  avgRating: number;
  _count: {
    experiences: number;
    matchesAsHost: number;
    matchesAsRequester: number;
    reviewsReceived: number;
    reviewsGiven: number;
  };
  stats: {
    pendingReceived: number;
    acceptedMatches: number;
    completedMatches: number;
  };
}

export interface UpdateProfileData {
  name?: string;
  age?: number;
  bio?: string;
  city?: string;
  avatar?: string;
  hasPartner?: boolean;
  hasChildren?: boolean;
  childrenAges?: string;
}
