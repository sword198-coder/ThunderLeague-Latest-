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
  const [messages, setMessages] = useState<(TournamentChatMessage & { name: string; avatar_url: string | null })[]>([]);
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
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      setMessages(
        msgs.map((m) => {
          const prof = profileMap.get(m.user_id);
          return {
            ...m,
            name: prof?.display_name || prof?.username || "Unknown",
            avatar_url: prof?.avatar_url || null,
          };
        })
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
    <div className="border rounded-xl overflow-hidden max-w-lg mx-auto shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="p-1.5 rounded-full bg-primary/10">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-sm">Tournament Chat</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{messages.length} messages</span>
      </div>

      <div className="h-72 sm:h-80 overflow-y-auto p-4 space-y-3 bg-muted/10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs opacity-60">Be the first to chat!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = user?.id === msg.user_id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${isOwn ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {msg.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[11px] font-semibold ${isOwn ? "text-primary" : "text-foreground"}`}>{msg.name}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), "HH:mm")}</span>
                </div>
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border rounded-tl-sm"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteMessage(msg.id)} className="text-[10px] text-muted-foreground hover:text-destructive mt-0.5 flex items-center gap-0.5">
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!chatEnabled ? (
        <div className="p-3 border-t bg-muted/20 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" />
          Chat is disabled
        </div>
      ) : canSend ? (
        <div className="flex gap-2 p-3 border-t bg-card">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            className="rounded-full"
          />
          <Button size="icon" className="rounded-full shrink-0" onClick={sendMessage} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 border-t bg-muted/20 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Ban className="h-3 w-3" />
          Only accepted participants can send messages
        </div>
      )}
    </div>
  );
}
