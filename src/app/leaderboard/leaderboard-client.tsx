"use client";

import { useState, useMemo, useEffect } from "react";
import { Trophy, Swords, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/leaderboard/player-card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { LeaderboardEntry, Profile, CardBackground } from "@/lib/types";

const TIERS = [
  { key: "high", label: "HIGH" },
  { key: "mid", label: "MID" },
  { key: "low", label: "LOW" },
] as const;

export function LeaderboardClient({
  entries,
  profiles,
}: {
  entries: LeaderboardEntry[];
  profiles: Profile[];
}) {
  const { user } = useAuth();
  const [activeTier, setActiveTier] = useState<string>("high");
  const [selectedPlayer, setSelectedPlayer] = useState<{
    data: LeaderboardEntry;
    profile: Profile | null;
  } | null>(null);
  const [backgrounds, setBackgrounds] = useState<CardBackground[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<Profile[]>(profiles);
  const supabase = createClient();

  useEffect(() => {
    setLiveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    supabase.from("card_backgrounds").select("*").then(({ data }) => {
      if (data) setBackgrounds(data as CardBackground[]);
    });
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setLiveProfiles((prev) => {
            const idx = prev.findIndex((p) => p.id === user.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = data as Profile;
              return copy;
            }
            return [...prev, data as Profile];
          });
        }
      });
    }
  }, [user]);

  const bgMap = useMemo(() => {
    const map = new Map<string, CardBackground>();
    for (const bg of backgrounds) map.set(bg.id, bg);
    return map;
  }, [backgrounds]);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of liveProfiles) {
      if (p.display_name) map.set(p.display_name.toLowerCase(), p);
      if (p.username) map.set(p.username.toLowerCase(), p);
      map.set(p.id, p);
    }
    return map;
  }, [liveProfiles]);

  const filteredEntries = useMemo(
    () => entries.filter((e) => e.tier === activeTier),
    [entries, activeTier]
  );

  const findProfile = (entry: LeaderboardEntry): Profile | null => {
    if (entry.user_id) return profileMap.get(entry.user_id) ?? null;
    return profileMap.get(entry.player_name.toLowerCase()) ?? null;
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground max-w-md">
          No entries yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center gap-1 mb-6 bg-muted rounded-lg p-1">
        {TIERS.map((tier) => (
          <Button
            key={tier.key}
            variant={activeTier === tier.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTier(tier.key)}
            className="flex-1 max-w-28"
          >
            {tier.label}
          </Button>
        ))}
      </div>

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
          {filteredEntries.map((entry) => (
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
              <TableCell className="font-medium">
                <button
                  onClick={() => setSelectedPlayer({ data: entry, profile: findProfile(entry) })}
                  className="hover:underline text-left cursor-pointer"
                >
                  {entry.player_name}
                </button>
              </TableCell>
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
          {filteredEntries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No entries in this tier
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <PlayerCard
        data={selectedPlayer ? { player_name: selectedPlayer.data.player_name, wins: selectedPlayer.data.wins, losses: selectedPlayer.data.losses, score: selectedPlayer.data.score, profile: selectedPlayer.profile } : null}
        open={!!selectedPlayer}
        onOpenChange={(v) => { if (!v) setSelectedPlayer(null); }}
        cardBackground={selectedPlayer?.profile?.selected_card_background_id ? bgMap.get(selectedPlayer.profile.selected_card_background_id) : null}
      />
    </>
  );
}
