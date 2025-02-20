"use client";

import { usePathname } from "next/navigation";

export default function ConditionalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // On the home page, no margin is applied.
  // For other pages, apply ml-12 (mobile) and ml-16 (sm and above).
  const marginClass = pathname === "/" ? "" : "ml-12 sm:ml-16";

  return (
    <main className={`${marginClass} transition-all duration-300`}>
      {children}
    </main>
  );
}
