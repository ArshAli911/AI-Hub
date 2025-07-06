import { getFirestore } from 'firebase-admin/firestore';
import { User, UserRole } from './User';

export interface Mentor {
  uid: string;
  user: User;
  specialty: string;
  expertise: string[];
  bio: string;
  hourlyRate: number;
  currency: string;
  availability: MentorAvailability[];
  rating: number;
  totalReviews: number;
  totalSessions: number;
  completedSessions: number;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: MentorProfile;
  stats?: MentorStats;
}

export interface MentorAvailability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  isAvailable: boolean;
}

export interface MentorProfile {
  education: string[];
  certifications: string[];
  experience: number; // years
  languages: string[];
  portfolio?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    youtube?: string;
    instagram?: string;
  };
}

export interface MentorStats {
  averageSessionDuration: number; // minutes
  totalEarnings: number;
  monthlyEarnings: number;
  responseTime: number; // average response time in minutes
  cancellationRate: number; // percentage
  repeatClientRate: number; // percentage
  topSkills: string[];
}

export interface MentorSession {
  id: string;
  mentorId: string;
  studentId: string;
  scheduledAt: Date;
  duration: number; // minutes
  sessionType: 'video' | 'audio' | 'chat';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  price: number;
  currency: string;
  notes?: string;
  meetingLink?: string;
  recordingUrl?: string;
  feedback?: SessionFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionFeedback {
  rating: number; // 1-5
  comment?: string;
  categories: {
    communication: number;
    expertise: number;
    helpfulness: number;
    punctuality: number;
  };
  submittedAt: Date;
}

export interface MentorReview {
  id: string;
  mentorId: string;
  reviewerId: string;
  sessionId: string;
  rating: number;
  comment: string;
  categories: {
    communication: number;
    expertise: number;
    helpfulness: number;
    punctuality: number;
  };
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class MentorModel {
  private db = getFirestore();
  private collection = this.db.collection('mentors');
  private sessionsCollection = this.db.collection('mentor_sessions');
  private reviewsCollection = this.db.collection('mentor_reviews');

  /**
   * Create a new mentor
   */
  async createMentor(mentorData: Omit<Mentor, 'uid' | 'user' | 'createdAt' | 'updatedAt'> & { uid: string; user: User }): Promise<Mentor> {
    try {
      const now = new Date();
      const mentor: Mentor = {
        ...mentorData,
        uid: mentorData.uid,
        user: mentorData.user,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        isVerified: false,
        rating: 0,
        totalReviews: 0,
        totalSessions: 0,
        completedSessions: 0,
        stats: {
          averageSessionDuration: 0,
          totalEarnings: 0,
          monthlyEarnings: 0,
          responseTime: 0,
          cancellationRate: 0,
          repeatClientRate: 0,
          topSkills: []
        }
      };

      await this.collection.doc(mentor.uid).set(mentor);
      return mentor;
    } catch (error) {
      console.error('Error creating mentor:', error);
      throw new Error('Failed to create mentor');
    }
  }

  /**
   * Get mentor by UID
   */
  async getMentorById(uid: string): Promise<Mentor | null> {
    try {
      const doc = await this.collection.doc(uid).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as Mentor;
    } catch (error) {
      console.error('Error fetching mentor:', error);
      throw new Error('Failed to fetch mentor');
    }
  }

  /**
   * Get all active mentors
   */
  async getActiveMentors(limit: number = 50, offset: number = 0): Promise<Mentor[]> {
    try {
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('rating', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => doc.data() as Mentor);
    } catch (error) {
      console.error('Error fetching active mentors:', error);
      throw new Error('Failed to fetch active mentors');
    }
  }

  /**
   * Search mentors by specialty
   */
  async searchMentorsBySpecialty(specialty: string, limit: number = 20): Promise<Mentor[]> {
    try {
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .where('specialty', '==', specialty)
        .orderBy('rating', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as Mentor);
    } catch (error) {
      console.error('Error searching mentors by specialty:', error);
      throw new Error('Failed to search mentors by specialty');
    }
  }

  /**
   * Update mentor
   */
  async updateMentor(uid: string, updates: Partial<Mentor>): Promise<Mentor> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.collection.doc(uid).update(updateData);
      
      const updatedMentor = await this.getMentorById(uid);
      if (!updatedMentor) {
        throw new Error('Mentor not found after update');
      }
      
      return updatedMentor;
    } catch (error) {
      console.error('Error updating mentor:', error);
      throw new Error('Failed to update mentor');
    }
  }

  /**
   * Create a mentor session
   */
  async createSession(sessionData: Omit<MentorSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<MentorSession> {
    try {
      const now = new Date();
      const session: MentorSession = {
        ...sessionData,
        id: this.db.collection('dummy').doc().id, // Generate a unique ID
        createdAt: now,
        updatedAt: now,
        status: 'pending'
      };

      await this.sessionsCollection.doc(session.id).set(session);
      return session;
    } catch (error) {
      console.error('Error creating mentor session:', error);
      throw new Error('Failed to create mentor session');
    }
  }

  /**
   * Get mentor sessions
   */
  async getMentorSessions(mentorId: string, status?: string): Promise<MentorSession[]> {
    try {
      let query = this.sessionsCollection.where('mentorId', '==', mentorId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('scheduledAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as MentorSession);
    } catch (error) {
      console.error('Error fetching mentor sessions:', error);
      throw new Error('Failed to fetch mentor sessions');
    }
  }

  /**
   * Get student sessions
   */
  async getStudentSessions(studentId: string, status?: string): Promise<MentorSession[]> {
    try {
      let query = this.sessionsCollection.where('studentId', '==', studentId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('scheduledAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as MentorSession);
    } catch (error) {
      console.error('Error fetching student sessions:', error);
      throw new Error('Failed to fetch student sessions');
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: MentorSession['status']): Promise<MentorSession> {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      await this.sessionsCollection.doc(sessionId).update(updateData);
      
      const doc = await this.sessionsCollection.doc(sessionId).get();
      if (!doc.exists) {
        throw new Error('Session not found');
      }
      
      return doc.data() as MentorSession;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw new Error('Failed to update session status');
    }
  }

  /**
   * Add session feedback
   */
  async addSessionFeedback(sessionId: string, feedback: Omit<SessionFeedback, 'submittedAt'>): Promise<void> {
    try {
      const sessionFeedback: SessionFeedback = {
        ...feedback,
        submittedAt: new Date()
      };

      await this.sessionsCollection.doc(sessionId).update({
        feedback: sessionFeedback,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error adding session feedback:', error);
      throw new Error('Failed to add session feedback');
    }
  }

  /**
   * Create a mentor review
   */
  async createReview(reviewData: Omit<MentorReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<MentorReview> {
    try {
      const now = new Date();
      const review: MentorReview = {
        ...reviewData,
        id: this.db.collection('dummy').doc().id,
        createdAt: now,
        updatedAt: now,
        isVerified: false
      };

      await this.reviewsCollection.doc(review.id).set(review);
      return review;
    } catch (error) {
      console.error('Error creating mentor review:', error);
      throw new Error('Failed to create mentor review');
    }
  }

  /**
   * Get mentor reviews
   */
  async getMentorReviews(mentorId: string, limit: number = 20): Promise<MentorReview[]> {
    try {
      const snapshot = await this.reviewsCollection
        .where('mentorId', '==', mentorId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorReview);
    } catch (error) {
      console.error('Error fetching mentor reviews:', error);
      throw new Error('Failed to fetch mentor reviews');
    }
  }

  /**
   * Update mentor stats
   */
  async updateMentorStats(mentorId: string, stats: Partial<MentorStats>): Promise<void> {
    try {
      const mentor = await this.getMentorById(mentorId);
      if (!mentor) {
        throw new Error('Mentor not found');
      }

      const updatedStats: MentorStats = {
        averageSessionDuration: mentor.stats?.averageSessionDuration || 0,
        totalEarnings: mentor.stats?.totalEarnings || 0,
        monthlyEarnings: mentor.stats?.monthlyEarnings || 0,
        responseTime: mentor.stats?.responseTime || 0,
        cancellationRate: mentor.stats?.cancellationRate || 0,
        repeatClientRate: mentor.stats?.repeatClientRate || 0,
        topSkills: mentor.stats?.topSkills || [],
        ...stats
      };

      await this.updateMentor(mentorId, { stats: updatedStats });
    } catch (error) {
      console.error('Error updating mentor stats:', error);
      throw new Error('Failed to update mentor stats');
    }
  }

  /**
   * Check mentor availability for a specific time
   */
  async checkAvailability(mentorId: string, date: Date, duration: number): Promise<boolean> {
    try {
      const mentor = await this.getMentorById(mentorId);
      if (!mentor || !mentor.isActive) {
        return false;
      }

      const dayOfWeek = date.getDay();
      const timeString = date.toTimeString().slice(0, 5); // HH:MM format

      // Check if mentor is available on this day and time
      const availability = mentor.availability.find(a => 
        a.dayOfWeek === dayOfWeek && 
        a.isAvailable &&
        timeString >= a.startTime && 
        timeString <= a.endTime
      );

      if (!availability) {
        return false;
      }

      // Check for conflicting sessions
      const conflictingSessions = await this.sessionsCollection
        .where('mentorId', '==', mentorId)
        .where('scheduledAt', '>=', date)
        .where('scheduledAt', '<=', new Date(date.getTime() + duration * 60000))
        .where('status', 'in', ['pending', 'confirmed'])
        .get();

      return conflictingSessions.empty;
    } catch (error) {
      console.error('Error checking mentor availability:', error);
      throw new Error('Failed to check mentor availability');
    }
  }

  /**
   * Get mentor earnings
   */
  async getMentorEarnings(mentorId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const snapshot = await this.sessionsCollection
        .where('mentorId', '==', mentorId)
        .where('status', '==', 'completed')
        .where('scheduledAt', '>=', startDate)
        .where('scheduledAt', '<=', endDate)
        .get();

      return snapshot.docs.reduce((total, doc) => {
        const session = doc.data() as MentorSession;
        return total + session.price;
      }, 0);
    } catch (error) {
      console.error('Error calculating mentor earnings:', error);
      throw new Error('Failed to calculate mentor earnings');
    }
  }
}

export const mentorModel = new MentorModel();
export default mentorModel; 