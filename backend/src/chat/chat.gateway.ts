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
import { LocationService } from './location.service';
import { TranslationService } from './translation.service';
import { Logger } from '@nestjs/common';
import { MessageType } from '@prisma/client';

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
    private locationService: LocationService,
    private translationService: TranslationService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(
        `[handleConnection] New connection attempt: ${client.id}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const token: string | undefined =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `[handleConnection] Client ${client.id} connected without token`,
        );
        client.disconnect();
        return;
      }

      this.logger.log(
        `[handleConnection] Token found for ${client.id}, verifying...`,
      );

      let payload: { sub: string };
      try {
        payload = this.jwtService.verify(token);
      } catch (jwtError) {
        this.logger.error(
          `[handleConnection] JWT verification failed for ${client.id}: ${jwtError}`,
        );
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      this.logger.log(`[handleConnection] JWT verified, userId: ${userId}`);
      client.userId = userId;

      // Track socket connection for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's personal room
      void client.join(`user:${userId}`);

      // Join all match rooms the user is part of
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ hostId: client.userId }, { requesterId: client.userId }],
          status: { in: ['pending', 'accepted'] },
        },
        select: { id: true, hostId: true, requesterId: true, status: true },
      });

      this.logger.log(
        `[handleConnection] User ${client.userId} has ${matches.length} active matches`,
      );

      for (const match of matches) {
        void client.join(`match:${match.id}`);
        this.logger.log(
          `[handleConnection] User ${client.userId} (socket ${client.id}) joined match:${match.id}`,
        );
      }

      this.logger.log(
        `User ${client.userId} connected with socket ${client.id}. Auto-joined ${matches.length} match rooms.`,
      );
      client.emit('connected', { userId: client.userId });
    } catch (error) {
      this.logger.error(
        `[handleConnection] CRITICAL ERROR for ${client.id}:`,
        error,
      );
      this.logger.error(
        `[handleConnection] Error stack:`,
        error instanceof Error ? error.stack : 'no stack',
      );
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
      this.logger.log(
        `User ${client.userId} disconnected (socket ${client.id})`,
      );
    }
  }

  @SubscribeMessage('joinMatch')
  async handleJoinMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() matchId: string,
  ) {
    this.logger.log(
      `[joinMatch] User ${client.userId} requesting to join match ${matchId}`,
    );

    if (!client.userId) {
      this.logger.warn(`[joinMatch] No userId on client`);
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Verify user is part of this match
      const match = await this.prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [{ hostId: client.userId }, { requesterId: client.userId }],
        },
      });

      if (!match) {
        this.logger.warn(
          `[joinMatch] User ${client.userId} has no access to match ${matchId}`,
        );
        return { success: false, error: 'No access to this match' };
      }

      this.logger.log(`[joinMatch] Match found, checking balance...`);

      // Verify user has enough balance to use chat
      const hasBalance = await this.walletService.hasEnoughBalance(
        client.userId,
      );
      if (!hasBalance) {
        this.logger.warn(
          `[joinMatch] User ${client.userId} has insufficient balance`,
        );
        return {
          success: false,
          error: `Necesitas al menos ${PLATFORM_FEE}€ en tu monedero para acceder al chat. Recarga tu saldo.`,
          requiresTopUp: true,
          requiredAmount: PLATFORM_FEE,
        };
      }

      this.logger.log(`[joinMatch] Balance OK, joining room...`);
      void client.join(`match:${matchId}`);

      // Debug: check sockets in room after joining (use optional chaining for safety)
      const room = this.server?.sockets?.adapter?.rooms?.get(
        `match:${matchId}`,
      );
      const socketsInRoom = room ? Array.from(room) : [];
      this.logger.log(
        `[joinMatch] User ${client.userId} (socket ${client.id}) joined match:${matchId}`,
      );
      this.logger.log(`[joinMatch] Sockets in room: ${socketsInRoom.length}`);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `[joinMatch] Error for user ${client.userId} joining match ${matchId}:`,
        error,
      );
      return { success: false, error: 'Error joining match' };
    }
  }

  @SubscribeMessage('leaveMatch')
  handleLeaveMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() matchId: string,
  ) {
    void client.leave(`match:${matchId}`);
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
      const hasBalance = await this.walletService.hasEnoughBalance(
        client.userId,
      );
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

      // Get the other user info
      const otherUserId =
        match.hostId === client.userId ? match.requesterId : match.hostId;

      this.logger.log(
        `[sendMessage] Broadcasting to match:${data.matchId}, other user: ${otherUserId}`,
      );

      // Broadcast message to all users in the match room
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);

      // ALSO emit directly to the other user's personal room as backup
      this.server.to(`user:${otherUserId}`).emit('newMessage', message);

      // Notification for badge updates
      this.server.to(`user:${otherUserId}`).emit('messageNotification', {
        matchId: data.matchId,
        message,
      });

      this.logger.log(`[sendMessage] Message sent successfully`);
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

  // Enviar mensaje de voz
  @SubscribeMessage('sendVoiceMessage')
  async handleSendVoiceMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { matchId: string; voiceUrl: string; duration: number },
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check rate limit
    if (!this.checkRateLimit(client.userId)) {
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

      // Verify balance
      const hasBalance = await this.walletService.hasEnoughBalance(
        client.userId,
      );
      if (!hasBalance) {
        return {
          success: false,
          error: `Necesitas al menos ${PLATFORM_FEE}€ en tu monedero para usar el chat.`,
          requiresTopUp: true,
        };
      }

      // Create voice message
      const message = await this.prisma.message.create({
        data: {
          matchId: data.matchId,
          senderId: client.userId,
          content: '🎤 Mensaje de voz',
          type: MessageType.VOICE,
          voiceUrl: data.voiceUrl,
          voiceDuration: data.duration,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Update match
      await this.prisma.match.update({
        where: { id: data.matchId },
        data: { updatedAt: new Date() },
      });

      // Broadcast
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);

      // Notify other user
      const otherUserId =
        match.hostId === client.userId ? match.requesterId : match.hostId;
      this.server.to(`user:${otherUserId}`).emit('messageNotification', {
        matchId: data.matchId,
        message,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending voice message: ${error}`);
      return { success: false, error: 'Failed to send voice message' };
    }
  }

  // Enviar mensaje de ubicación
  @SubscribeMessage('sendLocationMessage')
  async handleSendLocationMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      matchId: string;
      latitude: number;
      longitude: number;
      locationName?: string;
    },
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!this.checkRateLimit(client.userId)) {
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

      // Verify balance
      const hasBalance = await this.walletService.hasEnoughBalance(
        client.userId,
      );
      if (!hasBalance) {
        return {
          success: false,
          error: `Necesitas al menos ${PLATFORM_FEE}€ en tu monedero para usar el chat.`,
          requiresTopUp: true,
        };
      }

      // Get location name if not provided
      let locationName = data.locationName;
      if (!locationName) {
        locationName = await this.locationService.reverseGeocode(
          data.latitude,
          data.longitude,
        );
      }

      // Create location message
      const message = await this.prisma.message.create({
        data: {
          matchId: data.matchId,
          senderId: client.userId,
          content: `📍 ${locationName}`,
          type: MessageType.LOCATION,
          latitude: data.latitude,
          longitude: data.longitude,
          locationName,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Update match
      await this.prisma.match.update({
        where: { id: data.matchId },
        data: { updatedAt: new Date() },
      });

      // Broadcast
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);

      // Notify other user
      const otherUserId =
        match.hostId === client.userId ? match.requesterId : match.hostId;
      this.server.to(`user:${otherUserId}`).emit('messageNotification', {
        matchId: data.matchId,
        message,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending location message: ${error}`);
      return { success: false, error: 'Failed to send location message' };
    }
  }

  // Solicitar traducción de un mensaje
  @SubscribeMessage('requestTranslation')
  async handleRequestTranslation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; targetLang: string },
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await this.translationService.translateMessage(
        data.messageId,
        data.targetLang,
      );

      // Emit translation result to the requesting user
      client.emit('messageTranslated', {
        messageId: data.messageId,
        translation: result.translatedText,
        originalLang: result.detectedLanguage,
        targetLang: data.targetLang,
      });

      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`Error translating message: ${error}`);
      return { success: false, error: 'Failed to translate message' };
    }
  }

  // Enviar respuesta rápida (simplemente un mensaje de texto normal)
  @SubscribeMessage('sendQuickReply')
  async handleSendQuickReply(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; text: string },
  ) {
    // Reutilizar la lógica de sendMessage
    return this.handleSendMessage(client, {
      matchId: data.matchId,
      content: data.text,
    });
  }

  /**
   * Método público para emitir un nuevo mensaje desde el controller REST.
   * Útil para mensajes de voz que se suben via HTTP pero deben notificarse via WebSocket.
   */
  emitNewMessage(
    matchId: string,
    message: unknown,
    senderId: string,
    otherUserId: string,
  ) {
    // Emitir a la sala del match
    this.server.to(`match:${matchId}`).emit('newMessage', message);

    // Notificar al otro usuario para actualizar badges
    this.server.to(`user:${otherUserId}`).emit('messageNotification', {
      matchId,
      message,
    });

    this.logger.log(
      `[emitNewMessage] Emitted to match:${matchId} and user:${otherUserId}`,
    );
  }
}
