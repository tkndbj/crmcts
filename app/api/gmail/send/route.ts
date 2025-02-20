// app/api/gmail/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(request: NextRequest) {
  try {
    const { to, message, subject } = await request.json();

    // Retrieve stored tokens from cookies (or your preferred storage)
    const tokenCookie = request.cookies.get("google-tokens")?.value;
    if (!tokenCookie) {
      return NextResponse.json(
        { error: "No Google tokens found. Please authenticate." },
        { status: 401 }
      );
    }
    const tokens = JSON.parse(tokenCookie);

    // Create an OAuth2 client with your credentials
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oAuth2Client.setCredentials(tokens);

    // Helper function to create a raw email message
    function createRawMessage({
      to,
      from,
      subject,
      message,
    }: {
      to: string;
      from: string;
      subject: string;
      message: string;
    }) {
      const emailLines = [
        `To: ${to}`,
        `From: ${from}`,
        `Subject: ${subject}`,
        "",
        message,
      ];
      // Base64url encode the email
      return Buffer.from(emailLines.join("\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }

    // You need to know the "From" email. Depending on your implementation,
    // you might store the user email separately. For now, we'll assume that
    // tokens.email exists.
    const fromEmail = tokens.email || "";

    const raw = createRawMessage({
      to,
      from: fromEmail,
      subject,
      message,
    });

    // Send email using Gmail API
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Error sending email" },
      { status: 500 }
    );
  }
}
