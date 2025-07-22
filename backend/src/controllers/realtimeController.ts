import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { firestore } from '../config/firebaseAdmin';
import logger from '../services/loggerService';
import { verifyToken } from '../middleware/authMiddleware';

// User connection tracking
interface ConnectedUser {
  userId: string;
  socketId: string;
  rooms: Set<string>;
  lastActivity: Date;
}

export class RealtimeController {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupSocketHandlers();
    this.setupPeriodicTasks();

    logger.info('Realtime controller initialized');
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Get token from handshake
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token is required'));
        }
        
        // Verify token
        const user = await verifyToken(token);
        
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }
        
        // Attach user to socket
        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      
      if (!user) {
        socket.disconnect();
        return;
      }
      
      logger.info(`User ${user.uid} connected with socket ${socket.id}`);
      
      // Track connected user
      this.addConnectedUser(user.uid, socket.id);
      
      // Join user's personal room
      socket.join(`user:${user.uid}`);
      
      // Handle events
      socket.on('disconnect', () => this.handleDisconnect(socket));
      socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_end', (data) => this.handleTypingEnd(socket, data));
      socket.on('presence_update', (data) => this.handlePresenceUpdate(socket, data));
      socket.on('error', (error) => this.handleError(socket, error));
      
      // Send initial data
      this.sendInitialData(socket);
    });
  }

  /**
   * Set up periodic tasks
   */
  private setupPeriodicTasks(): void {
    // Clean up inactive users every 5 minutes
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 5 * 60 * 1000);
    
    // Update user presence every minute
    setInterval(() => {
      this.updateUserPresence();
    }, 60 * 1000);
  }

  /**
   * Add connected user
   */
  private addConnectedUser(userId: string, socketId: string): void {
    // Track user connection
    this.connectedUsers.set(socketId, {
      userId,
      socketId,
      rooms: new Set(),
      lastActivity: new Date()
    });
    
    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    
    // Update user's online status in database
    this.updateUserOnlineStatus(userId, true);
  }

  /**
   * Remove connected user
   */
  private removeConnectedUser(socketId: string): void {
    const user = this.connectedUsers.get(socketId);
    
    if (user) {
      // Remove from user sockets map
      const userSocketsSet = this.userSockets.get(user.userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socketId);
        
        // If no more sockets for this user, update online status
        if (userSocketsSet.size === 0) {
          this.userSockets.delete(user.userId);
          this.updateUserOnlineStatus(user.userId, false);
        }
      }
      
      // Remove from connected users map
      this.connectedUsers.delete(socketId);
    }
  }

  /**
   * Update user's online status in database
   */
  private async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await firestore.collection('users').doc(userId).update({
        isOnline,
        lastSeen: new Date(),
      });
      
      // Broadcast user status change to relevant rooms
      this.io.to(`user_status`).emit('user_status_change', {
        userId,
        isOnline,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(`Error updating online status for user ${userId}:`, error);
    }
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: any): void {
    const user = socket.data.user;
    
    if (user) {
      logger.info(`User ${user.uid} disconnected from socket ${socket.id}`);
      this.removeConnectedUser(socket.id);
    }
  }

  /**
   * Handle join room event
   */
  private handleJoinRoom(socket: any, data: { roomId: string; userData?: any }): void {
    const user = socket.data.user;
    const { roomId, userData } = data;
    
    if (!user || !roomId) {
      return;
    }
    
    // Join socket to room
    socket.join(roomId);
    
    // Update connected user's rooms
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.rooms.add(roomId);
      connectedUser.lastActivity = new Date();
    }
    
    logger.info(`User ${user.uid} joined room ${roomId}`);
    
    // Notify room members
    socket.to(roomId).emit('user_joined', {
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      roomId,
      timestamp: new Date(),
      userData
    });
  }

  /**
   * Handle leave room event
   */
  private handleLeaveRoom(socket: any, data: { roomId: string }): void {
    const user = socket.data.user;
    const { roomId } = data;
    
    if (!user || !roomId) {
      return;
    }
    
    // Leave socket from room
    socket.leave(roomId);
    
    // Update connected user's rooms
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.rooms.delete(roomId);
      connectedUser.lastActivity = new Date();
    }
    
    logger.info(`User ${user.uid} left room ${roomId}`);
    
    // Notify room members
    socket.to(roomId).emit('user_left', {
      userId: user.uid,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle send message event
   */
  private handleSendMessage(socket: any, data: { 
    roomId: string; 
    message: string; 
    type?: string;
    metadata?: any;
  }): void {
    const user = socket.data.user;
    const { roomId, message, type = 'text', metadata } = data;
    
    if (!user || !roomId || !message) {
      return;
    }
    
    // Update connected user's last activity
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.lastActivity = new Date();
    }
    
    // Create message object
    const messageData = {
      id: this.generateId(),
      roomId,
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      message,
      type,
      metadata,
      timestamp: new Date()
    };
    
    // Store message in database
    this.storeMessage(messageData);
    
    // Broadcast message to room
    this.io.to(roomId).emit('new_message', messageData);
    
    logger.debug(`User ${user.uid} sent message to room ${roomId}`);
  }

  /**
   * Handle typing start event
   */
  private handleTypingStart(socket: any, data: { roomId: string }): void {
    const user = socket.data.user;
    const { roomId } = data;
    
    if (!user || !roomId) {
      return;
    }
    
    // Update connected user's last activity
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.lastActivity = new Date();
    }
    
    // Broadcast typing start to room
    socket.to(roomId).emit('typing_start', {
      userId: user.uid,
      displayName: user.displayName,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing end event
   */
  private handleTypingEnd(socket: any, data: { roomId: string }): void {
    const user = socket.data.user;
    const { roomId } = data;
    
    if (!user || !roomId) {
      return;
    }
    
    // Update connected user's last activity
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.lastActivity = new Date();
    }
    
    // Broadcast typing end to room
    socket.to(roomId).emit('typing_end', {
      userId: user.uid,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle presence update event
   */
  private handlePresenceUpdate(socket: any, data: { status: string; activity?: string }): void {
    const user = socket.data.user;
    const { status, activity } = data;
    
    if (!user) {
      return;
    }
    
    // Update connected user's last activity
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      connectedUser.lastActivity = new Date();
    }
    
    // Update user's presence in database
    this.updateUserPresence(user.uid, status, activity);
  }

  /**
   * Handle error event
   */
  private handleError(socket: any, error: any): void {
    const user = socket.data.user;
    
    logger.error(`Socket error for user ${user?.uid || 'unknown'}:`, error);
  }

  /**
   * Send initial data to connected user
   */
  private async sendInitialData(socket: any): Promise<void> {
    const user = socket.data.user;
    
    if (!user) {
      return;
    }
    
    try {
      // Send unread notifications count
      const unreadNotificationsSnapshot = await firestore
        .collection('notifications')
        .where('userId', '==', user.uid)
        .where('read', '==', false)
        .count()
        .get();
      
      socket.emit('unread_notifications_count', {
        count: unreadNotificationsSnapshot.data().count
      });
      
      // Send unread messages count
      const unreadMessagesSnapshot = await firestore
        .collection('messages')
        .where('recipientId', '==', user.uid)
        .where('read', '==', false)
        .count()
        .get();
      
      socket.emit('unread_messages_count', {
        count: unreadMessagesSnapshot.data().count
      });
      
      // Send online friends
      const friendsSnapshot = await firestore
        .collection('friendships')
        .where('userId', '==', user.uid)
        .where('status', '==', 'accepted')
        .get();
      
      const friendIds = friendsSnapshot.docs.map(doc => doc.data().friendId);
      
      const onlineFriends = Array.from(this.userSockets.keys())
        .filter(userId => friendIds.includes(userId));
      
      socket.emit('online_friends', {
        friends: onlineFriends
      });
    } catch (error) {
      logger.error(`Error sending initial data to user ${user.uid}:`, error);
    }
  }

  /**
   * Store message in database
   */
  private async storeMessage(message: any): Promise<void> {
    try {
      await firestore.collection('messages').add(message);
    } catch (error) {
      logger.error('Error storing message:', error);
    }
  }

  /**
   * Update user presence
   */
  private async updateUserPresence(userId: string, status: string, activity?: string): Promise<void> {
    try {
      await firestore.collection('users').doc(userId).update({
        presenceStatus: status,
        presenceActivity: activity || null,
        lastSeen: new Date()
      });
      
      // Broadcast presence update to friends
      const friendsSnapshot = await firestore
        .collection('friendships')
        .where('friendId', '==', userId)
        .where('status', '==', 'accepted')
        .get();
      
      const friendIds = friendsSnapshot.docs.map(doc => doc.data().userId);
      
      friendIds.forEach(friendId => {
        this.io.to(`user:${friendId}`).emit('friend_presence_update', {
          userId,
          status,
          activity,
          timestamp: new Date()
        });
      });
    } catch (error) {
      logger.error(`Error updating presence for user ${userId}:`, error);
    }
  }

  /**
   * Clean up inactive users
   */
  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [socketId, user] of this.connectedUsers.entries()) {
      const inactiveTime = now.getTime() - user.lastActivity.getTime();
      
      if (inactiveTime > inactivityThreshold) {
        logger.info(`Cleaning up inactive user ${user.userId} with socket ${socketId}`);
        
        // Disconnect socket
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        
        // Remove user
        this.removeConnectedUser(socketId);
      }
    }
  }

  /**
   * Update user presence for all connected users
   */
  private updateUserPresence(): void {
    for (const [userId, socketIds] of this.userSockets.entries()) {
      if (socketIds.size > 0) {
        this.updateUserOnlineStatus(userId, true);
      }
    }
  }

  /**
   * Send notification to user
   */
  public sendNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Send notification to multiple users
   */
  public sendNotificationToUsers(userIds: string[], notification: any): void {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Send notification to room
   */
  public sendNotificationToRoom(roomId: string, notification: any): void {
    this.io.to(roomId).emit('notification', notification);
  }

  /**
   * Send event to user
   */
  public sendEvent(userId: string, eventName: string, data: any): void {
    this.io.to(`user:${userId}`).emit(eventName, data);
  }

  /**
   * Send event to room
   */
  public sendEventToRoom(roomId: string, eventName: string, data: any): void {
    this.io.to(roomId).emit(eventName, data);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

let realtimeController: RealtimeController | null = null;

export const initializeRealtimeController = (server: HttpServer): RealtimeController => {
  if (!realtimeController) {
    realtimeController = new RealtimeController(server);
  }
  return realtimeController;
};

export const getRealtimeController = (): RealtimeController | null => {
  return realtimeController;
};