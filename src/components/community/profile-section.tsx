"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import { NewConversationDialog } from "./new-conversation-dialog";
import { COUNTRIES } from "@/lib/types";
import type { Profile, Post, PostLike, CardBackground } from "@/lib/types";

export function ProfileSection({ viewUserId, onViewProfile }: { viewUserId?: string | null; onViewProfile?: (userId: string) => void }) {
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<(Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number })[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [cardBg, setCardBg] = useState<CardBackground | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const supabase = createClient();

  const isOwnProfile = !viewUserId || viewUserId === user?.id;

  const loadProfile = async () => {
    const targetUserId = (isOwnProfile ? user?.id : viewUserId) || user?.id;
    if (!targetUserId) return;

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", targetUserId).single();
    if (prof) setProfile(prof);

    if (prof?.selected_card_background_id) {
      const { data: bgData } = await supabase.from("card_backgrounds").select("*").eq("id", prof.selected_card_background_id).maybeSingle();
      if (bgData) setCardBg(bgData);
    }

    const { data: postsData } = await supabase.from("posts").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(50);
    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);
      const { data: likesData } = await supabase.from("post_likes").select("*").in("post_id", postIds);
      const { data: commentsData } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

      const likeCounts: Record<string, number> = {};
      likesData?.forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      const commentCounts: Record<string, number> = {};
      commentsData?.forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

      setPosts(postsData.map((p) => ({ ...p, profile: prof || undefined, likes: likesData?.filter((l) => l.post_id === p.id) || [], like_count: likeCounts[p.id] || 0, comment_count: commentCounts[p.id] || 0 })));
    } else {
      setPosts([]);
    }

    const { count: fCount } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", targetUserId);
    setFollowerCount(fCount || 0);
    const { count: folCount } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", targetUserId);
    setFollowingCount(folCount || 0);

    if (user && !isOwnProfile) {
      const { data: folData } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle();
      setFollowing(!!folData);
    }

    setLoading(false);
  };

  useEffect(() => { setLoading(true); loadProfile(); }, [viewUserId, user]);

  const toggleFollow = async () => {
    if (!user || !viewUserId) return;
    if (following) {
      await supabase.from("follows").delete().match({ follower_id: user.id, following_id: viewUserId });
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: viewUserId });
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  );

  const p = profile;
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
      <Card className="border-border/40 overflow-hidden rounded-2xl">
        <div className="aspect-[3/1] relative bg-muted overflow-hidden" style={bgType === "gradient" ? bgStyle : {}}>
          {bgType === "image" && bg?.file_url && <Image src={bg.file_url} alt="" fill className="object-cover" unoptimized />}
          {bgType === "video" && bg?.file_url && <video src={bg.file_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />}
        </div>

        <div className="px-5 pb-5">
          <div className="flex justify-between items-end -mt-14 mb-3">
            <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
              <AvatarImage src={p?.avatar_url ?? undefined} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <a href="/account"><Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4">Edit Profile</Button></a>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={() => setShowNewChat(true)} size="sm" variant="outline" className="rounded-full text-xs h-8 px-3">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Message
                  </Button>
                  <Button
                    onClick={toggleFollow}
                    size="sm"
                    className={`rounded-full text-xs h-8 px-4 ${following ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border/50" : ""}`}
                    variant={following ? "outline" : "default"}
                  >
                    {following ? <><UserCheck className="h-3.5 w-3.5 mr-1" /> Following</> : <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>}
                  </Button>
                </div>
              )}
              {!isOwnProfile && (viewUserId || user?.id) && (
                <NewConversationDialog open={showNewChat} onOpenChange={setShowNewChat} onCreated={() => setShowNewChat(false)} presetUserId={viewUserId || undefined} />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight">{p?.display_name || p?.username || "Unknown"}</h1>
            <p className="text-sm text-muted-foreground">@{p?.war_thunder_username || p?.username || "unknown"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {countryLabel && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {countryLabel}</span>}
            {p?.created_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {format(new Date(p.created_at), "MMMM yyyy")}</span>}
          </div>

          <div className="flex items-center gap-5 mt-4">
            <span className="text-sm"><strong className="text-foreground font-bold">{followingCount}</strong> <span className="text-muted-foreground">Following</span></span>
            <span className="text-sm"><strong className="text-foreground font-bold">{followerCount}</strong> <span className="text-muted-foreground">Followers</span></span>
          </div>
        </div>
      </Card>

      {isOwnProfile && <CreatePost onPostCreated={loadProfile} />}

      {posts.length === 0 ? (
        <Card className="border-border/40 rounded-2xl">
          <div className="py-16 text-center">
            <p className="text-muted-foreground">{isOwnProfile ? "No posts yet. Create your first post!" : "No posts yet."}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={loadProfile} onViewProfile={onViewProfile} />
          ))}
        </div>
      )}
    </div>
  );
}
