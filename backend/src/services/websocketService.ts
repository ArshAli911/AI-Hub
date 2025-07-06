import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { 
  SocketUser, 
  ChatMessage, 
  ChatRoom, 
  RealTimeNotification, 
  TypingIndicator, 
  OnlineStatus,
  SocketEvents,
  LiveUpdate
} from '../types/realtime';
import { RBACService } from './rbacService';
import { AuditService } from './auditService';
import logger from './loggerService';

export class WebSocketService {
  private static io: SocketIOServer;
  private static connectedUsers: Map<string, SocketUser> = new Map();
  private static userRooms: Map<string, Set<string>> = new Map();
  private static typingUsers: Map<string, TypingIndicator> = new Map();
  private static db = getFirestore();

  /**
   * Initialize Socket.IO server
   */
  static initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'http://localhost:19006',
          'http://localhost:8081',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private static setupEventHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decodedToken = await getAuth().verifyIdToken(token);
        const userRecord = await getAuth().getUser(decodedToken.uid);
        const customClaims = userRecord.customClaims as any;

        socket.data.user = {
          uid: decodedToken.uid,
          email: decodedToken.email || userRecord.email || '',
          role: customClaims?.role || 'user',
          permissions: customClaims?.permissions || [],
        };

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on(SocketEvents.CONNECT, (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   */
  private static handleConnection(socket: any): void {
    const user = socket.data.user;
    
    // Add user to connected users
    const socketUser: SocketUser = {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      socketId: socket.id,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.connectedUsers.set(user.uid, socketUser);
    this.userRooms.set(user.uid, new Set());

    logger.info(`User connected: ${user.email} (${user.uid})`);

    // Join user's personal room
    socket.join(`user:${user.uid}`);

    // Send online status to other users
    this.broadcastOnlineStatus(user.uid, 'online');

    // Send user's current rooms
    this.sendUserRooms(socket, user.uid);

    // Handle disconnection
    socket.on(SocketEvents.DISCONNECT, () => {
      this.handleDisconnection(socket, user.uid);
    });

    // Handle joining rooms
    socket.on(SocketEvents.JOIN_ROOM, (roomId: string) => {
      this.handleJoinRoom(socket, user.uid, roomId);
    });

    // Handle leaving rooms
    socket.on(SocketEvents.LEAVE_ROOM, (roomId: string) => {
      this.handleLeaveRoom(socket, user.uid, roomId);
    });

    // Handle sending messages
    socket.on(SocketEvents.SEND_MESSAGE, (data: { roomId: string; message: string; type?: string }) => {
      this.handleSendMessage(socket, user.uid, data);
    });

    // Handle typing indicators
    socket.on(SocketEvents.TYPING_START, (roomId: string) => {
      this.handleTypingStart(socket, user.uid, roomId);
    });

    socket.on(SocketEvents.TYPING_STOP, (roomId: string) => {
      this.handleTypingStop(socket, user.uid, roomId);
    });

    // Handle notification read
    socket.on(SocketEvents.NOTIFICATION_READ, (notificationId: string) => {
      this.handleNotificationRead(socket, user.uid, notificationId);
    });

    // Handle status updates
    socket.on(SocketEvents.STATUS_UPDATE, (status: OnlineStatus['status']) => {
      this.handleStatusUpdate(socket, user.uid, status);
    });
  }

  /**
   * Handle socket disconnection
   */
  private static handleDisconnection(socket: any, userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      // Update last activity
      user.lastActivity = Date.now();
      
      // Remove from connected users
      this.connectedUsers.delete(userId);
      this.userRooms.delete(userId);

      // Remove typing indicators
      this.typingUsers.delete(userId);

      // Broadcast offline status
      this.broadcastOnlineStatus(userId, 'offline');

      logger.info(`User disconnected: ${user.email} (${userId})`);

      // Log the disconnection
      AuditService.logEvent(
        'system',
        'system@aihub.com',
        'USER_DISCONNECTED',
        'websocket',
        { userId, socketId: socket.id },
        userId
      );
    }
  }

  /**
   * Handle joining a room
   */
  private static handleJoinRoom(socket: any, userId: string, roomId: string): void {
    try {
      // Check if user has permission to join the room
      this.checkRoomAccess(userId, roomId).then((hasAccess) => {
        if (!hasAccess) {
          socket.emit(SocketEvents.ERROR, { message: 'Access denied to room' });
          return;
        }

        socket.join(roomId);
        
        // Add room to user's rooms
        const userRooms = this.userRooms.get(userId) || new Set();
        userRooms.add(roomId);
        this.userRooms.set(userId, userRooms);

        // Notify room about new user
        socket.to(roomId).emit(SocketEvents.LIVE_UPDATE, {
          type: 'user_joined',
          data: { userId, roomId },
          timestamp: Date.now(),
        } as LiveUpdate);

        logger.info(`User ${userId} joined room ${roomId}`);

        // Send room history
        this.sendRoomHistory(socket, roomId);
      });
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leaving a room
   */
  private static handleLeaveRoom(socket: any, userId: string, roomId: string): void {
    socket.leave(roomId);
    
    // Remove room from user's rooms
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
    }

    // Notify room about user leaving
    socket.to(roomId).emit(SocketEvents.LIVE_UPDATE, {
      type: 'user_left',
      data: { userId, roomId },
      timestamp: Date.now(),
    } as LiveUpdate);

    logger.info(`User ${userId} left room ${roomId}`);
  }

  /**
   * Handle sending a message
   */
  private static async handleSendMessage(socket: any, userId: string, data: { roomId: string; message: string; type?: string }): Promise<void> {
    try {
      const { roomId, message, type = 'text' } = data;

      // Check if user is in the room
      const userRooms = this.userRooms.get(userId);
      if (!userRooms || !userRooms.has(roomId)) {
        socket.emit(SocketEvents.ERROR, { message: 'Not in room' });
        return;
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        senderId: userId,
        senderName: this.connectedUsers.get(userId)?.displayName || 'Unknown',
        message,
        timestamp: Date.now(),
        type: type as any,
      };

      // Save message to Firestore
      await this.db.collection('chat_messages').doc(chatMessage.id).set(chatMessage);

      // Update room's last message
      await this.db.collection('chat_rooms').doc(roomId).update({
        lastMessage: chatMessage,
        lastActivity: Date.now(),
      });

      // Broadcast message to room
      this.io.to(roomId).emit(SocketEvents.MESSAGE_RECEIVED, chatMessage);

      // Send live update
      this.io.to(roomId).emit(SocketEvents.LIVE_UPDATE, {
        type: 'message_sent',
        data: { message: chatMessage },
        timestamp: Date.now(),
      } as LiveUpdate);

      // Log the message
      AuditService.logEvent(
        userId,
        this.connectedUsers.get(userId)?.email || 'unknown',
        'CHAT_MESSAGE_SENT',
        'chat',
        { roomId, messageId: chatMessage.id },
        userId
      );

      logger.info(`Message sent in room ${roomId} by user ${userId}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing start
   */
  private static handleTypingStart(socket: any, userId: string, roomId: string): void {
    const user = this.connectedUsers.get(userId);
    if (!user) return;

    const typingIndicator: TypingIndicator = {
      roomId,
      userId,
      userName: user.displayName || user.email,
      isTyping: true,
      timestamp: Date.now(),
    };

    this.typingUsers.set(userId, typingIndicator);

    socket.to(roomId).emit(SocketEvents.TYPING_START, typingIndicator);
  }

  /**
   * Handle typing stop
   */
  private static handleTypingStop(socket: any, userId: string, roomId: string): void {
    this.typingUsers.delete(userId);

    socket.to(roomId).emit(SocketEvents.TYPING_STOP, {
      roomId,
      userId,
      isTyping: false,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle notification read
   */
  private static async handleNotificationRead(socket: any, userId: string, notificationId: string): Promise<void> {
    try {
      // Mark notification as read in Firestore
      await this.db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: Date.now(),
      });

      // Emit to user's personal room
      socket.emit(SocketEvents.NOTIFICATION_READ, { notificationId });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  /**
   * Handle status update
   */
  private static handleStatusUpdate(socket: any, userId: string, status: OnlineStatus['status']): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastActivity = Date.now();
      this.broadcastOnlineStatus(userId, status);
    }
  }

  /**
   * Send real-time notification to user
   */
  static async sendNotification(userId: string, notification: RealTimeNotification): Promise<void> {
    try {
      // Save notification to Firestore
      await this.db.collection('notifications').doc(notification.id).set(notification);

      // Send to user's personal room
      this.io.to(`user:${userId}`).emit(SocketEvents.NOTIFICATION_SENT, notification);

      // Send live update
      this.io.to(`user:${userId}`).emit(SocketEvents.LIVE_UPDATE, {
        type: 'notification',
        data: { notification },
        timestamp: Date.now(),
      } as LiveUpdate);

      logger.info(`Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Broadcast online status
   */
  private static broadcastOnlineStatus(userId: string, status: OnlineStatus['status']): void {
    const user = this.connectedUsers.get(userId);
    if (!user) return;

    const onlineStatus: OnlineStatus = {
      userId,
      status,
      lastSeen: Date.now(),
      socketId: status === 'online' ? user.socketId : undefined,
    };

    // Broadcast to all connected users
    this.io.emit(SocketEvents.ONLINE_STATUS, onlineStatus);
  }

  /**
   * Send user's rooms
   */
  private static async sendUserRooms(socket: any, userId: string): Promise<void> {
    try {
      // Get user's rooms from Firestore
      const roomsSnapshot = await this.db
        .collection('chat_rooms')
        .where('participants', 'array-contains', userId)
        .get();

      const rooms = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      socket.emit('user_rooms', rooms);
    } catch (error) {
      logger.error('Error sending user rooms:', error);
    }
  }

  /**
   * Send room history
   */
  private static async sendRoomHistory(socket: any, roomId: string): Promise<void> {
    try {
      // Get last 50 messages from the room
      const messagesSnapshot = await this.db
        .collection('chat_messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const messages = messagesSnapshot.docs
        .map(doc => doc.data() as ChatMessage)
        .reverse(); // Reverse to get chronological order

      socket.emit('room_history', { roomId, messages });
    } catch (error) {
      logger.error('Error sending room history:', error);
    }
  }

  /**
   * Check if user has access to room
   */
  private static async checkRoomAccess(userId: string, roomId: string): Promise<boolean> {
    try {
      const roomDoc = await this.db.collection('chat_rooms').doc(roomId).get();
      
      if (!roomDoc.exists) {
        return false;
      }

      const roomData = roomDoc.data() as ChatRoom;
      
      // Check if user is a participant
      if (roomData.participants.includes(userId)) {
        return true;
      }

      // For community rooms, check if user has permission
      if (roomData.type === 'community') {
        const hasPermission = await RBACService.hasPermission(userId, 'read_community');
        return hasPermission;
      }

      return false;
    } catch (error) {
      logger.error('Error checking room access:', error);
      return false;
    }
  }

  /**
   * Get connected users
   */
  static getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Get user's online status
   */
  static getUserStatus(userId: string): OnlineStatus | null {
    const user = this.connectedUsers.get(userId);
    if (!user) {
      return null;
    }

    return {
      userId,
      status: 'online',
      lastSeen: user.lastActivity,
      socketId: user.socketId,
    };
  }

  /**
   * Broadcast to all users
   */
  static broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to specific room
   */
  static broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Send to specific user
   */
  static sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }
} 