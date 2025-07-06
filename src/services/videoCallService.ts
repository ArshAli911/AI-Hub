import { Platform } from 'react-native';
import apiClient from '../api/client';
import firebaseAuthService from './firebaseService';
import websocketService from './websocketService';

export interface VideoCallRoom {
  id: string;
  name: string;
  sessionId?: string;
  mentorId: string;
  studentId: string;
  status: 'waiting' | 'active' | 'ended' | 'cancelled';
  participants: VideoCallParticipant[];
  settings: VideoCallSettings;
  recording: {
    enabled: boolean;
    url?: string;
    startTime?: Date;
    endTime?: Date;
  };
  chat: VideoCallMessage[];
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface VideoCallParticipant {
  id: string;
  userId: string;
  name: string;
  role: 'mentor' | 'student' | 'observer';
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  media: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
  streamId?: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface VideoCallSettings {
  maxParticipants: number;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  screenSharingEnabled: boolean;
  waitingRoomEnabled: boolean;
  autoRecord: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface VideoCallMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
  fileUrl?: string;
  fileName?: string;
}

export interface CreateRoomRequest {
  name: string;
  sessionId?: string;
  mentorId: string;
  studentId: string;
  settings?: Partial<VideoCallSettings>;
}

export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  role: 'mentor' | 'student' | 'observer';
  media?: {
    audio?: boolean;
    video?: boolean;
  };
}

export interface MediaStream {
  id: string;
  type: 'audio' | 'video' | 'screen';
  enabled: boolean;
  track?: MediaStreamTrack;
  stream?: MediaStream;
}

export interface CallStats {
  audioLevel: number;
  videoQuality: number;
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
}

class VideoCallService {
  private currentRoom: VideoCallRoom | null = null;
  private localStreams: Map<string, MediaStream> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private isInitialized = false;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize video call service
   */
  private async initialize(): Promise<void> {
    try {
      // Set up WebSocket listeners for video call events
      websocketService.on('room_created', this.handleRoomCreated.bind(this));
      websocketService.on('participant_joined', this.handleParticipantJoined.bind(this));
      websocketService.on('participant_left', this.handleParticipantLeft.bind(this));
      websocketService.on('media_update', this.handleMediaUpdate.bind(this));
      websocketService.on('chat_message', this.handleChatMessage.bind(this));
      websocketService.on('room_ended', this.handleRoomEnded.bind(this));
      websocketService.on('ice_candidate', this.handleIceCandidate.bind(this));
      websocketService.on('offer', this.handleOffer.bind(this));
      websocketService.on('answer', this.handleAnswer.bind(this));

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing video call service:', error);
    }
  }

  /**
   * Create a new video call room
   */
  async createRoom(data: CreateRoomRequest): Promise<VideoCallRoom> {
    try {
      const response = await apiClient.post<VideoCallRoom>('/video-calls/rooms', data);
      this.currentRoom = response.data;
      
      // Join the room via WebSocket
      websocketService.joinRoom(this.currentRoom.id, {
        userId: firebaseAuthService.getCurrentUser()?.uid,
        role: data.mentorId === firebaseAuthService.getCurrentUser()?.uid ? 'mentor' : 'student'
      });

      return this.currentRoom;
    } catch (error) {
      console.error('Error creating video call room:', error);
      throw error;
    }
  }

  /**
   * Join an existing video call room
   */
  async joinRoom(data: JoinRoomRequest): Promise<VideoCallRoom> {
    try {
      const response = await apiClient.post<VideoCallRoom>(`/video-calls/rooms/${data.roomId}/join`, data);
      this.currentRoom = response.data;

      // Join the room via WebSocket
      websocketService.joinRoom(data.roomId, {
        userId: data.userId,
        role: data.role,
        media: data.media
      });

      // Initialize local media streams
      await this.initializeLocalStreams(data.media);

      return this.currentRoom;
    } catch (error) {
      console.error('Error joining video call room:', error);
      throw error;
    }
  }

  /**
   * Leave the current video call room
   */
  async leaveRoom(): Promise<void> {
    try {
      if (this.currentRoom) {
        await apiClient.post(`/video-calls/rooms/${this.currentRoom.id}/leave`);
        
        // Leave room via WebSocket
        websocketService.leaveRoom(this.currentRoom.id);
        
        // Clean up media streams
        await this.cleanupStreams();
        
        this.currentRoom = null;
      }
    } catch (error) {
      console.error('Error leaving video call room:', error);
      throw error;
    }
  }

  /**
   * End the current video call room (mentor only)
   */
  async endRoom(): Promise<void> {
    try {
      if (this.currentRoom) {
        await apiClient.post(`/video-calls/rooms/${this.currentRoom.id}/end`);
        
        // End room via WebSocket
        websocketService.sendToRoom(this.currentRoom.id, 'end_room', {});
        
        // Clean up media streams
        await this.cleanupStreams();
        
        this.currentRoom = null;
      }
    } catch (error) {
      console.error('Error ending video call room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID
   */
  async getRoom(roomId: string): Promise<VideoCallRoom> {
    try {
      const response = await apiClient.get<VideoCallRoom>(`/video-calls/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting video call room:', error);
      throw error;
    }
  }

  /**
   * Initialize local media streams
   */
  private async initializeLocalStreams(media?: { audio?: boolean; video?: boolean }): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: media?.audio ?? true,
        video: media?.video ?? true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create audio stream
      if (constraints.audio) {
        const audioStream = new MediaStream();
        stream.getAudioTracks().forEach(track => audioStream.addTrack(track));
        
        this.localStreams.set('audio', {
          id: 'audio',
          type: 'audio',
          enabled: true,
          track: stream.getAudioTracks()[0],
          stream: audioStream
        });
      }

      // Create video stream
      if (constraints.video) {
        const videoStream = new MediaStream();
        stream.getVideoTracks().forEach(track => videoStream.addTrack(track));
        
        this.localStreams.set('video', {
          id: 'video',
          type: 'video',
          enabled: true,
          track: stream.getVideoTracks()[0],
          stream: videoStream
        });
      }
    } catch (error) {
      console.error('Error initializing local streams:', error);
      throw error;
    }
  }

  /**
   * Toggle local media stream
   */
  async toggleMedia(type: 'audio' | 'video', enabled: boolean): Promise<void> {
    try {
      const stream = this.localStreams.get(type);
      if (stream && stream.track) {
        stream.track.enabled = enabled;
        stream.enabled = enabled;

        // Notify other participants
        if (this.currentRoom) {
          websocketService.sendToRoom(this.currentRoom.id, 'media_update', {
            type,
            enabled,
            userId: firebaseAuthService.getCurrentUser()?.uid
          });
        }
      }
    } catch (error) {
      console.error('Error toggling media:', error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenSharing(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const screenStream: MediaStream = {
        id: 'screen',
        type: 'screen',
        enabled: true,
        track: stream.getVideoTracks()[0],
        stream
      };

      this.localStreams.set('screen', screenStream);

      // Notify other participants
      if (this.currentRoom) {
        websocketService.sendToRoom(this.currentRoom.id, 'screen_share_started', {
          userId: firebaseAuthService.getCurrentUser()?.uid
        });
      }
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenSharing(): Promise<void> {
    try {
      const screenStream = this.localStreams.get('screen');
      if (screenStream && screenStream.stream) {
        screenStream.stream.getTracks().forEach(track => track.stop());
        this.localStreams.delete('screen');

        // Notify other participants
        if (this.currentRoom) {
          websocketService.sendToRoom(this.currentRoom.id, 'screen_share_stopped', {
            userId: firebaseAuthService.getCurrentUser()?.uid
          });
        }
      }
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(content: string, type: 'text' | 'file' = 'text', fileUrl?: string, fileName?: string): Promise<void> {
    try {
      if (this.currentRoom) {
        const message: Omit<VideoCallMessage, 'id' | 'timestamp'> = {
          senderId: firebaseAuthService.getCurrentUser()?.uid || '',
          senderName: firebaseAuthService.getCurrentUser()?.displayName || '',
          content,
          type,
          fileUrl,
          fileName
        };

        websocketService.sendToRoom(this.currentRoom.id, 'chat_message', message);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    try {
      if (this.currentRoom) {
        await apiClient.post(`/video-calls/rooms/${this.currentRoom.id}/recording/start`);
        
        websocketService.sendToRoom(this.currentRoom.id, 'recording_started', {
          userId: firebaseAuthService.getCurrentUser()?.uid
        });
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    try {
      if (this.currentRoom) {
        await apiClient.post(`/video-calls/rooms/${this.currentRoom.id}/recording/stop`);
        
        websocketService.sendToRoom(this.currentRoom.id, 'recording_stopped', {
          userId: firebaseAuthService.getCurrentUser()?.uid
        });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<CallStats> {
    try {
      if (this.currentRoom) {
        const response = await apiClient.get<CallStats>(`/video-calls/rooms/${this.currentRoom.id}/stats`);
        return response.data;
      }
      throw new Error('No active call');
    } catch (error) {
      console.error('Error getting call stats:', error);
      throw error;
    }
  }

  /**
   * Get local streams
   */
  getLocalStreams(): Map<string, MediaStream> {
    return this.localStreams;
  }

  /**
   * Get remote streams
   */
  getRemoteStreams(): Map<string, MediaStream> {
    return this.remoteStreams;
  }

  /**
   * Get current room
   */
  getCurrentRoom(): VideoCallRoom | null {
    return this.currentRoom;
  }

  /**
   * Handle room created event
   */
  private handleRoomCreated(data: any): void {
    console.log('Room created:', data);
    this.currentRoom = data.room;
  }

  /**
   * Handle participant joined event
   */
  private handleParticipantJoined(data: any): void {
    console.log('Participant joined:', data);
    if (this.currentRoom) {
      this.currentRoom.participants.push(data.participant);
    }
  }

  /**
   * Handle participant left event
   */
  private handleParticipantLeft(data: any): void {
    console.log('Participant left:', data);
    if (this.currentRoom) {
      const index = this.currentRoom.participants.findIndex(p => p.id === data.participantId);
      if (index > -1) {
        this.currentRoom.participants[index].status = 'disconnected';
        this.currentRoom.participants[index].leftAt = new Date();
      }
    }
  }

  /**
   * Handle media update event
   */
  private handleMediaUpdate(data: any): void {
    console.log('Media update:', data);
    // Update participant media status
    if (this.currentRoom) {
      const participant = this.currentRoom.participants.find(p => p.userId === data.userId);
      if (participant) {
        participant.media[data.type] = data.enabled;
      }
    }
  }

  /**
   * Handle chat message event
   */
  private handleChatMessage(data: any): void {
    console.log('Chat message:', data);
    if (this.currentRoom) {
      this.currentRoom.chat.push({
        ...data,
        id: `msg_${Date.now()}_${Math.random()}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle room ended event
   */
  private handleRoomEnded(data: any): void {
    console.log('Room ended:', data);
    this.cleanupStreams();
    this.currentRoom = null;
  }

  /**
   * Handle ICE candidate event
   */
  private handleIceCandidate(data: any): void {
    console.log('ICE candidate:', data);
    // Handle WebRTC ICE candidate
  }

  /**
   * Handle offer event
   */
  private handleOffer(data: any): void {
    console.log('Offer received:', data);
    // Handle WebRTC offer
  }

  /**
   * Handle answer event
   */
  private handleAnswer(data: any): void {
    console.log('Answer received:', data);
    // Handle WebRTC answer
  }

  /**
   * Clean up media streams
   */
  private async cleanupStreams(): Promise<void> {
    try {
      // Stop all local streams
      this.localStreams.forEach(stream => {
        if (stream.stream) {
          stream.stream.getTracks().forEach(track => track.stop());
        }
      });
      this.localStreams.clear();

      // Close all peer connections
      this.peerConnections.forEach(connection => {
        connection.close();
      });
      this.peerConnections.clear();

      // Clear remote streams
      this.remoteStreams.clear();

      // Clear stats interval
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
    } catch (error) {
      console.error('Error cleaning up streams:', error);
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.cleanupStreams();
    this.currentRoom = null;
  }
}

export const videoCallService = new VideoCallService();
export default videoCallService; 