"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Trophy, Swords, BarChart3, Info, Crown } from "lucide-react";
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
import type { LeaderboardEntry, Profile, CardBackground, CardTitle } from "@/lib/types";

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
  const [titles, setTitles] = useState<CardTitle[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<Profile[]>(profiles);
  const supabase = createClient();

  useEffect(() => {
    setLiveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    supabase.from("card_backgrounds").select("*").then(({ data }) => {
      if (data) setBackgrounds(data as CardBackground[]);
    });
    supabase.from("card_titles").select("*").then(({ data }) => {
      if (data) setTitles(data as CardTitle[]);
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

  const titleMap = useMemo(() => {
    const map = new Map<string, CardTitle>();
    for (const t of titles) map.set(t.id, t);
    return map;
  }, [titles]);

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

  const top3 = filteredEntries.slice(0, 3);

  const podiumSlots = [
    { idx: 1, color: "bg-gray-300", borderColor: "#94a3b8", height: "h-24", label: "#2" },
    { idx: 0, color: "bg-yellow-400", borderColor: "#eab308", height: "h-32", label: "#1" },
    { idx: 2, color: "bg-amber-700", borderColor: "#d97706", height: "h-20", label: "#3" },
  ];

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

      {top3.length > 0 && (
        <div className="mb-8 flex items-end justify-center gap-4 px-4">
          {podiumSlots.map(({ idx, color, borderColor, height, label }) => {
            const entry = top3[idx];
            if (!entry) return <div key={idx} className="w-20" />;
            const profile = findProfile(entry);
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedPlayer({ data: entry, profile })}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold border-2 overflow-hidden"
                    style={{ borderColor }}
                  >
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <span>{entry.player_name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate max-w-[80px]">{entry.player_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.score.toLocaleString()}</p>
                </div>
                <div className={`w-20 ${height} rounded-t-lg ${color} flex items-start justify-center pt-2 transition-transform group-hover:scale-105`}>
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end mb-2">
        <span className="group relative inline-block">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-help">
            <Info className="h-3.5 w-3.5" />
            <span>Season Info</span>
          </button>
          <span className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-lg bg-popover border text-xs text-popover-foreground shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            The leaderboard is reset at the end of each season. Standings are based on performance in ranked tournaments during the current season.
          </span>
        </span>
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
        cardTitle={selectedPlayer?.profile?.selected_title_id ? titleMap.get(selectedPlayer.profile.selected_title_id) : null}
      />
    </>
  );
}
