"use client";

import { usePathname } from "next/navigation";

export default function ConditionalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // On non-home pages, add left margin (sm and above) and top padding on mobile.
  const marginClass = pathname === "/" ? "" : "sm:ml-16";
  const topPadding = pathname === "/" ? "" : "pt-16 sm:pt-0";

  return (
    <main
      className={`${marginClass} transition-all duration-300 ${topPadding}`}
    >
      {children}
    </main>
  );
}
