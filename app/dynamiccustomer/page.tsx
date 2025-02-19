// app/dynamiccustomer/page.tsx

import { Suspense } from "react";
import SearchParamsClient from "./SearchParamsClient";

// Disable static or server rendering:
export const dynamic = "force-dynamic";
export const revalidate = 0;

// This remains a server component (no "use client" at top!)
export default function DynamicCustomerPage() {
  return (
    <Suspense fallback={<div>Loading dynamic customer page...</div>}>
      <SearchParamsClient />
    </Suspense>
  );
}
