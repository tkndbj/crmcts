// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // This will redirect the root path ("/") to "/auth"
  redirect("/auth");
}
