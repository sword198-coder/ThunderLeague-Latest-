"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil, Trash2, Users, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Poll, Vote } from "@/lib/types";
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

const pollSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  optionsText: z.string().min(1, "At least one option is required"),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  status: z.enum(["draft", "active", "closed"]),
  allow_text_response: z.boolean().optional(),
});

type PollForm = z.infer<typeof pollSchema>;

type VoterInfo = {
  username: string;
  display_name: string | null;
  selected_option: string;
  text_response: string | null;
};

export function PollManager() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pollRequests, setPollRequests] = useState<{ id: string; user_id: string; title: string; description: string | null; options: string; status: string; created_at: string; username: string }[]>([]);
  const [votersDialog, setVotersDialog] = useState<{
    pollTitle: string;
    voters: VoterInfo[];
  } | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PollForm>({
    resolver: zodResolver(pollSchema),
    defaultValues: { status: "draft" },
  });

  const loadPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPolls(data);
  };

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("poll_requests")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load poll requests", error);
      return;
    }
    if (data) {
      setPollRequests(data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        title: r.title as string,
        description: r.description as string | null,
        options: r.options as string,
        status: r.status as string,
        created_at: r.created_at as string,
        username: ((r.profiles as Record<string, unknown> | null)?.username as string) ?? "Unknown",
      })));
    }
  };

  useEffect(() => {
    loadPolls();
    loadRequests();
    const channel = supabase
      .channel("admin-polls")
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => { loadPolls(); })
      .subscribe();
    const reqChannel = supabase
      .channel("admin-poll-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_requests" }, () => { loadRequests(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(reqChannel); };
  }, []);

  const approveRequest = async (id: string) => {
    await supabase.from("poll_requests").update({ status: "approved" }).eq("id", id);
    toast.success("Request approved. You can now create the poll.");
    loadRequests();
  };

  const rejectRequest = async (id: string) => {
    await supabase.from("poll_requests").update({ status: "rejected" }).eq("id", id);
    toast.success("Request rejected");
    loadRequests();
  };

  const startCreate = () => {
    setEditing(null);
    reset({ status: "draft", optionsText: "" });
    setShowForm(true);
  };

  const startEdit = (p: Poll) => {
    setEditing(p);
    setValue("title", p.title);
    setValue("description", p.description ?? "");
    setValue("optionsText", p.options.join("\n"));
    setValue("starts_at", p.starts_at.slice(0, 16));
    setValue("ends_at", p.ends_at.slice(0, 16));
    setValue("status", p.status);
    setValue("allow_text_response", p.allow_text_response);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    reset();
  };

  const onSubmit = async (data: PollForm) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const options = data.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: data.title,
      description: data.description || null,
      options,
      allow_text_response: data.allow_text_response ?? false,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: new Date(data.ends_at).toISOString(),
      status: data.status,
    };

    if (editing) {
      const { error } = await supabase
        .from("polls")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast.error("Failed to update poll");
        return;
      }
      toast.success("Poll updated");
    } else {
      const { error } = await supabase.from("polls").insert({
        ...payload,
        created_by: user.id,
      });
      if (error) {
        toast.error("Failed to create poll");
        return;
      }
      toast.success("Poll created");
    }

    cancelForm();
    loadPolls();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete poll");
      return;
    }
    toast.success("Poll deleted");
    loadPolls();
  };

  const toggleHidden = async (poll: Poll) => {
    const { error } = await supabase
      .from("polls")
      .update({ hidden: !poll.hidden })
      .eq("id", poll.id);
    if (error) {
      toast.error("Failed to update poll visibility");
      return;
    }
    toast.success(poll.hidden ? "Poll is now visible" : "Poll is now hidden");
    loadPolls();
  };

  const viewVoters = async (poll: Poll) => {
    const { data } = await supabase
      .from("votes")
      .select("selected_option, text_response, user_id")
      .eq("poll_id", poll.id);

    if (!data || data.length === 0) {
      toast.info("No votes yet");
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", data.map((v) => v.user_id));

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    const voters: VoterInfo[] = data.map((v) => {
      const p = profileMap.get(v.user_id);
      return {
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? null,
        selected_option: v.selected_option,
        text_response: v.text_response,
      };
    });

    setVotersDialog({ pollTitle: poll.title, voters });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      closed: "bg-muted text-muted-foreground",
    };
    return colors[status] ?? "";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Polls</h2>
        {!showForm && (
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Poll
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Poll" : "Create Poll"}</CardTitle>
            <CardDescription>
              {editing ? "Update the poll details" : "Create a new poll for users to vote on"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" {...register("description")} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optionsText">
                  Options <span className="text-muted-foreground text-xs">(one per line)</span>
                </Label>
                <Textarea
                  id="optionsText"
                  {...register("optionsText")}
                  rows={4}
                  placeholder="Option A\nOption B\nOption C"
                />
                {errors.optionsText && <p className="text-sm text-destructive">{errors.optionsText.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Date</Label>
                  <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
                  {errors.starts_at && <p className="text-sm text-destructive">{errors.starts_at.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">End Date</Label>
                  <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
                  {errors.ends_at && <p className="text-sm text-destructive">{errors.ends_at.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  {...register("status")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("allow_text_response")}
                  className="h-4 w-4 rounded border border-input accent-primary"
                />
                <span className="text-sm">Allow users to write a custom response</span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update Poll" : "Create Poll"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {pollRequests.filter(r => r.status === "pending").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Pending Poll Requests
            </CardTitle>
            <CardDescription>Users have requested to create these polls</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pollRequests.filter(r => r.status === "pending").map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">@{req.username}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{req.title}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">
                      {req.description || "—"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {req.options.split("\n").filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(req.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => approveRequest(req.id)} className="text-green-500 hover:text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => rejectRequest(req.id)} className="text-destructive hover:text-destructive/80">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No polls yet
                  </TableCell>
                </TableRow>
              ) : (
                polls.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
                    <TableCell>{p.options.length} options</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(p.status)}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.hidden ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          Hidden
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Visible
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(p.starts_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(p.ends_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewVoters(p)} title="View voters">
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleHidden(p)} title={p.hidden ? "Show in Votes" : "Hide from Votes"}>
                          {p.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Delete">
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

      <Dialog
        open={!!votersDialog}
        onOpenChange={(open) => { if (!open) setVotersDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Voters &mdash; {votersDialog?.pollTitle}
            </DialogTitle>
          </DialogHeader>
          {votersDialog && votersDialog.voters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No votes yet</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {votersDialog?.voters.map((v, i) => (
                <div key={i} className="p-2 rounded bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {v.display_name || v.username}
                      <span className="text-muted-foreground font-normal ml-1">@{v.username}</span>
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {v.selected_option}
                    </Badge>
                  </div>
                  {v.text_response && (
                    <p className="text-xs text-muted-foreground pl-1 border-l-2 border-primary/30 ml-1">
                      &ldquo;{v.text_response}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
