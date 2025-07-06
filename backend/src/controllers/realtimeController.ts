import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';
import { WebSocketService } from '../services/websocketService';
import { ChatRoom, ChatMessage } from '../types/realtime';
import logger from '../services/loggerService';

// Create a new chat room
export const createChatRoom = async (req: Request, res: Response) => {
  try {
    const { name, type, participants } = req.body;
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!name || !type || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'name, type, and participants array are required',
      });
    }

    // Ensure creator is included in participants
    const allParticipants = participants.includes(userId) 
      ? participants 
      : [...participants, userId];

    const roomData = {
      name,
      type,
      participants: allParticipants,
      createdBy: userId,
    };

    const chatRoom = await ChatService.createRoom(roomData, userId, userEmail);

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: chatRoom,
    });
  } catch (error) {
    logger.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get user's chat rooms
export const getUserRooms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const rooms = await ChatService.getUserRooms(userId);

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    logger.error('Error getting user rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user rooms',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get room details
export const getRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const room = await ChatService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: 'The specified chat room does not exist',
      });
    }

    // Check if user is a participant
    if (!room.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a participant in this room',
      });
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    logger.error('Error getting room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Add user to room
export const addUserToRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const adminId = req.user?.uid;
    const adminEmail = req.user?.email;

    if (!adminId || !adminEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'userId is required',
      });
    }

    await ChatService.addUserToRoom(roomId, userId, adminId, adminEmail);

    res.json({
      success: true,
      message: 'User added to room successfully',
    });
  } catch (error) {
    logger.error('Error adding user to room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add user to room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Remove user from room
export const removeUserFromRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const adminId = req.user?.uid;
    const adminEmail = req.user?.email;

    if (!adminId || !adminEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'userId is required',
      });
    }

    await ChatService.removeUserFromRoom(roomId, userId, adminId, adminEmail);

    res.json({
      success: true,
      message: 'User removed from room successfully',
    });
  } catch (error) {
    logger.error('Error removing user from room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove user from room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get room messages
export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if user is in the room
    const room = await ChatService.getRoom(roomId);
    if (!room || !room.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a participant in this room',
      });
    }

    const messages = await ChatService.getRoomMessages(
      roomId,
      parseInt(limit as string),
      before ? parseInt(before as string) : undefined
    );

    // Mark messages as read
    await ChatService.markMessagesAsRead(roomId, userId);

    res.json({
      success: true,
      data: messages,
      pagination: {
        limit: parseInt(limit as string),
        hasMore: messages.length === parseInt(limit as string),
      },
    });
  } catch (error) {
    logger.error('Error getting room messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room messages',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Send message to room
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { message, type = 'text', metadata } = req.body;
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'message is required',
      });
    }

    const chatMessage = await ChatService.sendMessage(
      roomId,
      userId,
      userEmail,
      message,
      type,
      metadata
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage,
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete message
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    await ChatService.deleteMessage(messageId, userId, userEmail);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Search messages
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { query, limit = 20 } = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'query is required',
      });
    }

    // Check if user is in the room
    const room = await ChatService.getRoom(roomId);
    if (!room || !room.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a participant in this room',
      });
    }

    const messages = await ChatService.searchMessages(
      roomId,
      query as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get room statistics
export const getRoomStats = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if user is in the room
    const room = await ChatService.getRoom(roomId);
    if (!room || !room.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a participant in this room',
      });
    }

    const stats = await ChatService.getRoomStats(roomId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting room stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get WebSocket connection status
export const getConnectionStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const status = WebSocketService.getUserStatus(userId);
    const connectedUsers = WebSocketService.getConnectedUsers();

    res.json({
      success: true,
      data: {
        userStatus: status,
        totalConnected: connectedUsers.length,
        connectedUsers: connectedUsers.map(user => ({
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          connectedAt: user.connectedAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting connection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 