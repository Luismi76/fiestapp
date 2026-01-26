'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket, useSocketEvent } from './useSocket';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';

// Types matching backend NotificationResponseDto
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date | string;
}

// Map notification types to toast types
const notificationTypeToToastType: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  match_request: 'info',
  match_accepted: 'success',
  match_rejected: 'warning',
  match_completed: 'success',
  new_message: 'info',
  reminder_3_days: 'info',
  reminder_1_day: 'warning',
  review_request: 'info',
  badge_earned: 'success',
  wallet_charged: 'info',
  wallet_low_balance: 'warning',
  referral_signup: 'success',
  referral_credit: 'success',
  system: 'info',
};

export interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  isConnected: boolean;
  clearNotifications: () => void;
}

export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const toast = useToast();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  // Handle incoming notifications
  const handleNotification = useCallback(
    (notification: RealtimeNotification) => {
      logger.socket('Received real-time notification:', notification);

      // Add to local state
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50

      // Show toast
      const toastType = notificationTypeToToastType[notification.type] || 'info';
      toast.addToast({
        type: toastType,
        title: notification.title,
        message: notification.message,
        duration: 6000,
      });
    },
    [toast]
  );

  // Subscribe to notification events
  useSocketEvent(socket, 'notification', handleNotification);

  // Clear notifications when user changes
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
    }
  }, [user?.id]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    clearNotifications,
  };
}
