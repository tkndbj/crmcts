// app/api/updateUser/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { userId, name, email, password } = await request.json();

    // 1. Update the user in Firebase Auth
    //    Build an object dynamically so we only update the fields that are provided
    const updateData: Record<string, string> = {};
    if (name) updateData.displayName = name;
    if (email) updateData.email = email;
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    await adminAuth.updateUser(userId, updateData);

    // 2. Update the user document in Firestore
    await adminFirestore.collection("users").doc(userId).update({
      displayName: name,
      email: email,
      // If you store more fields, update them here.
      // e.g., updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
