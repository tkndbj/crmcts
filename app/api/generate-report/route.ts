// File: app/api/generate-report/route.ts
import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// Import the Firestore from your shared admin module
import { adminFirestore } from "../../../firebaseAdmin";

export const config = {
  runtime: "nodejs", // Force Node runtime on Vercel
};

export async function GET(req: NextRequest) {
  try {
    // 1) Parse owner param
    const { searchParams } = new URL(req.url);
    const ownerParam = searchParams.get("owner") || "all";

    // 2) Query Firestore using your adminFirestore
    let customersData: any[] = [];
    if (ownerParam === "all") {
      const snapshot = await adminFirestore.collection("customers").get();
      customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      const snapshot = await adminFirestore
        .collection("customers")
        .where("owner", "==", ownerParam)
        .get();
      customersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // 3) Build the HTML ...
    const htmlContent = `...whatever...`;

    // 4) Launch Puppeteer
    const exePath = (await chromium.executablePath()) as string;
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: exePath,
      headless: true,
    });

    // 5) Generate PDF
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // 6) Return PDF as a plain Response
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="report.pdf"',
      },
    });
  } catch (error: any) {
    // Log only message/stack to avoid Next.js messing with error objects
    console.error("Error generating PDF:", error?.message || String(error));
    console.error(error?.stack || "");
    return new Response("Internal Server Error", { status: 500 });
  }
}
