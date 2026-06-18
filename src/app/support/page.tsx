"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquareText, Plus, Send, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { SupportTicket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  in_progress: { label: "In Progress", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) loadTickets();
  }, [user, authLoading]);

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user!.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Failed to create ticket");
      return;
    }
    toast.success("Ticket created");
    setCreating(false);
    setSubject("");
    setMessage("");
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
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
        tickets.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-lg">{t.subject}</CardTitle>
                  <CardDescription>
                    {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={STATUS_MAP[t.status]?.color}>
                  {STATUS_MAP[t.status]?.label || t.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">Your message:</p>
                <p className="whitespace-pre-wrap">{t.message}</p>
              </div>
              {t.admin_reply && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Admin reply:</p>
                  <p className="whitespace-pre-wrap">{t.admin_reply}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
