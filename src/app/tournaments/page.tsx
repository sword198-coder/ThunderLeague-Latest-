"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, Calendar, Swords, Users, Clock, Check, LogIn, Hourglass, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Tournament } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JoinDialog } from "@/components/tournaments/join-dialog";

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

export default function TournamentsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [approvedCounts, setApprovedCounts] = useState<Map<string, number>>(new Map());
  const [myParticipation, setMyParticipation] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [joinTournament, setJoinTournament] = useState<Tournament | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true });

      if (!tData) { setLoading(false); return; }
      setTournaments(tData);

      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("tournament_id, status");

      if (pData) {
        const counts = new Map<string, number>();
        pData.forEach((p) => {
          if (p.status === "approved") {
            counts.set(p.tournament_id, (counts.get(p.tournament_id) ?? 0) + 1);
          }
        });
        setApprovedCounts(counts);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myData } = await supabase
          .from("tournament_participants")
          .select("tournament_id, status")
          .eq("user_id", user.id);

        if (myData) {
          setMyParticipation(new Map(myData.map((m) => [m.tournament_id, m.status])));
        }
      }

      setLoading(false);
    };

    load();
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const active = tournaments.filter((t) => t.status === "active");
  const upcoming = tournaments.filter((t) => t.status === "upcoming");
  const past = tournaments.filter((t) => t.status === "completed" || t.status === "cancelled");

  const renderTournamentCard = (t: Tournament) => {
    const approved = approvedCounts.get(t.id) ?? 0;
    const myStatus = myParticipation.get(t.id);
    const full = approved >= t.max_players;

    return (
      <Card key={t.id} className={cn("flex flex-col", myStatus && "border-primary/30")}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <Badge variant="outline" className={cn(
              t.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}>
              {t.status === "active" ? "Active" : "Upcoming"}
            </Badge>
          </div>
          {t.description && <CardDescription className="text-xs">{t.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Swords className="h-4 w-4 shrink-0" />
              <span>{MODE_LABELS[t.mode]} — {TIER_LABELS[t.tier]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">BR {t.battle_rating}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{format(new Date(t.start_date), "MMM d, HH:mm")} — {format(new Date(t.end_date), "MMM d, HH:mm")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span className={cn(full && "text-destructive font-medium")}>
                {approved}/{t.max_players} players
                {full && " (Full)"}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-3 space-y-2">
            <Button variant="outline" className="w-full gap-1" onClick={() => router.push(`/tournaments/${t.id}`)}>
              <ExternalLink className="h-4 w-4" />
              View Tournament
            </Button>
            {!user ? (
              <Button className="w-full" onClick={() => router.push("/auth/login")}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to Join
              </Button>
            ) : myStatus === "approved" ? (
              <Button variant="outline" className="w-full border-green-500/30 text-green-600" disabled>
                <Check className="mr-2 h-4 w-4" />
                Approved
              </Button>
            ) : myStatus === "pending" ? (
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-yellow-500/30 text-yellow-600" disabled>
                  <Hourglass className="mr-2 h-4 w-4" />
                  Pending Approval
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => handleCancel(t.id)}>
                  <X className="mr-1 h-3 w-3" />
                  Cancel Application
                </Button>
              </div>
            ) : myStatus === "rejected" ? (
              <Button variant="outline" className="w-full border-red-500/30 text-red-500" disabled>
                <X className="mr-2 h-4 w-4" />
                Rejected
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={full}
                onClick={() => setJoinTournament(t)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                {full ? "Full" : "Join Tournament"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const allEmpty = active.length === 0 && upcoming.length === 0 && past.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <p className="text-muted-foreground mt-1">Browse and join tournaments</p>
      </div>

      {allEmpty && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tournaments available yet</p>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600" />
            </span>
            Active Tournaments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {active.map(renderTournamentCard)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Tournaments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {upcoming.map(renderTournamentCard)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Completed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {past.map((t) => {
              const myStatus = myParticipation.get(t.id);
              return (
                <Card key={t.id} className="opacity-70">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      {MODE_LABELS[t.mode]} — {TIER_LABELS[t.tier]}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(t.start_date), "MMM d, yyyy")}
                    </div>
                    <Badge variant="outline" className={cn(
                      t.status === "completed" ? "" : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {t.status === "completed" ? "Completed" : "Cancelled"}
                    </Badge>
                    {myStatus && (
                      <Badge variant="outline" className="text-xs">
                        You {myStatus === "approved" ? "participated" : myStatus === "pending" ? "had applied" : "were rejected"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
    </div>
  );
}
