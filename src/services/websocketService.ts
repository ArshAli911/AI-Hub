import { Platform } from 'react-native';
import firebaseAuthService from './firebaseService';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface WebSocketEvent {
  type: 'message' | 'connection' | 'error' | 'reconnect';
  data?: any;
  error?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export type WebSocketListener = (event: WebSocketEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, WebSocketListener[]> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];
  private connectionPromise: Promise<void> | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      timeout: 10000,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return this.connectionPromise || Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = this.performConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
    }

    return this.connectionPromise;
  }

  /**
   * Perform the actual connection
   */
  private async performConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get auth token for authentication
        const token = firebaseAuthService.getIdToken();
        
        // Add token to URL for authentication
        const url = new URL(this.config.url);
        url.searchParams.append('token', token);

        this.ws = new WebSocket(url.toString(), this.config.protocols);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit('connection', { type: 'connection', data: { connected: true } });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('connection', { 
            type: 'connection', 
            data: { connected: false, code: event.code, reason: event.reason } 
          });

          // Attempt reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          this.emit('error', { type: 'error', error: error.toString() });
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isConnecting = false;
    this.isConnected = false;
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.messageQueue = [];
  }

  /**
   * Send message to WebSocket server
   */
  send(type: string, data: any, id?: string): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now(),
      id
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(message);
    }
  }

  /**
   * Send message and wait for response
   */
  async sendAndWait(type: string, data: any, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const timeoutId = setTimeout(() => {
        this.removeListener(`response:${messageId}`, responseHandler);
        reject(new Error('Request timeout'));
      }, timeout);

      const responseHandler = (event: WebSocketEvent) => {
        clearTimeout(timeoutId);
        this.removeListener(`response:${messageId}`, responseHandler);
        resolve(event.data);
      };

      this.on(`response:${messageId}`, responseHandler);
      this.send(type, data, messageId);
    });
  }

  /**
   * Subscribe to a channel/room
   */
  subscribe(channel: string, data?: any): void {
    this.send('subscribe', { channel, data });
  }

  /**
   * Unsubscribe from a channel/room
   */
  unsubscribe(channel: string): void {
    this.send('unsubscribe', { channel });
  }

  /**
   * Join a room for real-time collaboration
   */
  joinRoom(roomId: string, userData?: any): void {
    this.send('join_room', { roomId, userData });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.send('leave_room', { roomId });
  }

  /**
   * Send message to a specific room
   */
  sendToRoom(roomId: string, type: string, data: any): void {
    this.send('room_message', { roomId, type, data });
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: WebSocketListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeListener(eventType: string, listener: WebSocketListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; connecting: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Emit the message type event
    this.emit(message.type, { type: 'message', data: message.data });

    // Handle response messages
    if (message.id) {
      this.emit(`response:${message.id}`, { type: 'message', data: message.data });
    }

    // Handle system messages
    switch (message.type) {
      case 'ping':
        this.send('pong', { timestamp: Date.now() });
        break;
      case 'error':
        this.emit('error', { type: 'error', error: message.data });
        break;
      case 'notification':
        this.handleNotification(message.data);
        break;
      case 'user_joined':
        this.handleUserJoined(message.data);
        break;
      case 'user_left':
        this.handleUserLeft(message.data);
        break;
      case 'typing_start':
        this.handleTypingStart(message.data);
        break;
      case 'typing_stop':
        this.handleTypingStop(message.data);
        break;
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: string, event: WebSocketEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      this.emit('reconnect', { type: 'reconnect', data: { attempt: this.reconnectAttempts } });
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle notification messages
   */
  private handleNotification(data: any): void {
    // Emit notification event for the app to handle
    this.emit('notification', { type: 'message', data });
  }

  /**
   * Handle user joined room
   */
  private handleUserJoined(data: any): void {
    this.emit('user_joined', { type: 'message', data });
  }

  /**
   * Handle user left room
   */
  private handleUserLeft(data: any): void {
    this.emit('user_left', { type: 'message', data });
  }

  /**
   * Handle typing start
   */
  private handleTypingStart(data: any): void {
    this.emit('typing_start', { type: 'message', data });
  }

  /**
   * Handle typing stop
   */
  private handleTypingStop(data: any): void {
    this.emit('typing_stop', { type: 'message', data });
  }
}

// Create default WebSocket service instance
const getWebSocketService = (): WebSocketService => {
  const wsUrl = __DEV__ 
    ? 'ws://localhost:3001/ws'
    : 'wss://your-production-api.com/ws';
  
  return new WebSocketService({ url: wsUrl });
};

export const websocketService = getWebSocketService();
export default websocketService; 