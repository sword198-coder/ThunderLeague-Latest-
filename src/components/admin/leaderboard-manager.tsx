"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormState = {
  rank: string;
  player_name: string;
  tier: "low" | "mid" | "high";
  squadron_name: string;
  battle_rating: string;
  score: string;
  wins: string;
  losses: string;
};

const emptyForm: FormState = {
  rank: "",
  player_name: "",
  tier: "high",
  squadron_name: "",
  battle_rating: "",
  score: "",
  wins: "0",
  losses: "0",
};

export function LeaderboardManager() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .order("tier", { ascending: true })
      .order("rank", { ascending: true });
    if (data) setEntries(data);
  }, [supabase]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select(      "id, display_name, username, avatar_url, role, email, first_name, last_name, war_thunder_username, squadron_name, nationality, discord_username, thunder_points, last_active_at, play_countries, play_tiers, play_mode, created_at, mfa_enrolled, selected_card_background_id");
    if (data) setProfiles(data as Profile[]);
  }, [supabase]);

  useEffect(() => {
    fetchEntries();
    fetchProfiles();
    const channel = supabase
      .channel("admin-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard_entries" }, () => { fetchEntries(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEntries, fetchProfiles]);

  const filteredProfiles = profiles.filter(
    (p) =>
      (p.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        p.username?.toLowerCase().includes(userSearch.toLowerCase())) &&
      userSearch.length > 0
  );

  const selectProfile = (p: Profile) => {
    setForm({ ...form, player_name: p.display_name || p.username || "" });
    setUserSearch(p.display_name || p.username || "");
    setSelectedUserId(p.id);
    setShowUserDropdown(false);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setUserSearch("");
    setSelectedUserId(null);
    setEditingId(null);
  };

  const editEntry = (entry: LeaderboardEntry) => {
    setForm({
      rank: String(entry.rank),
      player_name: entry.player_name,
      tier: entry.tier,
      squadron_name: entry.squadron_name ?? "",
      battle_rating: entry.battle_rating,
      score: String(entry.score),
      wins: String(entry.wins),
      losses: String(entry.losses),
    });
    setUserSearch(entry.player_name);
    setSelectedUserId(entry.user_id);
    setEditingId(entry.id);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      rank: parseInt(form.rank) || 0,
      player_name: form.player_name,
      tier: form.tier,
      squadron_name: form.squadron_name || null,
      battle_rating: form.battle_rating,
      score: parseInt(form.score) || 0,
      wins: parseInt(form.wins) || 0,
      losses: parseInt(form.losses) || 0,
      user_id: selectedUserId,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("leaderboard_entries")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("leaderboard_entries")
        .insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Entry updated" : "Entry created");
      resetForm();
      await fetchEntries();
    }
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from("leaderboard_entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Entry deleted");
      await fetchEntries();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Leaderboard Management</h2>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Edit Entry" : "Add Entry"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Rank</Label>
            <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="1" />
          </div>
          <div className="space-y-1 relative">
            <Label>Player Name</Label>
            <div className="relative">
              <Input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); setForm({ ...form, player_name: e.target.value }); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search user..."
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {showUserDropdown && filteredProfiles.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredProfiles.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProfile(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  >
                    {p.display_name || p.username}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v: string | null) => v && setForm({ ...form, tier: v as "low" | "mid" | "high" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">HIGH</SelectItem>
                <SelectItem value="mid">MID</SelectItem>
                <SelectItem value="low">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Squadron</Label>
            <Input value={form.squadron_name} onChange={(e) => setForm({ ...form, squadron_name: e.target.value })} placeholder="SkyKnights" />
          </div>
          <div className="space-y-1">
            <Label>Battle Rating</Label>
            <Input value={form.battle_rating} onChange={(e) => setForm({ ...form, battle_rating: e.target.value })} placeholder="Top Tier" />
          </div>
          <div className="space-y-1">
            <Label>Score</Label>
            <Input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="9850" />
          </div>
          <div className="space-y-1">
            <Label>Wins</Label>
            <Input value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label>Losses</Label>
            <Input value={form.losses} onChange={(e) => setForm({ ...form, losses: e.target.value })} placeholder="0" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update" : "Create"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="w-16 text-center">Tier</TableHead>
              <TableHead className="hidden sm:table-cell">Squadron</TableHead>
              <TableHead className="hidden md:table-cell">BR</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right w-20">W</TableHead>
              <TableHead className="text-right w-20">L</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-center">{entry.rank}</TableCell>
                <TableCell className="font-medium">{entry.player_name}</TableCell>
                <TableCell className="text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    entry.tier === "high" ? "bg-amber-500/20 text-amber-500" :
                    entry.tier === "mid" ? "bg-blue-500/20 text-blue-500" :
                    "bg-gray-500/20 text-gray-500"
                  }`}>
                    {entry.tier.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {entry.squadron_name ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {entry.battle_rating}
                </TableCell>
                <TableCell className="text-right">{entry.score.toLocaleString()}</TableCell>
                <TableCell className="text-right">{entry.wins}</TableCell>
                <TableCell className="text-right">{entry.losses}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => editEntry(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No entries yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
