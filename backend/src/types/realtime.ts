export interface SocketUser {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  socketId: string;
  connectedAt: number;
  lastActivity: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    imageUrl?: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'community';
  participants: string[];
  createdBy: string;
  createdAt: number;
  lastMessage?: ChatMessage;
  unreadCount?: Record<string, number>;
}

export interface RealTimeNotification {
  id: string;
  type: 'message' | 'mention' | 'like' | 'comment' | 'follow' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: number;
}

export interface OnlineStatus {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
  socketId?: string;
}

export interface LiveUpdate {
  type: 'user_joined' | 'user_left' | 'message_sent' | 'typing_started' | 'typing_stopped' | 'notification';
  data: any;
  timestamp: number;
}

// WebSocket event types
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  
  // Chat events
  SEND_MESSAGE = 'send_message',
  MESSAGE_RECEIVED = 'message_received',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  
  // Notification events
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_READ = 'notification_read',
  
  // Status events
  STATUS_UPDATE = 'status_update',
  ONLINE_STATUS = 'online_status',
  
  // Live updates
  LIVE_UPDATE = 'live_update',
  
  // Error events
  ERROR = 'error',
  AUTH_ERROR = 'auth_error',
} 