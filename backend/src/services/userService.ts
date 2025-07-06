import { authAdmin, firestoreAdmin } from '../config/firebaseAdmin';

const usersCollection = firestoreAdmin.collection('users');

export const createUserService = async (email: string, password: string, displayName?: string, customClaims?: { [key: string]: any }) => {
  try {
    const userRecord = await authAdmin.createUser({
      email: email,
      password: password,
      displayName: displayName,
    });

    // Optionally, save additional user data to Firestore
    await usersCollection.doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName || email.split('@')[0],
      createdAt: new Date(),
      // Add any other default user fields here
    });

    if (customClaims) {
      await authAdmin.setCustomUserClaims(userRecord.uid, customClaims);
      console.log(`Custom claims set for user ${userRecord.uid}:`, customClaims);
    }

    console.log('Successfully created new user:', userRecord.uid);
    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const setCustomUserClaimsService = async (uid: string, customClaims: { [key: string]: any }) => {
  try {
    await authAdmin.setCustomUserClaims(uid, customClaims);
    // You might also want to update the user's document in Firestore with these claims for easier querying
    await usersCollection.doc(uid).update({ customClaims: customClaims });
    console.log(`Custom claims set for user ${uid}:`, customClaims);
  } catch (error) {
    console.error(`Error setting custom claims for user ${uid}:`, error);
    throw error;
  }
};

export const getUserByIdService = async (uid: string) => {
  try {
    const userRecord = await authAdmin.getUser(uid);
    const userDoc = await usersCollection.doc(uid).get();
    
    // Combine Firebase Auth user data with Firestore profile data
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      phoneNumber: userRecord.phoneNumber,
      customClaims: userRecord.customClaims,
      firestoreProfile: userDoc.exists ? userDoc.data() : null,
    };
  } catch (error) {
    console.error(`Error fetching user ${uid}:`, error);
    throw error;
  }
};

export const deleteUserService = async (uid: string) => {
  try {
    await authAdmin.deleteUser(uid);
    // Optionally, delete user's data from Firestore as well
    await usersCollection.doc(uid).delete();
    console.log(`Successfully deleted user ${uid}`);
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    throw error;
  }
}; 