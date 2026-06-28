"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, Loader2, Search, Plus, Send, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Profile, Message } from "@/lib/types";

type ConvSummary = {
  id: string;
  otherProfile: Profile;
  lastMessage?: string;
};

export function FloatingChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<ConvSummary | null>(null);
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const supabase = createClient();

  const loadConversations = async () => {
    if (!user) return;
    const { data: parts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
    if (!parts || parts.length === 0) { setLoading(false); setConversations([]); return; }
    const convIds = parts.map((p) => p.conversation_id);

    const { data: allParts } = await supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convIds);
    if (!allParts) { setLoading(false); return; }

    const convOtherMap: Record<string, string[]> = {};
    allParts.forEach((p) => { if (!convOtherMap[p.conversation_id]) convOtherMap[p.conversation_id] = []; convOtherMap[p.conversation_id].push(p.user_id); });

    const otherUserIds: string[] = [];
    const convIdToOtherId: Record<string, string> = {};
    Object.entries(convOtherMap).forEach(([convId, userIds]) => {
      const otherId = userIds.find((uid) => uid !== user.id);
      if (otherId) { otherUserIds.push(otherId); convIdToOtherId[convId] = otherId; }
    });

    if (otherUserIds.length === 0) { setLoading(false); setConversations([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherUserIds);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const { data: lastMsgs } = await supabase.from("messages").select("conversation_id, text, created_at").in("conversation_id", convIds).order("created_at", { ascending: false });
    const lastMsgMap: Record<string, { text: string; created_at: string }> = {};
    lastMsgs?.forEach((m) => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = { text: m.text, created_at: m.created_at }; });

    setConversations(convIds.map((convId) => { const otherId = convIdToOtherId[convId]; if (!otherId) return null; const otherProfile = profileMap.get(otherId); if (!otherProfile) return null; return { id: convId, otherProfile: otherProfile as Profile, lastMessage: lastMsgMap[convId]?.text }; }).filter(Boolean) as ConvSummary[]);
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", senderIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setMessages(data.map((m) => ({ ...m, sender: profileMap.get(m.sender_id) })));
    } else { setMessages([]); }
  };

  const searchPlayers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(6);
    setSearchResults((data || []).filter((p) => p.id !== user?.id) as Profile[]);
    setSearching(false);
  };

  const startConversation = async (otherId: string) => {
    const { data: myParts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user?.id);
    if (myParts && myParts.length > 0) {
      const convIds = myParts.map((p) => p.conversation_id);
      const { data: theirParts } = await supabase.from("conversation_participants").select("conversation_id").in("conversation_id", convIds).eq("user_id", otherId);
      if (theirParts && theirParts.length > 0) {
        loadConversations();
        setShowNew(false);
        setSearch("");
        return;
      }
    }
    const { data: convId } = await supabase.rpc("create_conversation", { participant_ids: [user?.id, otherId] });
    if (convId) { loadConversations(); }
    setShowNew(false);
    setSearch("");
  };

  const sendMessage = async () => {
    if (!text.trim() || !user || !activeConv || sending) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_id: user.id, text: text.trim() });
    setSending(false);
    setText("");
  };

  // Realtime
  useEffect(() => {
    if (!user || !open) return;
    loadConversations();
    const channel = supabase.channel("floating-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` }, () => loadConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { if (!activeConv) loadConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, open]);

  // Subscribe to new messages when in a conversation
  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
    const channel = supabase.channel(`fc-${activeConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` }, (payload) => {
        const nm = payload.new as Record<string, string>;
        const msg: Message = { id: nm.id, conversation_id: nm.conversation_id, sender_id: nm.sender_id, text: nm.text, created_at: nm.created_at };
        supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", nm.sender_id).single().then(({ data: prof }) => {
          setMessages((prev) => [...prev, { ...msg, sender: prof || undefined } as Message & { sender?: Profile }]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  const openConversation = (conv: ConvSummary) => {
    setActiveConv(conv);
    loadMessages(conv.id);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all">
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 shadow-2xl rounded-xl border border-border/50 bg-background overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20 shrink-0">
        {activeConv ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => { setActiveConv(null); setMessages([]); }} className="p-0.5 rounded hover:bg-muted/50"><ChevronLeft className="h-4 w-4" /></button>
            <Avatar className="h-7 w-7">
              <AvatarImage src={activeConv.otherProfile.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px]">{(activeConv.otherProfile.display_name || activeConv.otherProfile.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold truncate">{activeConv.otherProfile.display_name || activeConv.otherProfile.username}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h3 className="text-sm font-bold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Chats</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNew(!showNew)} className="p-1.5 rounded-full hover:bg-muted/50"><Plus className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-muted/50"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* New conversation search */}
      {showNew && !activeConv && (
        <div className="p-3 border-b border-border/20 shrink-0">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => searchPlayers(e.target.value)} placeholder="Search players..." className="pl-8 h-8 text-xs rounded-lg" autoFocus />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin" />}
          </div>
          {searchResults.map((p) => (
            <button key={p.id} onClick={() => startConversation(p.id)} className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-muted/50 text-left transition-colors">
              <Avatar className="h-7 w-7"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{(p.display_name || p.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{p.display_name || p.username}</p><p className="text-[10px] text-muted-foreground">@{p.username}</p></div>
            </button>
          ))}
          {search.length >= 2 && searchResults.length === 0 && !searching && <p className="text-[10px] text-muted-foreground text-center py-2">No players found</p>}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeConv ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>}
              {messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && <Avatar className="h-6 w-6 shrink-0 mt-0.5"><AvatarImage src={m.sender?.avatar_url ?? undefined} /><AvatarFallback className="text-[8px]">{(m.sender?.display_name || m.sender?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>}
                    <div className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 rounded-tl-sm"}`}>{m.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-border/20 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-1.5">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message..." className="h-8 text-xs rounded-full" />
                <button type="submit" disabled={!text.trim() || sending} className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No conversations</p>
                <button onClick={() => setShowNew(true)} className="text-xs text-primary hover:underline mt-1">Start one</button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button key={conv.id} onClick={() => openConversation(conv)} className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-muted/50 text-left transition-colors">
                  <Avatar className="h-8 w-8"><AvatarImage src={conv.otherProfile.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{(conv.otherProfile.display_name || conv.otherProfile.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{conv.otherProfile.display_name || conv.otherProfile.username}</p><p className="text-[10px] text-muted-foreground truncate">{conv.lastMessage || "No messages yet"}</p></div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
