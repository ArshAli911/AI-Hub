import * as admin from 'firebase-admin';
import path from 'path';

// Load your service account key file
// Use process.cwd() for a more reliable path relative to the project root
// Corrected path to include 'src' directory
const serviceAccountPath = path.resolve(process.cwd(), 'src', 'config', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://<DATABASE_NAME>.firebaseio.com", // Uncomment if using Realtime Database
  // storageBucket: "<BUCKET_NAME>.appspot.com", // Uncomment if using Cloud Storage
});

console.log('Firebase Admin SDK initialized successfully!');

// Export the initialized services
export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
export const messagingAdmin = admin.messaging();
// export const storageAdmin = admin.storage(); // Uncomment if you need server-side storage access 