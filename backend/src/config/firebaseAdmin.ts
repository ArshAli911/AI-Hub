import * as admin from 'firebase-admin';
import path from 'path';
import { config } from './environment'; // Import the environment configuration

// Load your service account key file
// Use process.cwd() for a more reliable path relative to the project root
// Corrected path to include 'src' directory
const serviceAccountPath = path.resolve(process.cwd(), 'src', 'config', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://<DATABASE_NAME>.firebaseio.com", // Uncomment if using Realtime Database
  storageBucket: config.FIREBASE_STORAGE_BUCKET, // Use the storage bucket from environment config
});

console.log('Firebase Admin SDK initialized successfully!');

// Export the initialized services
export const auth = admin.auth();
export const firestore = admin.firestore();
export const messaging = admin.messaging();
export const storage = admin.storage();

// Legacy exports for backward compatibility
export const authAdmin = auth;
export const firestoreAdmin = firestore;
export const messagingAdmin = messaging;
export const storageAdmin = storage; 