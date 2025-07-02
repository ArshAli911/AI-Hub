export interface Mentor {
  id: string;
  name: string;
  title: string;
  bio: string;
  imageUrl?: string;
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