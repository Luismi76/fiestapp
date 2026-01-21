import { IsBoolean, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export enum NotificationType {
  MATCH_REQUEST = 'match_request',
  MATCH_ACCEPTED = 'match_accepted',
  MATCH_REJECTED = 'match_rejected',
  MATCH_COMPLETED = 'match_completed',
  NEW_MESSAGE = 'new_message',
  REMINDER_3_DAYS = 'reminder_3_days',
  REMINDER_1_DAY = 'reminder_1_day',
  REVIEW_REQUEST = 'review_request',
  BADGE_EARNED = 'badge_earned',
  WALLET_CHARGED = 'wallet_charged',
  REFERRAL_SIGNUP = 'referral_signup',
  REFERRAL_CREDIT = 'referral_credit',
  SYSTEM = 'system',
}

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  data?: Record<string, unknown>;
}

export class NotificationResponseDto {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date;
}

export class NotificationListResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean = false;

  @IsOptional()
  @IsString()
  type?: NotificationType;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNewMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMatchAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMatchRejected?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  emailReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  emailReviewRequest?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  pushMatchAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  pushReminders?: boolean;
}

export class NotificationPreferencesResponseDto {
  emailNewMatch: boolean;
  emailMatchAccepted: boolean;
  emailMatchRejected: boolean;
  emailNewMessage: boolean;
  emailReminders: boolean;
  emailReviewRequest: boolean;
  emailMarketing: boolean;
  pushNewMatch: boolean;
  pushMatchAccepted: boolean;
  pushNewMessage: boolean;
  pushReminders: boolean;
}
