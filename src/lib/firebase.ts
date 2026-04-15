/**
 * Firebase Admin SDK Initialization
 * This module initializes the Firebase Admin SDK for backend use
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'sankalp-learning',
    // Uses ADC (Application Default Credentials) or GOOGLE_APPLICATION_CREDENTIALS env var
  });
}

export const firebaseAdmin = admin;
export const db = admin.firestore();
export const auth = admin.auth();

export default admin;
