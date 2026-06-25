"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trophy, Calendar, Swords, Users, Clock, ChevronLeft, CheckCircle2, XCircle, Hourglass, MessageCircle, X } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Tournament, TournamentMatch, TournamentParticipant } from "@/lib/types";
import { WT_NATIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TournamentChat } from "@/components/tournament-chat";
import { TournamentMediaCard } from "@/components/tournament-media-card";
import { JoinDialog } from "@/components/tournaments/join-dialog";

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
  const [participants, setParticipants] = useState<(TournamentParticipant & { name: string; username: string; avatar_url: string | null })[]>([]);
  const extraProfilesRef = useRef<Map<string, { name: string; username: string; avatar_url: string | null; country: string | null; vehicle: string | null }>>(new Map());
  const nationLabel = (code: string | null) => WT_NATIONS.find((n) => n.code === code)?.label ?? code ?? "";
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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

      const { data: mData } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("match_index", { ascending: true });
      setMatches(mData ?? []);

      const matchPlayerIds = new Set<string>();
      (mData ?? []).forEach((m) => {
        if (m.player1_id) matchPlayerIds.add(m.player1_id);
        if (m.player2_id) matchPlayerIds.add(m.player2_id);
        m.team1_player_ids?.forEach((pid: string) => matchPlayerIds.add(pid));
        m.team2_player_ids?.forEach((pid: string) => matchPlayerIds.add(pid));
      });

      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", id);

      const allUserIds = new Set([...(pData ?? []).map((p) => p.user_id), ...matchPlayerIds]);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", [...allUserIds]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      setParticipants(
        (pData ?? []).map((p) => {
          const prof = profileMap.get(p.user_id);
          return {
            ...p,
            name: prof?.display_name || prof?.username || "Unknown",
            username: prof?.username || "unknown",
            avatar_url: prof?.avatar_url || null,
            country: p.country || null,
            vehicle: p.vehicle || null,
          };
        })
      );

      const extraMap = new Map<string, { name: string; username: string; avatar_url: string | null; country: string | null; vehicle: string | null }>();
      (profiles ?? []).forEach((prof) => {
        if (!(pData ?? []).some((p) => p.user_id === prof.id)) {
          extraMap.set(prof.id, { name: prof.display_name || prof.username || "Unknown", username: prof.username || "unknown", avatar_url: prof.avatar_url || null, country: null, vehicle: null });
        }
      });
      extraProfilesRef.current = extraMap;

      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${id}` }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants", filter: `tournament_id=eq.${id}` }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, []);

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
  const profileMap = new Map(participants.map((p) => [p.user_id, { name: p.name, username: p.username, avatar_url: p.avatar_url, country: p.country, vehicle: p.vehicle }]));
  extraProfilesRef.current.forEach((v, k) => { if (!profileMap.has(k)) profileMap.set(k, v); });
  const approvedCount = participants.filter((p) => p.status === "approved").length;
  const isParticipant = participants.some((p) => p.user_id === user?.id);
  const isApproved = participants.some((p) => p.user_id === user?.id && p.status === "approved");

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="h-3 w-3" />;
      case "pending": return <Hourglass className="h-3 w-3" />;
      case "rejected": return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleJoin = async (data: { in_game_name: string; squadron: string; country: string; vehicle: string }) => {
    if (!user) return;
    setJoining(true);
    await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      user_id: user.id,
      in_game_name: data.in_game_name,
      squadron: data.squadron || null,
      country: data.country,
      vehicle: data.vehicle,
      status: "pending",
      accepted_terms: true,
    });
    setJoining(false);
    setShowJoin(false);
    window.location.reload();
  };

  return (
    <div ref={mainRef} className="min-h-screen">
      {/* Sticky top panel */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => router.push("/tournaments")} className="shrink-0">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-lg font-bold truncate">{tournament.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn(
              tournament.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
              tournament.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
              tournament.status === "completed" ? "bg-muted text-muted-foreground" :
              "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              {tournament.status}
            </Badge>
            <Badge variant="outline">
              {tournament.system === "1v1" ? "1v1" : "4v4"}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {MODE_LABELS[tournament.mode]} &middot; BR {tournament.battle_rating}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-8">
        {tournament.thumbnail_url && (
          <div className="rounded-xl overflow-hidden border bg-muted" style={{ aspectRatio: "16/9" }}>
            <img src={tournament.thumbnail_url} alt={tournament.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Tournament info + join */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <p className="text-muted-foreground">{tournament.description}</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {!isParticipant && tournament.status === "upcoming" && (
                <Button size="lg" onClick={() => setShowJoin(true)}>
                  Join Tournament
                </Button>
              )}
              {isParticipant && !isApproved && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 py-2 px-3">
                  <Hourglass className="h-4 w-4 mr-1" />
                  Application Pending
                </Badge>
              )}
              {isApproved && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 py-2 px-3">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approved
                </Badge>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Swords className="h-4 w-4 shrink-0" />
                {MODE_LABELS[tournament.mode]} &mdash; {TIER_LABELS[tournament.tier]}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">BR {tournament.battle_rating}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="text-xs">
                  {format(new Date(tournament.start_date), "MMM d, HH:mm")} &mdash; {format(new Date(tournament.end_date), "MMM d, HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span className="text-xs">{approvedCount}/{tournament.max_players} players</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <TournamentMediaCard tournamentId={tournament.id} />

        {participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {participants.map((p) => (
                  <div key={p.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    p.status === "approved" ? "border-green-500/20 bg-green-500/5" :
                    p.status === "pending" ? "border-yellow-500/20 bg-yellow-500/5" :
                    "border-red-500/20 bg-red-500/5"
                  )}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        p.status === "approved" ? "bg-green-500/20 text-green-500" :
                        p.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-red-500/20 text-red-500"
                      )}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs shrink-0",
                      p.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      p.status === "pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                      "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      <span className="flex items-center gap-1">
                        {statusIcon(p.status)}
                        {p.status}
                      </span>
                    </Badge>
                  </div>
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
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                    {ROUND_NAMES[round] || `Round ${round}`}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches
                      .filter((m) => m.round === round)
                      .map((m) => {
                        const getPlayerInfo = (playerId: string | null) => {
                          if (!playerId) return null;
                          return profileMap.get(playerId) ?? null;
                        };

                        return (
                          <Card key={m.id} className={cn(
                            "overflow-hidden",
                            m.status === "completed" && "border-green-500/30",
                            m.status === "in_progress" && "border-amber-500/30",
                          )}>
                            <div className={cn(
                              "px-4 py-2 flex items-center justify-between border-b",
                              m.status === "completed" ? "bg-green-500/5" :
                              m.status === "in_progress" ? "bg-amber-500/5" : "bg-muted/30"
                            )}>
                              <span className="text-xs font-semibold text-muted-foreground">
                                Match #{m.match_index + 1}
                              </span>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                m.status === "completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                m.status === "in_progress" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {m.status === "in_progress" ? "In Progress" : m.status}
                              </Badge>
                            </div>

                            <CardContent className="p-4 space-y-3">
                              {tournament.system === "1v1" ? (
                                <>
                                  <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border",
                                    m.winner_id === m.player1_id ? "border-green-500/30 bg-green-500/5" : "border-transparent bg-muted/30"
                                  )}>
                                    {getPlayerInfo(m.player1_id)?.avatar_url ? (
                                      <img src={getPlayerInfo(m.player1_id)?.avatar_url ?? ""} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">
                                        {getPlayerInfo(m.player1_id)?.name?.charAt(0).toUpperCase() ?? "?"}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">
                                        {getPlayerInfo(m.player1_id)?.name ?? "TBD"}
                                      </p>
                                      {getPlayerInfo(m.player1_id) && (
                                        <>
                                          <p className="text-xs text-muted-foreground truncate">
                                            @{getPlayerInfo(m.player1_id)?.username}
                                          </p>
                                          {(getPlayerInfo(m.player1_id)?.country || getPlayerInfo(m.player1_id)?.vehicle) && (
                                            <p className="text-[11px] text-muted-foreground/70 truncate">
                                              {nationLabel(getPlayerInfo(m.player1_id)?.country ?? null)}{getPlayerInfo(m.player1_id)?.country && getPlayerInfo(m.player1_id)?.vehicle ? " · " : ""}{getPlayerInfo(m.player1_id)?.vehicle ?? ""}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {m.winner_id === m.player1_id && (
                                      <Trophy className="h-4 w-4 text-green-500 shrink-0" />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs font-semibold text-muted-foreground">VS</span>
                                    <div className="h-px flex-1 bg-border" />
                                  </div>

                                  <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border",
                                    m.winner_id === m.player2_id ? "border-green-500/30 bg-green-500/5" : "border-transparent bg-muted/30"
                                  )}>
                                    {getPlayerInfo(m.player2_id)?.avatar_url ? (
                                      <img src={getPlayerInfo(m.player2_id)?.avatar_url ?? ""} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">
                                        {getPlayerInfo(m.player2_id)?.name?.charAt(0).toUpperCase() ?? "?"}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">
                                        {getPlayerInfo(m.player2_id)?.name ?? "TBD"}
                                      </p>
                                      {getPlayerInfo(m.player2_id) && (
                                        <>
                                          <p className="text-xs text-muted-foreground truncate">
                                            @{getPlayerInfo(m.player2_id)?.username}
                                          </p>
                                          {(getPlayerInfo(m.player2_id)?.country || getPlayerInfo(m.player2_id)?.vehicle) && (
                                            <p className="text-[11px] text-muted-foreground/70 truncate">
                                              {nationLabel(getPlayerInfo(m.player2_id)?.country ?? null)}{getPlayerInfo(m.player2_id)?.country && getPlayerInfo(m.player2_id)?.vehicle ? " · " : ""}{getPlayerInfo(m.player2_id)?.vehicle ?? ""}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {m.winner_id === m.player2_id && (
                                      <Trophy className="h-4 w-4 text-green-500 shrink-0" />
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className={cn(
                                    "p-3 rounded-lg border",
                                    m.winner_id && m.team1_player_ids.includes(m.winner_id) ? "border-green-500/30 bg-green-500/5" : "border-transparent bg-muted/30"
                                  )}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Team 1</p>
                                    <div className="space-y-1.5">
                                      {m.team1_player_ids.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">TBD</p>
                                      ) : (
                                        m.team1_player_ids.map((pid) => {
                                          const p = getPlayerInfo(pid);
                                          return (
                                            <div key={pid} className="flex items-start gap-2">
                                              {p?.avatar_url ? (
                                                <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                                              ) : (
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0 mt-0.5">
                                                  {p?.name?.charAt(0).toUpperCase() ?? "?"}
                                                </div>
                                              )}
                                              <div className="min-w-0">
                                                <p className="text-xs truncate font-medium">{p?.name ?? "Unknown"}</p>
                                                {(p?.country || p?.vehicle) && (
                                                  <p className="text-[10px] text-muted-foreground/70 truncate">
                                                    {nationLabel(p?.country ?? null)}{p?.country && p?.vehicle ? " · " : ""}{p?.vehicle ?? ""}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "p-3 rounded-lg border",
                                    m.winner_id && m.team2_player_ids.includes(m.winner_id) ? "border-green-500/30 bg-green-500/5" : "border-transparent bg-muted/30"
                                  )}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Team 2</p>
                                    <div className="space-y-1.5">
                                      {m.team2_player_ids.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">TBD</p>
                                      ) : (
                                        m.team2_player_ids.map((pid) => {
                                          const p = getPlayerInfo(pid);
                                          return (
                                            <div key={pid} className="flex items-start gap-2">
                                              {p?.avatar_url ? (
                                                <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                                              ) : (
                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-500 shrink-0 mt-0.5">
                                                  {p?.name?.charAt(0).toUpperCase() ?? "?"}
                                                </div>
                                              )}
                                              <div className="min-w-0">
                                                <p className="text-xs truncate font-medium">{p?.name ?? "Unknown"}</p>
                                                {(p?.country || p?.vehicle) && (
                                                  <p className="text-[10px] text-muted-foreground/70 truncate">
                                                    {nationLabel(p?.country ?? null)}{p?.country && p?.vehicle ? " · " : ""}{p?.vehicle ?? ""}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {m.scheduled_at && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(m.scheduled_at), "MMM d, yyyy HH:mm")}
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

      {/* Chat floating button */}
      {tournament.chat_visible && (
        <>
          <button
            onClick={() => setShowChat(!showChat)}
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </button>

          {showChat && (
            <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[60vh] shadow-2xl rounded-xl border bg-background overflow-hidden">
              <TournamentChat
                tournamentId={tournament.id}
                isUserApproved={isApproved}
                chatEnabled={tournament.chat_enabled}
              />
            </div>
          )}
        </>
      )}

      <JoinDialog
        open={showJoin}
        onOpenChange={setShowJoin}
        tournamentTitle={tournament.title}
        defaultInGameName=""
        defaultSquadron=""
        onSubmit={handleJoin}
      />
    </div>
  );
}
