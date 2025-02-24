// app/layout.tsx
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

import AuthLayout from "./AuthLayout";
import NotificationsBell from "./components/NotificationsBell";
import GlobalReminder from "./components/GlobalReminder";

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
        <AuthLayout>
          {children}
          <NotificationsBell />
          <GlobalReminder />
        </AuthLayout>
      </body>
    </html>
  );
}
