export interface Mentor {
  _id: string;
  id: string; // Add id property for compatibility
  firstName: string;
  lastName: string;
  name: string; // Add name property for compatibility
  title: string; // Add title property
  specialty: string;
  bio: string;
  imageUrl?: string;
  domain?: string;
  availability?: string;
  price?: number;
  hourlyRate?: number; // Add hourlyRate property
  rating?: number;
  experience?: number;
  userId?: string; // Add userId property
  expertise?: string[]; // Add expertise array
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