"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Flag, Loader2, RefreshCw, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { ChatReport, TournamentChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";

export default function ChatReportsPage() {
  const [reports, setReports] = useState<(ChatReport & { message?: TournamentChatMessage; reporter_name?: string; tournament_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadReports = useCallback(async () => {
    const { data: rData } = await supabase
      .from("chat_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rData) { setLoading(false); return; }

    const enriched = await Promise.all(
      rData.map(async (r) => {
        let message: TournamentChatMessage | undefined;
        let reporter_name: string | undefined;
        let tournament_title: string | undefined;

        const { data: msg } = await supabase
          .from("tournament_chat_messages")
          .select("*")
          .eq("id", r.message_id)
          .maybeSingle();
        message = msg || undefined;

        const { data: prof } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", r.reporter_id)
          .single();
        reporter_name = prof?.username;

        const { data: tourn } = await supabase
          .from("tournaments")
          .select("title")
          .eq("id", r.tournament_id)
          .single();
        tournament_title = tourn?.title;

        return { ...r, message, reporter_name, tournament_title };
      })
    );

    setReports(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadReports();
    const channel = supabase
      .channel("admin-chat-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reports" }, () => { loadReports(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadReports]);

  const dismissReport = async (reportId: string) => {
    await supabase.from("chat_reports").delete().eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    toast.success("Report dismissed");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Flag className="h-6 w-6" />
          Chat Reports ({reports.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={loadReports}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            No chat reports yet
          </CardContent>
        </Card>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Reported Message
                    </Badge>
                    <span className="text-sm font-medium">{r.tournament_title || "Unknown Tournament"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reported by @{r.reporter_name || "unknown"} · {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => dismissReport(r.id)} title="Dismiss">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {r.message ? (
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    <span>Reported message:</span>
                  </div>
                  <p className="whitespace-pre-wrap">{r.message.message}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Message was deleted</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
