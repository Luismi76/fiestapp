'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/match';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (matchId: string, content: string) => Promise<Message | null>;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  markAsRead: (matchId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const sendMessage = useCallback(async (matchId: string, content: string): Promise<Message | null> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        resolve(null);
        return;
      }

      socketRef.current.emit(
        'sendMessage',
        { matchId, content },
        (response: { success: boolean; message?: Message; error?: string; requiresTopUp?: boolean }) => {
          if (response.success && response.message) {
            resolve(response.message);
          } else if (response.requiresTopUp) {
            // Reject with the error message so the UI can show wallet error
            reject(new Error(response.error || 'Saldo insuficiente en el monedero'));
          } else {
            console.error('Failed to send message:', response.error);
            resolve(null);
          }
        }
      );
    });
  }, []);

  const joinMatch = useCallback((matchId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('joinMatch', matchId);
    }
  }, []);

  const leaveMatch = useCallback((matchId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leaveMatch', matchId);
    }
  }, []);

  const setTyping = useCallback((matchId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { matchId, isTyping });
    }
  }, []);

  const markAsRead = useCallback((matchId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('markAsRead', matchId);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    joinMatch,
    leaveMatch,
    setTyping,
    markAsRead,
  };
}

// Hook for listening to socket events
export function useSocketEvent<T>(
  socket: Socket | null,
  event: string,
  callback: (data: T) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
}
