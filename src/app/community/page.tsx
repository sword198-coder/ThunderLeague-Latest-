"use client";

import { useState, useRef, useEffect } from "react";
import { Home, User, ArrowLeft, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { HomeFeed } from "@/components/community/home-feed";
import { ProfileSection } from "@/components/community/profile-section";
import { MaintenanceGuard } from "@/components/maintenance-guard";

export default function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(6);
    setSearchResults((data || []).filter((p) => p.id !== user?.id));
    setSearching(false);
  };

  const navigateToProfile = (userId: string) => {
    setViewUserId(userId);
    setTab("profile");
    setShowSearch(false);
    setSearch("");
  };

  const goHome = () => {
    setViewUserId(null);
    setTab("home");
  };

  const goMyProfile = () => {
    setViewUserId(null);
    setTab("profile");
  };

  return (
    <MaintenanceGuard page="community">
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14 max-w-6xl mx-auto">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
                  <button onClick={goHome} className={cn("flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all", tab === "home" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Home className="h-4 w-4" />
                    Home
                  </button>
                  <button onClick={goMyProfile} className={cn("flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all", tab === "profile" && !viewUserId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                </div>
                {viewUserId && (
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground ml-3">
                    <ArrowLeft className="h-4 w-4" />
                    <button onClick={goMyProfile} className="hover:text-foreground transition-colors">Back to my profile</button>
                  </div>
                )}
              </div>

              {/* Player search */}
              <div ref={searchRef} className="relative">
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Search className="h-4 w-4" />
                </button>
                {showSearch && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-50">
                    <div className="bg-background border border-border/50 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={search} onChange={(e) => { doSearch(e.target.value); setShowSearch(true); }} placeholder="Search players..." className="pl-9 h-9 text-sm rounded-lg" autoFocus />
                          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto pb-2">
                        {search.length >= 2 && searchResults.length === 0 && !searching && (
                          <p className="text-xs text-muted-foreground text-center py-4">No players found</p>
                        )}
                        {searchResults.map((p) => (
                          <button key={p.id} onClick={() => navigateToProfile(p.id)} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-muted/50 text-left transition-colors">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={p.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">{(p.display_name || p.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                              <p className="text-xs text-muted-foreground">@{p.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {tab === "home" ? (
            <HomeFeed onViewProfile={navigateToProfile} />
          ) : (
            <ProfileSection viewUserId={viewUserId} onViewProfile={navigateToProfile} />
          )}
        </div>
      </div>
    </MaintenanceGuard>
  );
}
