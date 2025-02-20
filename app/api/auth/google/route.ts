// app/api/auth/google/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
  // Create OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Define the scopes needed. Adjust these scopes based on your needs.
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ];

  // Generate the Google OAuth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // ensures a refresh token is provided
    scope: scopes,
    prompt: "consent", // forces consent screen, useful during development
  });

  return NextResponse.redirect(authUrl);
}
