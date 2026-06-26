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
      <div className="container mx-auto px-4 py-8">
        {/* Inner navbar */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
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

        {tab === "home" ? <HomeFeed /> : <ProfileSection />}
      </div>
    </MaintenanceGuard>
  );
}
