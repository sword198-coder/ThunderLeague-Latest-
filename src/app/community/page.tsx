"use client";

import { useState } from "react";
import { Home, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeFeed } from "@/components/community/home-feed";
import { ProfileSection } from "@/components/community/profile-section";
import { MaintenanceGuard } from "@/components/maintenance-guard";

const TABS = [
  { key: "home", label: "Home", icon: Home },
  { key: "profile", label: "Profile", icon: User },
];

export default function CommunityPage() {
  const [tab, setTab] = useState("home");

  return (
    <MaintenanceGuard page="community">
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14 max-w-6xl mx-auto">
              <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all",
                      tab === key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {tab === "home" ? <HomeFeed /> : <ProfileSection />}
        </div>
      </div>
    </MaintenanceGuard>
  );
}
