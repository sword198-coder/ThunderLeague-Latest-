"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trophy, Calendar, Swords, Users, Clock, ChevronLeft, Flag } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Tournament, TournamentMatch, TournamentParticipant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<string, string> = { air: "Air", ground: "Ground", both: "Air & Ground" };
const TIER_LABELS: Record<string, string> = { low: "Low Tier", mid: "Mid Tier", high: "High Tier", top: "Top Tier" };
const ROUND_NAMES = ["", "Quarter-Finals", "Semi-Finals", "Final"];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [participants, setParticipants] = useState<(TournamentParticipant & { name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const load = async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!tData) { setLoading(false); return; }
      setTournament(tData);

      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("*, user_id")
        .eq("tournament_id", id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", (pData ?? []).map((p) => p.user_id));

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      setParticipants(
        (pData ?? []).map((p) => ({
          ...p,
          name: profileMap.get(p.user_id)?.display_name || profileMap.get(p.user_id)?.username || "Unknown",
        }))
      );

      const { data: mData } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("match_index", { ascending: true });
      setMatches(mData ?? []);

      setLoading(false);
    };
    load();
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
        <p className="text-muted-foreground">Tournament not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/tournaments")}>
          Back to Tournaments
        </Button>
      </div>
    );
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort();
  const profileMap = new Map(participants.map((p) => [p.user_id, p.name]));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <Button variant="ghost" onClick={() => router.push("/tournaments")} className="gap-1">
        <ChevronLeft className="h-4 w-4" />
        Back to Tournaments
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.title}</h1>
            {tournament.description && (
              <p className="text-muted-foreground mt-2">{tournament.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn(
              tournament.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
              tournament.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
              tournament.status === "completed" ? "bg-muted text-muted-foreground" :
              "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              {tournament.status}
            </Badge>
            <Badge variant="outline" className={tournament.system === "1v1" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"}>
              {tournament.system === "1v1" ? "1v1 Knockout" : "4v4 Teams"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Swords className="h-4 w-4 shrink-0" />
              {MODE_LABELS[tournament.mode]} — {TIER_LABELS[tournament.tier]}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">BR {tournament.battle_rating}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-xs">
                {format(new Date(tournament.start_date), "MMM d, HH:mm")} — {format(new Date(tournament.end_date), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-xs">{participants.filter((p) => p.status === "approved").length}/{tournament.max_players} players</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Badge key={p.id} variant="outline" className={cn(
                  p.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  p.status === "pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                  "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  <Flag className="h-3 w-3 mr-1" />
                  {p.name}
                  <span className="ml-1 opacity-60">({p.status})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Matches & Bracket
          </h2>

          <div className="space-y-8">
            {rounds.map((round) => (
              <div key={round}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  {ROUND_NAMES[round] || `Round ${round}`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches
                    .filter((m) => m.round === round)
                    .map((m) => {
                      const p1Name = profileMap.get(m.player1_id ?? "") ?? (m.team1_player_ids.length > 0 ? `Team (${m.team1_player_ids.length})` : "TBD");
                      const p2Name = profileMap.get(m.player2_id ?? "") ?? (m.team2_player_ids.length > 0 ? `Team (${m.team2_player_ids.length})` : "TBD");

                      return (
                        <Card key={m.id} className={cn(
                          m.status === "completed" && "border-green-500/30",
                          m.status === "in_progress" && "border-amber-500/30",
                        )}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xs text-muted-foreground">
                                Match #{m.match_index + 1}
                              </CardTitle>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                m.status === "completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                m.status === "in_progress" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {m.status === "in_progress" ? "In Progress" : m.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={cn("text-sm", m.winner_id === m.player1_id && "font-bold text-green-500")}>
                                {p1Name}
                                {m.winner_id === m.player1_id && " 👑"}
                              </span>
                              {tournament.system === "1v1" && (
                                <span className="text-xs text-muted-foreground">VS</span>
                              )}
                            </div>
                            {tournament.system === "1v1" && (
                              <div className="flex items-center justify-between">
                                <span className={cn("text-sm", m.winner_id === m.player2_id && "font-bold text-green-500")}>
                                  {p2Name}
                                  {m.winner_id === m.player2_id && " 👑"}
                                </span>
                              </div>
                            )}
                            {m.scheduled_at && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                                <Clock className="h-3 w-3" />
                                {format(new Date(m.scheduled_at), "MMM d, HH:mm")}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No matches have been set up yet</p>
            <p className="text-xs mt-1">Check back later or contact the tournament organizer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
