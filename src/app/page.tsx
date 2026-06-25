"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Hero } from "@/components/landing/hero";
import { NewsTicker } from "@/components/landing/news-ticker";
import { AnnouncementSection } from "@/components/landing/announcement-section";
import { YouTubeStrip } from "@/components/landing/youtube-strip";
import { DiscordStrip } from "@/components/landing/discord-strip";
import { TikTokStrip } from "@/components/landing/tiktok-strip";
import { AboutSection } from "@/components/landing/about-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/tournaments");
    }
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (user) {
    return null;
  }

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
