'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { matchesApi } from '@/lib/api';
import { Message } from '@/types/match';
import logger from '@/lib/logger';

interface MessageContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markMatchAsRead: (matchId: string) => void;
  isConnected: boolean;
}

const MessageContext = createContext<MessageContextType | null>(null);

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, markAsRead } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count from backend
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await matchesApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      logger.error('Failed to fetch message unread count:', error);
    }
  }, [isAuthenticated]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      void refreshUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshUnreadCount]);

  // Handle incoming real-time messages to increment count
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Only increment if message is from another user
      if (message.senderId !== user?.id) {
        logger.socket('MessageContext: New message received, incrementing count');
        setUnreadCount((prev) => prev + 1);
      }
    },
    [user?.id]
  );

  // Subscribe to WebSocket message events
  useSocketEvent(socket, 'newMessage', handleNewMessage);

  // Mark match as read (both locally and via socket)
  const markMatchAsRead = useCallback(
    (matchId: string) => {
      // Use socket to mark as read
      if (isConnected) {
        markAsRead(matchId);
      }
      // Refresh count from server to get accurate number
      void refreshUnreadCount();
    },
    [isConnected, markAsRead, refreshUnreadCount]
  );

  // Clear state when user changes
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
    }
  }, [user?.id]);

  // Polling every 30 seconds for message count (fallback for when WebSocket misses messages)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      void refreshUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshUnreadCount]);

  return (
    <MessageContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        markMatchAsRead,
        isConnected,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
}
