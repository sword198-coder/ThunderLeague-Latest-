"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Zap, Loader2, Search, Plus, Minus, History } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ThunderPointsLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export function ThunderPointsManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ThunderPointsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [profilesRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, thunder_points").order("username"),
        supabase.from("thunder_points_log").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (logsRes.data) setLogs(logsRes.data as ThunderPointsLog[]);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const givePoints = async () => {
    if (!selectedUserId || !amount || !reason.trim()) return;
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    setSaving(true);
    const finalAmount = mode === "add" ? numAmount : -numAmount;

    const { error: logError } = await supabase.from("thunder_points_log").insert({
      user_id: selectedUserId,
      amount: finalAmount,
      reason: reason.trim(),
    });

    if (logError) {
      toast.error("Failed to log transaction");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("thunder_points").eq("id", selectedUserId).single();
    const currentPoints = (profile as any)?.thunder_points ?? 0;
    await supabase.from("profiles").update({ thunder_points: Math.max(0, currentPoints + finalAmount) }).eq("id", selectedUserId);

    setSaving(false);
    toast.success(`${mode === "add" ? "Added" : "Deducted"} ${numAmount} points`);
    setAmount("");
    setReason("");

    const [profilesRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, thunder_points").order("username"),
      supabase.from("thunder_points_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (logsRes.data) setLogs(logsRes.data as ThunderPointsLog[]);
  };

  const filtered = profiles.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase()) ||
    (p.display_name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Give / Deduct Thunder Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search User</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by username..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${selectedUserId === p.id ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedUserId(p.id); setSearch(p.username); }}
                  >
                    <span>@{p.username}</span>
                    <span className="text-amber-500 font-medium flex items-center gap-1"><Zap className="h-3 w-3" />{p.thunder_points}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No users found</p>}
              </div>
            )}
          </div>
          {selectedUserId && (
            <>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as "add" | "deduct")}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add"><span className="flex items-center gap-1"><Plus className="h-4 w-4" /> Give</span></SelectItem>
                    <SelectItem value="deduct"><span className="flex items-center gap-1"><Minus className="h-4 w-4" /> Deduct</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Tournament win reward" />
              </div>
              <Button onClick={givePoints} disabled={saving || !amount || !reason.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Zap className="h-4 w-4 mr-1" />
                {mode === "add" ? "Give Points" : "Deduct Points"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">@{profiles.find((p) => p.id === l.user_id)?.username || l.user_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${l.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                        {l.amount > 0 ? "+" : ""}{l.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), "MMM d, HH:mm")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
