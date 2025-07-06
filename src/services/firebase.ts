// src/services/firebase.ts

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYSJhRb3UhnObpVGtb6MAF9SADGojPIs4", // Replaced with your actual API KEY
  authDomain: "ai-companion-af7a4.firebaseapp.com", // Replaced with your actual AUTH DOMAIN
  projectId: "ai-companion-af7a4", // Replaced with your actual PROJECT ID
  storageBucket: "ai-companion-af7a4.firebasestorage.app", // Replaced with your actual STORAGE BUCKET
  messagingSenderId: "", // Not provided, leaving as empty string
  appId: "1:784293794246:android:7e0d2ebbf02177b351e2c7", // Replaced with your actual APP ID
  measurementId: "" // Not provided, leaving as empty string (optional)
};

// Initialize Firebase
let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();

export const firebaseService = {
  // Placeholder for Firebase related functions
  // For example:
  // signInWithEmail: (email: string, password: string) => auth.signInWithEmailAndPassword(email, password),
  // signOut: () => auth.signOut(),
  // uploadFile: (file: Blob, path: string) => storage.ref(path).put(file),
  init: () => console.log('Firebase initialized (placeholder)'), // This will now be called by the actual initialization above
}; 