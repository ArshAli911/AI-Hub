export interface Mentor {
  _id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  bio: string;
  imageUrl?: string;
  domain?: string;
  availability?: string;
  price?: number;
  rating?: number;
  experience?: number;
  // Add more mentor-related fields as needed
}

export interface MentorSession {
  id: string;
  mentorId: string;
  date: number;
  time: string;
  status: 'booked' | 'available' | 'completed';
  // Add more session-related fields as needed
}

export interface Session {
  _id: string;
  mentor: Mentor;
  scheduledAt: string;
  duration: number;
  sessionType: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
} 