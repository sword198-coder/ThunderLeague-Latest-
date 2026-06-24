"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AboutSection() {
  const [aboutText, setAboutText] = useState(
    "ThunderLeague is the ultimate War Thunder tournament platform. Compete against the best players, climb the leaderboard, and prove your skills in epic aerial and ground battles."
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "about_text").single().then(({ data }) => {
      if (data) setAboutText(data.value);
    });
  }, []);

  return (
    <section id="about" className="w-full bg-muted/30 border-t border-border py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-foreground mb-6">About ThunderLeague</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{aboutText}</p>
      </div>
    </section>
  );
}
