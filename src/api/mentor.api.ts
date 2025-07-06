import apiClient, { ApiResponse } from './client';
import { Session } from '../types/mentor';

export interface Mentor {
  uid: string;
  user: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
    bio?: string;
  };
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
  profile?: MentorProfile;
  stats?: MentorStats;
}

export interface MentorAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isAvailable: boolean;
}

export interface MentorProfile {
  education: string[];
  certifications: string[];
  experience: number;
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
  averageSessionDuration: number;
  totalEarnings: number;
  monthlyEarnings: number;
  responseTime: number;
  cancellationRate: number;
  repeatClientRate: number;
  topSkills: string[];
}

export interface MentorSession {
  id: string;
  mentorId: string;
  studentId: string;
  scheduledAt: Date;
  duration: number;
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
  rating: number;
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
  isHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMentorRequest {
  uid: string;
  specialty: string;
  expertise: string[];
  bio: string;
  hourlyRate: number;
  currency: string;
  availability?: MentorAvailability[];
  profile?: MentorProfile;
}

export interface CreateSessionRequest {
  mentorId: string;
  scheduledAt: string;
  duration: number;
  sessionType: 'video' | 'audio' | 'chat';
  notes?: string;
}

export interface UpdateSessionRequest {
  status?: string;
  notes?: string;
  meetingLink?: string;
  recordingUrl?: string;
}

export interface CreateReviewRequest {
  mentorId: string;
  sessionId: string;
  rating: number;
  comment: string;
  categories: {
    communication: number;
    expertise: number;
    helpfulness: number;
    punctuality: number;
  };
}

export interface SessionFeedbackRequest {
  rating: number;
  comment?: string;
  categories: {
    communication: number;
    expertise: number;
    helpfulness: number;
    punctuality: number;
  };
}

class MentorApi {
  private basePath = '/mentors';

  /**
   * Create a new mentor
   */
  async createMentor(data: CreateMentorRequest): Promise<ApiResponse<Mentor>> {
    return apiClient.post<Mentor>(this.basePath, data);
  }

  /**
   * Get mentor by ID
   */
  async getMentorById(uid: string): Promise<ApiResponse<Mentor>> {
    return apiClient.get<Mentor>(`${this.basePath}/${uid}`);
  }

  /**
   * Get active mentors
   */
  async getActiveMentors(limit: number = 20, offset: number = 0, specialty?: string): Promise<ApiResponse<Mentor[]>> {
    const params: any = { limit, offset };
    if (specialty) params.specialty = specialty;

    return apiClient.get<Mentor[]>(this.basePath, { params });
  }

  /**
   * Search mentors by specialty
   */
  async searchMentorsBySpecialty(specialty: string, limit: number = 20): Promise<ApiResponse<Mentor[]>> {
    return apiClient.get<Mentor[]>(`${this.basePath}/specialty/${specialty}`, {
      params: { limit }
    });
  }

  /**
   * Update mentor profile
   */
  async updateMentor(uid: string, data: Partial<Mentor>): Promise<ApiResponse<Mentor>> {
    return apiClient.put<Mentor>(`${this.basePath}/${uid}`, data);
  }

  /**
   * Create a mentor session
   */
  async createSession(data: CreateSessionRequest): Promise<ApiResponse<MentorSession>> {
    return apiClient.post<MentorSession>(`${this.basePath}/sessions`, data);
  }

  /**
   * Get mentor sessions
   */
  async getMentorSessions(mentorId: string, status?: string): Promise<ApiResponse<MentorSession[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<MentorSession[]>(`${this.basePath}/${mentorId}/sessions`, { params });
  }

  /**
   * Get student sessions
   */
  async getStudentSessions(studentId: string, status?: string): Promise<ApiResponse<MentorSession[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<MentorSession[]>(`${this.basePath}/student/${studentId}/sessions`, { params });
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: string): Promise<ApiResponse<MentorSession>> {
    return apiClient.put<MentorSession>(`${this.basePath}/sessions/${sessionId}/status`, { status });
  }

  /**
   * Update session details
   */
  async updateSession(sessionId: string, data: UpdateSessionRequest): Promise<ApiResponse<MentorSession>> {
    return apiClient.put<MentorSession>(`${this.basePath}/sessions/${sessionId}`, data);
  }

  /**
   * Add session feedback
   */
  async addSessionFeedback(sessionId: string, data: SessionFeedbackRequest): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/sessions/${sessionId}/feedback`, data);
  }

  /**
   * Create a mentor review
   */
  async createReview(data: CreateReviewRequest): Promise<ApiResponse<MentorReview>> {
    return apiClient.post<MentorReview>(`${this.basePath}/reviews`, data);
  }

  /**
   * Get mentor reviews
   */
  async getMentorReviews(mentorId: string, limit: number = 20): Promise<ApiResponse<MentorReview[]>> {
    return apiClient.get<MentorReview[]>(`${this.basePath}/${mentorId}/reviews`, {
      params: { limit }
    });
  }

  /**
   * Check mentor availability
   */
  async checkAvailability(mentorId: string, date: string, duration: number): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(`${this.basePath}/${mentorId}/availability`, {
      params: { date, duration }
    });
  }

  /**
   * Get mentor earnings
   */
  async getMentorEarnings(mentorId: string, startDate: string, endDate: string): Promise<ApiResponse<number>> {
    return apiClient.get<number>(`${this.basePath}/${mentorId}/earnings`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Update mentor stats
   */
  async updateMentorStats(mentorId: string, stats: Partial<MentorStats>): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${mentorId}/stats`, { stats });
  }

  /**
   * Get mentor analytics
   */
  async getMentorAnalytics(mentorId: string, period: string = '30d'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${mentorId}/analytics`, {
      params: { period }
    });
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<ApiResponse<MentorSession>> {
    return apiClient.get<MentorSession>(`${this.basePath}/sessions/${sessionId}`);
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<ApiResponse<MentorSession>> {
    return apiClient.put<MentorSession>(`${this.basePath}/sessions/${sessionId}/cancel`, { reason });
  }

  /**
   * Reschedule session
   */
  async rescheduleSession(sessionId: string, newScheduledAt: string): Promise<ApiResponse<MentorSession>> {
    return apiClient.put<MentorSession>(`${this.basePath}/sessions/${sessionId}/reschedule`, { 
      scheduledAt: newScheduledAt 
    });
  }

  /**
   * Get session feedback
   */
  async getSessionFeedback(sessionId: string): Promise<ApiResponse<SessionFeedback>> {
    return apiClient.get<SessionFeedback>(`${this.basePath}/sessions/${sessionId}/feedback`);
  }

  /**
   * Get mentor availability schedule
   */
  async getMentorAvailability(mentorId: string): Promise<ApiResponse<MentorAvailability[]>> {
    return apiClient.get<MentorAvailability[]>(`${this.basePath}/${mentorId}/availability/schedule`);
  }

  /**
   * Update mentor availability
   */
  async updateMentorAvailability(mentorId: string, availability: MentorAvailability[]): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${mentorId}/availability`, { availability });
  }

  /**
   * Get mentor calendar
   */
  async getMentorCalendar(mentorId: string, startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${mentorId}/calendar`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Get mentor time slots
   */
  async getMentorTimeSlots(mentorId: string, date: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/${mentorId}/timeslots`, {
      params: { date }
    });
  }

  /**
   * Get mentor specialties
   */
  async getMentorSpecialties(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/specialties`);
  }

  /**
   * Get mentor expertise areas
   */
  async getMentorExpertise(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/expertise`);
  }

  /**
   * Get featured mentors
   */
  async getFeaturedMentors(limit: number = 10): Promise<ApiResponse<Mentor[]>> {
    return apiClient.get<Mentor[]>(`${this.basePath}/featured`, {
      params: { limit }
    });
  }

  /**
   * Get top rated mentors
   */
  async getTopRatedMentors(limit: number = 10): Promise<ApiResponse<Mentor[]>> {
    return apiClient.get<Mentor[]>(`${this.basePath}/top-rated`, {
      params: { limit }
    });
  }

  /**
   * Get mentor recommendations
   */
  async getMentorRecommendations(userId: string, limit: number = 10): Promise<ApiResponse<Mentor[]>> {
    return apiClient.get<Mentor[]>(`${this.basePath}/recommendations`, {
      params: { userId, limit }
    });
  }

  /**
   * Book a session
   */
  async bookSession(data: CreateSessionRequest): Promise<ApiResponse<MentorSession>> {
    return apiClient.post<MentorSession>(`${this.basePath}/book`, data);
  }

  /**
   * Get session history
   */
  async getSessionHistory(userId: string, role: 'mentor' | 'student', limit: number = 20): Promise<ApiResponse<MentorSession[]>> {
    return apiClient.get<MentorSession[]>(`${this.basePath}/sessions/history`, {
      params: { userId, role, limit }
    });
  }

  /**
   * Get upcoming sessions
   */
  async getUpcomingSessions(userId: string, role: 'mentor' | 'student', limit: number = 10): Promise<ApiResponse<MentorSession[]>> {
    return apiClient.get<MentorSession[]>(`${this.basePath}/sessions/upcoming`, {
      params: { userId, role, limit }
    });
  }
}

export const mentorApi = new MentorApi();
export default mentorApi; 