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
    const res = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 10 // adjust as needed
    });
    const messages = res.data.messages || [];

    // For each message, fetch its details
    const emails = await Promise.all(
      messages.map(async (msg) => {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full"
        });
        const headers = msgRes.data.payload?.headers || [];
        const from = headers.find(h => h.name === "From")?.value || "";
        const subject = headers.find(h => h.name === "Subject")?.value || "";
        const date = headers.find(h => h.name === "Date")?.value || "";
        // Using snippet as body preview
        const body = msgRes.data.snippet || "";
        return {
          id: msg.id,
          from,
          subject,
          date,
          body
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
