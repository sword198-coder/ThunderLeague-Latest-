"use client";

import { Hero } from "@/components/landing/hero";
import { NewsTicker } from "@/components/landing/news-ticker";
import { AnnouncementSection } from "@/components/landing/announcement-section";
import { YouTubeStrip } from "@/components/landing/youtube-strip";
import { DiscordStrip } from "@/components/landing/discord-strip";
import { TikTokStrip } from "@/components/landing/tiktok-strip";
import { AboutSection } from "@/components/landing/about-section";
import { Footer } from "@/components/landing/footer";

export function LandingClient({ settings }: { settings: Record<string, string> }) {
  return (
    <>
      <Hero
        initialImages={settings.hero_images ? tryParse(settings.hero_images) : undefined}
        initialInterval={settings.hero_interval ? parseInt(settings.hero_interval) : undefined}
      />
      <NewsTicker
        initialItems={settings.news_items ? tryParse(settings.news_items) : undefined}
        initialInterval={settings.news_interval ? parseInt(settings.news_interval) : undefined}
      />
      <AnnouncementSection initialTrailerUrl={settings.trailer_url} />
      <YouTubeStrip initialUrl={settings.youtube_url} />
      <DiscordStrip initialUrl={settings.discord_url} />
      <TikTokStrip initialUrl={settings.tiktok_url} />
      <AboutSection initialAboutText={settings.about_text} />
      <Footer initialYoutubeUrl={settings.youtube_url} initialDiscordUrl={settings.discord_url} />
    </>
  );
}

function tryParse(json: string): string[] | undefined {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}
