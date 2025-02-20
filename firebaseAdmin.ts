// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // Build a service account object using snake_case keys.
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID, // snake_case key
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  // (Optional) Log to ensure the env values are loaded:
  console.log("Service Account:", serviceAccount);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    // If you use a database URL, ensure it's set:
    // databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
