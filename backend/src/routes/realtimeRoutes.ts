import { Router } from 'express';
import {
  createChatRoom,
  getUserRooms,
  getRoom,
  addUserToRoom,
  removeUserFromRoom,
  getRoomMessages,
  sendMessage,
  deleteMessage,
  searchMessages,
  getRoomStats,
  getConnectionStatus,
} from '../controllers/realtimeController';
import { verifyIdToken, requirePermission } from '../middleware/authMiddleware';
import { Permission } from '../types/rbac';

const router = Router();

// All real-time routes require authentication
router.use(verifyIdToken);

// Chat room management
router.post('/rooms', requirePermission([Permission.CREATE_POST]), createChatRoom);
router.get('/rooms', getUserRooms);
router.get('/rooms/:roomId', getRoom);
router.post('/rooms/:roomId/users', requirePermission([Permission.MANAGE_USERS]), addUserToRoom);
router.delete('/rooms/:roomId/users', requirePermission([Permission.MANAGE_USERS]), removeUserFromRoom);

// Message management
router.get('/rooms/:roomId/messages', getRoomMessages);
router.post('/rooms/:roomId/messages', sendMessage);
router.delete('/messages/:messageId', deleteMessage);
router.get('/rooms/:roomId/messages/search', searchMessages);

// Room statistics
router.get('/rooms/:roomId/stats', getRoomStats);

// WebSocket connection status
router.get('/connection/status', getConnectionStatus);

export default router; 