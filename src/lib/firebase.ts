/**
 * Firebase Admin SDK Initialization
 * This module initializes the Firebase Admin SDK for backend use
 */

import * as admin from 'firebase-admin';

function parseServiceAccountFromEnv(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as admin.ServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.');
  }
}

if (!admin.apps.length) {
  const serviceAccount = parseServiceAccountFromEnv();
  const resolvedProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'sankalp-learning';

  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    projectId: resolvedProjectId,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const firebaseAdmin = admin;
export const db = admin.firestore();
export const auth = admin.auth();

export default admin;
