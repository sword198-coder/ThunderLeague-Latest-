"use client";

import { useState, useEffect } from "react";
import { Users, MessageCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";
import type { Post, Profile, PostLike, CardBackground } from "@/lib/types";

type PostWithExtras = Post & { profile?: Profile; likes?: PostLike[]; like_count?: number; comment_count?: number };

export function HomeFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithExtras[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPosts = async () => {
    if (!user) return;
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

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

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

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
          profile: profileMap.get(p.user_id),
          likes: likesData?.filter((l) => l.post_id === p.id) || [],
          like_count: likeCounts[p.id] || 0,
          comment_count: commentCounts[p.id] || 0,
        }))
      );
    } else {
      setPosts([]);
    }

    const { data: followerData } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id);

    const followerIds = followerData?.map((f) => f.follower_id) || [];

    if (followerIds.length > 0) {
      const { data: followerProfiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, last_active_at")
        .in("id", followerIds);

      setFollowers((followerProfiles || []) as Profile[]);
      setOnlineCount(
        (followerProfiles || []).filter((p: any) => {
          if (!p.last_active_at) return false;
          return Date.now() - new Date(p.last_active_at).getTime() < 300000;
        }).length
      );
    }

    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="hidden lg:block lg:col-span-1 space-y-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Followers ({followers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {onlineCount} online
            </div>
            {followers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No followers yet</p>
            ) : (
              followers.slice(0, 10).map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={f.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{((f.display_name || f.username || "") as string).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{f.display_name || f.username}</span>
                  {f.last_active_at && Date.now() - new Date(f.last_active_at).getTime() < 300000 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto shrink-0" />
                  )}
                </div>
              ))
            )}
            {followers.length > 10 && (
              <p className="text-xs text-muted-foreground">+{followers.length - 10} more</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <CreatePost onPostCreated={loadPosts} />

        {posts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet. Follow other players to see their posts!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={loadPosts} />
          ))
        )}
      </div>

      <div className="hidden lg:block lg:col-span-1 space-y-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
