import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { adminFirestore } from "../../../firebaseAdmin";

export const config = {
  runtime: "nodejs",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerParam = searchParams.get("owner") || "all";

    let customersData: any[] = [];
    if (ownerParam === "all") {
      // Limit to 20 docs to avoid timeouts
      const snapshot = await adminFirestore
        .collection("customers")
        .limit(20) // <-- limit results
        .get();
      customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      // For a user's own data, we can limit or not
      const snapshot = await adminFirestore
        .collection("customers")
        .where("owner", "==", ownerParam)
        .limit(20) // optional limit here too
        .get();
      customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Just a quick test for clarity:
    const htmlContent = `
      <html>
        <head><title>Rapor</title></head>
        <body>
          <h1>${ownerParam} Müşteri Raporu (max 20)</h1>
          <ul>
            ${customersData
              .map((c) => `<li>${c.name} - ${c.email}</li>`)
              .join("")}
          </ul>
        </body>
      </html>
    `;

    const exePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: exePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error?.message || String(error));
    return new Response("Internal Server Error", { status: 500 });
  }
}
