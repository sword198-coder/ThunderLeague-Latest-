"use client";

import { useState } from "react";
import { Home, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeFeed } from "@/components/community/home-feed";
import { ProfileSection } from "@/components/community/profile-section";
import { MaintenanceGuard } from "@/components/maintenance-guard";

export default function CommunityPage() {
  const [tab, setTab] = useState("home");
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  const navigateToProfile = (userId: string) => {
    setViewUserId(userId);
    setTab("profile");
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
              <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
                <button
                  onClick={goHome}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all",
                    tab === "home"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Home className="h-4 w-4" />
                  Home
                </button>
                <button
                  onClick={goMyProfile}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all",
                    tab === "profile" && !viewUserId
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
              </div>
              {viewUserId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  <button onClick={goMyProfile} className="hover:text-foreground transition-colors">Back to my profile</button>
                </div>
              )}
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
