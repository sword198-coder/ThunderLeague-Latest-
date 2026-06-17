"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <section
      className="relative flex items-center justify-center min-h-[70vh] bg-cover bg-center"
      style={{ backgroundImage: "url(/hero.png)" }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          ThunderLeague
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-8">
          The ultimate War Thunder tournament platform. Compete, climb the
          leaderboard, and prove you&apos;re the best player.
        </p>
        {!user && (
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-base"
              onClick={() => router.push("/auth/signup")}
            >
              Join Tournament
            </Button>
            <Button
              size="lg"
              className="text-base bg-secondary text-secondary-foreground hover:bg-secondary/90"
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
