import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { LeaderboardClient } from "./leaderboard-client";
import type { LeaderboardEntry, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: entries } = await supabase
    .from("leaderboard_entries")
    .select("*")
    .order("tier", { ascending: true })
    .order("rank", { ascending: true });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, war_thunder_username, squadron_name, nationality, discord_username, thunder_points");

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/leaderbackground.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Top Tournaments players</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <LeaderboardClient
            entries={(entries ?? []) as LeaderboardEntry[]}
            profiles={(profiles ?? []) as Profile[]}
          />
        </div>
      </div>
    </div>
  );
}
