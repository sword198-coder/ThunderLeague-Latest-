"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquareText, Plus, Send, Loader2, RefreshCw, ImagePlus, X, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { SupportTicket, TicketReply } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  in_progress: { label: "In Progress", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

export default function SupportPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tickets, setTickets] = useState<(SupportTicket & { replies: TicketReply[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File | null>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const loadTickets = async () => {
    const { data: tData } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user!.id)
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
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) loadTickets();
  }, [user, authLoading]);

  const handleImageSelect = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const uploadImage = async (file: File, ticketId?: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = ticketId ? `${ticketId}/${Date.now()}.${ext}` : `temp/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ticket-images").upload(path, file, { upsert: true });
    if (error) {
      if (error.message?.includes("bucket") || error.message?.includes("not found")) {
        toast.error("Storage bucket 'ticket-images' does not exist. Run migration 0037.");
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }
      return null;
    }
    const { data: urlData } = supabase.storage.from("ticket-images").getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) { setSending(false); return; }
    }
    const { data: newTicket, error } = await supabase.from("support_tickets").insert({
      user_id: user!.id,
      subject: subject.trim(),
      message: message.trim(),
      image_url: imageUrl,
    }).select().single();
    setSending(false);
    if (error || !newTicket) {
      toast.error("Failed to create ticket");
      return;
    }
    toast.success("Ticket created");
    setCreating(false);
    setSubject("");
    setMessage("");
    setImageFile(null);
    setImagePreview(null);
    loadTickets();
  };

  const handleReply = async (ticketId: string) => {
    const text = replyText[ticketId]?.trim();
    if (!text) return;
    setSendingReply(true);
    let imageUrl: string | null = null;
    if (replyImages[ticketId]) {
      imageUrl = await uploadImage(replyImages[ticketId]!, ticketId);
      if (!imageUrl) { setSendingReply(false); return; }
    }
    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: ticketId,
      user_id: user!.id,
      message: text,
      image_url: imageUrl,
    });
    setSendingReply(false);
    if (error) {
      toast.error("Failed to send reply");
      return;
    }
    setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
    setReplyImages((prev) => ({ ...prev, [ticketId]: null }));
    setReplying(null);
    loadTickets();
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquareText className="h-7 w-7" />
            Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a ticket and our team will help you
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTickets}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {!creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => document.getElementById("ticket-image")?.click()}>
                  <ImagePlus className="h-4 w-4 mr-1" />
                  {imageFile ? "Change Image" : "Add Image"}
                </Button>
                <input
                  id="ticket-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                />
                {imageFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{imageFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleImageSelect(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border mt-2" />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setCreating(false); handleImageSelect(null); }}>Cancel</Button>
              <Button onClick={createTicket} disabled={sending || !subject.trim() || !message.trim()}>
                {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" />
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No tickets yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        tickets.map((t) => {
          const isExpanded = expandedTicket === t.id;
          const canReply = t.status !== "closed" && t.status !== "resolved";
          return (
            <Card key={t.id}>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setExpandedTicket(isExpanded ? null : t.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{t.subject}</CardTitle>
                    <CardDescription>
                      {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                      {t.replies.length > 0 && ` · ${t.replies.length} ${t.replies.length === 1 ? "reply" : "replies"}`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={STATUS_MAP[t.status]?.color}>
                    {STATUS_MAP[t.status]?.label || t.status}
                  </Badge>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className={`flex gap-3 ${t.user_id === user?.id ? "" : "flex-row-reverse"}`}>
                      <div className="flex-1 max-w-[80%]">
                        <div className="bg-muted/30 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs">You</span>
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
                      const isAdmin = r.user_id !== t.user_id;
                      return (
                        <div key={r.id} className={`flex gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}>
                          <Avatar className="h-8 w-8 shrink-0 mt-1">
                            <AvatarImage src={isAdmin ? "/admin-avatar.png" : undefined} />
                            <AvatarFallback className="text-xs">{isAdmin ? "A" : "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 max-w-[80%]">
                            <div className={`rounded-lg p-3 text-sm ${isAdmin ? "bg-primary/5 border border-primary/10" : "bg-muted/30"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs">{isAdmin ? "Admin" : "You"}</span>
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
                  {canReply && replying === t.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <Textarea
                        value={replyText[t.id] || ""}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        rows={3}
                        placeholder="Write your reply..."
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => document.getElementById(`reply-image-${t.id}`)?.click()}>
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach
                        </Button>
                        <input id={`reply-image-${t.id}`} type="file" accept="image/*" className="hidden"
                          onChange={(e) => setReplyImages((prev) => ({ ...prev, [t.id]: e.target.files?.[0] || null }))}
                        />
                        {replyImages[t.id] && <span className="text-xs text-muted-foreground">{replyImages[t.id]?.name}</span>}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setReplying(null); setReplyText((prev) => ({ ...prev, [t.id]: "" })); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleReply(t.id)} disabled={sendingReply || !replyText[t.id]?.trim()}>
                          {sendingReply && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          <Send className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  ) : canReply && (
                    <div className="pt-2">
                      <Button variant="outline" size="sm" onClick={() => setReplying(t.id)}>
                        <Send className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                    </div>
                  )}
                  {t.status === "closed" && (
                    <p className="text-xs text-muted-foreground text-center pt-2">This ticket is closed</p>
                  )}
                  {t.status === "resolved" && (
                    <p className="text-xs text-muted-foreground text-center pt-2">This ticket has been resolved</p>
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
