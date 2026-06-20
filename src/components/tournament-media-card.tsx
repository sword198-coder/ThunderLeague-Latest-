"use client";

import { useState, useEffect } from "react";
import { Monitor, Music, Globe, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

type MediaLink = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
};

const PLATFORM_ICONS: Record<string, ReactNode> = {
  youtube: <Play className="h-5 w-5" />,
  tiktok: <Music className="h-5 w-5" />,
  twitch: <Monitor className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "hover:bg-red-500/20 hover:text-red-500 border-red-500/30 text-red-400",
  tiktok: "hover:bg-pink-500/20 hover:text-pink-500 border-pink-500/30 text-pink-400",
  twitch: "hover:bg-purple-500/20 hover:text-purple-500 border-purple-500/30 text-purple-400",
  website: "hover:bg-blue-500/20 hover:text-blue-500 border-blue-500/30 text-blue-400",
};

export function TournamentMediaCard({ tournamentId }: { tournamentId: string }) {
  const [links, setLinks] = useState<MediaLink[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tournament_media_links")
        .select("id, platform, url, label")
        .eq("tournament_id", tournamentId)
        .eq("visible", true);

      if (data) setLinks(data);
    };

    load();

    const channel = supabase
      .channel(`media-links-${tournamentId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tournament_media_links",
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5" />
          Media & Coverage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {links.map((link) => {
            const icon = PLATFORM_ICONS[link.platform] || <Globe className="h-5 w-5" />;
            const color = PLATFORM_COLORS[link.platform] || "hover:bg-muted hover:text-foreground";
            return (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className={`gap-2 ${color}`}>
                  {icon}
                  {link.label || link.platform}
                </Button>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
