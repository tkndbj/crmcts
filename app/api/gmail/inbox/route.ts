import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const tokenCookie = request.cookies.get("google-tokens")?.value;
  if (!tokenCookie) {
    return NextResponse.json(
      { error: "Google tokenleri bulunamadı. Lütfen kimlik doğrulaması yapın." },
      { status: 401 }
    );
  }
  const tokens = JSON.parse(tokenCookie);
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  try {
    // Get list of messages from the INBOX
    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 10, // or 50, or whatever you prefer
    });
    const messages = listRes.data.messages || [];

    // For each message, fetch its details (full) to decode the body
    const emails = await Promise.all(
      messages.map(async (msg) => {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });

        const payload = msgRes.data.payload || {};
        const headers = payload.headers || [];

        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Attempt to extract plain-text body
        let body = "";
        if (payload.parts) {
          // Find the part that is text/plain (or fallback to snippet, or text/html if you prefer)
          const part = payload.parts.find((p) => p.mimeType === "text/plain");
          if (part && part.body && part.body.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
          } else {
            // If there's an HTML part or no text/plain, you can handle that too
            // For now, fallback to snippet if no text/plain found
            body = msgRes.data.snippet || "";
          }
        } else if (payload.body?.data) {
          // If there's only one part and no multi-part
          body = Buffer.from(payload.body.data, "base64").toString("utf-8");
        } else {
          // Fallback to snippet if we have absolutely no "body.data"
          body = msgRes.data.snippet || "";
        }

        return {
          id: msg.id!,
          from,
          subject,
          date,
          body,
        };
      })
    );

    return NextResponse.json(emails);
  } catch (error: any) {
    console.error("E-postalar alınırken hata:", error);
    return NextResponse.json(
      { error: error.message || "E-postalar alınırken hata oluştu" },
      { status: 500 }
    );
  }
}
