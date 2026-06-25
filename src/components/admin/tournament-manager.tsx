"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil, Trash2, Users, Check, X, Swords, Bell, MessageCircle, Eye, EyeOff, Lock, Unlock, Upload, Image as ImageIcon, Shuffle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, TournamentMatch, TournamentChatMessage } from "@/lib/types";
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
  system: z.enum(["1v1", "4v4"]),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]),
  chat_enabled: z.boolean().optional(),
  chat_visible: z.boolean().optional(),
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
  const [manageTournament, setManageTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [approvedPlayers, setApprovedPlayers] = useState<{ id: string; name: string }[]>([]);
  const [newMatchP1, setNewMatchP1] = useState("");
  const [newMatchP2, setNewMatchP2] = useState("");
  const [newMatchT1, setNewMatchT1] = useState<string[]>([]);
  const [newMatchT2, setNewMatchT2] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<(TournamentChatMessage & { name: string })[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatVisible, setChatVisible] = useState(true);
  const [mediaLinks, setMediaLinks] = useState<{ id: string; platform: string; url: string; label: string; visible: boolean }[]>([]);
  const [newMediaPlatform, setNewMediaPlatform] = useState("youtube");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaLabel, setNewMediaLabel] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "upcoming", mode: "air", tier: "mid", max_players: 16, system: "1v1" },
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
    setThumbnailUrl(null);
    reset({ status: "upcoming", mode: "air", tier: "mid", max_players: 16, system: "1v1", description: "", battle_rating: "", chat_enabled: true, chat_visible: true });
    setShowForm(true);
  };

  const startEdit = (t: Tournament) => {
    setEditing(t);
    setThumbnailUrl(t.thumbnail_url);
    setValue("title", t.title);
    setValue("description", t.description ?? "");
    setValue("mode", t.mode);
    setValue("tier", t.tier);
    setValue("battle_rating", t.battle_rating);
    setValue("start_date", t.start_date.slice(0, 16));
    setValue("end_date", t.end_date.slice(0, 16));
    setValue("max_players", t.max_players);
    setValue("system", t.system);
    setValue("status", t.status);
    setValue("chat_enabled", t.chat_enabled);
    setValue("chat_visible", t.chat_visible);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    reset();
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    const ext = file.name.split(".").pop();
    const path = `thumbnails/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("tournament-thumbnails").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setThumbnailUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("tournament-thumbnails").getPublicUrl(path);
    if (urlData?.publicUrl) {
      setThumbnailUrl(urlData.publicUrl);
    }
    setThumbnailUploading(false);
  };

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      mode: data.mode,
      tier: data.tier,
      battle_rating: data.battle_rating,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString(),
      max_players: data.max_players,
      system: data.system,
      status: data.status,
      chat_enabled: data.chat_enabled ?? true,
      chat_visible: data.chat_visible ?? true,
      thumbnail_url: thumbnailUrl,
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

  const openManage = async (t: Tournament) => {
    setManageTournament(t);
    setChatEnabled(t.chat_enabled);
    setChatVisible(t.chat_visible);

    const { data: msgs } = await supabase
      .from("tournament_chat_messages")
      .select("*")
      .eq("tournament_id", t.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (msgs) {
      const userIds = [...new Set(msgs.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name || p.username]));
      setChatMessages(msgs.map((m) => ({ ...m, name: nameMap.get(m.user_id) || "Unknown" })));
    }

    const { data: mediaData } = await supabase
      .from("tournament_media_links")
      .select("*")
      .eq("tournament_id", t.id)
      .order("created_at", { ascending: true });
    setMediaLinks(mediaData ?? []);

    const { data: parts } = await supabase
      .from("tournament_participants")
      .select("id, user_id, status, in_game_name")
      .eq("tournament_id", t.id)
      .eq("status", "approved");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", (parts ?? []).map((p) => p.user_id));

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const players = (parts ?? []).map((p) => {
      const prof = profileMap.get(p.user_id);
      return {
        id: p.user_id,
        name: prof?.display_name || prof?.username || p.in_game_name || "Unknown",
      };
    });
    setApprovedPlayers(players);

    const { data: matchData } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", t.id)
      .order("round", { ascending: true })
      .order("match_index", { ascending: true });

    setMatches(matchData ?? []);
  };

  const notifyMatchPlayers = async (match: TournamentMatch) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const playerIds: string[] = [];
    if (match.player1_id) playerIds.push(match.player1_id);
    if (match.player2_id) playerIds.push(match.player2_id);
    playerIds.push(...match.team1_player_ids, ...match.team2_player_ids);

    if (playerIds.length === 0) { toast.info("No players assigned to this match"); return; }

    const notifications = playerIds.map((pid) => ({
      user_id: pid,
      title: `Match Notification - ${manageTournament?.title}`,
      message: `You have a match scheduled. Check the tournament page for details.`,
      type: "tournament",
      link: `/tournaments/${manageTournament?.id}`,
      created_by: user.id,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    if (error) { toast.error("Failed to send notifications"); return; }
    toast.success(`Notification sent to ${notifications.length} player(s)`);
  };

  const createMatch = async () => {
    if (!manageTournament) return;
    const round = 1;
    const matchIndex = matches.filter((m) => m.round === round).length;

    if (manageTournament.system === "1v1") {
      if (!newMatchP1 || !newMatchP2) { toast.error("Select both players"); return; }
      if (newMatchP1 === newMatchP2) { toast.error("Players must be different"); return; }
    }

    const payload: Record<string, unknown> = {
      tournament_id: manageTournament.id,
      round,
      match_index: matchIndex,
    };

    if (manageTournament.system === "1v1") {
      payload.player1_id = newMatchP1;
      payload.player2_id = newMatchP2;
    } else {
      payload.team1_player_ids = newMatchT1;
      payload.team2_player_ids = newMatchT2;
    }

    const { error } = await supabase.from("tournament_matches").insert(payload);
    if (error) { toast.error("Failed to create match"); return; }
    toast.success("Match created");
    setNewMatchP1("");
    setNewMatchP2("");
    setNewMatchT1([]);
    setNewMatchT2([]);
    openManage(manageTournament);
  };

  const updateMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
    const { error } = await supabase
      .from("tournament_matches")
      .update(updates)
      .eq("id", matchId);

    if (error) { toast.error("Failed to update match"); return; }
    toast.success("Match updated");
    if (manageTournament) openManage(manageTournament);
  };

  const deleteMatch = async (matchId: string) => {
    const { error } = await supabase.from("tournament_matches").delete().eq("id", matchId);
    if (error) { toast.error("Failed to delete match"); return; }
    toast.success("Match deleted");
    if (manageTournament) openManage(manageTournament);
  };

  const drawMatches = async () => {
    if (!manageTournament) return;
    if (approvedPlayers.length < 2) { toast.error("Need at least 2 approved players"); return; }

    const { data: existing } = await supabase
      .from("tournament_matches")
      .select("id")
      .eq("tournament_id", manageTournament.id);
    if (existing && existing.length > 0) {
      toast.error("Delete existing matches first before drawing");
      return;
    }

    const shuffled = [...approvedPlayers].sort(() => Math.random() - 0.5);
    let matchIndex = 0;
    const inserts: Record<string, unknown>[] = [];

    if (manageTournament.system === "1v1") {
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 >= shuffled.length) break;
        inserts.push({
          tournament_id: manageTournament.id,
          round: 1,
          match_index: matchIndex++,
          player1_id: shuffled[i].id,
          player2_id: shuffled[i + 1].id,
          status: "pending",
        });
      }
    } else {
      const mid = Math.ceil(shuffled.length / 2);
      const team1 = shuffled.slice(0, mid);
      const team2 = shuffled.slice(mid);
      if (team1.length === 0 || team2.length === 0) { toast.error("Not enough players for two teams"); return; }
      inserts.push({
        tournament_id: manageTournament.id,
        round: 1,
        match_index: matchIndex++,
        team1_player_ids: team1.map((p) => p.id),
        team2_player_ids: team2.map((p) => p.id),
        status: "pending",
      });
    }

    if (inserts.length === 0) { toast.error("Not enough players to create matches"); return; }

    const { error } = await supabase.from("tournament_matches").insert(inserts);
    if (error) { toast.error("Failed to create matches"); return; }
    toast.success(`Created ${inserts.length} match(es) via draw`);
    if (manageTournament) openManage(manageTournament);
  };

  const updateChatSetting = async (field: "chat_enabled" | "chat_visible", value: boolean) => {
    if (!manageTournament) return;
    const { error } = await supabase.from("tournaments").update({ [field]: value }).eq("id", manageTournament.id);
    if (error) { toast.error("Failed to update chat setting"); return; }
    if (field === "chat_enabled") setChatEnabled(value);
    else setChatVisible(value);
    toast.success(field === "chat_enabled" ? (value ? "Chat enabled" : "Chat disabled") : (value ? "Chat visible" : "Chat hidden"));
  };

  const deleteChatMessage = async (msgId: string) => {
    const { error } = await supabase.from("tournament_chat_messages").delete().eq("id", msgId);
    if (error) { toast.error("Failed to delete message"); return; }
    setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast.success("Message deleted");
  };

  const addMediaLink = async () => {
    if (!manageTournament || !newMediaUrl.trim()) { toast.error("Enter a URL"); return; }
    const { data, error } = await supabase.from("tournament_media_links").insert({
      tournament_id: manageTournament.id,
      platform: newMediaPlatform,
      url: newMediaUrl.trim(),
      label: newMediaLabel.trim() || null,
      visible: true,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setMediaLinks((prev) => [...prev, data]);
    setNewMediaUrl("");
    setNewMediaLabel("");
    toast.success("Link added");
  };

  const toggleMediaLink = async (linkId: string, visible: boolean) => {
    const { error } = await supabase.from("tournament_media_links").update({ visible }).eq("id", linkId);
    if (error) { toast.error(error.message); return; }
    setMediaLinks((prev) => prev.map((l) => l.id === linkId ? { ...l, visible } : l));
  };

  const deleteMediaLink = async (linkId: string) => {
    const { error } = await supabase.from("tournament_media_links").delete().eq("id", linkId);
    if (error) { toast.error(error.message); return; }
    setMediaLinks((prev) => prev.filter((l) => l.id !== linkId));
    toast.success("Link deleted");
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_players">Max Players</Label>
                  <Input id="max_players" type="number" {...register("max_players", { valueAsNumber: true })} min={1} />
                  {errors.max_players && <p className="text-sm text-destructive">{errors.max_players.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system">System</Label>
                  <select id="system" {...register("system")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="1v1">1v1 Knockout</option>
                    <option value="4v4">4v4 Teams</option>
                  </select>
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
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Tournament Panel Image (16:9)
                </Label>
                {thumbnailUrl && (
                  <div className="relative rounded-lg overflow-hidden border bg-muted" style={{ aspectRatio: "16/9", maxWidth: 400 }}>
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl(null)}
                      className="absolute top-2 right-2 p-1 bg-destructive/80 text-white rounded-full hover:bg-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Label className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  {thumbnailUrl ? "Change Image" : "Upload Image"}
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={thumbnailUploading} />
                </Label>
                {thumbnailUploading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("chat_enabled")} defaultChecked />
                  <span className="text-sm">Chat Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("chat_visible")} defaultChecked />
                  <span className="text-sm">Chat Visible</span>
                </label>
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
                <TableHead>System</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>BR</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No tournaments yet</TableCell>
                </TableRow>
              ) : (
                tournaments.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium max-w-xs truncate">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.system === "1v1" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"}>
                        {t.system === "1v1" ? "1v1" : "4v4"}
                      </Badge>
                    </TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => openManage(t)} title="Manage Matches">
                          <Swords className="h-4 w-4" />
                        </Button>
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

      <Dialog open={!!manageTournament} onOpenChange={(o) => { if (!o) setManageTournament(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2 border-b mb-2">
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Manage Matches — {manageTournament?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Approved Players ({approvedPlayers.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {approvedPlayers.map((p) => (
                  <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                ))}
                {approvedPlayers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No approved players yet</p>
                )}
              </div>
            </div>

            {approvedPlayers.length >= 2 && matches.length === 0 && (
              <Button variant="secondary" size="sm" className="w-full gap-2" onClick={drawMatches}>
                <Shuffle className="h-4 w-4" />
                Draw Matches (Auto-pair {approvedPlayers.length} players)
              </Button>
            )}

            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Match
              </h4>

              {manageTournament?.system === "1v1" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Player 1</Label>
                    <select
                      value={newMatchP1}
                      onChange={(e) => setNewMatchP1(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select player...</option>
                      {approvedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Player 2</Label>
                    <select
                      value={newMatchP2}
                      onChange={(e) => setNewMatchP2(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select player...</option>
                      {approvedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Team 1 Players</Label>
                    <div className="border rounded-md p-2 min-h-[60px] space-y-1">
                      {newMatchT1.length === 0 && <p className="text-xs text-muted-foreground">Click players below to add</p>}
                      {newMatchT1.map((pid) => {
                        const pl = approvedPlayers.find((a) => a.id === pid);
                        return (
                          <Badge key={pid} variant="outline" className="text-xs cursor-pointer"
                            onClick={() => setNewMatchT1(newMatchT1.filter((id) => id !== pid))}
                          >
                            {pl?.name ?? pid} ✕
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Team 2 Players</Label>
                    <div className="border rounded-md p-2 min-h-[60px] space-y-1">
                      {newMatchT2.length === 0 && <p className="text-xs text-muted-foreground">Click players below to add</p>}
                      {newMatchT2.map((pid) => {
                        const pl = approvedPlayers.find((a) => a.id === pid);
                        return (
                          <Badge key={pid} variant="outline" className="text-xs cursor-pointer"
                            onClick={() => setNewMatchT2(newMatchT2.filter((id) => id !== pid))}
                          >
                            {pl?.name ?? pid} ✕
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1.5">Available players:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {approvedPlayers.filter((p) => !newMatchT1.includes(p.id) && !newMatchT2.includes(p.id)).map((p) => (
                        <div key={p.id} className="flex gap-1">
                          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-500/20 border-blue-500/30"
                            onClick={() => setNewMatchT1([...newMatchT1, p.id])}
                          >
                            {p.name} → T1
                          </Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-purple-500/20 border-purple-500/30"
                            onClick={() => setNewMatchT2([...newMatchT2, p.id])}
                          >
                            {p.name} → T2
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button size="sm" onClick={createMatch} disabled={
                manageTournament?.system === "1v1" ? (!newMatchP1 || !newMatchP2) : (newMatchT1.length === 0 || newMatchT2.length === 0)
              }>
                <Plus className="h-3 w-3 mr-1" />
                Create Match
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Existing Matches ({matches.length})</h4>

              {matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-6 gap-4 items-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Round</p>
                            <p className="text-sm font-medium">R{m.round} #{m.match_index + 1}</p>
                          </div>

                          {manageTournament?.system === "1v1" ? (
                            <>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Player 1</p>
                                <select
                                  value={m.player1_id ?? ""}
                                  onChange={(e) => updateMatch(m.id, { player1_id: e.target.value || null } as Partial<TournamentMatch>)}
                                  className="w-full text-xs bg-transparent border rounded px-2 py-1"
                                >
                                  <option value="">—</option>
                                  {approvedPlayers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Player 2</p>
                                <select
                                  value={m.player2_id ?? ""}
                                  onChange={(e) => updateMatch(m.id, { player2_id: e.target.value || null } as Partial<TournamentMatch>)}
                                  className="w-full text-xs bg-transparent border rounded px-2 py-1"
                                >
                                  <option value="">—</option>
                                  {approvedPlayers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Team 1 ({m.team1_player_ids.length})</p>
                                <div className="flex flex-wrap gap-1">
                                  {m.team1_player_ids.map((pid) => {
                                    const pl = approvedPlayers.find((a) => a.id === pid);
                                    return <Badge key={pid} variant="outline" className="text-xs">{pl?.name ?? pid}</Badge>;
                                  })}
                                  {m.team1_player_ids.length === 0 && <span className="text-xs text-muted-foreground">Empty</span>}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Team 2 ({m.team2_player_ids.length})</p>
                                <div className="flex flex-wrap gap-1">
                                  {m.team2_player_ids.map((pid) => {
                                    const pl = approvedPlayers.find((a) => a.id === pid);
                                    return <Badge key={pid} variant="outline" className="text-xs">{pl?.name ?? pid}</Badge>;
                                  })}
                                  {m.team2_player_ids.length === 0 && <span className="text-xs text-muted-foreground">Empty</span>}
                                </div>
                              </div>
                            </>
                          )}

                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Schedule</p>
                            <input
                              type="datetime-local"
                              value={m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : ""}
                              onChange={(e) => updateMatch(m.id, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<TournamentMatch>)}
                              className="w-full text-xs bg-transparent border rounded px-1 py-1"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Status</p>
                            <select
                              value={m.status}
                              onChange={(e) => updateMatch(m.id, { status: e.target.value } as Partial<TournamentMatch>)}
                              className="w-full text-xs bg-transparent border rounded px-1 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 mt-3 pt-2 border-t">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => notifyMatchPlayers(m)}>
                            <Bell className="h-3 w-3" />
                            Notify
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => deleteMatch(m.id)}>
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6 border rounded-lg">
                  No matches yet. Use the form above to create one.
                </p>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat Settings
              </h4>
              <div className="flex gap-4">
                <Button size="sm" variant={chatEnabled ? "default" : "outline"} onClick={() => updateChatSetting("chat_enabled", !chatEnabled)}>
                  {chatEnabled ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                  {chatEnabled ? "Chat Enabled" : "Chat Disabled"}
                </Button>
                <Button size="sm" variant={chatVisible ? "default" : "outline"} onClick={() => updateChatSetting("chat_visible", !chatVisible)}>
                  {chatVisible ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  {chatVisible ? "Chat Visible" : "Chat Hidden"}
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                {chatMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No messages in chat</p>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{msg.name}</p>
                      <p className="text-xs text-muted-foreground break-words">{msg.message}</p>
                      <p className="text-[10px] text-muted-foreground/60">{format(new Date(msg.created_at), "MMM d, HH:mm")}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => deleteChatMessage(msg.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Media &amp; Social Links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Platform</Label>
                  <select value={newMediaPlatform} onChange={(e) => setNewMediaPlatform(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitch">Twitch</option>
                    <option value="website">Website</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)} placeholder="https://..." className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label (optional)</Label>
                  <div className="flex gap-1">
                    <Input value={newMediaLabel} onChange={(e) => setNewMediaLabel(e.target.value)} placeholder="Watch Live" className="h-9 text-xs" />
                    <Button size="sm" className="h-9 shrink-0" onClick={addMediaLink}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {mediaLinks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No links added yet</p>}
                {mediaLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">{link.platform}</Badge>
                      <span className="text-xs truncate">{link.label || link.url}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleMediaLink(link.id, !link.visible)} title={link.visible ? "Hide" : "Show"}>
                        {link.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMediaLink(link.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
