"use client";

import { useState, useEffect } from "react";
import { Play, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AnnouncementSection() {
  const [trailerUrl, setTrailerUrl] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "trailer_url").single().then(({ data }) => {
      if (data) setTrailerUrl(data.value);
    });
  }, []);

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
    return null;
  };

  const embedUrl = getEmbedUrl(trailerUrl);

  return (
    <section className="w-full bg-muted/30 border-y border-border">
      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Play className="h-3.5 w-3.5" />
            Official Trailer
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Official Trailer</h2>
          <p className="text-muted-foreground">Watch the latest ThunderLeague trailer</p>
        </div>
        <div className="max-w-4xl mx-auto">
          {embedUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-xl shadow-black/20 bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="ThunderLeague Official Trailer"
              />
            </div>
          ) : trailerUrl ? (
            <div className="rounded-xl overflow-hidden border border-border/50 shadow-xl shadow-black/20 bg-black" style={{ aspectRatio: "16/9" }}>
              <video
                src={trailerUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 bg-muted/50 flex flex-col items-center justify-center p-16 text-center" style={{ aspectRatio: "16/9" }}>
              <div className="p-4 rounded-full bg-muted border border-border/50 mb-4">
                <Play className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No trailer uploaded yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Admin can upload a trailer in Landing Settings</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
