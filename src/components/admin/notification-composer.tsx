"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, History, Pencil, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const schema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export function NotificationComposer() {
  const [history, setHistory] = useState<Notification[]>([]);
  const [editing, setEditing] = useState<Notification | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadHistory = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_global", true)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data);
  };

  useEffect(() => {
    loadHistory();
    const channel = supabase
      .channel("admin-notifications-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { loadHistory(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const startEdit = (n: Notification) => {
    setEditing(n);
    setValue("title", n.title);
    setValue("body", n.message);
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      const { error } = await supabase
        .from("notifications")
        .update({ title: data.title, message: data.body })
        .eq("id", editing.id);

      if (error) {
        toast.error("Failed to update notification");
        return;
      }
      toast.success("Notification updated");
      cancelEdit();
    } else {
      const { error } = await supabase.from("notifications").insert({
        title: data.title,
        message: data.body,
        is_global: true,
        created_by: user.id,
        type: "info",
      });

      if (error) {
        toast.error("Failed to send notification");
        return;
      }
      toast.success("Notification sent to all users!");
      reset();
    }

    loadHistory();
  };

  const handleDelete = async (n: Notification) => {
    const esc = (s: string) => s.replace(/"/g, '""');
    const filter = `id.eq.${n.id},and(title.eq."${esc(n.title)}",message.eq."${esc(n.message)}")`;

    const { data: related } = await supabase
      .from("notifications")
      .select("id")
      .or(filter);

    if (related && related.length > 0) {
      const ids = related.map((r) => r.id);
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) {
        toast.error("Failed to delete notification");
        return;
      }
    }

    toast.success("Notification deleted");
    loadHistory();
  };

  const handleResend = async (n: Notification) => {
    const { error } = await supabase.from("notifications").insert({
      title: n.title,
      message: n.message,
      is_global: true,
      type: n.type,
    });
    if (error) {
      toast.error("Failed to resend notification");
      return;
    }
    toast.success("Notification resent");
    loadHistory();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Notification" : "Send Notification"}</CardTitle>
          <CardDescription>
            {editing
              ? "Update this notification"
              : "Send a notification to all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" {...register("body")} rows={4} />
              {errors.body && (
                <p className="text-sm text-destructive">{errors.body.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                {editing ? "Update" : "Send to All Users"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No notifications sent yet
                  </TableCell>
                </TableRow>
              ) : (
                history.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(n.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(n)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleResend(n)} title="Resend">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(n)} title="Delete">
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
    </div>
  );
}
