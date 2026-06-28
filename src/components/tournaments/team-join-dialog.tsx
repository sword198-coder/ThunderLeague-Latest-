"use client";

import { useState } from "react";
import { Loader2, Search, X, UserPlus, Flag, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WT_NATIONS } from "@/lib/types";

type InvitedPlayer = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function TeamJoinDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tournamentId: string;
  tournamentTitle: string;
}) {
  const { user, profile } = useAuth();
  const [nation, setNation] = useState(profile?.nationality || "");
  const [vehicle, setVehicle] = useState("");
  const [inGameName, setInGameName] = useState(profile?.war_thunder_username || "");
  const [squadron, setSquadron] = useState(profile?.squadron_name || "");
  const [invited, setInvited] = useState<InvitedPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<InvitedPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const searchPlayers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(5);
    setSearchResults((data || []).filter((p) => p.id !== user?.id && !invited.find((i) => i.id === p.id)) as InvitedPlayer[]);
    setSearching(false);
  };

  const addPlayer = (p: InvitedPlayer) => {
    if (invited.length >= 3) return;
    setInvited([...invited, p]);
    setSearch("");
    setSearchResults([]);
  };

  const removePlayer = (id: string) => {
    setInvited(invited.filter((p) => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!user || invited.length === 0) return;
    setSubmitting(true);

    // Create invites for each invited player
    const invites = invited.map((p, i) => ({
      tournament_id: tournamentId,
      requester_id: user.id,
      invitee_id: p.id,
      slot_number: i + 2,
    }));

    const { error: inviteError } = await supabase.from("tournament_team_invites").insert(invites);
    if (inviteError) { toast.error(`Failed to send invites: ${inviteError.message}`); setSubmitting(false); return; }

    // Send notifications with tournament link
    const notifications = invited.map((p) => ({
      user_id: p.id,
      title: `Team Invite — ${tournamentTitle}`,
      message: `${profile?.display_name || profile?.username || "Someone"} invited you to join their team in ${tournamentTitle}. Click to view.`,
      type: "tournament",
      link: `/tournaments/${tournamentId}`,
      created_by: user.id,
    }));
    await supabase.from("notifications").insert(notifications);

    // Register the team leader
    const { error: memberError } = await supabase.from("tournament_team_members").insert({
      tournament_id: tournamentId,
      user_id: user.id,
      team_leader_id: user.id,
      in_game_name: inGameName.trim(),
      squadron: squadron.trim(),
      nation,
      vehicle,
      slot_number: 1,
    });
    if (memberError) { toast.error(`Failed to register: ${memberError.message}`); setSubmitting(false); return; }

    setSubmitting(false);
    toast.success(`Invites sent! ${invited.length} player(s) notified.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Join as Team</DialogTitle>
          <DialogDescription>{tournamentTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Team leader section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" /> Team Leader (You)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">In-Game Name</Label>
                <Input value={inGameName} onChange={(e) => setInGameName(e.target.value)} placeholder="Your WT name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Squadron</Label>
                <Input value={squadron} onChange={(e) => setSquadron(e.target.value)} placeholder="Squadron (optional)" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nation *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WT_NATIONS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setNation(code)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
                        nation === code
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <Flag className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Vehicle *</Label>
                <Input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. Leopard 2A7V"
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">Write the vehicle name as it appears in the game</p>
              </div>
            </div>
          </div>

          {/* Team members section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Teammates ({invited.length}/3)</h3>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => searchPlayers(e.target.value)}
                placeholder="Search players by username..."
                className="pl-9 h-9 text-sm"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPlayer(p)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{(p.display_name || p.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                      <p className="text-xs text-muted-foreground">@{p.username}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full">
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                ))}
              </div>
            )}

            {/* Invited players */}
            {invited.length > 0 && (
              <div className="space-y-2">
                {invited.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{(p.display_name || p.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                      <p className="text-xs text-muted-foreground">Slot #{i + 2}</p>
                    </div>
                    <button onClick={() => removePlayer(p.id)} className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={submitting || invited.length === 0 || !nation || !vehicle || !inGameName.trim()} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Send Invite{invited.length > 1 ? "s" : ""} ({invited.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
