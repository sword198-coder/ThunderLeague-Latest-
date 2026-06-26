"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wrench } from "lucide-react";

export function MaintenanceGuard({ page, children }: { page: string; children: ReactNode }) {
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("site_settings").select("key, value");
      if (data) {
        const statusEntry = data.find((s) => s.key === "page_maintenance");
        const msgEntry = data.find((s) => s.key === "maintenance_message");
        if (statusEntry) {
          try {
            const status = JSON.parse(statusEntry.value);
            if (status[page]) {
              setDisabled(true);
              setMessage(msgEntry?.value || "This page is under development. It will be available soon.");
            }
          } catch {}
        }
      }
      setChecking(false);
    };
    check();
  }, [page]);

  if (checking) return null;

  if (disabled) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <div className="p-4 rounded-full bg-amber-500/10 inline-block mb-6">
          <Wrench className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Page Unavailable</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  return <>{children}</>;
}
