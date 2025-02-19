import { Suspense } from "react";
import DynamicCustomerClient from "./DynamicCustomerClient";

export default function DynamicCustomerPage() {
  return (
    <Suspense fallback={<div>Loading dynamic customer...</div>}>
      <DynamicCustomerClient />
    </Suspense>
  );
}
