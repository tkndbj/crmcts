import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

// Import the AuthLayout and our new NotificationsBell component
import AuthLayout from "./AuthLayout";
import NotificationsBell from "./components/NotificationsBell";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CTS CRM",
  description: "CTS Müşteri Takip Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${figtree.className} antialiased overflow-x-hidden`}>
        {/* We wrap children in a separate client component */}
        <AuthLayout>
          {children}
          <NotificationsBell />
        </AuthLayout>
      </body>
    </html>
  );
}
