import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing code parameter" },
      { status: 400 }
    );
  }

  // Create OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Retrieve user's email using OAuth2 API
    const oauth2 = google.oauth2({ auth: oAuth2Client, version: "v2" });
    const { data: userInfo } = await oauth2.userinfo.get();
    (tokens as any).email = userInfo.email; // Attach the email to tokens

    // Example: Store tokens in an HTTP-only cookie
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("google-tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error exchanging code for token:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
