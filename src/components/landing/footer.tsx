"use client";

import { Play, MessageCircle, Globe, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function Footer() {
  const [links, setLinks] = useState({
    youtube_url: "https://youtube.com",
    discord_url: "https://discord.gg/thunderleague",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["youtube_url", "discord_url"])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((s) => (map[s.key] = s.value));
          setLinks((prev) => ({ ...prev, ...map }));
        }
      });
  }, []);

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="md:col-span-2">
            <h3 className="text-foreground font-bold text-xl mb-3">
              Battlefront Premier League (BPL)
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              The premier War Thunder tournament platform. Compete, climb the leaderboard, and prove you&apos;re the best pilot.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href={links.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-muted border border-border/50 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
              >
                <Play className="h-4 w-4" />
              </a>
              <a
                href={links.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-muted border border-border/50 text-muted-foreground hover:text-indigo-400 hover:border-indigo-400/30 hover:bg-indigo-500/10 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">Tournaments</a></li>
              <li><a href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">Leaderboard</a></li>
              <li><a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="text-muted-foreground">Terms of Service</span></li>
              <li><span className="text-muted-foreground">Privacy Policy</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 bg-muted/50">
        <div className="container mx-auto px-4 py-4 max-w-5xl mx-auto">
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            &copy; {new Date().getFullYear()} BPL. All rights reserved.
            <span className="hidden sm:inline">Made with <Heart className="h-3 w-3 inline text-red-500" /> by the BPL team</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
