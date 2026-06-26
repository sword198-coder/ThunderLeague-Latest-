"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, MessageCircle, Loader2, Hash, TrendingUp, Dot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import type { Profile, Post, PostLike } from "@/lib/types";

type PostWithExtras = Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number };

export function HomeFeed() {
  const { user, profile: myProfile } = useAuth();
  const [posts, setPosts] = useState<PostWithExtras[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPosts = async () => {
    if (!user) return;

    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const followedIds = follows?.map((f) => f.following_id) || [];
    const visibleIds = [user.id, ...followedIds];

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", visibleIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);
      const userIds = [...new Set(postsData.map((p) => p.user_id))];

      const { data: profilesData } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const { data: likesData } = await supabase.from("post_likes").select("*").in("post_id", postIds);
      const { data: commentsData } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

      const likeCounts: Record<string, number> = {};
      likesData?.forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      const commentCounts: Record<string, number> = {};
      commentsData?.forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

      setPosts(postsData.map((p) => ({
        ...p,
        profile: profileMap.get(p.user_id),
        likes: likesData?.filter((l) => l.post_id === p.id) || [],
        like_count: likeCounts[p.id] || 0,
        comment_count: commentCounts[p.id] || 0,
      })));
    } else {
      setPosts([]);
    }

    // Followers
    const { data: followerData } = await supabase.from("follows").select("follower_id").eq("following_id", user.id);
    const followerIds = followerData?.map((f) => f.follower_id) || [];
    if (followerIds.length > 0) {
      const { data: followerProfiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url, last_active_at").in("id", followerIds);
      setFollowers((followerProfiles || []) as Profile[]);
      setOnlineCount((followerProfiles || []).filter((p: any) => p.last_active_at && Date.now() - new Date(p.last_active_at).getTime() < 300000).length);
    }

    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const myInitials = myProfile?.display_name?.slice(0, 2).toUpperCase() || myProfile?.username?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
      {/* Left sidebar — profile card + followers */}
      <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
        {/* Mini profile card */}
        <Card className="border-border/40 rounded-2xl overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <div className="px-4 pb-4 -mt-8">
            <Avatar className="h-14 w-14 ring-4 ring-background shadow-md">
              <AvatarImage src={myProfile?.avatar_url ?? undefined} />
              <AvatarFallback className="font-bold">{myInitials}</AvatarFallback>
            </Avatar>
            <div className="mt-2 space-y-0">
              <p className="font-extrabold text-sm">{myProfile?.display_name || myProfile?.username || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">@{myProfile?.war_thunder_username || myProfile?.username}</p>
            </div>
          </div>
        </Card>

        {/* Followers */}
        <Card className="border-border/40 rounded-2xl">
          <div className="p-4 pb-2">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Followers
              <span className="text-muted-foreground font-normal ml-auto text-xs">{followers.length}</span>
            </h3>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {followers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No followers yet</p>
            ) : (
              followers.slice(0, 6).map((f) => (
                <div key={f.id} className="flex items-center gap-2.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={f.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{((f.display_name || f.username || "") as string).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight truncate">{f.display_name || f.username}</p>
                    <div className="flex items-center gap-1">
                      {f.last_active_at && Date.now() - new Date(f.last_active_at).getTime() < 300000 && (
                        <Dot className="h-4 w-4 text-green-500 -ml-1" />
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {f.last_active_at && Date.now() - new Date(f.last_active_at).getTime() < 300000 ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {followers.length > 6 && (
              <p className="text-xs text-muted-foreground text-center pt-1">+{followers.length - 6} more</p>
            )}
          </div>
        </Card>
      </div>

      {/* Center — Feed */}
      <div className="lg:col-span-4 space-y-3">
        <CreatePost onPostCreated={loadPosts} />

        {posts.length === 0 ? (
          <Card className="border-border/40 rounded-2xl">
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No posts yet. Follow other players to see their posts!</p>
            </div>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={loadPosts} />
          ))
        )}
      </div>

      {/* Right sidebar — trends / chats */}
      <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
        <Card className="border-border/40 rounded-2xl">
          <div className="p-4 pb-2">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </h3>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {[
              { tag: "#BPL", count: "12.5K" },
              { tag: "#WarThunder", count: "8.2K" },
              { tag: "#Tournament", count: "3.1K" },
            ].map((t) => (
              <div key={t.tag} className="group cursor-pointer">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{t.tag}</p>
                <p className="text-xs text-muted-foreground">{t.count} posts</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/40 rounded-2xl">
          <div className="p-4 pb-2">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
            </h3>
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
