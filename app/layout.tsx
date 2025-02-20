import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import SidebarAndInbox from "./components/SidebarAndInbox"; // your conditional sidebar component
import ConditionalMain from "./components/ConditionalMain";

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
        <SidebarAndInbox />
        <ConditionalMain>{children}</ConditionalMain>
      </body>
    </html>
  );
}
