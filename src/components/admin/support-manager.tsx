"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquareText, Loader2, Send, RefreshCw, Paperclip, X, CheckCircle2, Archive } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket, TicketReply } from "@/lib/types";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const [tickets, setTickets] = useState<(SupportTicket & { replies: TicketReply[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [profileMap, setProfileMap] = useState<Record<string, { username: string; discord_username: string | null }>>({});
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const supabase = createClient();

  const loadTickets = useCallback(async () => {
    const { data: tData } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (tData) {
      const ticketsWithReplies = await Promise.all(
        tData.map(async (t) => {
          const { data: rData } = await supabase
            .from("ticket_replies")
            .select("*")
            .eq("ticket_id", t.id)
            .order("created_at", { ascending: true });
          return { ...t, replies: rData ?? [] };
        })
      );
      setTickets(ticketsWithReplies);
      const userIds = [...new Set(tData.map((t) => t.user_id))];
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

  const uploadImage = async (file: File, ticketId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${ticketId}/admin-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ticket-images").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Failed to upload image");
      return null;
    }
    const { data: urlData } = supabase.storage.from("ticket-images").getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim() && !replyFile) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    let imageUrl: string | null = null;
    if (replyFile) {
      imageUrl = await uploadImage(replyFile, ticketId);
      if (!imageUrl) { setSaving(false); return; }
    }

    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: replyText.trim() || "(image attachment)",
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Failed to send reply");
      setSaving(false);
      return;
    }

    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        title: `New Reply on Your Ticket`,
        message: `Admin replied to your ticket "${ticket.subject}".`,
        type: "info",
        link: `/support`,
      });
    }

    setSaving(false);
    toast.success("Reply sent");
    setReplying(null);
    setReplyText("");
    setReplyFile(null);
    loadTickets();
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticketId);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      const labels: Record<string, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        title: "Ticket Status Changed",
        message: `Your ticket "${ticket.subject}" status changed to "${labels[newStatus] || newStatus}".`,
        type: "info",
        link: `/support`,
      });
    }
    toast.success("Status updated");
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
          const isExpanded = expandedTicket === t.id;
          return (
            <Card key={t.id}>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setExpandedTicket(isExpanded ? null : t.id)}
              >
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
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0 mt-1">
                        <AvatarFallback className="text-xs bg-primary/10">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[80%]">
                        <div className="bg-muted/30 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs">@{profile?.username || "User"}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{t.message}</p>
                          {t.image_url && (
                            <a href={t.image_url} target="_blank" rel="noopener noreferrer">
                              <img src={t.image_url} alt="Attachment" className="max-h-48 rounded-lg border mt-2" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {t.replies.map((r) => {
                      const isAdminReply = r.user_id !== t.user_id;
                      return (
                        <div key={r.id} className={`flex gap-3 ${isAdminReply ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 shrink-0 mt-1">
                            <AvatarFallback className={`text-xs ${isAdminReply ? "bg-primary/10" : ""}`}>
                              {isAdminReply ? "A" : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 max-w-[80%]">
                            <div className={`rounded-lg p-3 text-sm ${isAdminReply ? "bg-primary/5 border border-primary/10" : "bg-muted/30"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs">{isAdminReply ? "Admin" : profile?.username || "User"}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{r.message}</p>
                              {r.image_url && (
                                <a href={r.image_url} target="_blank" rel="noopener noreferrer">
                                  <img src={r.image_url} alt="Attachment" className="max-h-48 rounded-lg border mt-2" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {replying === t.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center gap-3">
                        <Label className="shrink-0">Status:</Label>
                        <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v ?? t.status)}>
                          <SelectTrigger className="w-36">
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
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => document.getElementById(`admin-img-${t.id}`)?.click()}>
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach Image
                        </Button>
                        <input id={`admin-img-${t.id}`} type="file" accept="image/*" className="hidden"
                          onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                        />
                        {replyFile && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{replyFile.name}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyFile(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => { setReplying(null); setReplyText(""); setReplyFile(null); }}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleReply(t.id)}
                          disabled={saving || (!replyText.trim() && !replyFile)}
                        >
                          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => { setReplying(t.id); setReplyText(""); setReplyFile(null); }}>
                        <Send className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                      {t.status === "open" && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(t.id, "in_progress")}>
                          Start Progress
                        </Button>
                      )}
                      {t.status !== "resolved" && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(t.id, "resolved")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                      {t.status !== "closed" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(t.id, "closed")}>
                          <Archive className="h-4 w-4 mr-1" />
                          Close
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
