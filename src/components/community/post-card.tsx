"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentSection } from "./comment-section";
import type { Post, Profile, PostLike } from "@/lib/types";

type PostWithDetails = Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number };

export function PostCard({ post, onUpdate }: { post: PostWithDetails; onUpdate: () => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const supabase = createClient();

  const isOwner = user?.id === post.user_id;
  const initials = post.profile?.display_name
    ? post.profile.display_name.slice(0, 2).toUpperCase()
    : post.profile?.username?.slice(0, 2).toUpperCase() || "??";

  useEffect(() => {
    if (user && post.likes) {
      setLiked(post.likes.some((l) => l.user_id === user.id));
    }
  }, [user, post.likes]);

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: user.id });
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const deletePost = async () => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    onUpdate();
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profile?.avatar_url ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{post.profile?.display_name || post.profile?.username || "Unknown"}</p>
              <p className="text-xs text-muted-foreground" title={format(new Date(post.created_at), "MMM d, yyyy h:mm a")}>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isOwner && (
            <button onClick={deletePost} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {post.text && <p className="text-sm whitespace-pre-wrap">{post.text}</p>}

        {post.image_url && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/30">
            <Image src={post.image_url} alt="" fill className="object-cover" unoptimized />
          </div>
        )}

        <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
          <button onClick={toggleLike} className={`flex items-center gap-1.5 transition-colors ${liked ? "text-red-500" : "hover:text-red-400"}`}>
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <MessageCircle className="h-4 w-4" />
            {post.comment_count || 0}
          </button>
        </div>
      </div>

      {showComments && (
        <div className="border-t border-border/30">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  );
}
