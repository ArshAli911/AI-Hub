import { getFirestore } from 'firebase-admin/firestore';
import { ChatRoom, ChatMessage, TypingIndicator } from '../types/realtime';
import { RBACService } from './rbacService';
import { AuditService } from './auditService';
import { WebSocketService } from './websocketService';
import logger from './loggerService';

export class ChatService {
  private static db = getFirestore();

  /**
   * Create a new chat room
   */
  static async createRoom(
    roomData: Omit<ChatRoom, 'id' | 'createdAt' | 'lastMessage' | 'unreadCount'>,
    creatorId: string,
    creatorEmail: string
  ): Promise<ChatRoom> {
    try {
      const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const chatRoom: ChatRoom = {
        id: roomId,
        ...roomData,
        createdAt: Date.now(),
        unreadCount: {},
      };

      // Save room to Firestore
      await this.db.collection('chat_rooms').doc(roomId).set(chatRoom);

      // Log room creation
      await AuditService.logEvent(
        creatorId,
        creatorEmail,
        'CHAT_ROOM_CREATED',
        'chat',
        { roomId, roomType: roomData.type, participants: roomData.participants },
        creatorId
      );

      logger.info(`Chat room created: ${roomId} by ${creatorEmail}`);

      return chatRoom;
    } catch (error) {
      logger.error('Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Get user's chat rooms
   */
  static async getUserRooms(userId: string): Promise<ChatRoom[]> {
    try {
      const roomsSnapshot = await this.db
        .collection('chat_rooms')
        .where('participants', 'array-contains', userId)
        .orderBy('lastActivity', 'desc')
        .get();

      return roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatRoom[];
    } catch (error) {
      logger.error('Error getting user rooms:', error);
      throw error;
    }
  }

  /**
   * Get room details
   */
  static async getRoom(roomId: string): Promise<ChatRoom | null> {
    try {
      const roomDoc = await this.db.collection('chat_rooms').doc(roomId).get();
      
      if (!roomDoc.exists) {
        return null;
      }

      return {
        id: roomDoc.id,
        ...roomDoc.data(),
      } as ChatRoom;
    } catch (error) {
      logger.error('Error getting room:', error);
      throw error;
    }
  }

  /**
   * Add user to room
   */
  static async addUserToRoom(
    roomId: string,
    userId: string,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    try {
      const roomRef = this.db.collection('chat_rooms').doc(roomId);
      
      await this.db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists) {
          throw new Error('Room not found');
        }

        const roomData = roomDoc.data() as ChatRoom;
        
        if (roomData.participants.includes(userId)) {
          throw new Error('User already in room');
        }

        // Add user to participants
        const updatedParticipants = [...roomData.participants, userId];
        
        transaction.update(roomRef, {
          participants: updatedParticipants,
          lastActivity: Date.now(),
        });
      });

      // Log the action
      await AuditService.logEvent(
        adminId,
        adminEmail,
        'USER_ADDED_TO_ROOM',
        'chat',
        { roomId, userId },
        userId
      );

      logger.info(`User ${userId} added to room ${roomId}`);
    } catch (error) {
      logger.error('Error adding user to room:', error);
      throw error;
    }
  }

  /**
   * Remove user from room
   */
  static async removeUserFromRoom(
    roomId: string,
    userId: string,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    try {
      const roomRef = this.db.collection('chat_rooms').doc(roomId);
      
      await this.db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists) {
          throw new Error('Room not found');
        }

        const roomData = roomDoc.data() as ChatRoom;
        
        if (!roomData.participants.includes(userId)) {
          throw new Error('User not in room');
        }

        // Remove user from participants
        const updatedParticipants = roomData.participants.filter(id => id !== userId);
        
        transaction.update(roomRef, {
          participants: updatedParticipants,
          lastActivity: Date.now(),
        });
      });

      // Log the action
      await AuditService.logEvent(
        adminId,
        adminEmail,
        'USER_REMOVED_FROM_ROOM',
        'chat',
        { roomId, userId },
        userId
      );

      logger.info(`User ${userId} removed from room ${roomId}`);
    } catch (error) {
      logger.error('Error removing user from room:', error);
      throw error;
    }
  }

  /**
   * Get room messages
   */
  static async getRoomMessages(
    roomId: string,
    limit: number = 50,
    beforeTimestamp?: number
  ): Promise<ChatMessage[]> {
    try {
      let query = this.db
        .collection('chat_messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (beforeTimestamp) {
        query = query.where('timestamp', '<', beforeTimestamp);
      }

      const messagesSnapshot = await query.get();

      return messagesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatMessage[];
    } catch (error) {
      logger.error('Error getting room messages:', error);
      throw error;
    }
  }

  /**
   * Send message to room
   */
  static async sendMessage(
    roomId: string,
    senderId: string,
    senderEmail: string,
    message: string,
    type: ChatMessage['type'] = 'text',
    metadata?: ChatMessage['metadata']
  ): Promise<ChatMessage> {
    try {
      // Check if user is in the room
      const room = await this.getRoom(roomId);
      if (!room || !room.participants.includes(senderId)) {
        throw new Error('User not in room');
      }

      const chatMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        senderId,
        senderName: room.participants.find(p => p === senderId) || 'Unknown',
        message,
        timestamp: Date.now(),
        type,
        metadata,
      };

      // Save message to Firestore
      await this.db.collection('chat_messages').doc(chatMessage.id).set(chatMessage);

      // Update room's last message and activity
      await this.db.collection('chat_rooms').doc(roomId).update({
        lastMessage: chatMessage,
        lastActivity: Date.now(),
      });

      // Log the message
      await AuditService.logEvent(
        senderId,
        senderEmail,
        'CHAT_MESSAGE_SENT',
        'chat',
        { roomId, messageId: chatMessage.id, messageType: type },
        senderId
      );

      logger.info(`Message sent in room ${roomId} by ${senderEmail}`);

      return chatMessage;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(
    messageId: string,
    userId: string,
    userEmail: string
  ): Promise<void> {
    try {
      const messageDoc = await this.db.collection('chat_messages').doc(messageId).get();
      
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data() as ChatMessage;
      
      // Check if user is the sender or has admin permissions
      if (messageData.senderId !== userId) {
        const hasPermission = await RBACService.hasPermission(userId, 'moderate_posts');
        if (!hasPermission) {
          throw new Error('Permission denied');
        }
      }

      // Delete the message
      await this.db.collection('chat_messages').doc(messageId).delete();

      // Log the deletion
      await AuditService.logEvent(
        userId,
        userEmail,
        'CHAT_MESSAGE_DELETED',
        'chat',
        { messageId, originalSender: messageData.senderId },
        userId
      );

      logger.info(`Message ${messageId} deleted by ${userEmail}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    roomId: string,
    userId: string
  ): Promise<void> {
    try {
      const roomRef = this.db.collection('chat_rooms').doc(roomId);
      
      await this.db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists) {
          throw new Error('Room not found');
        }

        const roomData = roomDoc.data() as ChatRoom;
        const unreadCount = roomData.unreadCount || {};
        
        // Reset unread count for this user
        unreadCount[userId] = 0;
        
        transaction.update(roomRef, {
          unreadCount,
          lastActivity: Date.now(),
        });
      });

      logger.info(`Messages marked as read in room ${roomId} by user ${userId}`);
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get typing indicators for a room
   */
  static async getTypingIndicators(roomId: string): Promise<TypingIndicator[]> {
    try {
      const typingSnapshot = await this.db
        .collection('typing_indicators')
        .where('roomId', '==', roomId)
        .where('isTyping', '==', true)
        .get();

      return typingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TypingIndicator[];
    } catch (error) {
      logger.error('Error getting typing indicators:', error);
      throw error;
    }
  }

  /**
   * Update typing indicator
   */
  static async updateTypingIndicator(
    roomId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const indicatorId = `${roomId}-${userId}`;
      const indicatorRef = this.db.collection('typing_indicators').doc(indicatorId);

      if (isTyping) {
        await indicatorRef.set({
          roomId,
          userId,
          userName,
          isTyping,
          timestamp: Date.now(),
        });
      } else {
        await indicatorRef.delete();
      }

      // Broadcast typing indicator via WebSocket
      WebSocketService.broadcastToRoom(roomId, isTyping ? 'typing_start' : 'typing_stop', {
        roomId,
        userId,
        userName,
        isTyping,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error updating typing indicator:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  static async searchMessages(
    roomId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    try {
      // Note: This is a simple text search. For production, consider using
      // a search service like Algolia or Elasticsearch
      const messagesSnapshot = await this.db
        .collection('chat_messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp', 'desc')
        .limit(100) // Get more messages to search through
        .get();

      const messages = messagesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatMessage[];

      // Simple text search
      const filteredMessages = messages.filter(message =>
        message.message.toLowerCase().includes(query.toLowerCase())
      );

      return filteredMessages.slice(0, limit);
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Get room statistics
   */
  static async getRoomStats(roomId: string): Promise<{
    totalMessages: number;
    totalParticipants: number;
    lastActivity: number;
    messageTypes: Record<string, number>;
  }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Get message count
      const messagesSnapshot = await this.db
        .collection('chat_messages')
        .where('roomId', '==', roomId)
        .get();

      const messages = messagesSnapshot.docs.map(doc => doc.data() as ChatMessage);
      
      // Count message types
      const messageTypes: Record<string, number> = {};
      messages.forEach(message => {
        messageTypes[message.type] = (messageTypes[message.type] || 0) + 1;
      });

      return {
        totalMessages: messages.length,
        totalParticipants: room.participants.length,
        lastActivity: room.lastActivity || room.createdAt,
        messageTypes,
      };
    } catch (error) {
      logger.error('Error getting room stats:', error);
      throw error;
    }
  }
} 