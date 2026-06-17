"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTab() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push("/admin")}
      className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
    >
      <Shield className="h-4 w-4 mr-1" />
      Admin
    </Button>
  );
}
