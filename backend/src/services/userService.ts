import { authAdmin, firestoreAdmin } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

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

export const updateUserSettingsService = async (uid: string, settings: { [key: string]: any }) => {
  try {
    await usersCollection.doc(uid).set({ settings: settings }, { merge: true });
    console.log(`User settings updated for ${uid}`);
  } catch (error) {
    console.error(`Error updating user settings for ${uid}:`, error);
    throw error;
  }
};

export const updateUserPrivacySettingsService = async (uid: string, privacySettings: { [key: string]: any }) => {
  try {
    await usersCollection.doc(uid).set({ privacySettings: privacySettings }, { merge: true });
    console.log(`User privacy settings updated for ${uid}`);
  } catch (error) {
    console.error(`Error updating user privacy settings for ${uid}:`, error);
    throw error;
  }
};

export const followUserService = async (followerId: string, followingId: string) => {
  try {
    // Add to follower's 'following' list
    await usersCollection.doc(followerId).update({
      following: admin.firestore.FieldValue.arrayUnion(followingId)
    });
    // Add to followed user's 'followers' list
    await usersCollection.doc(followingId).update({
      followers: admin.firestore.FieldValue.arrayUnion(followerId)
    });
    console.log(`User ${followerId} is now following ${followingId}`);
  } catch (error) {
    console.error(`Error following user:`, error);
    throw error;
  }
};

export const unfollowUserService = async (followerId: string, followingId: string) => {
  try {
    // Remove from follower's 'following' list
    await usersCollection.doc(followerId).update({
      following: admin.firestore.FieldValue.arrayRemove(followingId)
    });
    // Remove from followed user's 'followers' list
    await usersCollection.doc(followingId).update({
      followers: admin.firestore.FieldValue.arrayRemove(followerId)
    });
    console.log(`User ${followerId} unfollowed ${followingId}`);
  } catch (error) {
    console.error(`Error unfollowing user:`, error);
    throw error;
  }
};

export const addNotificationService = async (uid: string, notification: { type: string; message: string; entityId?: string; read?: boolean; createdAt?: FirebaseFirestore.FieldValue }) => {
  try {
    const notificationsCollection = usersCollection.doc(uid).collection('notifications');
    const newNotification = {
      ...notification,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await notificationsCollection.add(newNotification);
    console.log(`Notification added for user ${uid}`);
  } catch (error) {
    console.error(`Error adding notification for user ${uid}:`, error);
    throw error;
  }
};

export const getNotificationsService = async (uid: string, limit: number = 20) => {
  try {
    const notificationsCollection = usersCollection.doc(uid).collection('notifications');
    const snapshot = await notificationsCollection.orderBy('createdAt', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching notifications for user ${uid}:`, error);
    throw error;
  }
};

export const markNotificationAsReadService = async (uid: string, notificationId: string) => {
  try {
    const notificationsCollection = usersCollection.doc(uid).collection('notifications');
    await notificationsCollection.doc(notificationId).update({ read: true });
    console.log(`Notification ${notificationId} marked as read for user ${uid}`);
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read for user ${uid}:`, error);
    throw error;
  }
};

export const updateUserAvatarService = async (uid: string, photoURL: string) => {
  try {
    // Update photoURL in Firebase Auth
    await authAdmin.updateUser(uid, { photoURL });

    // Update photoURL in Firestore user document
    await usersCollection.doc(uid).update({ photoURL });

    console.log(`User ${uid} avatar updated to: ${photoURL}`);
  } catch (error) {
    console.error(`Error updating avatar for user ${uid}:`, error);
    throw error;
  }
}; 