"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trophy, Calendar, Swords, Users, Clock, ChevronLeft, CheckCircle2, XCircle, Hourglass, MessageCircle, X, Play, Music, Monitor, Globe, ArrowRight, Shield, Target, Zap, AlertCircle, Info } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Tournament, TournamentMatch, TournamentParticipant } from "@/lib/types";
import { WT_NATIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const TournamentChat = dynamic(() => import("@/components/tournament-chat").then((m) => m.TournamentChat), { ssr: false });
const JoinDialog = dynamic(() => import("@/components/tournaments/join-dialog").then((m) => m.JoinDialog), { ssr: false });
const TeamJoinDialog = dynamic(() => import("@/components/tournaments/team-join-dialog").then((m) => m.TeamJoinDialog), { ssr: false });
import { MaintenanceGuard } from "@/components/maintenance-guard";
import type { ReactNode } from "react";

const MODE_LABELS: Record<string, string> = { air: "Air", ground: "Ground", both: "Air & Ground" };
const TIER_LABELS: Record<string, string> = { low: "Low Tier", mid: "Mid Tier", high: "High Tier", top: "Top Tier" };
const ROUND_NAMES = ["", "Quarter-Finals", "Semi-Finals", "Final"];

type MediaLink = { id: string; platform: string; url: string; label: string | null };

const PLATFORM_ICONS: Record<string, ReactNode> = {
  youtube: <Play className="h-3.5 w-3.5" />,
  tiktok: <Music className="h-3.5 w-3.5" />,
  twitch: <Monitor className="h-3.5 w-3.5" />,
  website: <Globe className="h-3.5 w-3.5" />,
};

const TEAM_COLOR_CYCLES = [
  { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/30", lightBg: "bg-blue-500/[0.04]" },
  { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/30", lightBg: "bg-red-500/[0.04]" },
  { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", ring: "ring-green-500/30", lightBg: "bg-green-500/[0.04]" },
  { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/30", lightBg: "bg-orange-500/[0.04]" },
  { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/30", lightBg: "bg-purple-500/[0.04]" },
  { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", ring: "ring-cyan-500/30", lightBg: "bg-cyan-500/[0.04]" },
  { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/30", lightBg: "bg-pink-500/[0.04]" },
  { border: "border-yellow-500/30", bg: "bg-yellow-500/10", text: "text-yellow-400", ring: "ring-yellow-500/30", lightBg: "bg-yellow-500/[0.04]" },
];

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "hover:bg-red-500/20 hover:text-red-500 border-red-500/30 text-red-400",
  tiktok: "hover:bg-pink-500/20 hover:text-pink-500 border-pink-500/30 text-pink-400",
  twitch: "hover:bg-purple-500/20 hover:text-purple-500 border-purple-500/30 text-purple-400",
  website: "hover:bg-blue-500/20 hover:text-blue-500 border-blue-500/30 text-blue-400",
};

const STATUS_STYLE: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  upcoming: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  active: {
    border: "border-green-500/30",
    bg: "bg-green-500/10",
    text: "text-green-400",
    dot: "bg-green-500",
  },
  completed: {
    border: "border-muted-foreground/30",
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  cancelled: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
  },
};

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [participants, setParticipants] = useState<(TournamentParticipant & { name: string; username: string; avatar_url: string | null })[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const extraProfilesRef = useRef<Map<string, { name: string; username: string; avatar_url: string | null; country: string | null; vehicle: string | null }>>(new Map());
  const nationLabel = (code: string | null) => WT_NATIONS.find((n) => n.code === code)?.label ?? code ?? "";
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showTeamJoin, setShowTeamJoin] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteProfiles, setInviteProfiles] = useState<Record<string, any>>({});
  const [teamMembers, setTeamMembers] = useState<Record<string, { team_leader_id: string; slot_number: number }>>({});
  const [joining, setJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      if (!tournament) return;
      const now = Date.now();
      const start = new Date(tournament.start_date).getTime();
      const end = new Date(tournament.end_date).getTime();
      const target = now < start ? start : now < end ? end : 0;
      if (!target) { setTimeLeft(""); return; }
      const diff = target - now;
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const prefix = now < start ? "Starts in" : "Ends in";
      setTimeLeft(`${prefix} ${d}d ${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tournament]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  const getEffectiveStatus = (t: Tournament) => {
    if (t.status === "cancelled") return "cancelled";
    const now = new Date();
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    if (now >= end) return "completed";
    if (now >= start) return "active";
    return "upcoming";
  };

  useEffect(() => {
    const load = async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!tData) { setLoading(false); return; }

      const effective = getEffectiveStatus(tData);
      if (effective !== tData.status) {
        supabase.rpc("auto_update_tournament_status", { tournament_id: id });
      }
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

      const { data: mediaData } = await supabase
        .from("tournament_media_links")
        .select("id, platform, url, label")
        .eq("tournament_id", id)
        .eq("visible", true);
      setMediaLinks(mediaData ?? []);

      // Fetch team members for this tournament
      const { data: tmData } = await supabase
        .from("tournament_team_members")
        .select("user_id, team_leader_id, slot_number")
        .eq("tournament_id", id);
      const tmMap: Record<string, { team_leader_id: string; slot_number: number }> = {};
      (tmData ?? []).forEach((tm) => { tmMap[tm.user_id] = { team_leader_id: tm.team_leader_id, slot_number: tm.slot_number }; });
      setTeamMembers(tmMap);

      // Fetch pending team invites for current user
      if (user) {
        const { data: inviteData } = await supabase
          .from("tournament_team_invites")
          .select("*")
          .eq("tournament_id", id)
          .eq("invitee_id", user.id)
          .eq("status", "pending");
        setPendingInvites(inviteData ?? []);

        if (inviteData && inviteData.length > 0) {
          const reqIds = inviteData.map((inv) => inv.requester_id);
          const { data: reqProfiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", reqIds);
          const pmap: Record<string, any> = {};
          (reqProfiles ?? []).forEach((p) => { pmap[p.id] = p; });
          setInviteProfiles(pmap);
        }
      }

      setLoading(false);
    };
    load();

    const interval = setInterval(async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (tData) {
        const effective = getEffectiveStatus(tData);
        if (effective !== tData.status) {
          supabase.rpc("auto_update_tournament_status", { tournament_id: id });
          setTournament(tData);
        }
      }
    }, 30000);

    const debounceTimer = { current: null as NodeJS.Timeout | null };
    const debouncedLoad = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(load, 400);
    };

    const channel = supabase
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMatches((prev) => [...prev, payload.new as TournamentMatch]);
        } else if (payload.eventType === "UPDATE") {
          setMatches((prev) => prev.map((m) => m.id === payload.new.id ? { ...m, ...payload.new as TournamentMatch } : m));
        } else if (payload.eventType === "DELETE") {
          setMatches((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants", filter: `tournament_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const pNew = payload.new as { user_id: string };
          supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", pNew.user_id).single().then(({ data: prof }) => {
            setParticipants((prev) => {
              const idx = prev.findIndex((p) => p.user_id === payload.new.user_id);
              const merged = { ...payload.new as any, name: prof?.display_name || prof?.username || "Unknown", username: prof?.username || "unknown", avatar_url: prof?.avatar_url || null };
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = merged;
                return copy;
              }
              return [...prev, merged];
            });
          });
        } else if (payload.eventType === "DELETE") {
          setParticipants((prev) => prev.filter((p) => p.user_id !== payload.old.user_id));
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
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
  const profileMap = new Map(participants.map((p) => [p.user_id, { name: p.name, username: p.username, avatar_url: p.avatar_url, country: p.country, vehicle: p.vehicle }]));
  extraProfilesRef.current.forEach((v, k) => { if (!profileMap.has(k)) profileMap.set(k, v); });
  // Assign team colors deterministicly
  const uniqueTeamLeaders = [...new Set(Object.values(teamMembers).map((tm) => tm.team_leader_id))].sort();
  const teamColorIndex: Record<string, number> = {};
  uniqueTeamLeaders.forEach((leaderId, i) => { teamColorIndex[leaderId] = i % TEAM_COLOR_CYCLES.length; });
  const approvedCount = participants.filter((p) => p.status === "approved").length;
  const isParticipant = participants.some((p) => p.user_id === user?.id);
  const isApproved = participants.some((p) => p.user_id === user?.id && p.status === "approved");
  const effectiveStatus = getEffectiveStatus(tournament);
  const st = STATUS_STYLE[effectiveStatus] || STATUS_STYLE.upcoming;

  const now = new Date();
  const startDate = new Date(tournament.start_date);
  const hoursUntilStart = differenceInHours(startDate, now);
  const isUpcoming = effectiveStatus === "upcoming";
  const joinLocked = isUpcoming && hoursUntilStart > 24;
  const joinLockHours = Math.floor(hoursUntilStart - 24);

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
    <MaintenanceGuard page="tournaments">
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14 max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push("/tournaments")}
              className="group gap-1.5 text-muted-foreground hover:text-foreground -ml-3"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-sm font-medium">Back to Tournaments</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10">
        {/* Thumbnail + Info card side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Thumbnail */}
          <div className="lg:col-span-7">
            {tournament.thumbnail_url ? (
              <div className="rounded-xl overflow-hidden border border-border/50 bg-muted shadow-lg shadow-black/10 relative" style={{ aspectRatio: "16/9" }}>
                <Image src={tournament.thumbnail_url} alt={tournament.title} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg shadow-black/10" style={{ aspectRatio: "16/9" }}>
                <div className="text-center">
                  <Trophy className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground/40 text-sm font-medium">No thumbnail</p>
                </div>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <Card className="h-full border-border/50 shadow-lg shadow-black/5">
              <CardHeader className="pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-2xl font-bold leading-tight">{tournament.title}</CardTitle>
                  <Badge className={cn("shrink-0 capitalize border-0", st.bg, st.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 inline-block", st.dot)} />
                    {effectiveStatus}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs border-border/50">
                    <Swords className="h-3 w-3 mr-1" />
                    {MODE_LABELS[tournament.mode]}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-border/50">
                    {TIER_LABELS[tournament.tier]}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono border-border/50">
                    BR {tournament.battle_rating}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border-border/50",
                      tournament.system === "1v1" ? "text-blue-400 border-blue-500/30" : "text-purple-400 border-purple-500/30"
                    )}
                  >
                    {tournament.system === "1v1" ? "1v1" : "4v4"}
                  </Badge>
                  {tournament.rounds_to_win > 1 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                      Best of {(tournament.rounds_to_win * 2) - 1}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Start</p>
                      <p className="text-sm font-medium">{format(new Date(tournament.start_date), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">End</p>
                      <p className="text-sm font-medium">{format(new Date(tournament.end_date), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                </div>

                {timeLeft && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Time Remaining</p>
                      <p className="text-sm font-bold tabular-nums text-amber-400">{timeLeft}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Players</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        <span className={cn(approvedCount === tournament.max_players ? "text-green-400" : "text-foreground")}>
                          {approvedCount}
                        </span>
                        <span className="text-muted-foreground">/{tournament.max_players}</span>
                      </p>
                      <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            approvedCount === tournament.max_players ? "bg-green-500" : "bg-primary/60"
                          )}
                          style={{ width: `${(approvedCount / tournament.max_players) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {tournament.description && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
                  </div>
                )}

                {mediaLinks.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Media & Links</p>
                    <div className="flex flex-wrap gap-2">
                      {mediaLinks.map((link) => {
                        const icon = PLATFORM_ICONS[link.platform] || <Globe className="h-3.5 w-3.5" />;
                        const color = PLATFORM_COLORS[link.platform] || "hover:bg-muted hover:text-foreground";
                        return (
                          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs border-border/50", color)}>
                              {icon}
                              {link.label || link.platform}
                            </Button>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Participants + Motivation side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Participants list */}
          <div className="lg:col-span-7">
            <Card className="border-border/50 shadow-lg shadow-black/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Participants
                  <span className="text-sm font-normal text-muted-foreground">({participants.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(participants.length > 0 && "max-h-[500px] overflow-y-auto space-y-2 pr-1")}>
                {participants.length > 0 ? (
                  participants.map((p) => {
                    const tm = teamMembers[p.user_id];
                    const tc = tm ? TEAM_COLOR_CYCLES[teamColorIndex[tm.team_leader_id] ?? 0] : null;
                    return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        tc ? `${tc.border} ${tc.lightBg}` :
                        p.status === "approved" ? "border-green-500/20 bg-green-500/[0.03]" :
                        p.status === "pending" ? "border-yellow-500/20 bg-yellow-500/[0.03]" :
                        "border-red-500/20 bg-red-500/[0.03]"
                      )}
                    >
                      {p.avatar_url ? (
                        <div className={cn(
                          "w-10 h-10 rounded-full overflow-hidden shrink-0 relative",
                          tc ? `${tc.ring} ring-2` : "ring-2 ring-border/50"
                        )}>
                          <Image src={p.avatar_url} alt={p.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-2",
                          tc ? `${tc.ring} ${tc.bg} ${tc.text}` :
                          p.status === "approved" ? "ring-green-500/30 bg-green-500/20 text-green-500" :
                          p.status === "pending" ? "ring-yellow-500/30 bg-yellow-500/20 text-yellow-500" :
                          "ring-red-500/30 bg-red-500/20 text-red-500"
                        )}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", tc && tc.text)}>{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tm && (
                          <Badge variant="outline" className={cn("text-xs font-medium", tc ? `${tc.border} ${tc.bg} ${tc.text}` : "border-blue-500/30 bg-blue-500/10 text-blue-400")}>
                            <Users className="h-3 w-3 mr-0.5" />
                            {tm.slot_number === 1 ? "Lead" : `#${tm.slot_number}`}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn(
                          "text-xs border-0 font-medium",
                          p.status === "approved" ? "bg-green-500/10 text-green-500" :
                          p.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-red-500/10 text-red-500"
                        )}>
                          <span className="flex items-center gap-1">
                            {statusIcon(p.status)}
                            {p.status}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground/60 font-medium">No participants yet</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">Be the first to join!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Motivation + Join */}
          <div className="lg:col-span-5">
            <Card className="h-full border-border/50 shadow-lg shadow-black/5 overflow-hidden">
              <div className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent h-full">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[420px] relative z-10">
                  <div className="p-4 rounded-full bg-amber-500/20 ring-4 ring-amber-500/10">
                    <Trophy className="h-10 w-10 text-amber-400" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Ready to Compete?</h3>
                    <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
                      Join the battle and prove you&apos;re the best pilot. The arena awaits, challenger!
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Target className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">Compete</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">Win</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Shield className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">Glory</span>
                    </div>
                  </div>

                  {!isParticipant && (effectiveStatus === "upcoming" || effectiveStatus === "active") && (
                    <div className="w-full max-w-xs space-y-2">
                      {joinLocked && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Applications open 24 hours before tournament starts (opens in ~{joinLockHours}h)</span>
                        </div>
                      )}
                      <Button
                        size="lg"
                        disabled={joinLocked}
                        className={cn(
                          "w-full gap-2 transition-all duration-300",
                          joinLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/25"
                        )}
                        onClick={() => setShowJoin(true)}
                      >
                        <Swords className="h-5 w-5" />
                        Join Tournament
                        <ArrowRight className="h-4 w-4 ml-auto opacity-70" />
                      </Button>
                      {tournament.system === "4v4" && (
                        <Button
                          size="lg"
                          variant="outline"
                          disabled={joinLocked}
                          className="w-full gap-2"
                          onClick={() => setShowTeamJoin(true)}
                        >
                          <Users className="h-5 w-5" />
                          Join as Team
                        </Button>
                      )}
                    </div>
                  )}

                  {isParticipant && !isApproved && (
                    <div className="w-full max-w-xs p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                      <Hourglass className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-yellow-400">Application Pending</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Waiting for organizer approval</p>
                    </div>
                  )}

                  {isApproved && (
                    <div className="w-full max-w-xs p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-400">You&apos;re In!</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Good luck in the tournament</p>
                    </div>
                  )}

                  {pendingInvites.length > 0 && (
                    <div className="w-full max-w-xs space-y-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> Team Invites
                      </h4>
                      {pendingInvites.map((inv) => {
                        const invProf = inviteProfiles[inv.requester_id];
                        return (
                          <div key={inv.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={invProf?.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">{(invProf?.display_name || invProf?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{invProf?.display_name || invProf?.username || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">Slot #{inv.slot_number}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("tournament_team_invites")
                                    .update({ status: "accepted" })
                                    .eq("id", inv.id);
                                  if (error) { toast.error(error.message); return; }
                                  // Register as team member
                                  await supabase.from("tournament_team_members").insert({
                                    tournament_id: tournament.id,
                                    user_id: user?.id,
                                    team_leader_id: inv.requester_id,
                                    in_game_name: profile?.war_thunder_username || "",
                                    squadron: profile?.squadron_name || "",
                                    nation: profile?.nationality || "",
                                    vehicle: "",
                                    slot_number: inv.slot_number,
                                  });
                                  // Add as tournament participant
                                  await supabase.from("tournament_participants").upsert({
                                    tournament_id: tournament.id,
                                    user_id: user?.id,
                                    in_game_name: profile?.war_thunder_username || "",
                                    squadron: profile?.squadron_name || "",
                                    country: profile?.nationality || "",
                                    vehicle: "",
                                    status: "pending",
                                    accepted_terms: true,
                                  }, { onConflict: "tournament_id, user_id" });
                                  toast.success("Invite accepted!");
                                  setPendingInvites((prev) => prev.filter((i) => i.id !== inv.id));
                                  window.location.reload();
                                }}
                                className="p-1 rounded-full hover:bg-green-500/20 text-green-400 transition-colors"
                                title="Accept"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("tournament_team_invites")
                                    .update({ status: "rejected" })
                                    .eq("id", inv.id);
                                  if (error) toast.error(error.message);
                                  else { toast.success("Invite rejected"); setPendingInvites((prev) => prev.filter((i) => i.id !== inv.id)); }
                                }}
                                className="p-1 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isParticipant && (effectiveStatus === "completed" || effectiveStatus === "cancelled") && (
                    <div className="w-full max-w-xs p-4 rounded-xl bg-muted/50 border border-border/30 text-center">
                      <p className="text-sm text-muted-foreground font-medium capitalize">{effectiveStatus}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Registration is not open</p>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </div>
        </div>

        {/* Matches section */}
        {matches.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Matches & Bracket</h2>
                <p className="text-sm text-muted-foreground">{matches.length} match{matches.length !== 1 ? "es" : ""} scheduled</p>
              </div>
            </div>

            <div className="space-y-8">
              {rounds.map((round) => (
                <div key={round}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                      {ROUND_NAMES[round] || `Round ${round}`}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

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
                            "overflow-hidden border-border/50 shadow-md shadow-black/5 transition-shadow hover:shadow-lg",
                            m.status === "completed" && "border-green-500/20",
                            m.status === "in_progress" && "border-amber-500/20",
                          )}>
                            <div className={cn(
                              "px-4 py-2.5 flex items-center justify-between border-b border-border/40",
                              m.status === "completed" ? "bg-green-500/[0.04]" :
                              m.status === "in_progress" ? "bg-amber-500/[0.04]" : "bg-muted/20"
                            )}>
                              <span className="text-xs font-semibold text-muted-foreground">
                                Match #{m.match_index + 1}
                              </span>
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-2 py-0 border-0 font-medium",
                                m.status === "completed" ? "bg-green-500/10 text-green-500" :
                                m.status === "in_progress" ? "bg-amber-500/10 text-amber-500" :
                                "bg-muted/50 text-muted-foreground"
                              )}>
                                {m.status === "in_progress" ? "In Progress" : m.status}
                              </Badge>
                            </div>

                            <CardContent className="p-4 space-y-3">
                              {tournament.system === "1v1" ? (
                                <>
                                  <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    m.winner_id === m.player1_id ? "border-green-500/30 bg-green-500/[0.04]" : "border-transparent bg-muted/30"
                                  )}>
                                    {getPlayerInfo(m.player1_id)?.avatar_url ? (
                                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-border/50 relative">
                                        <Image src={getPlayerInfo(m.player1_id)?.avatar_url ?? ""} alt="" fill className="object-cover" unoptimized />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-border/50">
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
                                    {(m.player1_score != null || m.player2_score != null) && (
                                      <span className="text-sm font-bold tabular-nums shrink-0">{m.player1_score ?? "-"}</span>
                                    )}
                                    {m.winner_id === m.player1_id && (
                                      <Trophy className="h-4 w-4 text-green-500 shrink-0" />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-border/50" />
                                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">VS</span>
                                    <div className="h-px flex-1 bg-border/50" />
                                  </div>

                                  <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    m.winner_id === m.player2_id ? "border-green-500/30 bg-green-500/[0.04]" : "border-transparent bg-muted/30"
                                  )}>
                                    {getPlayerInfo(m.player2_id)?.avatar_url ? (
                                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-border/50 relative">
                                        <Image src={getPlayerInfo(m.player2_id)?.avatar_url ?? ""} alt="" fill className="object-cover" unoptimized />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-border/50">
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
                                    {(m.player1_score != null || m.player2_score != null) && (
                                      <span className="text-sm font-bold tabular-nums shrink-0">{m.player2_score ?? "-"}</span>
                                    )}
                                    {m.winner_id === m.player2_id && (
                                      <Trophy className="h-4 w-4 text-green-500 shrink-0" />
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className={cn(
                                    "p-3 rounded-lg border transition-colors",
                                    m.winner_id && m.team1_player_ids.includes(m.winner_id) ? "border-green-500/30 bg-green-500/[0.04]" : "border-transparent bg-muted/30"
                                  )}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-500/60" />
                                      Team 1
                                      {(m.player1_score != null || m.player2_score != null) && (
                                        <span className="ml-auto text-sm font-bold tabular-nums text-foreground">{m.player1_score ?? "-"}</span>
                                      )}
                                    </p>
                                    <div className="space-y-1.5">
                                      {m.team1_player_ids.length === 0 ? (
                                        <p className="text-xs text-muted-foreground/60">TBD</p>
                                      ) : (
                                        m.team1_player_ids.map((pid) => {
                                          const p = getPlayerInfo(pid);
                                          return (
                                            <div key={pid} className="flex items-start gap-2">
                                              {p?.avatar_url ? (
                                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-border/50 relative">
                                                  <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized />
                                                </div>
                                              ) : (
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0 mt-0.5 ring-1 ring-border/50">
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
                                    "p-3 rounded-lg border transition-colors",
                                    m.winner_id && m.team2_player_ids.includes(m.winner_id) ? "border-green-500/30 bg-green-500/[0.04]" : "border-transparent bg-muted/30"
                                  )}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-purple-500/60" />
                                      Team 2
                                      {(m.player1_score != null || m.player2_score != null) && (
                                        <span className="ml-auto text-sm font-bold tabular-nums text-foreground">{m.player2_score ?? "-"}</span>
                                      )}
                                    </p>
                                    <div className="space-y-1.5">
                                      {m.team2_player_ids.length === 0 ? (
                                        <p className="text-xs text-muted-foreground/60">TBD</p>
                                      ) : (
                                        m.team2_player_ids.map((pid) => {
                                          const p = getPlayerInfo(pid);
                                          return (
                                            <div key={pid} className="flex items-start gap-2">
                                              {p?.avatar_url ? (
                                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-border/50 relative">
                                                  <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized />
                                                </div>
                                              ) : (
                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-500 shrink-0 mt-0.5 ring-1 ring-border/50">
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
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 pt-3 border-t border-border/30 mt-3">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(m.scheduled_at), "MMM d, yyyy HH:mm")}
                                </div>
                              )}
                              {m.status !== "completed" && m.status !== "cancelled" && user && (
                                (() => {
                                  const isPlayerInMatch = tournament.system === "1v1"
                                    ? user.id === m.player1_id || user.id === m.player2_id
                                    : [...m.team1_player_ids, ...m.team2_player_ids].includes(user.id);
                                  if (!isPlayerInMatch) return null;
                                  return (
                                    <div className="pt-3 border-t border-border/30 mt-3">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="text-xs h-7 gap-1"
                                        onClick={async () => {
                                          if (!confirm("Are you sure you want to forfeit? The opponent will automatically win.")) return;
                                          const opponentId = tournament.system === "1v1"
                                            ? (user.id === m.player1_id ? m.player2_id : m.player1_id)
                                            : null;
                                          await supabase.from("tournament_matches").update({
                                            status: "completed",
                                            winner_id: opponentId,
                                          }).eq("id", m.id);
                                          toast.success("You have forfeited the match.");
                                          window.location.reload();
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                        Forfeit
                                      </Button>
                                    </div>
                                  );
                                })()
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
          <Card className="border-border/50 shadow-lg shadow-black/5">
            <CardContent className="py-16 text-center">
              <div className="p-3 rounded-full bg-muted/50 inline-block mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-medium">No matches have been set up yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1.5">Check back later or contact the tournament organizer</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat floating button */}
      {tournament.chat_visible && (
        <>
          <button
            onClick={() => setShowChat(!showChat)}
            className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all"
          >
            {showChat ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </button>

          {showChat && (
            <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[60vh] shadow-2xl rounded-xl border border-border/50 bg-background overflow-hidden">
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
        defaultInGameName={profile?.war_thunder_username ?? ""}
        defaultSquadron={profile?.squadron_name ?? ""}
        defaultCountry={profile?.nationality ?? ""}
        onSubmit={handleJoin}
      />
      <TeamJoinDialog
        open={showTeamJoin}
        onOpenChange={setShowTeamJoin}
        tournamentId={tournament.id}
        tournamentTitle={tournament.title}
      />
    </div>
    </MaintenanceGuard>
  );
}
