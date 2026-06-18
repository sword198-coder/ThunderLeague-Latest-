"use client";

import { useRouter, usePathname } from "next/navigation";
import { Trophy, BarChart3, Vote, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { label: "Tournaments", icon: Trophy, href: "/tournaments" },
    { label: "Leaderboard", icon: BarChart3, href: "/leaderboard" },
    { label: "Votes", icon: Vote, href: "/votes" },
    { label: "Support", icon: MessageSquareText, href: "/support" },
  ];

  return (
    <div className="hidden sm:flex items-center gap-1 mr-2">
      {tabs.map(({ label, icon: Icon, href }) => (
        <button
          key={href}
          onClick={() => router.push(href)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
            pathname === href || pathname.startsWith(href + "/")
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
