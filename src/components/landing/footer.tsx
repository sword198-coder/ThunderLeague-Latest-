"use client";

import { Play, MessageCircle } from "lucide-react";
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
    <footer className="bg-cover bg-center border-t border-border py-12 px-4 min-h-[60vh] flex items-end" style={{ backgroundImage: "url(/background.png)" }}>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-foreground font-bold text-lg mb-4">
              <span className="text-primary">Thunder</span>League
            </h3>
            <p className="text-muted-foreground text-sm">
              The premier War Thunder tournament platform.
            </p>
          </div>
          <div>
            <h4 className="text-foreground font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-foreground font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href={links.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Play className="h-6 w-6" />
              </a>
              <a
                href={links.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-indigo-400 transition-colors"
              >
                <MessageCircle className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          &copy; 2026 ThunderLeague. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
