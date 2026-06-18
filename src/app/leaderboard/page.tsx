import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { BarChart3, Trophy, Swords } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
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

  const { data } = await supabase
    .from("leaderboard_entries")
    .select("*")
    .order("rank", { ascending: true });

  return data ?? [];
}

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground max-w-md">
          No entries yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 opacity-15 pointer-events-none"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="hidden sm:table-cell">Squadron</TableHead>
              <TableHead className="hidden md:table-cell">BR</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                <Trophy className="h-4 w-4 inline mr-1" />
                W
              </TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                <Swords className="h-4 w-4 inline mr-1" />
                L
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-center font-medium">
                  {entry.rank <= 3 ? (
                    <span className="text-lg">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    entry.rank
                  )}
                </TableCell>
                <TableCell className="font-medium">{entry.player_name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {entry.squadron_name ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {entry.battle_rating}
                </TableCell>
                <TableCell className="text-right font-bold">{entry.score.toLocaleString()}</TableCell>
                <TableCell className="hidden sm:table-cell text-right text-green-600">
                  {entry.wins}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right text-red-500">
                  {entry.losses}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </div>
  );
}
