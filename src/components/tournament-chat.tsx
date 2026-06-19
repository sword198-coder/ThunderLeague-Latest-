"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Trash2, MessageCircle, Ban, Lock } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { TournamentChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TournamentChat({ tournamentId, isUserApproved, chatEnabled }: { tournamentId: string; isUserApproved: boolean; chatEnabled: boolean }) {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [messages, setMessages] = useState<(TournamentChatMessage & { name: string })[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "super_admin";
  const canSend = !!(user && (isAdmin || isUserApproved));

  useEffect(() => {
    const load = async () => {
      const { data: msgs } = await supabase
        .from("tournament_chat_messages")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true });

      if (!msgs) return;

      const userIds = [...new Set(msgs.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name || p.username]));

      setMessages(
        msgs.map((m) => ({
          ...m,
          name: nameMap.get(m.user_id) || "Unknown",
        }))
      );
    };

    load();

    const channel = supabase
      .channel(`tournament-chat-${tournamentId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tournament_chat_messages",
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    await supabase.from("tournament_chat_messages").insert({
      tournament_id: tournamentId,
      user_id: user.id,
      message: text.trim(),
    });
    setText("");
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("tournament_chat_messages").delete().eq("id", msgId);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <MessageCircle className="h-4 w-4" />
        <span className="font-semibold text-sm">Tournament Chat</span>
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isOwn = user?.id === msg.user_id;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isOwn ? "bg-primary/10" : "bg-muted"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{msg.name}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), "HH:mm")}</span>
                  {(isOwn || isAdmin) && (
                    <button onClick={() => deleteMessage(msg.id)} className="text-muted-foreground hover:text-destructive ml-auto">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!chatEnabled ? (
        <div className="p-3 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3 inline mr-1" />
          Chat is disabled
        </div>
      ) : canSend ? (
        <div className="flex gap-2 p-3 border-t">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
          />
          <Button size="icon" onClick={sendMessage} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          <Ban className="h-3 w-3 inline mr-1" />
          Only accepted participants can send messages
        </div>
      )}
    </div>
  );
}
