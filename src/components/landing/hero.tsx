"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function Hero({ initialImages, initialInterval }: { initialImages?: string[]; initialInterval?: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initialImages ?? ["/hero.png"]);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const imgLenRef = useRef(initialImages?.length ?? 1);
  const msRef = useRef((initialInterval ?? 5) * 1000);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (imgLenRef.current > 1 && !isPaused) {
      timerRef.current = setInterval(() => setCurrent((prev) => (prev + 1) % imgLenRef.current), msRef.current);
    }
  };

  useEffect(() => {
    if (initialImages) {
      if (initialImages.length > 1) startTimer();
      return;
    }
    const supabase = createClient();
    supabase.from("site_settings").select("key, value").in("key", ["hero_images", "hero_interval"]).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      let imgs = ["/hero.png"];
      if (map.hero_images) {
        try {
          const parsed = JSON.parse(map.hero_images);
          if (Array.isArray(parsed) && parsed.length > 0) imgs = parsed;
        } catch {}
      }
      setImages(imgs);
      imgLenRef.current = imgs.length;
      if (map.hero_interval) {
        const v = parseInt(map.hero_interval) * 1000;
        if (v > 0) msRef.current = v;
      }
      startTimer();
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [initialImages, initialInterval]);

  useEffect(() => { startTimer(); }, [isPaused]);

  const move = (dir: number) => setCurrent((prev) => (prev + dir + images.length) % images.length);

  return (
    <section
      className="relative flex items-center justify-center min-h-[70vh] bg-cover bg-center transition-all duration-700"
      style={{ backgroundImage: `url(${images[current]})` }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 bg-black/60" />
      {images.length > 1 && (
        <>
          <button
            onClick={() => move(-1)}
            className="absolute left-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => move(1)}
            className="absolute right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 z-20 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-3 h-3 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Battlefront Premier League
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-8">
          The ultimate War Thunder tournament platform. Compete, climb the
          leaderboard, and prove you&apos;re the best player.
        </p>
        {!user && (
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-base w-[180px]"
              onClick={() => router.push("/auth/signup")}
            >
              Join Tournament
            </Button>
            <Button
              size="lg"
              className="text-base w-[180px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => router.push("/leaderboard")}
            >
              Leaderboard
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
