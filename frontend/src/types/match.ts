import { Experience, Host, Festival } from './experience';

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
  festival: {
    id: string;
    name: string;
  };
}

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
}

export interface Match {
  id: string;
  experienceId: string;
  requesterId: string;
  hostId: string;
  status: MatchStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  experience: MatchExperience;
  requester: MatchUser;
  host: MatchUser;
  _count?: {
    messages: number;
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
}

export interface MatchStats {
  asHost: Record<string, number>;
  asRequester: Record<string, number>;
}
