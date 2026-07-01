"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Loader2, Dot, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import type { Profile, Post, PostLike } from "@/lib/types";

const FloatingChat = dynamic(() => import("./floating-chat").then((m) => m.FloatingChat), { ssr: false });

const PAGE_SIZE = 10;

type PostWithExtras = Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number };

export function HomeFeed({ onViewProfile }: { onViewProfile?: (userId: string) => void }) {
  const { user, profile: myProfile } = useAuth();
  const [posts, setPosts] = useState<PostWithExtras[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createClient();

  const fetchFollowedIds = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    return [user.id, ...(data?.map((f) => f.following_id) || [])];
  }, [user]);

  const enrichPosts = useCallback(async (postsData: Post[]) => {
    if (postsData.length === 0) return [];
    const postIds = postsData.map((p) => p.id);
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const [{ data: profilesData }, { data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds),
      supabase.from("post_likes").select("*").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);
    const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
    const likeCounts: Record<string, number> = {};
    likesData?.forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
    const commentCounts: Record<string, number> = {};
    commentsData?.forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });
    return postsData.map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id) as Profile | undefined,
      likes: likesData?.filter((l) => l.post_id === p.id) || [],
      like_count: likeCounts[p.id] || 0,
      comment_count: commentCounts[p.id] || 0,
    }) as PostWithExtras);
  }, []);

  const loadPosts = useCallback(async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoading(true);
    const visibleIds = await fetchFollowedIds();
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", visibleIds)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    const enriched = await enrichPosts(postsData || []);
    setPosts(enriched);
    setHasMore((postsData?.length ?? 0) >= PAGE_SIZE);
    if (showLoader) setLoading(false);
  }, [user, fetchFollowedIds, enrichPosts]);

  const loadMorePosts = useCallback(async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    const visibleIds = await fetchFollowedIds();
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", visibleIds)
      .order("created_at", { ascending: false })
      .range(posts.length, posts.length + PAGE_SIZE - 1);
    const enriched = await enrichPosts(postsData || []);
    setPosts((prev) => [...prev, ...enriched]);
    setHasMore((postsData?.length ?? 0) >= PAGE_SIZE);
    setLoadingMore(false);
  }, [user, fetchFollowedIds, enrichPosts, posts.length, loadingMore]);

  const updatePost = useCallback((updatedPost: PostWithExtras) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }, []);

  const refreshFirstPage = useCallback(() => { loadPosts(false); }, [loadPosts]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Followers
  useEffect(() => {
    if (!user) return;
    supabase.from("follows").select("follower_id").eq("following_id", user.id).then(({ data }) => {
      const followerIds = data?.map((f) => f.follower_id) || [];
      if (followerIds.length > 0) {
        supabase.from("profiles").select("id, username, display_name, avatar_url, last_active_at").in("id", followerIds).then(({ data: profiles }) => {
          setFollowers((profiles || []) as Profile[]);
        });
      } else {
        setFollowers([]);
      }
    });
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const myInitials = myProfile?.display_name?.slice(0, 2).toUpperCase() || myProfile?.username?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left sidebar — profile card + followers */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
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
              followers.slice(0, 8).map((f) => (
                <button key={f.id} onClick={() => onViewProfile?.(f.id)} className="flex items-center gap-2.5 w-full text-left">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={f.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">{((f.display_name || f.username || "") as string).slice(0, 2).toUpperCase()}</AvatarFallback>
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
                </button>
              ))
            )}
            {followers.length > 6 && (
              <p className="text-xs text-muted-foreground text-center pt-1">+{followers.length - 6} more</p>
            )}
          </div>
        </Card>
      </div>

      {/* Center — Feed */}
      <div className="lg:col-span-8 space-y-3">
        <CreatePost onPostCreated={refreshFirstPage} />

        {posts.length === 0 ? (
          <Card className="border-border/40 rounded-2xl">
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No posts yet. Follow other players to see their posts!</p>
            </div>
          </Card>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={refreshFirstPage} onViewProfile={onViewProfile} />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" onClick={loadMorePosts} disabled={loadingMore} className="gap-2">
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <FloatingChat />
    </div>
  );
}
