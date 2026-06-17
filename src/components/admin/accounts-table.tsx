"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Send, Bell } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export function AccountsTable() {
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Profile | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAccounts(data);
        setLoading(false);
      });
  }, []);

  const openNotify = (profile: Profile) => {
    setTarget(profile);
    setNotifTitle("");
    setNotifBody("");
  };

  const sendNotification = async () => {
    if (!target || !notifTitle.trim() || !notifBody.trim()) return;
    setSending(true);

    const { error } = await supabase.from("notifications").insert({
      user_id: target.id,
      title: notifTitle.trim(),
      message: notifBody.trim(),
      type: "info",
      is_global: false,
    });

    setSending(false);

    if (error) {
      toast.error("Failed to send notification");
      return;
    }

    toast.success(`Notification sent to ${target.display_name || target.username}`);
    setTarget(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Accounts ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>WT Username</TableHead>
                <TableHead>Squadron</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-20">Notify</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">@{a.username}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.display_name || "\u2014"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        a.role === "super_admin"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {a.role === "super_admin" ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.war_thunder_username || "\u2014"}</TableCell>
                  <TableCell>{a.squadron_name || "\u2014"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(a.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openNotify(a)} title="Send notification">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Notify {target?.display_name || target?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ntitle">Title</Label>
              <Input id="ntitle" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Notification title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nbody">Message</Label>
              <Textarea id="nbody" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} rows={4} placeholder="Notification message" />
            </div>
            <div className="flex justify-end">
              <Button onClick={sendNotification} disabled={sending || !notifTitle.trim() || !notifBody.trim()}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
