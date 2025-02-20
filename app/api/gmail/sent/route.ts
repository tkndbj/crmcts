import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  try {
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

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Here, we fetch messages with the "SENT" label. 
    // Adjust maxResults and any query (q) as needed.
    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["SENT"],
      maxResults: 50,
      // If you want more advanced searching:
      // q: "subject:whatever newer_than:7d" etc.
    });

    const messages = listRes.data.messages || []; // Array of { id, threadId }
    if (messages.length === 0) {
      return NextResponse.json([]); // Empty array if no sent messages found
    }

    // For each message, fetch the full data (headers, body, etc.)
    // Then we transform the raw Gmail message into your desired Email shape.
    const emailDataPromises = messages.map(async (msg) => {
      const detailRes = await gmail.users.messages.get({
        userId: "me",
        id: msg.id as string,
        format: "full", // or "metadata" if you only want headers
      });
      const detail = detailRes.data;

      // Parse out headers like From, To, Subject, Date, etc.
      const payload = detail.payload || {};
      const headers = payload.headers || [];

      const fromHeader = headers.find((h) => h.name === "From");
      const toHeader = headers.find((h) => h.name === "To");
      const subjectHeader = headers.find((h) => h.name === "Subject");
      const dateHeader = headers.find((h) => h.name === "Date");

      // Basic snippet or body extraction
      // If the email is plain text, you can sometimes use detail.snippet or the parts
      let body = "";
      if (payload.parts) {
        // Attempt to read the first text part 
        const part = payload.parts.find(
          (p) => p.mimeType === "text/plain"
        );
        if (part && part.body && part.body.data) {
          // The body is base64 encoded
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      } else if (payload.body?.data) {
        // The entire payload might be the body if there's no parts
        body = Buffer.from(payload.body.data, "base64").toString("utf-8");
      }

      return {
        id: msg.id,
        from: fromHeader?.value ?? "",
        to: toHeader?.value ?? "",
        subject: subjectHeader?.value ?? "",
        date: dateHeader?.value ?? "",
        body: body,
      };
    });

    const emailData = await Promise.all(emailDataPromises);

    return NextResponse.json(emailData);
  } catch (error: any) {
    console.error("Error fetching sent messages:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching sent messages" },
      { status: 500 }
    );
  }
}
