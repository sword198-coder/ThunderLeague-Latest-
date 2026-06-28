"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageCircle, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChatWindow } from "./chat-window";
import { NewConversationDialog } from "./new-conversation-dialog";
import type { Profile } from "@/lib/types";

type ConvWithProfile = {
  id: string;
  otherProfile: Profile;
  lastMessage?: string;
  lastMessageTime?: string;
};

export function ChatSidebar() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConvWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<ConvWithProfile | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const loadConversations = async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!parts || parts.length === 0) { setLoading(false); setConversations([]); return; }

    const convIds = parts.map((p) => p.conversation_id);

    // Get all participants in those conversations to find who the other person is
    const { data: allParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds);

    if (!allParts) { setLoading(false); return; }

    // Find the other user in each conversation
    const convOtherMap: Record<string, string[]> = {};
    allParts.forEach((p) => {
      if (!convOtherMap[p.conversation_id]) convOtherMap[p.conversation_id] = [];
      convOtherMap[p.conversation_id].push(p.user_id);
    });

    const otherUserIds: string[] = [];
    const convIdToOtherId: Record<string, string> = {};
    Object.entries(convOtherMap).forEach(([convId, userIds]) => {
      const otherId = userIds.find((uid) => uid !== user.id);
      if (otherId) {
        otherUserIds.push(otherId);
        convIdToOtherId[convId] = otherId;
      }
    });

    if (otherUserIds.length === 0) { setLoading(false); setConversations([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, last_active_at")
      .in("id", otherUserIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Get last message for each conversation
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("conversation_id, text, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMsgMap: Record<string, { text: string; created_at: string }> = {};
    lastMsgs?.forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = { text: m.text, created_at: m.created_at };
    });

    setConversations(
      convIds
        .map((convId) => {
          const otherId = convIdToOtherId[convId];
          if (!otherId) return null;
          const otherProfile = profileMap.get(otherId);
          if (!otherProfile) return null;
          return {
            id: convId,
            otherProfile: otherProfile as Profile,
            lastMessage: lastMsgMap[convId]?.text,
            lastMessageTime: lastMsgMap[convId]?.created_at,
          };
        })
        .filter(Boolean) as ConvWithProfile[]
    );
    setLoading(false);
  };

  useEffect(() => { loadConversations(); }, [user]);

  // Realtime subscription for new conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-sidebar")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` }, () => { loadConversations(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { loadConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = conversations.filter(
    (c) =>
      (c.otherProfile.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.otherProfile.username || "").toLowerCase().includes(search.toLowerCase())
  );

  if (activeConv) {
    return (
      <Card className="border-border/40 rounded-2xl overflow-hidden flex flex-col h-full">
        <div className="flex-1 min-h-0 flex flex-col">
          <ChatWindow conversationId={activeConv.id} otherProfile={activeConv.otherProfile} onClose={() => setActiveConv(null)} />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/40 rounded-2xl overflow-hidden flex flex-col h-full">
        <div className="p-3 pb-1 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
            </h3>
            <button onClick={() => setShowNew(true)} className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-8 h-8 text-xs rounded-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">{search ? "No conversations found" : "No conversations yet"}</p>
              {!search && <button onClick={() => setShowNew(true)} className="text-xs text-primary hover:underline mt-1">Start a conversation</button>}
            </div>
          ) : (
            <div className="space-y-0.5 px-2 pb-2">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={conv.otherProfile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{(conv.otherProfile.display_name || conv.otherProfile.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{conv.otherProfile.display_name || conv.otherProfile.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages yet"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <NewConversationDialog open={showNew} onOpenChange={setShowNew} onCreated={() => { loadConversations(); }} />
    </>
  );
}
