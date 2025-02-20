// app/api/createUser/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/firebaseAdmin"; // your firebase admin setup

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    await adminFirestore.collection("users").doc(userRecord.uid).set({
      displayName: name,
      email,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
