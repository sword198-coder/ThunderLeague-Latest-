"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  squadron_name: string;
  battle_rating: string;
  score: string;
  wins: string;
  losses: string;
};

const emptyForm: FormState = {
  rank: "",
  player_name: "",
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
  const supabase = createClient();

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .order("rank", { ascending: true });
    if (data) setEntries(data);
  }, [supabase]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const editEntry = (entry: LeaderboardEntry) => {
    setForm({
      rank: String(entry.rank),
      player_name: entry.player_name,
      squadron_name: entry.squadron_name ?? "",
      battle_rating: entry.battle_rating,
      score: String(entry.score),
      wins: String(entry.wins),
      losses: String(entry.losses),
    });
    setEditingId(entry.id);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      rank: parseInt(form.rank) || 0,
      player_name: form.player_name,
      squadron_name: form.squadron_name || null,
      battle_rating: form.battle_rating,
      score: parseInt(form.score) || 0,
      wins: parseInt(form.wins) || 0,
      losses: parseInt(form.losses) || 0,
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
          <div className="space-y-1">
            <Label>Player Name</Label>
            <Input value={form.player_name} onChange={(e) => setForm({ ...form, player_name: e.target.value })} placeholder="AcePilot" />
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
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
