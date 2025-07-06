import { firestoreAdmin } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

const prototypesCollection = firestoreAdmin.collection('prototypes');

export const getPrototypesService = async () => {
  try {
    const snapshot = await prototypesCollection.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching prototypes from Firestore:', error);
    throw error;
  }
};

export const getPrototypeByIdService = async (id: string) => {
  try {
    const doc = await prototypesCollection.doc(id).get();
    if (!doc.exists) {
      return null; // Prototype not found
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error fetching prototype ${id} from Firestore:`, error);
    throw error;
  }
};

export const createPrototypeService = async (prototypeData: any) => {
  try {
    const newPrototype = {
      ...prototypeData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0, // Initialize views
    };
    const docRef = await prototypesCollection.add(newPrototype);
    return { id: docRef.id, ...newPrototype };
  } catch (error) {
    console.error('Error creating prototype in Firestore:', error);
    throw error;
  }
};

export const submitFeedbackService = async (prototypeId: string, feedbackData: any) => {
  try {
    const feedbackCollection = prototypesCollection.doc(prototypeId).collection('feedback');
    const newFeedback = {
      ...feedbackData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await feedbackCollection.add(newFeedback);
    return { id: docRef.id, ...newFeedback };
  } catch (error) {
    console.error(`Error submitting feedback for prototype ${prototypeId} in Firestore:`, error);
    throw error;
  }
}; 