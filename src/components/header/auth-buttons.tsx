"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => router.push("/auth/login")}>
        Login
      </Button>
      <Button onClick={() => router.push("/auth/signup")}>Sign Up</Button>
    </div>
  );
}
