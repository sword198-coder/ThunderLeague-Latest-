"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Link, Check, X, RefreshCw, Zap, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ReferralLink, ReferralSignup, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export function ReferralManager() {
  const [referrers, setReferrers] = useState<(ReferralLink & { username?: string })[]>([]);
  const [signups, setSignups] = useState<(ReferralSignup & { referred_username?: string })[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const [linksRes, signupsRes, profilesRes] = await Promise.all([
      supabase.from("referral_links").select("*"),
      supabase.from("referral_signups").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username"),
    ]);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      profilesRes.data.forEach((p: any) => { map[p.id] = p.username; });
      setProfiles(map);
    }
    if (linksRes.data) {
      setReferrers(linksRes.data.map((l: any) => ({ ...l, username: profilesRes.data?.find((p: any) => p.id === l.user_id)?.username })));
    }
    if (signupsRes.data) {
      setSignups(signupsRes.data.map((s: any) => ({
        ...s,
        referred_username: profilesRes.data?.find((p: any) => p.id === s.referred_user_id)?.username,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-referrals")
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_links" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_signups" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const toggleVerify = async (id: string, verified: boolean) => {
    const { error } = await supabase.from("referral_signups").update({ verified }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(verified ? "Verified" : "Unverified");
    load();
  };

  const filteredReferrers = referrers.filter((r) =>
    (r.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const referrerSignups = selectedReferrer
    ? signups.filter((s) => s.referral_link_id === selectedReferrer)
    : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Link className="h-6 w-6" />
          Referral System
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referrers ({referrers.length})</CardTitle>
          <CardDescription>Users who requested a referral link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search referrer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
            {filteredReferrers.map((r) => {
              const count = signups.filter((s) => s.referral_link_id === r.id).length;
              const verified = signups.filter((s) => s.referral_link_id === r.id && s.verified).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between ${selectedReferrer === r.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedReferrer(selectedReferrer === r.id ? null : r.id)}
                >
                  <div>
                    <p className="font-medium">@{r.username || r.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count} signups</Badge>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">{verified} verified</Badge>
                  </div>
                </button>
              );
            })}
            {filteredReferrers.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No referrers found</p>}
          </div>
        </CardContent>
      </Card>

      {selectedReferrer && (
        <Card>
          <CardHeader>
            <CardTitle>
              Signups for @{referrers.find((r) => r.id === selectedReferrer)?.username || "user"}
            </CardTitle>
            <CardDescription>Users who signed up via this referral link</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrerSignups.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No signups yet</TableCell></TableRow>
                ) : (
                  referrerSignups.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">@{s.referred_username || s.referred_user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {s.verified ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleVerify(s.id, !s.verified)}>
                          {s.verified ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-500" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
