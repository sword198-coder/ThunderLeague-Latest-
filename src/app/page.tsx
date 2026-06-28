"use client";

import { Hero } from "@/components/landing/hero";
import { NewsTicker } from "@/components/landing/news-ticker";
import { AnnouncementSection } from "@/components/landing/announcement-section";
import { YouTubeStrip } from "@/components/landing/youtube-strip";
import { DiscordStrip } from "@/components/landing/discord-strip";
import { TikTokStrip } from "@/components/landing/tiktok-strip";
import { AboutSection } from "@/components/landing/about-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {

  return (
    <>
      <Hero />
      <NewsTicker />
      <AnnouncementSection />
      <YouTubeStrip />
      <DiscordStrip />
      <TikTokStrip />
      <AboutSection />
      <Footer />
    </>
  );
}
