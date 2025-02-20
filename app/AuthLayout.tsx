"use client";

import SidebarAndInbox from "./components/SidebarAndInbox";
import ConditionalMain from "./components/ConditionalMain";
import { AuthContextProvider } from "../context/AuthContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthContextProvider>
      <SidebarAndInbox />
      <ConditionalMain>{children}</ConditionalMain>
    </AuthContextProvider>
  );
}
