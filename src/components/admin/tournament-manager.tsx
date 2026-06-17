"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil, Trash2, Users, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  mode: z.enum(["air", "ground", "both"]),
  tier: z.enum(["low", "mid", "high", "top"]),
  battle_rating: z.string().min(1, "BR is required"),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  max_players: z.number().int().min(1),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]),
});

type FormData = z.infer<typeof schema>;

type ParticipantInfo = {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
  in_game_name: string | null;
  squadron: string | null;
  country: string | null;
  vehicle: string | null;
};

const MODE_LABELS: Record<string, string> = {
  air: "Air",
  ground: "Ground",
  both: "Both",
};

const TIER_LABELS: Record<string, string> = {
  low: "Low Tier (1.0-3.0)",
  mid: "Mid Tier (3.0-6.0)",
  high: "High Tier (6.0-8.0)",
  top: "Top Tier (8.0-12.0)",
};

export function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [participantsDialog, setParticipantsDialog] = useState<{
    tournamentId: string;
    tournamentTitle: string;
    participants: ParticipantInfo[];
  } | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "upcoming", mode: "air", tier: "mid", max_players: 16 },
  });

  const load = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTournaments(data);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    reset({ status: "upcoming", mode: "air", tier: "mid", max_players: 16, description: "", battle_rating: "" });
    setShowForm(true);
  };

  const startEdit = (t: Tournament) => {
    setEditing(t);
    setValue("title", t.title);
    setValue("description", t.description ?? "");
    setValue("mode", t.mode);
    setValue("tier", t.tier);
    setValue("battle_rating", t.battle_rating);
    setValue("start_date", t.start_date.slice(0, 16));
    setValue("end_date", t.end_date.slice(0, 16));
    setValue("max_players", t.max_players);
    setValue("status", t.status);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title: data.title,
      description: data.description || null,
      mode: data.mode,
      tier: data.tier,
      battle_rating: data.battle_rating,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString(),
      max_players: data.max_players,
      status: data.status,
    };

    if (editing) {
      const { error } = await supabase.from("tournaments").update(payload).eq("id", editing.id);
      if (error) { toast.error("Failed to update tournament"); return; }
      toast.success("Tournament updated");
    } else {
      const { error } = await supabase.from("tournaments").insert({ ...payload, created_by: user.id });
      if (error) { toast.error("Failed to create tournament"); return; }
      toast.success("Tournament created");
    }

    cancelForm();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete tournament"); return; }
    toast.success("Tournament deleted");
    load();
  };

  const viewParticipants = async (t: Tournament) => {
    const { data: parts } = await supabase
      .from("tournament_participants")
      .select("id, user_id, status, in_game_name, squadron, country, vehicle")
      .eq("tournament_id", t.id);

    if (!parts || parts.length === 0) {
      toast.info("No applicants yet");
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", parts.map((p) => p.user_id));

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const participants: ParticipantInfo[] = parts.map((p) => {
      const prof = profileMap.get(p.user_id);
      return {
        id: p.id,
        username: prof?.username ?? "unknown",
        display_name: prof?.display_name ?? null,
        status: p.status,
        in_game_name: p.in_game_name,
        squadron: p.squadron,
        country: p.country,
        vehicle: p.vehicle,
      };
    });

    setParticipantsDialog({ tournamentId: t.id, tournamentTitle: t.title, participants });
  };

  const updateParticipantStatus = async (participantId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tournament_participants")
      .update({ status: newStatus })
      .eq("id", participantId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(newStatus === "approved" ? "Applicant approved" : "Applicant rejected");

    setParticipantsDialog((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === participantId ? { ...p, status: newStatus } : p
        ),
      };
    });
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      completed: "bg-muted text-muted-foreground",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[s] ?? "";
  };

  const partStatusBadge = (s: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[s] ?? "";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tournaments</h2>
        {!showForm && (
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Tournament" : "Create Tournament"}</CardTitle>
            <CardDescription>
              {editing ? "Update the tournament details" : "Create a new tournament for players to join"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tournament Name</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" {...register("description")} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mode">Mode</Label>
                  <select id="mode" {...register("mode")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="air">Air</option>
                    <option value="ground">Ground</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <select id="tier" {...register("tier")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="low">Low Tier (1.0-3.0)</option>
                    <option value="mid">Mid Tier (3.0-6.0)</option>
                    <option value="high">High Tier (6.0-8.0)</option>
                    <option value="top">Top Tier (8.0-12.0)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="battle_rating">Battle Rating Range</Label>
                <Input id="battle_rating" {...register("battle_rating")} placeholder="e.g. 3.0-4.0" />
                {errors.battle_rating && <p className="text-sm text-destructive">{errors.battle_rating.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" type="datetime-local" {...register("start_date")} />
                  {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="datetime-local" {...register("end_date")} />
                  {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_players">Max Players</Label>
                  <Input id="max_players" type="number" {...register("max_players", { valueAsNumber: true })} min={1} />
                  {errors.max_players && <p className="text-sm text-destructive">{errors.max_players.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" {...register("status")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update Tournament" : "Create Tournament"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>BR</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No tournaments yet</TableCell>
                </TableRow>
              ) : (
                tournaments.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium max-w-xs truncate">{t.title}</TableCell>
                    <TableCell>{MODE_LABELS[t.mode]}</TableCell>
                    <TableCell className="text-xs">{TIER_LABELS[t.tier]}</TableCell>
                    <TableCell>{t.battle_rating}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => viewParticipants(t)}>
                        <Users className="h-3 w-3" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.start_date), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(t.status)}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(t)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!participantsDialog} onOpenChange={(o) => { if (!o) setParticipantsDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {participantsDialog?.tournamentTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {participantsDialog?.participants.map((p) => (
              <div key={p.id} className="p-3 rounded bg-muted/50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold">
                      {p.display_name || p.username}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">@{p.username}</span>
                    <Badge variant="outline" className={`ml-2 text-xs ${partStatusBadge(p.status)}`}>
                      {p.status}
                    </Badge>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => updateParticipantStatus(p.id, "approved")} title="Approve">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => updateParticipantStatus(p.id, "rejected")} title="Reject">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {p.in_game_name && <div><span className="font-medium text-foreground/70">IGN:</span> {p.in_game_name}</div>}
                  {p.squadron && <div><span className="font-medium text-foreground/70">Squad:</span> {p.squadron}</div>}
                  {p.country && <div><span className="font-medium text-foreground/70">Country:</span> {p.country.toUpperCase()}</div>}
                  {p.vehicle && <div className="col-span-2"><span className="font-medium text-foreground/70">Vehicle:</span> {p.vehicle}</div>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
