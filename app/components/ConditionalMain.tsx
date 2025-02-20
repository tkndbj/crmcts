"use client";

import { usePathname } from "next/navigation";

export default function ConditionalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // No margin on mobile; on screens >= sm add left margin.
  const marginClass = pathname === "/" ? "" : "sm:ml-16";

  return (
    <main
      className={`${marginClass} transition-all duration-300 pt-16 sm:pt-0`}
    >
      {children}
    </main>
  );
}
