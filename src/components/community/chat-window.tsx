"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Message } from "@/lib/types";
import type { Profile } from "@/lib/types";

export function ChatWindow({
  conversationId,
  otherProfile,
  onClose,
}: {
  conversationId: string;
  otherProfile: Profile;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", senderIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setMessages(data.map((m) => ({ ...m, sender: profileMap.get(m.sender_id) })));
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const newMsg = payload.new as Record<string, string>;
        const msg: Message = { id: newMsg.id, conversation_id: newMsg.conversation_id, sender_id: newMsg.sender_id, text: newMsg.text, created_at: newMsg.created_at };
        supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", newMsg.sender_id).single().then(({ data: prof }) => {
          setMessages((prev) => [...prev, { ...msg, sender: prof || undefined } as Message & { sender?: Profile }]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      text: text.trim(),
    });
    setSending(false);
    if (error) return;
    setText("");
  };

  const initials = (otherProfile.display_name || otherProfile.username || "?").slice(0, 2).toUpperCase();

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 p-3 border-b border-border/30 shrink-0">
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted/50 -ml-1"><X className="h-4 w-4" /></button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherProfile.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{otherProfile.display_name || otherProfile.username}</p>
          <p className="text-[11px] text-muted-foreground truncate">@{otherProfile.username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          const initials = m.sender?.display_name?.slice(0, 2).toUpperCase() || m.sender?.username?.slice(0, 2).toUpperCase() || "??";
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={m.sender?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 rounded-tl-sm"
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border/30 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="h-9 text-sm rounded-full"
          />
          <button type="submit" disabled={!text.trim() || sending} className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
