"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Search, Ban, AlertTriangle, Shield, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserBan, UserWarning } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserWithMeta = Profile & { bans: UserBan[]; warnings: UserWarning[] };

const DURATIONS = [
  { label: "1 Hour", value: "1h" },
  { label: "6 Hours", value: "6h" },
  { label: "12 Hours", value: "12h" },
  { label: "24 Hours", value: "24h" },
  { label: "3 Days", value: "3d" },
  { label: "7 Days", value: "7d" },
  { label: "14 Days", value: "14d" },
  { label: "30 Days", value: "30d" },
  { label: "Permanent", value: "permanent" },
];

function parseDuration(value: string): { text: string; expiresAt: Date } {
  const now = new Date();
  switch (value) {
    case "1h": return { text: "1 hour", expiresAt: new Date(now.getTime() + 3600000) };
    case "6h": return { text: "6 hours", expiresAt: new Date(now.getTime() + 6 * 3600000) };
    case "12h": return { text: "12 hours", expiresAt: new Date(now.getTime() + 12 * 3600000) };
    case "24h": return { text: "24 hours", expiresAt: new Date(now.getTime() + 24 * 3600000) };
    case "3d": return { text: "3 days", expiresAt: new Date(now.getTime() + 3 * 86400000) };
    case "7d": return { text: "7 days", expiresAt: new Date(now.getTime() + 7 * 86400000) };
    case "14d": return { text: "14 days", expiresAt: new Date(now.getTime() + 14 * 86400000) };
    case "30d": return { text: "30 days", expiresAt: new Date(now.getTime() + 30 * 86400000) };
    case "permanent": return { text: "Permanent", expiresAt: new Date("2099-12-31") };
    default: return { text: "1 day", expiresAt: new Date(now.getTime() + 86400000) };
  }
}

export default function BansPage() {
  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("7d");
  const [banning, setBanning] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [warning, setWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<"bans" | "warnings">("bans");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, role")
      .order("created_at", { ascending: false });

    if (!profiles) return;

    const allUserIds = profiles.map((p) => p.id);

    const [banRes, warnRes] = await Promise.all([
      supabase.from("user_bans").select("*").in("user_id", allUserIds).order("created_at", { ascending: false }),
      supabase.from("user_warnings").select("*").in("user_id", allUserIds).order("created_at", { ascending: false }),
    ]);

    const bansByUser = new Map<string, UserBan[]>();
    (banRes.data ?? []).forEach((b) => {
      if (!bansByUser.has(b.user_id)) bansByUser.set(b.user_id, []);
      bansByUser.get(b.user_id)!.push(b);
    });

    const warnsByUser = new Map<string, UserWarning[]>();
    (warnRes.data ?? []).forEach((w) => {
      if (!warnsByUser.has(w.user_id)) warnsByUser.set(w.user_id, []);
      warnsByUser.get(w.user_id)!.push(w);
    });

    setUsers(profiles.map((p) => ({
      ...(p as unknown as Profile),
      bans: bansByUser.get(p.id) ?? [],
      warnings: warnsByUser.get(p.id) ?? [],
    })));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const getActiveBan = (u: UserWithMeta) => u.bans.find((b) => new Date(b.expires_at) > new Date());

  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) { toast.error("Enter a reason"); return; }
    setBanning(true);
    const { text, expiresAt } = parseDuration(banDuration);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_bans").insert({
      user_id: selectedUser.id,
      reason: banReason.trim(),
      duration_text: text,
      expires_at: expiresAt.toISOString(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); setBanning(false); return; }
    toast.success(`Banned ${selectedUser.display_name || selectedUser.username} for ${text}`);
    setBanReason(""); setSelectedUser(null); setSearch("");
    await load();
    setBanning(false);
  };

  const handleWarn = async () => {
    if (!selectedUser || !warnReason.trim()) { toast.error("Enter a reason"); return; }
    setWarning(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_warnings").insert({
      user_id: selectedUser.id,
      reason: warnReason.trim(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); setWarning(false); return; }
    toast.success(`Warning issued to ${selectedUser.display_name || selectedUser.username}`);
    setWarnReason("");
    await load();
    setWarning(false);
  };

  const unban = async (banId: string) => {
    const { error } = await supabase.from("user_bans").delete().eq("id", banId);
    if (error) { toast.error(error.message); return; }
    toast.success("User unbanned");
    await load();
  };

  const deleteWarning = async (warnId: string) => {
    const { error } = await supabase.from("user_warnings").delete().eq("id", warnId);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const filtered = users.filter((u) =>
    (u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.username?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Bans &amp; Warnings</h2>
        <div className="flex gap-2">
          <Button variant={activeTab === "bans" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("bans")}>
            <Ban className="h-4 w-4 mr-1" /> Bans
          </Button>
          <Button variant={activeTab === "warnings" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("warnings")}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Warnings
          </Button>
        </div>
      </div>

      <div className="relative">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-8" />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(o) => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser?.display_name || selectedUser?.username}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {activeTab === "bans" && (
                <>
                  <div className="space-y-1">
                    <Label>Reason</Label>
                    <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Why is this user being banned?" rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>Duration</Label>
                    <Select value={banDuration} onValueChange={(v) => setBanDuration(v || "7d")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleBan} disabled={banning || !banReason.trim()} className="w-full">
                    {banning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Ban className="h-4 w-4 mr-1" /> Ban User
                  </Button>
                  {getActiveBan(selectedUser) && (
                    <p className="text-xs text-destructive text-center">This user already has an active ban</p>
                  )}
                </>
              )}
              {activeTab === "warnings" && (
                <>
                  <div className="space-y-1">
                    <Label>Warning Reason</Label>
                    <Textarea value={warnReason} onChange={(e) => setWarnReason(e.target.value)} placeholder="Describe the violation..." rows={2} />
                  </div>
                  <Button onClick={handleWarn} disabled={warning || !warnReason.trim()} className="w-full">
                    {warning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <AlertTriangle className="h-4 w-4 mr-1" /> Issue Warning
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        )}
        {filtered.map((u) => {
          const activeBan = getActiveBan(u);
          return (
            <div key={u.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                  {(u.display_name || u.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {activeBan && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                      Banned ({activeBan.duration_text})
                    </Badge>
                  )}
                  {u.warnings.length > 0 && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                      {u.warnings.length} warning{u.warnings.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 ml-2 shrink-0" onClick={() => { setSelectedUser(u); setBanReason(""); setWarnReason(""); }}>
                <Shield className="h-3 w-3 mr-1" /> Manage
              </Button>
            </div>
          );
        })}
      </div>

      {activeTab === "bans" && users.some((u) => getActiveBan(u)) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Ban className="h-4 w-4" /> Active Bans
          </h3>
          <div className="space-y-2">
            {users.filter((u) => getActiveBan(u)).map((u) => {
              const b = getActiveBan(u)!;
              return (
                <div key={b.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">{b.reason} · {b.duration_text} · expires {format(new Date(b.expires_at), "MMM d")}</p>
                  </div>
                  <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => unban(b.id)}>
                    <UserMinus className="h-3 w-3 mr-1" /> Unban
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "warnings" && users.some((u) => u.warnings.length > 0) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" /> Recent Warnings
          </h3>
          <div className="space-y-2">
            {users.filter((u) => u.warnings.length > 0).flatMap((u) =>
              u.warnings.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">{w.reason} · {format(new Date(w.created_at), "MMM d, HH:mm")}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteWarning(w.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
