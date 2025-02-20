"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Inbox from "./inbox";

export default function SidebarAndInbox() {
  const pathname = usePathname();

  // Do not render Sidebar and Inbox on the home page ("/")
  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <Sidebar />
      <Inbox />
    </>
  );
}
