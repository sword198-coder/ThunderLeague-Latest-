"use client";

import { useState, useEffect } from "react";
import { Trophy, Swords, BarChart3, Users, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AboutSection({ initialAboutText }: { initialAboutText?: string }) {
  const [aboutText, setAboutText] = useState(
    initialAboutText ?? "BPL is the ultimate War Thunder tournament platform. Compete against the best players, climb the leaderboard, and prove your skills in epic aerial and ground battles."
  );

  useEffect(() => {
    if (initialAboutText) return;
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "about_text").single().then(({ data }) => {
      if (data) setAboutText(data.value);
    });
  }, [initialAboutText]);

  const features = [
    { icon: Swords, label: "Weekly Tournaments", desc: "Compete in regular 1v1 and 4v4 tournaments" },
    { icon: BarChart3, label: "Leaderboard Rankings", desc: "Climb the ranks and earn your spot among the elite" },
    { icon: Users, label: "Community Driven", desc: "Join thousands of War Thunder players" },
    { icon: Trophy, label: "Win Prizes", desc: "Earn Thunder Points and exclusive rewards" },
  ];

  return (
    <section id="about" className="w-full bg-gradient-to-b from-background via-muted/20 to-background border-t border-border py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            About
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">About BPL</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">{aboutText}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div key={feature.label} className="p-5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 hover:border-primary/30 transition-all duration-300 text-center group">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{feature.label}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
