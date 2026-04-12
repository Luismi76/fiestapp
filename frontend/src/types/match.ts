import { Experience, Festival } from './experience';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface MatchUser {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  city?: string;
  bio?: string;
}

export interface MatchExperience {
  id: string;
  title: string;
  type: string;
  price?: number;
  city: string;
  photos?: string[];
  depositEnabled?: boolean;
  depositPercentage?: number;
  balanceDaysBefore?: number;
  festival: {
    id: string;
    name: string;
  };
}

export type MessageType = 'TEXT' | 'VOICE' | 'LOCATION' | 'QUICK_REPLY';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  // Enhanced chat fields
  type?: MessageType;
  voiceUrl?: string;
  voiceDuration?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  originalLang?: string;
  translations?: Record<string, string>;
}

export interface OfferExperience {
  id: string;
  title: string;
  type: string;
  city: string;
  photos?: string[];
  festival?: { id: string; name: string } | null;
}

export interface MatchPaymentPlan {
  id: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  depositPaid: boolean;
  depositPaidAt?: string | null;
  balanceDueDate: string;
  balancePaid: boolean;
  balancePaidAt?: string | null;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
}

export interface Match {
  id: string;
  experienceId: string;
  requesterId: string;
  hostId: string;
  status: MatchStatus;
  startDate?: string;
  endDate?: string;
  participants?: number;
  participantNames?: string[];
  totalPrice?: number;
  paymentStatus?: string;
  offerDescription?: string;
  offerExperienceId?: string;
  offerExperience?: OfferExperience | null;
  hostConfirmed?: boolean;
  requesterConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  experience: MatchExperience;
  requester: MatchUser;
  host: MatchUser;
  paymentPlan?: MatchPaymentPlan | null;
  _count?: {
    messages: number;
  };
  unreadCount?: number;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
}

export interface MatchDetail extends Match {
  experience: Experience & { festival: Festival };
  messages: Message[];
}

export interface CreateMatchData {
  experienceId: string;
  message?: string;
  startDate?: string;
  endDate?: string;
  selectedDates?: string[];
  participants?: number;
  participantNames?: string[];
  offerDescription?: string;
  offerExperienceId?: string;
}

export interface MatchStats {
  asHost: Record<string, number>;
  asRequester: Record<string, number>;
}
