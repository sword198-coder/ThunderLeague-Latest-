"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import type { Profile, Post, PostLike, CardBackground } from "@/lib/types";

export function ProfileSection() {
  const { user, profile: myProfile } = useAuth();
  const [posts, setPosts] = useState<(Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number })[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [cardBg, setCardBg] = useState<CardBackground | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadProfile = async () => {
    if (!user) return;

    const { data: bgData } = await supabase
      .from("user_card_backgrounds")
      .select("card_background_id, card_background:card_backgrounds(*)")
      .eq("user_id", user.id)
      .eq("is_selected", true)
      .maybeSingle();

    if (bgData && (bgData as any).card_background) setCardBg((bgData as any).card_background);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("*")
        .in("post_id", postIds);

      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);

      const likeCounts: Record<string, number> = {};
      likesData?.forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });

      const commentCounts: Record<string, number> = {};
      commentsData?.forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

      setPosts(
        postsData.map((p) => ({
          ...p,
          profile: myProfile ?? undefined,
          likes: likesData?.filter((l) => l.post_id === p.id) || [],
          like_count: likeCounts[p.id] || 0,
          comment_count: commentCounts[p.id] || 0,
        }))
      );
    }

    const { count: fCount } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id);
    setFollowerCount(fCount || 0);

    const { count: folCount } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", user.id);
    setFollowingCount(folCount || 0);

    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const p = myProfile;
  const initials = p?.display_name?.slice(0, 2).toUpperCase() || p?.username?.slice(0, 2).toUpperCase() || "??";

  const bg = cardBg;
  const bgStyle = bg?.type === "gradient"
    ? { backgroundImage: `linear-gradient(135deg, ${bg.gradient_from}, ${bg.gradient_via || bg.gradient_from}, ${bg.gradient_to})` }
    : bg?.file_url
    ? { backgroundImage: `url(${bg.file_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(135deg, #92400e, #d97706, #fbbf24)" };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 overflow-hidden">
        <div className="aspect-[3/1] relative" style={bgStyle}>
          {bg?.type === "image" && bg.file_url && (
            <Image src={bg.file_url} alt="" fill className="object-cover" unoptimized />
          )}
        </div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-background shrink-0">
              <AvatarImage src={p?.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="pt-10 sm:pt-0 flex-1">
              <h2 className="text-xl font-bold">{p?.display_name || p?.username || "Unknown"}</h2>
              {p?.war_thunder_username && (
                <p className="text-sm text-muted-foreground">@{p.war_thunder_username}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span><strong>{followerCount}</strong> Followers</span>
                <span><strong>{followingCount}</strong> Following</span>
                <span><strong>{posts.length}</strong> Posts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreatePost onPostCreated={loadProfile} />

      {posts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No posts yet. Create your first post!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={loadProfile} />
        ))
      )}
    </div>
  );
}
