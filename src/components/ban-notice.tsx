"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Ban, AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { UserBan, UserWarning } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function BanNotice() {
  const { user } = useAuth();
  const supabase = createClient();
  const [activeBan, setActiveBan] = useState<UserBan | null>(null);
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setActiveBan(null); setWarnings([]); setLoading(false); return; }

    const check = async () => {
      const [banRes, warnRes] = await Promise.all([
        supabase.from("user_bans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("user_warnings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      if (banRes.data && new Date(banRes.data.expires_at) > new Date()) {
        setActiveBan(banRes.data);
      } else {
        setActiveBan(null);
      }

      setWarnings(warnRes.data ?? []);
      setLoading(false);
    };

    check();

    const channel = supabase
      .channel(`user-bans-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_bans",
        filter: `user_id=eq.${user.id}`,
      }, () => { check(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading || !activeBan) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/20">
              <Ban className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Account Suspended</DialogTitle>
              <DialogDescription>
                You have been temporarily banned from BPL
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="font-medium">Duration:</span>
              <span>{activeBan.duration_text}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Reason:</span>
              <span>{activeBan.reason}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This ban will expire on {format(new Date(activeBan.expires_at), "MMMM d, yyyy 'at' HH:mm")}
            </p>
          </div>

          {warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Recent warnings:</p>
              <div className="space-y-1">
                {warnings.map((w) => (
                  <div key={w.id} className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                    <span>{w.reason} — {format(new Date(w.created_at), "MMM d")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            If you believe this was a mistake, please contact support.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
