// app/dynamiccustomer/page.tsx (Server Component by default)
import { Suspense } from "react";
import DynamicCustomerClient from "./DynamicCustomerClient";

// This file has NO "use client" at the top
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DynamicCustomerClient />
    </Suspense>
  );
}
