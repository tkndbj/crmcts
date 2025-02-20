"use client";

import { usePathname } from "next/navigation";

export default function ConditionalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Remove margin on the home page ("/"), otherwise apply ml-16
  const marginClass = pathname === "/" ? "" : "ml-16";

  return (
    <main className={`${marginClass} transition-all duration-300`}>
      {children}
    </main>
  );
}
