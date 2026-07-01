"use client";

import { memo, useState, useEffect } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Trash2, Share, UserPlus, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { CommentSection } from "./comment-section";
import type { Post, Profile, PostLike } from "@/lib/types";

type PostWithDetails = Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number };

export const PostCard = memo(function PostCard({ post, onUpdate, onViewProfile }: { post: PostWithDetails; onUpdate: () => void; onViewProfile?: (userId: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const supabase = createClient();

  const isOwner = user?.id === post.user_id;
  const canFollow = user && !isOwner && post.profile;
  const initials = post.profile?.display_name
    ? post.profile.display_name.slice(0, 2).toUpperCase()
    : post.profile?.username?.slice(0, 2).toUpperCase() || "??";

  useEffect(() => {
    if (user && post.likes) setLiked(post.likes.some((l) => l.user_id === user.id));
  }, [user, post.likes]);

  useEffect(() => {
    if (!user || isOwner || !post.profile) return;
    supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", post.user_id).maybeSingle().then(({ data }) => {
      setFollowing(!!data);
    });
  }, [user, post.user_id, isOwner]);

  const toggleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    if (following) {
      await supabase.from("follows").delete().match({ follower_id: user.id, following_id: post.user_id });
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: post.user_id });
      setFollowing(true);
    }
    setFollowLoading(false);
  };

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: user.id });
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const deletePost = async () => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    onUpdate();
  };

  const handleShare = async () => {
    const text = `${post.profile?.display_name || post.profile?.username}: "${post.text}"`;
    if (navigator.share) {
      await navigator.share({ title: "BPL Community", text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card className="border-border/40 rounded-2xl overflow-hidden transition-colors hover:border-border/60">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => onViewProfile?.(post.user_id)} className="shrink-0">
            <Avatar className="h-11 w-11 shrink-0 hover:ring-2 ring-primary/30 transition-all">
              <AvatarImage src={post.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
          </button>

          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button onClick={() => onViewProfile?.(post.user_id)} className="text-sm font-extrabold truncate hover:underline">{post.profile?.display_name || post.profile?.username || "Unknown"}</button>
                <span className="text-sm text-muted-foreground truncate shrink-0">
                  @{post.profile?.username || "unknown"} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
              {canFollow && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                    following
                      ? "border-border/50 text-muted-foreground hover:border-red-500/50 hover:text-red-400"
                      : "border-primary/50 text-primary hover:bg-primary/10"
                  }`}
                >
                  {following ? (
                    <><UserCheck className="h-3 w-3" /> Following</>
                  ) : (
                    <><UserPlus className="h-3 w-3" /> Follow</>
                  )}
                </button>
              )}
              {isOwner && (
                <button onClick={deletePost} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            </div>

            {/* Text */}
            {post.text && (
              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{post.text}</p>
            )}

            {/* Image */}
            {post.image_url && (
              <div className="relative w-full aspect-video mt-3 rounded-xl overflow-hidden border border-border/30 bg-muted">
                <Image src={post.image_url} alt="" fill className="object-cover" unoptimized />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-8 mt-3 text-muted-foreground">
              <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </div>
                {post.comment_count || 0}
              </button>
              <button onClick={toggleLike} className={`flex items-center gap-1.5 text-xs transition-colors group ${liked ? "text-red-500" : "hover:text-red-400"}`}>
                <div className={`p-1.5 rounded-full transition-colors ${liked ? "bg-red-500/10" : "group-hover:bg-red-500/10"}`}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                </div>
                {likeCount}
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                  <Share className="h-4 w-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-border/30">
          <CommentSection postId={post.id} />
        </div>
      )}
    </Card>
  );
});
