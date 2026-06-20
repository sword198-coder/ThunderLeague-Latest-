"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { UserWarning } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WarnCtx = { unseenCount: number; dismiss: (id: string) => void };
const WarningCtx = createContext<WarnCtx>({ unseenCount: 0, dismiss: () => {} });
export const useWarnings = () => useContext(WarningCtx);

export function WarningProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [unseen, setUnseen] = useState<UserWarning[]>([]);
  const [current, setCurrent] = useState<UserWarning | null>(null);

  const dismiss = useCallback((id: string) => {
    const key = "tl_seen_warnings";
    const raw = localStorage.getItem(key);
    const seen = new Set(raw ? JSON.parse(raw) : []);
    seen.add(id);
    localStorage.setItem(key, JSON.stringify([...seen]));
    setUnseen((prev) => { const next = prev.filter((w) => w.id !== id); return next; });
    setCurrent(null);
  }, []);

  const fetchUnseen = useCallback(async () => {
    if (!user) return;
    const key = "tl_seen_warnings";
    const raw = localStorage.getItem(key);
    const seen = new Set(raw ? JSON.parse(raw) : []);
    const { data } = await supabase
      .from("user_warnings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      const u = data.filter((w) => !seen.has(w.id));
      setUnseen(u);
      if (u.length > 0 && !current) setCurrent(u[0]);
    }
  }, [user, current, supabase]);

  useEffect(() => {
    if (!user) { setUnseen([]); setCurrent(null); return; }
    fetchUnseen();
    const channel = supabase
      .channel(`user-warnings-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_warnings",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const w = payload.new as UserWarning;
        const key = "tl_seen_warnings";
        const raw = localStorage.getItem(key);
        const seen = new Set(raw ? JSON.parse(raw) : []);
        if (!seen.has(w.id)) {
          setUnseen((prev) => [w, ...prev]);
          setCurrent(w);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnseen, supabase]);

  return (
    <WarningCtx.Provider value={{ unseenCount: unseen.length, dismiss }}>
      {children}
      {current && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/20">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <DialogTitle className="text-base">Warning Received</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(current.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm">{current.reason}</p>
            </div>
            <Button onClick={() => dismiss(current.id)} className="w-full">OK</Button>
          </DialogContent>
        </Dialog>
      )}
    </WarningCtx.Provider>
  );
}
