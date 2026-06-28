"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
  presetUserId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  presetUserId?: string;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (open && presetUserId && !autoStarted && user) {
      setAutoStarted(true);
      const startConv = async () => {
        setCreating(true);
        const { data: myParts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
        if (myParts && myParts.length > 0) {
          const convIds = myParts.map((p) => p.conversation_id);
          const { data: theirParts } = await supabase.from("conversation_participants").select("conversation_id").in("conversation_id", convIds).eq("user_id", presetUserId);
          if (theirParts && theirParts.length > 0) {
            setCreating(false);
            onOpenChange(false);
            onCreated();
            return;
          }
        }
        const { error } = await supabase.rpc("create_conversation", { participant_ids: [user.id, presetUserId] });
        setCreating(false);
        if (error) { toast.error("Failed to create conversation"); return; }
        onOpenChange(false);
        onCreated();
      };
      startConv();
    }
    if (!open) setAutoStarted(false);
  }, [open, presetUserId, user, autoStarted]);

  const searchPlayers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(8);
    setResults((data || []).filter((p) => p.id !== user?.id));
    setSearching(false);
  };

  const startConversation = async (otherId: string) => {
    if (!user || creating) return;
    setCreating(true);
    const { data: myParts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
    if (myParts && myParts.length > 0) {
      const convIds = myParts.map((p) => p.conversation_id);
      const { data: theirParts } = await supabase.from("conversation_participants").select("conversation_id").in("conversation_id", convIds).eq("user_id", otherId);
      if (theirParts && theirParts.length > 0) {
        setCreating(false);
        onOpenChange(false);
        onCreated();
        return;
      }
    }
    const { error } = await supabase.rpc("create_conversation", { participant_ids: [user.id, otherId] });
    setCreating(false);
    if (error) { toast.error("Failed to create conversation"); return; }
    onOpenChange(false);
    onCreated();
  };

  if (presetUserId && creating) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xs">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Search for a player to start a conversation</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => searchPlayers(e.target.value)}
            placeholder="Search by name or username..."
            className="pl-9 h-9 text-sm"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.map((p) => (
            <button key={p.id} onClick={() => startConversation(p.id)} disabled={creating} className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-muted/50 text-left transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{(p.display_name || p.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                <p className="text-xs text-muted-foreground">@{p.username}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full" disabled={creating}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
              </Button>
            </button>
          ))}
          {search.length >= 2 && results.length === 0 && !searching && (
            <p className="text-xs text-muted-foreground text-center py-4">No players found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
