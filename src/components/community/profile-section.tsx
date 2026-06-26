"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Calendar, Loader2, MapPin, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import { COUNTRIES } from "@/lib/types";
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

    if (myProfile?.selected_card_background_id) {
      const { data: bgData } = await supabase
        .from("card_backgrounds")
        .select("*")
        .eq("id", myProfile.selected_card_background_id)
        .maybeSingle();
      if (bgData) setCardBg(bgData);
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);
      const { data: likesData } = await supabase.from("post_likes").select("*").in("post_id", postIds);
      const { data: commentsData } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

      const likeCounts: Record<string, number> = {};
      likesData?.forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      const commentCounts: Record<string, number> = {};
      commentsData?.forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

      setPosts(postsData.map((p) => ({
        ...p,
        profile: myProfile ?? undefined,
        likes: likesData?.filter((l) => l.post_id === p.id) || [],
        like_count: likeCounts[p.id] || 0,
        comment_count: commentCounts[p.id] || 0,
      })));
    }

    const { count: fCount } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id);
    setFollowerCount(fCount || 0);
    const { count: folCount } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id);
    setFollowingCount(folCount || 0);
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const p = myProfile;
  const initials = p?.display_name?.slice(0, 2).toUpperCase() || p?.username?.slice(0, 2).toUpperCase() || "??";

  const bg = cardBg;
  const bgType = bg?.type || "gradient";
  const bgStyle = bgType === "gradient"
    ? { backgroundImage: `linear-gradient(135deg, ${bg?.gradient_from || "#1a1a2e"}, ${bg?.gradient_via || bg?.gradient_from || "#16213e"}, ${bg?.gradient_to || "#0f3460"})` }
    : bgType === "image" && bg?.file_url
    ? { backgroundImage: `url(${bg.file_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)" };

  const countryLabel = p?.nationality ? COUNTRIES.find((c) => c.code === p.nationality)?.label : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile header */}
      <Card className="border-border/40 overflow-hidden rounded-2xl">
        {/* Banner */}
        <div className="aspect-[3/1] relative bg-muted overflow-hidden" style={bgType === "gradient" ? bgStyle : {}}>
          {bgType === "image" && bg?.file_url && (
            <Image src={bg.file_url} alt="" fill className="object-cover" unoptimized />
          )}
          {bgType === "video" && bg?.file_url && (
            <video src={bg.file_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        {/* Avatar + info */}
        <div className="px-5 pb-5">
          <div className="flex justify-between items-end -mt-14 mb-3">
            <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
              <AvatarImage src={p?.avatar_url ?? undefined} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <a href="/account">
              <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4">
                Edit Profile
              </Button>
            </a>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight">{p?.display_name || p?.username || "Unknown"}</h1>
            <p className="text-sm text-muted-foreground">@{p?.war_thunder_username || p?.username || "unknown"}</p>
          </div>

          {/* Bio / meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {countryLabel && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {countryLabel}</span>
            )}
            {p?.created_at && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {format(new Date(p.created_at), "MMMM yyyy")}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 mt-4">
            <span className="text-sm"><strong className="text-foreground font-bold">{followingCount}</strong> <span className="text-muted-foreground">Following</span></span>
            <span className="text-sm"><strong className="text-foreground font-bold">{followerCount}</strong> <span className="text-muted-foreground">Followers</span></span>
          </div>
        </div>
      </Card>

      {/* Create post */}
      <CreatePost onPostCreated={loadProfile} />

      {/* Posts feed */}
      {posts.length === 0 ? (
        <Card className="border-border/40 rounded-2xl">
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No posts yet. Create your first post!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={loadProfile} />
          ))}
        </div>
      )}
    </div>
  );
}
