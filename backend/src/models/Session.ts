import { firestore } from '../config/firebaseAdmin';
import logger from '../services/loggerService';

export interface SessionParticipant {
  userId: string;
  role: 'mentor' | 'student' | 'observer';
  joinedAt?: Date;
  leftAt?: Date;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  permissions: {
    canSpeak: boolean;
    canShare: boolean;
    canRecord: boolean;
    canInvite: boolean;
  };
}

export interface SessionRecording {
  id: string;
  fileName: string;
  url: string;
  duration: number; // in seconds
  size: number; // in bytes
  format: string;
  quality: 'low' | 'medium' | 'high';
  startTime: Date;
  endTime: Date;
  uploadedAt: Date;
}

export interface SessionFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface SessionMessage {
  id: string;
  userId: string;
  content: string;
  type: 'text' | 'file' | 'system';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5 stars
  comment?: string;
  categories: {
    communication: number;
    knowledge: number;
    helpfulness: number;
    punctuality: number;
    overall: number;
  };
  isPublic: boolean;
  createdAt: Date;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  type: 'one_on_one' | 'group' | 'workshop' | 'webinar';
  category: 'mentoring' | 'tutoring' | 'consultation' | 'interview' | 'presentation' | 'other';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'no_show';
  visibility: 'public' | 'private' | 'invite_only';
  
  // Participants
  hostId: string; // Usually the mentor
  participants: SessionParticipant[];
  maxParticipants: number;
  
  // Scheduling
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration?: number; // actual duration in minutes
  timezone: string;
  
  // Meeting details
  meetingRoom: {
    id: string;
    url?: string;
    password?: string;
    provider: 'internal' | 'zoom' | 'google_meet' | 'teams' | 'other';
    settings: {
      recordingEnabled: boolean;
      chatEnabled: boolean;
      screenShareEnabled: boolean;
      waitingRoomEnabled: boolean;
      muteOnEntry: boolean;
    };
  };
  
  // Content and resources
  agenda?: string[];
  objectives?: string[];
  prerequisites?: string[];
  materials: SessionFile[];
  recordings: SessionRecording[];
  
  // Communication
  chat: {
    enabled: boolean;
    messages: SessionMessage[];
    allowFileSharing: boolean;
  };
  
  // Pricing and payment
  pricing: {
    type: 'free' | 'paid';
    amount?: number;
    currency?: string;
    paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed';
    paymentId?: string;
  };
  
  // Reminders and notifications
  reminders: {
    sent24h: boolean;
    sent1h: boolean;
    sent15min: boolean;
    customReminders?: {
      time: Date;
      sent: boolean;
      message: string;
    }[];
  };
  
  // Feedback and ratings
  feedback: SessionFeedback[];
  ratings: {
    average: number;
    count: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  
  // Session metadata
  metadata: {
    createdBy: string;
    lastModifiedBy: string;
    source: 'manual' | 'booking_system' | 'recurring' | 'api';
    parentSessionId?: string; // For recurring sessions
    seriesId?: string; // For session series
    tags: string[];
    notes?: string;
    internalNotes?: string; // Only visible to mentors/admins
  };
  
  // Analytics and tracking
  analytics: {
    views: number;
    bookings: number;
    completionRate: number;
    averageRating: number;
    noShowRate: number;
    lastActivity: Date;
  };
  
  // Recurring session settings
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number; // every N days/weeks/months
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    endDate?: Date;
    maxOccurrences?: number;
    exceptions?: Date[]; // Dates to skip
  };
  
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface SessionBooking {
  id: string;
  sessionId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  bookingType: 'instant' | 'request' | 'invitation';
  message?: string; // Message from student when booking
  response?: string; // Response from mentor
  paymentRequired: boolean;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  remindersSent: {
    booking: boolean;
    day_before: boolean;
    hour_before: boolean;
    fifteen_min: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  type: Session['type'];
  category: Session['category'];
  defaultDuration: number; // in minutes
  defaultMaxParticipants: number;
  defaultAgenda: string[];
  defaultObjectives: string[];
  defaultPrerequisites: string[];
  defaultMaterials: Omit<SessionFile, 'id' | 'uploadedAt'>[];
  defaultSettings: Session['meetingRoom']['settings'];
  pricing: Session['pricing'];
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionSeries {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  sessions: string[]; // Session IDs
  totalSessions: number;
  completedSessions: number;
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    totalAmount?: number;
    currency?: string;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
    };
  };
  enrollments: {
    userId: string;
    enrolledAt: Date;
    completedSessions: number;
    status: 'active' | 'completed' | 'cancelled';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class SessionModel {
  private static sessionsCollection = 'sessions';
  private static bookingsCollection = 'sessionBookings';
  private static feedbackCollection = 'sessionFeedback';
  private static templatesCollection = 'sessionTemplates';
  private static seriesCollection = 'sessionSeries';

  /**
   * Create a new session
   */
  static async createSession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    try {
      const now = new Date();
      const session = {
        ...sessionData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.sessionsCollection).add(session);
      
      const createdSession: Session = {
        id: docRef.id,
        ...session
      };

      logger.info(`Session created: ${createdSession.id}`);
      return createdSession;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<Session | null> {
    try {
      const sessionDoc = await firestore.collection(this.sessionsCollection).doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        return null;
      }

      return {
        id: sessionDoc.id,
        ...sessionDoc.data()
      } as Session;
    } catch (error) {
      logger.error(`Error getting session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session
   */
  static async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await firestore.collection(this.sessionsCollection).doc(sessionId).update(updateData);
      
      return await this.getSessionById(sessionId);
    } catch (error) {
      logger.error(`Error updating session ${sessionId}:`, error);
      throw new Error('Failed to update session');
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await firestore.collection(this.sessionsCollection).doc(sessionId).delete();
      
      // Delete related bookings
      await this.deleteSessionRelatedData(sessionId);

      logger.info(`Session deleted: ${sessionId}`);
    } catch (error) {
      logger.error(`Error deleting session ${sessionId}:`, error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Get sessions with pagination and filters
   */
  static async getSessions(
    limit: number = 20,
    offset: number = 0,
    filters: {
      hostId?: string;
      participantId?: string;
      status?: Session['status'];
      type?: Session['type'];
      category?: Session['category'];
      startDate?: Date;
      endDate?: Date;
      upcoming?: boolean;
      searchQuery?: string;
      sortBy?: 'scheduledStartTime' | 'createdAt' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ sessions: Session[]; total: number }> {
    try {
      let query = firestore.collection(this.sessionsCollection);

      // Apply filters
      if (filters.hostId) {
        query = query.where('hostId', '==', filters.hostId);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.startDate) {
        query = query.where('scheduledStartTime', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('scheduledStartTime', '<=', filters.endDate);
      }

      if (filters.upcoming) {
        query = query.where('scheduledStartTime', '>=', new Date());
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'scheduledStartTime';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.orderBy(sortBy, sortOrder);

      // Apply pagination
      const snapshot = await query.limit(limit).offset(offset).get();

      let sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];

      // Filter by participant if specified
      if (filters.participantId) {
        sessions = sessions.filter(session =>
          session.participants.some(p => p.userId === filters.participantId)
        );
      }

      // Apply search filter if provided
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        sessions = sessions.filter(session =>
          session.title.toLowerCase().includes(searchLower) ||
          session.description?.toLowerCase().includes(searchLower) ||
          session.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Get total count (approximate)
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      return { sessions, total };
    } catch (error) {
      logger.error('Error getting sessions:', error);
      throw new Error('Failed to get sessions');
    }
  }

  /**
   * Book a session
   */
  static async bookSession(bookingData: Omit<SessionBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionBooking> {
    try {
      const session = await this.getSessionById(bookingData.sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if session is bookable
      if (session.status !== 'scheduled') {
        throw new Error('Session is not available for booking');
      }

      // Check if user already booked
      const existingBooking = await this.getUserSessionBooking(bookingData.sessionId, bookingData.userId);
      if (existingBooking) {
        throw new Error('User has already booked this session');
      }

      // Check capacity
      const currentBookings = await this.getSessionBookings(bookingData.sessionId, 'confirmed');
      if (currentBookings.length >= session.maxParticipants) {
        throw new Error('Session is full');
      }

      const now = new Date();
      const booking = {
        ...bookingData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.bookingsCollection).add(booking);
      
      // Update session analytics
      await this.updateSessionAnalytics(bookingData.sessionId, { bookings: 1 });

      const createdBooking: SessionBooking = {
        id: docRef.id,
        ...booking
      };

      logger.info(`Session booking created: ${createdBooking.id}`);
      return createdBooking;
    } catch (error) {
      logger.error('Error booking session:', error);
      throw error;
    }
  }

  /**
   * Cancel session booking
   */
  static async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    try {
      await firestore.collection(this.bookingsCollection).doc(bookingId).update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date()
      });

      logger.info(`Session booking cancelled: ${bookingId}`);
    } catch (error) {
      logger.error(`Error cancelling booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Get session bookings
   */
  static async getSessionBookings(
    sessionId: string,
    status?: SessionBooking['status']
  ): Promise<SessionBooking[]> {
    try {
      let query = firestore.collection(this.bookingsCollection)
        .where('sessionId', '==', sessionId);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionBooking[];
    } catch (error) {
      logger.error(`Error getting bookings for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Get user's session booking
   */
  static async getUserSessionBooking(sessionId: string, userId: string): Promise<SessionBooking | null> {
    try {
      const snapshot = await firestore
        .collection(this.bookingsCollection)
        .where('sessionId', '==', sessionId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as SessionBooking;
    } catch (error) {
      logger.error(`Error getting user booking for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Start session
   */
  static async startSession(sessionId: string): Promise<void> {
    try {
      await firestore.collection(this.sessionsCollection).doc(sessionId).update({
        status: 'active',
        actualStartTime: new Date(),
        updatedAt: new Date()
      });

      logger.info(`Session started: ${sessionId}`);
    } catch (error) {
      logger.error(`Error starting session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * End session
   */
  static async endSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      
      if (!session || !session.actualStartTime) {
        throw new Error('Session not found or not started');
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - session.actualStartTime.getTime()) / (1000 * 60));

      await firestore.collection(this.sessionsCollection).doc(sessionId).update({
        status: 'completed',
        actualEndTime: endTime,
        duration,
        updatedAt: new Date()
      });

      // Update all confirmed bookings to completed
      const bookings = await this.getSessionBookings(sessionId, 'confirmed');
      const batch = firestore.batch();
      
      bookings.forEach(booking => {
        const bookingRef = firestore.collection(this.bookingsCollection).doc(booking.id);
        batch.update(bookingRef, {
          status: 'completed',
          updatedAt: new Date()
        });
      });

      await batch.commit();

      logger.info(`Session ended: ${sessionId}, duration: ${duration} minutes`);
    } catch (error) {
      logger.error(`Error ending session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add participant to session
   */
  static async addParticipant(
    sessionId: string,
    participant: SessionParticipant
  ): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if user is already a participant
      const existingParticipant = session.participants.find(p => p.userId === participant.userId);
      if (existingParticipant) {
        throw new Error('User is already a participant');
      }

      // Check capacity
      if (session.participants.length >= session.maxParticipants) {
        throw new Error('Session is full');
      }

      const updatedParticipants = [...session.participants, {
        ...participant,
        joinedAt: new Date(),
        connectionStatus: 'connected'
      }];

      await firestore.collection(this.sessionsCollection).doc(sessionId).update({
        participants: updatedParticipants,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error adding participant to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove participant from session
   */
  static async removeParticipant(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      const updatedParticipants = session.participants.map(p =>
        p.userId === userId
          ? { ...p, leftAt: new Date(), connectionStatus: 'disconnected' as const }
          : p
      );

      await firestore.collection(this.sessionsCollection).doc(sessionId).update({
        participants: updatedParticipants,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error removing participant from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add session feedback
   */
  static async addFeedback(feedbackData: Omit<SessionFeedback, 'id' | 'createdAt'>): Promise<SessionFeedback> {
    try {
      const feedback = {
        ...feedbackData,
        createdAt: new Date()
      };

      const docRef = await firestore.collection(this.feedbackCollection).add(feedback);
      
      // Update session ratings
      await this.updateSessionRatings(feedbackData.sessionId);

      const createdFeedback: SessionFeedback = {
        id: docRef.id,
        ...feedback
      };

      logger.info(`Session feedback added: ${createdFeedback.id}`);
      return createdFeedback;
    } catch (error) {
      logger.error('Error adding session feedback:', error);
      throw new Error('Failed to add session feedback');
    }
  }

  /**
   * Get session feedback
   */
  static async getSessionFeedback(sessionId: string): Promise<SessionFeedback[]> {
    try {
      const snapshot = await firestore
        .collection(this.feedbackCollection)
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionFeedback[];
    } catch (error) {
      logger.error(`Error getting feedback for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Get upcoming sessions for reminders
   */
  static async getUpcomingSessions(timeframe: number): Promise<Session[]> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + timeframe);

      const snapshot = await firestore
        .collection(this.sessionsCollection)
        .where('status', '==', 'scheduled')
        .where('scheduledStartTime', '>=', now)
        .where('scheduledStartTime', '<=', futureTime)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
    } catch (error) {
      logger.error('Error getting upcoming sessions:', error);
      return [];
    }
  }

  /**
   * Create session template
   */
  static async createTemplate(templateData: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    try {
      const now = new Date();
      const template = {
        ...templateData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.templatesCollection).add(template);
      
      const createdTemplate: SessionTemplate = {
        id: docRef.id,
        ...template
      };

      logger.info(`Session template created: ${createdTemplate.id}`);
      return createdTemplate;
    } catch (error) {
      logger.error('Error creating session template:', error);
      throw new Error('Failed to create session template');
    }
  }

  /**
   * Get session templates
   */
  static async getTemplates(createdBy?: string): Promise<SessionTemplate[]> {
    try {
      let query = firestore.collection(this.templatesCollection);

      if (createdBy) {
        query = query.where('createdBy', '==', createdBy);
      } else {
        query = query.where('isPublic', '==', true);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionTemplate[];
    } catch (error) {
      logger.error('Error getting session templates:', error);
      return [];
    }
  }

  /**
   * Update session analytics
   */
  private static async updateSessionAnalytics(
    sessionId: string,
    updates: Partial<Session['analytics']>
  ): Promise<void> {
    try {
      const analyticsUpdates: any = { updatedAt: new Date() };
      
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          analyticsUpdates[`analytics.${key}`] = firestore.FieldValue.increment(value);
        } else {
          analyticsUpdates[`analytics.${key}`] = value;
        }
      });

      await firestore.collection(this.sessionsCollection).doc(sessionId).update(analyticsUpdates);
    } catch (error) {
      logger.error(`Error updating session analytics ${sessionId}:`, error);
    }
  }

  /**
   * Update session ratings
   */
  private static async updateSessionRatings(sessionId: string): Promise<void> {
    try {
      const feedback = await this.getSessionFeedback(sessionId);
      
      if (feedback.length === 0) {
        return;
      }

      const ratings = feedback.map(f => f.rating);
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      const breakdown = {
        5: ratings.filter(r => r === 5).length,
        4: ratings.filter(r => r === 4).length,
        3: ratings.filter(r => r === 3).length,
        2: ratings.filter(r => r === 2).length,
        1: ratings.filter(r => r === 1).length,
      };

      await firestore.collection(this.sessionsCollection).doc(sessionId).update({
        'ratings.average': average,
        'ratings.count': ratings.length,
        'ratings.breakdown': breakdown,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error updating session ratings ${sessionId}:`, error);
    }
  }

  /**
   * Delete session related data
   */
  private static async deleteSessionRelatedData(sessionId: string): Promise<void> {
    try {
      const batch = firestore.batch();

      // Delete bookings
      const bookingsSnapshot = await firestore
        .collection(this.bookingsCollection)
        .where('sessionId', '==', sessionId)
        .get();
      
      bookingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete feedback
      const feedbackSnapshot = await firestore
        .collection(this.feedbackCollection)
        .where('sessionId', '==', sessionId)
        .get();
      
      feedbackSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      logger.error(`Error deleting related data for session ${sessionId}:`, error);
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStatistics(
    hostId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    averageRating: number;
    totalBookings: number;
    noShowRate: number;
    sessionsByType: Record<Session['type'], number>;
    sessionsByCategory: Record<Session['category'], number>;
  }> {
    try {
      let query = firestore.collection(this.sessionsCollection);

      if (hostId) {
        query = query.where('hostId', '==', hostId);
      }

      if (startDate) {
        query = query.where('scheduledStartTime', '>=', startDate);
      }

      if (endDate) {
        query = query.where('scheduledStartTime', '<=', endDate);
      }

      const snapshot = await query.get();
      const sessions = snapshot.docs.map(doc => doc.data() as Session);

      const stats = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
        averageRating: 0,
        totalBookings: 0,
        noShowRate: 0,
        sessionsByType: {} as Record<Session['type'], number>,
        sessionsByCategory: {} as Record<Session['category'], number>
      };

      // Calculate averages and counts
      let totalRatings = 0;
      let ratingCount = 0;
      let totalBookings = 0;
      let noShows = 0;

      sessions.forEach(session => {
        // Count by type and category
        stats.sessionsByType[session.type] = (stats.sessionsByType[session.type] || 0) + 1;
        stats.sessionsByCategory[session.category] = (stats.sessionsByCategory[session.category] || 0) + 1;

        // Sum ratings
        if (session.ratings.count > 0) {
          totalRatings += session.ratings.average * session.ratings.count;
          ratingCount += session.ratings.count;
        }

        // Count bookings and no-shows
        totalBookings += session.analytics.bookings;
        if (session.status === 'no_show') {
          noShows++;
        }
      });

      stats.averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
      stats.totalBookings = totalBookings;
      stats.noShowRate = stats.totalSessions > 0 ? (noShows / stats.totalSessions) * 100 : 0;

      return stats;
    } catch (error) {
      logger.error('Error getting session statistics:', error);
      throw new Error('Failed to get session statistics');
    }
  }
}

export const sessionModel = SessionModel;
export default SessionModel;