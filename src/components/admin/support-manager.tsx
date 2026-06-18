"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquareText, Loader2, Send, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_MAP: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-muted text-muted-foreground",
};

export function SupportManager() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [profileMap, setProfileMap] = useState<Record<string, { username: string; discord_username: string | null }>>({});
  const supabase = createClient();

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setTickets(data);
      const userIds = [...new Set(data.map((t) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, discord_username")
        .in("id", userIds);
      if (profiles) {
        const map: Record<string, { username: string; discord_username: string | null }> = {};
        profiles.forEach((p) => { map[p.id] = { username: p.username, discord_username: p.discord_username }; });
        setProfileMap(map);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTickets();
    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => { loadTickets(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  const updateTicket = async (id: string, updates: Partial<SupportTicket>) => {
    setSaving(true);
    const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update ticket");
      return;
    }
    toast.success("Ticket updated");
    setReplying(null);
    setReplyText("");
    loadTickets();
  };

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

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
          <MessageSquareText className="h-6 w-6" />
          Support Tickets ({tickets.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadTickets}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tickets found
          </CardContent>
        </Card>
      ) : (
        filtered.map((t) => {
          const profile = profileMap[t.user_id];
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{t.subject}</CardTitle>
                    <CardDescription className="flex flex-col gap-0.5">
                      <span>@{profile?.username || t.user_id.slice(0, 8)}</span>
                      {profile?.discord_username && (
                        <span className="text-xs">Discord: {profile.discord_username}</span>
                      )}
                      <span>{format(new Date(t.created_at), "MMM d, yyyy HH:mm")}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={STATUS_MAP[t.status]}>
                    {STATUS_OPTIONS.find((o) => o.value === t.status)?.label || t.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">User message:</p>
                  <p className="whitespace-pre-wrap">{t.message}</p>
                </div>

                {t.admin_reply && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Admin reply:</p>
                    <p className="whitespace-pre-wrap">{t.admin_reply}</p>
                  </div>
                )}

                {replying === t.id ? (
                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={t.status}
                        onValueChange={(v) => setTickets((prev) => prev.map((x) => x.id === t.id ? { ...x, status: v ?? t.status } as SupportTicket : x))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`reply-${t.id}`}>Reply</Label>
                      <Textarea
                        id={`reply-${t.id}`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        placeholder="Write your reply..."
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => { setReplying(null); setReplyText(""); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateTicket(t.id, {
                          status: t.status,
                          admin_reply: replyText || t.admin_reply,
                        } as SupportTicket)}
                        disabled={saving}
                      >
                        {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        <Send className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setReplying(t.id); setReplyText(t.admin_reply || ""); }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {t.admin_reply ? "Edit Reply" : "Reply"}
                    </Button>
                    {t.status !== "closed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTicket(t.id, { status: "closed" } as SupportTicket)}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
