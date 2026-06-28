"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PostComment } from "@/lib/types";

export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<(PostComment & { profile?: { avatar_url?: string | null; display_name?: string | null; username?: string } })[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, post_id, user_id, text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url, display_name, username")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setComments(data.map((c) => ({ ...c, profile: profileMap.get(c.user_id) })) as any);
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [postId]);

  const sendComment = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("post_comments").insert({ user_id: user.id, post_id: postId, text: text.trim() });
    setSending(false);
    if (error) { return; }
    setText("");
    load();
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    load();
  };

  return (
    <div className="p-4 space-y-3">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] font-bold">{(c.profile?.display_name || c.profile?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-muted/50 rounded-2xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold">{c.profile?.display_name || c.profile?.username || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs mt-0.5">{c.text}</p>
                </div>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => deleteComment(c.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {user && (
        <form onSubmit={(e) => { e.preventDefault(); sendComment(); }} className="flex items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-bold">{user?.email?.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-2 bg-muted/30 rounded-full px-3 py-1 border border-border/30">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              className="h-8 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button type="submit" disabled={sending || !text.trim()} size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
