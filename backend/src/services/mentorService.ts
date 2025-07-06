import { firestoreAdmin } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

const mentorsCollection = firestoreAdmin.collection('mentors');
const bookingsCollection = firestoreAdmin.collection('mentorBookings');

export const getMentorsService = async () => {
  try {
    const snapshot = await mentorsCollection.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching mentors from Firestore:', error);
    throw error;
  }
};

export const getMentorByIdService = async (id: string) => {
  try {
    const doc = await mentorsCollection.doc(id).get();
    if (!doc.exists) {
      return null; // Mentor not found
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error fetching mentor ${id} from Firestore:`, error);
    throw error;
  }
};

export const bookMentorSessionService = async (bookingData: any) => {
  try {
    const newBooking = {
      ...bookingData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending', // Initial status for a new booking
    };
    const docRef = await bookingsCollection.add(newBooking);
    return { id: docRef.id, ...newBooking };
  } catch (error) {
    console.error('Error booking mentor session in Firestore:', error);
    throw error;
  }
};

// You can add more mentor-related services here, e.g., updateMentorProfile, cancelSession, etc. 