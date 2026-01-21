import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService, PLATFORM_FEE } from '../wallet/wallet.service';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Simple rate limiter for WebSocket
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MESSAGE_RATE_LIMIT = 30; // 30 mensajes por minuto
const RATE_LIMIT_WINDOW = 60000; // 1 minuto

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private messageRateLimits = new Map<string, RateLimitEntry>(); // userId -> rate limit data

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub as string;
      client.userId = userId;

      // Track socket connection for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's personal room
      client.join(`user:${userId}`);

      // Join all match rooms the user is part of
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ hostId: client.userId }, { requesterId: client.userId }],
          status: { in: ['pending', 'accepted'] },
        },
        select: { id: true },
      });

      for (const match of matches) {
        client.join(`match:${match.id}`);
      }

      this.logger.log(`User ${client.userId} connected with socket ${client.id}`);
      client.emit('connected', { userId: client.userId });
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userId} disconnected (socket ${client.id})`);
    }
  }

  @SubscribeMessage('joinMatch')
  async handleJoinMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() matchId: string,
  ) {
    if (!client.userId) return;

    // Verify user is part of this match
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ hostId: client.userId }, { requesterId: client.userId }],
      },
    });

    if (!match) {
      return { success: false, error: 'No access to this match' };
    }

    // Verify user has enough balance to use chat
    const hasBalance = await this.walletService.hasEnoughBalance(client.userId);
    if (!hasBalance) {
      return {
        success: false,
        error: `Necesitas al menos ${PLATFORM_FEE}€ en tu monedero para acceder al chat. Recarga tu saldo.`,
        requiresTopUp: true,
        requiredAmount: PLATFORM_FEE,
      };
    }

    client.join(`match:${matchId}`);
    this.logger.log(`User ${client.userId} joined match room ${matchId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveMatch')
  handleLeaveMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() matchId: string,
  ) {
    client.leave(`match:${matchId}`);
    return { success: true };
  }

  // Check rate limit for a user
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.messageRateLimits.get(userId);

    if (!entry || now > entry.resetAt) {
      // Reset or create new entry
      this.messageRateLimits.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (entry.count >= MESSAGE_RATE_LIMIT) {
      return false;
    }

    entry.count++;
    return true;
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; content: string },
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check rate limit
    if (!this.checkRateLimit(client.userId)) {
      this.logger.warn(`Rate limit exceeded for user ${client.userId}`);
      return {
        success: false,
        error: 'Demasiados mensajes. Espera un momento antes de enviar más.',
      };
    }

    try {
      // Verify user is part of this match
      const match = await this.prisma.match.findFirst({
        where: {
          id: data.matchId,
          OR: [{ hostId: client.userId }, { requesterId: client.userId }],
          status: { notIn: ['rejected', 'cancelled'] },
        },
      });

      if (!match) {
        return { success: false, error: 'No access to this match' };
      }

      // Verify user has enough balance to use chat
      const hasBalance = await this.walletService.hasEnoughBalance(client.userId);
      if (!hasBalance) {
        return {
          success: false,
          error: `Necesitas al menos ${PLATFORM_FEE}€ en tu monedero para usar el chat. Recarga tu saldo.`,
          requiresTopUp: true,
          requiredAmount: PLATFORM_FEE,
        };
      }

      // Create message in database
      const message = await this.prisma.message.create({
        data: {
          matchId: data.matchId,
          senderId: client.userId,
          content: data.content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      // Update match's updatedAt
      await this.prisma.match.update({
        where: { id: data.matchId },
        data: { updatedAt: new Date() },
      });

      // Broadcast message to all users in the match room
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);

      // Also notify the other user specifically (for badge updates)
      const otherUserId =
        match.hostId === client.userId ? match.requesterId : match.hostId;
      this.server.to(`user:${otherUserId}`).emit('messageNotification', {
        matchId: data.matchId,
        message,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`);
      return { success: false, error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    // Broadcast typing indicator to others in the match room
    client.to(`match:${data.matchId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() matchId: string,
  ) {
    if (!client.userId) return;

    await this.prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: client.userId },
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }

  // Method to check if a user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Method to send notification to a specific user
  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
