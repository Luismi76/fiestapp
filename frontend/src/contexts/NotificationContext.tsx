'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi, Notification } from '@/lib/api';
import logger from '@/lib/logger';

// Map notification types to toast types
const notificationTypeToToastType: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  match_request: 'info',
  match_accepted: 'success',
  match_rejected: 'warning',
  match_completed: 'success',
  match_cancelled: 'warning',
  new_message: 'info',
  new_review: 'success',
  reminder_3_days: 'info',
  reminder_1_day: 'warning',
  review_request: 'info',
  badge_earned: 'success',
  wallet_charged: 'info',
  wallet_low_balance: 'warning',
  referral_signup: 'success',
  referral_credit: 'success',
  system: 'info',
  warning: 'warning',
  strike: 'error',
};

interface NotificationContextType {
  unreadCount: number;
  recentNotifications: Notification[];
  isConnected: boolean;
  refreshCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);

  // Fetch initial unread count from backend
  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const { unreadCount: count } = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      logger.error('Failed to fetch notification count:', error);
    }
  }, [isAuthenticated]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      void refreshCount();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [isAuthenticated, refreshCount]);

  // Handle incoming real-time notifications
  const handleNotification = useCallback(
    (notification: Notification) => {
      logger.socket('Received real-time notification:', notification);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Add to recent notifications (keep last 10)
      setRecentNotifications((prev) => [notification, ...prev].slice(0, 10));

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

  // Subscribe to WebSocket notification events
  useSocketEvent(socket, 'notification', handleNotification);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setRecentNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    // Sync with backend
    try {
      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      // Revert on error
      void refreshCount();
    }
  }, [refreshCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setUnreadCount(0);
    setRecentNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Sync with backend
    try {
      await notificationsApi.markAllAsRead();
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      // Revert on error
      void refreshCount();
    }
  }, [refreshCount]);

  // Clear state when user changes
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        isConnected,
        refreshCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
