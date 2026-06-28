"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, Calendar, Swords, Users, Clock, Check, LogIn, Hourglass, X, ExternalLink, Target, Zap } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Tournament } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JoinDialog } from "@/components/tournaments/join-dialog";
import { TeamJoinDialog } from "@/components/tournaments/team-join-dialog";
import { MaintenanceGuard } from "@/components/maintenance-guard";

const MODE_LABELS: Record<string, string> = {
  air: "Air",
  ground: "Ground",
  both: "Air & Ground",
};

const TIER_LABELS: Record<string, string> = {
  low: "Low Tier",
  mid: "Mid Tier",
  high: "High Tier",
  top: "Top Tier",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
      status === "active" ? "bg-green-500 animate-pulse" :
      status === "upcoming" ? "bg-blue-500" :
      status === "completed" ? "bg-muted-foreground" :
      "bg-red-500"
    )} />
  );
}

export default function TournamentsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [approvedCounts, setApprovedCounts] = useState<Map<string, number>>(new Map());
  const [myParticipation, setMyParticipation] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [joinTournament, setJoinTournament] = useState<Tournament | null>(null);
  const [teamJoinTournament, setTeamJoinTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true });

      if (!tData) { if (!cancelled) setLoading(false); return; }

      if (!cancelled) setTournaments(tData);

      tData.forEach((t) => {
        const es = getEffectiveStatus(t);
        if (es !== t.status) {
          supabase.rpc("auto_update_tournament_status", { tournament_id: t.id });
        }
      });

      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("tournament_id, status");

      if (pData && !cancelled) {
        const counts = new Map<string, number>();
        pData.forEach((p) => {
          if (p.status === "approved") {
            counts.set(p.tournament_id, (counts.get(p.tournament_id) ?? 0) + 1);
          }
        });
        setApprovedCounts(counts);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: myData } = await supabase
          .from("tournament_participants")
          .select("tournament_id, status")
          .eq("user_id", user.id);

        if (myData) {
          setMyParticipation(new Map(myData.map((m) => [m.tournament_id, m.status])));
        }
      }

      if (!cancelled) setLoading(false);
    };

    load();

    const interval = setInterval(() => { load(); }, 60000);

    const channel = supabase
      .channel("tournaments-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants" }, () => { load(); })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const handleSubmitApplication = async (tournamentId: string, data: {
    in_game_name: string;
    squadron: string;
    country: string;
    vehicle: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournamentId,
      user_id: user.id,
      in_game_name: data.in_game_name,
      squadron: data.squadron || null,
      country: data.country,
      vehicle: data.vehicle,
      accepted_terms: true,
    });

    if (error) {
      toast.error(error.message?.includes("duplicate key")
        ? "Already applied"
        : "Tournament is full or unavailable");
      return;
    }

    setMyParticipation((prev) => new Map(prev).set(tournamentId, "pending"));
    setJoinTournament(null);
    toast.success("Application submitted! Awaiting admin approval.");
  };

  const handleCancel = async (tournamentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id);

    if (error) { toast.error("Failed to cancel"); return; }

    setMyParticipation((prev) => {
      const next = new Map(prev);
      next.delete(tournamentId);
      return next;
    });
    toast.success("Application cancelled");
  };

  const getEffectiveStatus = useCallback((t: Tournament) => {
    if (t.status === "cancelled") return "cancelled";
    const now = new Date();
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    if (now >= end) return "completed";
    if (now >= start) return "active";
    return "upcoming";
  }, []);

  const active = useMemo(() => tournaments.filter((t) => getEffectiveStatus(t) === "active"), [tournaments]);
  const upcoming = useMemo(() => tournaments.filter((t) => getEffectiveStatus(t) === "upcoming"), [tournaments]);
  const past = useMemo(() => tournaments.filter((t) => { const s = getEffectiveStatus(t); return s === "completed" || s === "cancelled"; }), [tournaments]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  const allEmpty = active.length === 0 && upcoming.length === 0 && past.length === 0;

  const renderTournamentCard = (t: Tournament & { _effectiveStatus?: string }) => {
    const es = t._effectiveStatus || getEffectiveStatus(t);
    const approved = approvedCounts.get(t.id) ?? 0;
    const myStatus = myParticipation.get(t.id);
    const full = approved >= t.max_players;
    const hoursUntilStart = differenceInHours(new Date(t.start_date), new Date());
    const joinLocked = es === "upcoming" && hoursUntilStart > 24;
    const joinLockHours = Math.floor(hoursUntilStart - 24);
    const isPast = es === "completed" || es === "cancelled";

    return (
      <div
        key={t.id}
        className={cn(
          "group relative rounded-xl border transition-all duration-300 overflow-hidden bg-card",
          myStatus ? "border-primary/30" : "border-border/50",
          "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          "hover:-translate-y-0.5"
        )}
      >
        {myStatus && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        )}

        <div className="p-5 space-y-4 relative">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base truncate">{t.title}</h3>
                {myStatus === "approved" && (
                  <Badge variant="outline" className="h-5 text-[10px] border-green-500/30 bg-green-500/10 text-green-500 shrink-0 px-1.5">
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    In
                  </Badge>
                )}
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground/70 line-clamp-1">{t.description}</p>
              )}
            </div>
            <Badge variant="outline" className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5",
              es === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
              es === "completed" ? "bg-muted/50 text-muted-foreground border-border/50" :
              es === "cancelled" ? "bg-red-500/10 text-red-500 border-red-500/20" :
              "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}>
              <StatusDot status={es} />
              {es === "active" ? "Live" : es === "completed" ? "Done" : es === "cancelled" ? "Canceled" : "Soon"}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Swords className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{MODE_LABELS[t.mode]}</span>
              <span className="text-muted-foreground/40 mx-0.5">·</span>
              <span className="font-semibold text-foreground/70">{TIER_LABELS[t.tier]}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5 shrink-0" />
              <span>BR <span className="font-semibold text-foreground/70">{t.battle_rating}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{format(new Date(t.start_date), "MMM d, HH:mm")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className={cn(full && "text-destructive font-medium")}>
                {approved}/{t.max_players}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all duration-500",
              full ? "bg-destructive" : "bg-primary/60"
            )} style={{ width: `${Math.min((approved / t.max_players) * 100, 100)}%` }} />
          </div>

          {/* Actions */}
          <div className="pt-1 space-y-2">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={() => router.push(`/tournaments/${t.id}`)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Details
            </Button>
            {!user ? (
              <Button size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={() => router.push("/auth/login")}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in to Join
              </Button>
            ) : myStatus === "approved" ? (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs border-green-500/30 text-green-600" disabled>
                <Check className="mr-1 h-3.5 w-3.5" />
                Approved
              </Button>
            ) : myStatus === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-yellow-500/30 text-yellow-600" disabled>
                  <Hourglass className="mr-1 h-3.5 w-3.5" />
                  Pending
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleCancel(t.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : myStatus === "rejected" ? (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs border-red-500/30 text-red-500" disabled>
                <X className="mr-1 h-3.5 w-3.5" />
                Rejected
              </Button>
            ) : isPast ? (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs" disabled>
                <Clock className="mr-1 h-3.5 w-3.5" />
                {es === "cancelled" ? "Cancelled" : "Ended"}
              </Button>
            ) : es === "upcoming" && joinLocked ? (
              <div className="space-y-1">
                <Button size="sm" className="w-full h-8 text-xs" disabled>
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  Opens in ~{joinLockHours}h
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs" disabled={full} onClick={() => setJoinTournament(t)}>
                  <Trophy className="mr-1 h-3.5 w-3.5" />
                  {full ? "Full" : "Join"}
                </Button>
                {t.system === "4v4" && !full && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setTeamJoinTournament(t)}>
                    <Users className="h-3.5 w-3.5" />
                    Team
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <MaintenanceGuard page="tournaments">
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image src="/background1.png" alt="" fill className="object-cover opacity-[0.45]" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
        <div className="absolute top-20 -left-32 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 -right-32 w-[700px] h-[700px] bg-blue-500/8 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Hero header */}
      <div className="relative border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5" />
        <div className="container mx-auto px-4 py-10 max-w-5xl relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tournaments</h1>
              </div>
              <p className="text-sm text-muted-foreground/70 mt-1">Compete, prove your skill, and claim the crown</p>
            </div>

          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10 relative">

        {allEmpty && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-full bg-muted/30">
              <Trophy className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground/60 font-medium">No tournaments yet</p>
            <p className="text-xs text-muted-foreground/40">Check back soon for upcoming events</p>
          </div>
        )}

        {/* Active */}
        {active.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  Live Now
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground/60">{active.length} tournament{active.length > 1 ? "s" : ""} in progress</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {active.map(renderTournamentCard)}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Upcoming</h2>
                <p className="text-xs text-muted-foreground/60">{upcoming.length} tournament{upcoming.length > 1 ? "s" : ""} on the horizon</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map(renderTournamentCard)}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">History</h2>
                <p className="text-xs text-muted-foreground/60">{past.length} past tournament{past.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {past.map(renderTournamentCard)}
            </div>
          </section>
        )}

        {joinTournament && (
          <JoinDialog
            open={!!joinTournament}
            onOpenChange={(o) => { if (!o) setJoinTournament(null); }}
            tournamentTitle={joinTournament.title}
            defaultInGameName={profile?.war_thunder_username ?? ""}
            defaultSquadron={profile?.squadron_name ?? ""}
            onSubmit={(data) => handleSubmitApplication(joinTournament.id, data)}
          />
        )}
        {teamJoinTournament && (
          <TeamJoinDialog
            open={!!teamJoinTournament}
            onOpenChange={(o) => { if (!o) setTeamJoinTournament(null); }}
            tournamentId={teamJoinTournament.id}
            tournamentTitle={teamJoinTournament.title}
          />
        )}
      </div>
    </div>
    </MaintenanceGuard>
  );
}
