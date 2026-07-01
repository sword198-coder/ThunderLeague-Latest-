"use client";

import { useState, useEffect, type ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import { Play, MessageCircle, Swords, Sparkles, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

type Links = {
  youtube_url: string;
  discord_url: string;
  tiktok_url: string;
};

type CardData = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  button?: string;
  href?: string;
};

const staticCards: CardData[] = [
  { icon: Swords, title: "All Battle Ratings", desc: "Tournaments for every player, across every Battle Rating" },
  { icon: Sparkles, title: "100% Free", desc: "Join for free — no entry fees, ever" },
];

export function MarqueeCards() {
  const [links, setLinks] = useState<Links>({
    youtube_url: "https://youtube.com",
    discord_url: "https://discord.gg/thunderleague",
    tiktok_url: "https://tiktok.com/@thunderleague",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["youtube_url", "discord_url", "tiktok_url"])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((s) => (map[s.key] = s.value));
          setLinks((prev) => ({ ...prev, ...map }));
        }
      });
  }, []);

  const cards: CardData[] = [
    {
      icon: Play,
      title: "YouTube",
      desc: "Watch all tournaments live on our YouTube channel",
      button: "Subscribe Now",
      href: links.youtube_url,
    },
    {
      icon: Music2,
      title: "TikTok Shorts",
      desc: "Highlights and quick action clips on TikTok Shorts",
      button: "Follow Us",
      href: links.tiktok_url,
    },
    {
      icon: MessageCircle,
      title: "Discord",
      desc: "Join our Discord community",
      button: "Join Now",
      href: links.discord_url,
    },
    ...staticCards,
  ];

  return (
    <section className="py-12 overflow-hidden bg-muted">
      <div className="relative">
        <div
          className="flex gap-6 w-max marquee-scroll"
        >
          {[...cards, ...cards, ...cards].map((card, i) => (
            <Card
              key={i}
              className="w-72 shrink-0 hover:border-amber-500/30 transition-colors"
            >
              <CardContent className="p-6 space-y-4">
                <card.icon className="h-8 w-8 text-amber-500" />
                <div>
                  <CardTitle className="text-lg">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {card.desc}
                  </CardDescription>
                </div>
                {card.button && card.href && (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    onClick={() => window.open(card.href, "_blank")}
                  >
                    {card.button}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
