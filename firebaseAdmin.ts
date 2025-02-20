// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // Optionally log the env variable to verify it’s loaded:
  console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID, // snake_case key expected at runtime
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    // If you need databaseURL, add it here (or remove the property if not used)
    // databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
