"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Report, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportsPage() {
  const [reports, setReports] = useState<(Report & { reporter_name: string })[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", userIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name || p.username]));

    setReports(data.map((r) => ({ ...r, reporter_name: nameMap.get(r.user_id) || "Unknown" })));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: status as Report["status"] } : r));
    toast.success("Status updated");
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.subject.toLowerCase().includes(search.toLowerCase()) && !r.reporter_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      dismissed: "bg-muted text-muted-foreground",
    };
    return colors[s] ?? "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reports ({reports.length})</h2>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject or reporter..." className="pl-8" />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No reports found</p>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{r.subject}</h4>
                  <Badge variant="outline" className={`text-xs ${statusBadge(r.status)}`}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  by {r.reporter_name} · {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <Select value={r.status} onValueChange={(v) => { if (v) updateStatus(r.id, v); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>
            {r.image_url && (
              <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> View attachment
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
