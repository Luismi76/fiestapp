'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/match';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

// Singleton socket instance to survive React Strict Mode
let globalSocket: Socket | null = null;
let globalSocketUserId: string | null = null;

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!user) {
      // User logged out - disconnect global socket
      if (globalSocket) {
        console.log('[useSocket] User logged out, disconnecting socket');
        globalSocket.disconnect();
        globalSocket = null;
        globalSocketUserId = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[useSocket] No token found');
      return;
    }

    // If socket exists for same user, reuse it
    if (globalSocket && globalSocketUserId === user.id) {
      console.log('[useSocket] Reusing existing socket for user:', user.id);
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
      return;
    }

    // Different user or no socket - create new one
    if (globalSocket && globalSocketUserId !== user.id) {
      console.log('[useSocket] Different user, disconnecting old socket');
      globalSocket.disconnect();
      globalSocket = null;
      globalSocketUserId = null;
    }

    console.log('[useSocket] Creating new socket for user:', user.id);

    const newSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    globalSocket = newSocket;
    globalSocketUserId = user.id;

    newSocket.on('connect', () => {
      console.log('[useSocket] Socket connected, id:', newSocket.id);
      if (mountedRef.current) {
        setIsConnected(true);
        setSocket(newSocket);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[useSocket] Socket disconnected, reason:', reason);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[useSocket] Socket connection error:', error.message);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    });

    // Debug: log all incoming events
    newSocket.onAny((event, ...args) => {
      console.log('[Socket Event]', event, args);
    });

    // Set socket immediately so useSocketEvent can subscribe
    setSocket(newSocket);

    return () => {
      mountedRef.current = false;
      // DON'T disconnect here - let the socket persist for Strict Mode
      // Socket will be disconnected when user logs out or changes
    };
  }, [user?.id]);

  const sendMessage = useCallback(async (matchId: string, content: string): Promise<Message | null> => {
    return new Promise((resolve, reject) => {
      if (!globalSocket?.connected) {
        console.log('[Socket] Cannot send message - not connected');
        resolve(null);
        return;
      }

      console.log('[Socket] Sending message to match:', matchId, content);
      globalSocket.emit(
        'sendMessage',
        { matchId, content },
        (response: { success: boolean; message?: Message; error?: string; requiresTopUp?: boolean }) => {
          console.log('[Socket] sendMessage response:', response);
          if (response.success && response.message) {
            resolve(response.message);
          } else if (response.requiresTopUp) {
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
    if (globalSocket?.connected) {
      console.log('[Socket] Joining match room:', matchId);
      globalSocket.emit('joinMatch', matchId, (response: { success: boolean; error?: string }) => {
        console.log('[Socket] joinMatch response:', response);
      });
    } else {
      console.log('[Socket] Cannot join match - not connected. Socket state:', globalSocket ? 'exists but disconnected' : 'null');
    }
  }, []);

  const leaveMatch = useCallback((matchId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('leaveMatch', matchId);
    }
  }, []);

  const setTyping = useCallback((matchId: string, isTyping: boolean) => {
    if (globalSocket?.connected) {
      globalSocket.emit('typing', { matchId, isTyping });
    }
  }, []);

  const markAsRead = useCallback((matchId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('markAsRead', matchId);
    }
  }, []);

  return {
    socket,
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
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socket) {
      return;
    }

    console.log(`[useSocketEvent] Subscribing to '${event}' on socket ${socket.id || 'pending'}`);

    const handler = (data: T) => {
      console.log(`[useSocketEvent] Received '${event}':`, data);
      callbackRef.current(data);
    };

    socket.on(event, handler);

    return () => {
      console.log(`[useSocketEvent] Unsubscribing from '${event}'`);
      socket.off(event, handler);
    };
  }, [socket, event]);
}
