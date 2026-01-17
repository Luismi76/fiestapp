export interface ReviewAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
}

export interface ReviewTarget {
  id: string;
  name: string;
  avatar?: string;
}

export interface ReviewExperience {
  id: string;
  title: string;
  festival?: {
    name: string;
  };
}

export interface Review {
  id: string;
  experienceId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthor;
  target?: ReviewTarget;
  experience?: ReviewExperience;
}

export interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  distribution?: Record<number, number>;
}

export interface ReviewsResponse {
  data: Review[];
  stats: ReviewStats;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateReviewData {
  experienceId: string;
  targetId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
  existingReview?: Review;
  match?: {
    id: string;
    experienceId: string;
  };
  targetUser?: {
    id: string;
    name: string;
  };
}
