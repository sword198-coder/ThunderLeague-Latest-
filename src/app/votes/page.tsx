"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, BarChart3, Clock, AlertTriangle, PenLine, Plus, Users } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import type { Poll, Vote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function VotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [playerPolls, setPlayerPolls] = useState<{ id: string; title: string; description: string | null; options: string[]; created_at: string }[]>([]);
  const [confirmedVotes, setConfirmedVotes] = useState<Map<string, { option: string; text: string | null }>>(new Map());
  const [pendingSelections, setPendingSelections] = useState<Map<string, string>>(new Map());
  const [pendingTexts, setPendingTexts] = useState<Map<string, string>>(new Map());
  const [voting, setVoting] = useState(false);
  const [confirmPoll, setConfirmPoll] = useState<{ id: string; option: string; text: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestOptions, setRequestOptions] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: pollsData } = await supabase
        .from("polls")
        .select("*")
        .in("status", ["active", "closed"])
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (pollsData) setPolls(pollsData);

      const { data: requestsData } = await supabase
        .from("poll_requests")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (requestsData) {
        setPlayerPolls(requestsData.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: r.title as string,
          description: r.description as string | null,
          options: (r.options as string).split("\n").map((s) => s.trim()).filter(Boolean),
          created_at: r.created_at as string,
        })));
      }

      const { data: votesData } = await supabase
        .from("votes")
        .select("*")
        .eq("user_id", user.id);

      if (votesData) {
        const voteMap = new Map<string, { option: string; text: string | null }>();
        votesData.forEach((v: Vote) => voteMap.set(v.poll_id, { option: v.selected_option, text: v.text_response }));
        setConfirmedVotes(voteMap);
      }

      setLoading(false);
    };

    loadData();

    const debounceTimer = { current: null as NodeJS.Timeout | null };
    const debouncedLoad = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(loadData, 400);
    };

    const channel = supabase
      .channel("votes-polls")
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setPolls((prev) => [...prev, payload.new as Poll]);
        } else if (payload.eventType === "UPDATE") {
          setPolls((prev) => prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new as Poll } : p));
        } else if (payload.eventType === "DELETE") {
          setPolls((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_requests" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new.status === "approved") {
          const r = payload.new as Record<string, unknown>;
          setPlayerPolls((prev) => [...prev, {
            id: r.id as string,
            title: r.title as string,
            description: r.description as string | null,
            options: (r.options as string).split("\n").map((s: string) => s.trim()).filter(Boolean),
            created_at: r.created_at as string,
          }]);
        } else if (payload.eventType === "UPDATE") {
          setPlayerPolls((prev) => prev.filter((p) => p.id !== payload.new.id));
        } else if (payload.eventType === "DELETE") {
          setPlayerPolls((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const selectOption = (pollId: string, option: string) => {
    setPendingTexts((prev) => new Map(prev).set(pollId, ""));
    setPendingSelections((prev) => new Map(prev).set(pollId, option));
  };

  const setTextResponse = (pollId: string, text: string) => {
    setPendingTexts((prev) => new Map(prev).set(pollId, text));
  };

  const openConfirm = (pollId: string) => {
    const option = pendingSelections.get(pollId);
    const text = pendingTexts.get(pollId) || "";
    if (!option && !text) return;
    setConfirmPoll({ id: pollId, option: option || text, text: text || null });
  };

  const confirmVote = async () => {
    if (!confirmPoll) return;
    const { id: pollId, option, text } = confirmPoll;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setVoting(true);

    const { error } = await supabase.from("votes").insert({
      poll_id: pollId,
      user_id: user.id,
      selected_option: option,
      text_response: text,
    });

    setVoting(false);
    setConfirmPoll(null);

    if (error) {
      toast.error("Failed to submit vote");
      return;
    }

    setConfirmedVotes((prev) => new Map(prev).set(pollId, { option, text }));
    setPendingSelections((prev) => {
      const next = new Map(prev);
      next.delete(pollId);
      return next;
    });
    setPendingTexts((prev) => {
      const next = new Map(prev);
      next.delete(pollId);
      return next;
    });
    toast.success("Vote submitted");
  };

  const submitRequest = async () => {
    if (!requestTitle.trim() || !requestOptions.trim()) {
      toast.error("Title and at least one option are required");
      return;
    }
    setSubmittingRequest(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmittingRequest(false); return; }
    const { error } = await supabase.from("poll_requests").insert({
      user_id: user.id,
      title: requestTitle.trim(),
      description: requestDescription.trim() || null,
      options: requestOptions.trim(),
    });
    setSubmittingRequest(false);
    if (error) {
      toast.error("Failed to submit request");
      return;
    }
    toast.success("Poll request submitted! Admins will review it.");
    setShowRequestDialog(false);
    setRequestTitle("");
    setRequestDescription("");
    setRequestOptions("");
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status === "closed");

  return (
    <MaintenanceGuard page="votes">
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Votes</h1>
          <p className="text-muted-foreground mt-1">Cast your vote on community polls</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Request Poll
        </Button>
      </div>

      {activePolls.length === 0 && closedPolls.length === 0 && playerPolls.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No polls available yet</p>
          </CardContent>
        </Card>
      )}

      {playerPolls.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Players Polls</h2>
              <p className="text-sm text-muted-foreground">Community-suggested polls approved by admins</p>
            </div>
          </div>
          <div className="space-y-4">
            {playerPolls.map((rp) => (
              <Card key={rp.id} className="border-green-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-base">{rp.title}</CardTitle>
                  </div>
                  {rp.description && (
                    <CardDescription className="mt-1">{rp.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {rp.options.length > 0 && (
                    <div className="space-y-1.5">
                      {rp.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-xs font-medium text-muted-foreground">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activePolls.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Active Polls</h2>
              <p className="text-sm text-muted-foreground">Cast your vote on active polls</p>
            </div>
          </div>
          <div className="space-y-4">
            {activePolls.map((poll) => {
        const hasVoted = confirmedVotes.has(poll.id);
        const myVote = confirmedVotes.get(poll.id);
        const pendingSelection = pendingSelections.get(poll.id);
        const pendingText = pendingTexts.get(poll.id) ?? "";
        const expired = isPast(new Date(poll.ends_at));

        return (
          <Card key={poll.id} className={hasVoted ? "border-muted" : "border-primary/20"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{poll.title}</CardTitle>
                  {poll.description && (
                    <CardDescription className="mt-1">{poll.description}</CardDescription>
                  )}
                </div>
                {hasVoted ? (
                  <Badge variant="outline" className="shrink-0 bg-muted text-muted-foreground">
                    Voted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {expired ? "Ended" : `Ends ${format(new Date(poll.ends_at), "MMM d, HH:mm")}`}
                </span>
                <span>{poll.options.length} options</span>
              </div>
            </CardHeader>

            {hasVoted ? (
              <CardContent>
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{myVote?.option}</span>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Check className="h-3.5 w-3.5" />
                      Your vote
                    </span>
                  </div>
                  {myVote?.text && (
                    <p className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
                      &ldquo;{myVote.text}&rdquo;
                    </p>
                  )}
                </div>
              </CardContent>
            ) : (
              <CardContent className="space-y-3">
                {poll.options.map((option) => {
                  const selected = pendingSelection === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectOption(poll.id, option)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all cursor-pointer",
                        selected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium">{option}</span>
                    </button>
                  );
                })}
                {poll.allow_text_response && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <PenLine className="h-3 w-3" />
                      Or write your own response
                    </label>
                    <Textarea
                      placeholder="Type your custom response..."
                      value={pendingText}
                      onChange={(e) => setTextResponse(poll.id, e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
                {(pendingSelection || pendingText) && (
                  <Button
                    className="w-full mt-2"
                    onClick={() => openConfirm(poll.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Vote
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
          </div>
        </div>
      )}

      {closedPolls.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Past Polls
          </h2>
          <div className="space-y-4">
              {closedPolls.map((poll) => {
              const myVote = confirmedVotes.get(poll.id);
              return (
                <Card key={poll.id} className="opacity-70">
                  <CardHeader>
                    <CardTitle className="text-lg">{poll.title}</CardTitle>
                    {poll.description && <CardDescription>{poll.description}</CardDescription>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Closed
                      </Badge>
                      <span>Ended {format(new Date(poll.ends_at), "MMM d, yyyy")}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {poll.options.map((option) => (
                        <div
                          key={option}
                          className={cn(
                            "p-2 rounded text-sm",
                            myVote?.option === option && "bg-primary/5 border border-primary/20"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {option}
                            {myVote?.option === option && (
                              <Badge variant="outline" className="text-xs text-primary border-primary/20">
                                Your vote
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {myVote?.text && (
                        <div className="p-2 rounded text-sm bg-muted/50 border-l-2 border-primary/30">
                          <div className="flex items-center gap-2">
                            <PenLine className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">&ldquo;{myVote.text}&rdquo;</span>
                            <Badge variant="outline" className="text-xs text-primary border-primary/20">
                              Your response
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Request a Poll
            </DialogTitle>
            <DialogDescription>
              Submit your poll idea for admin approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="req-title">Title *</Label>
              <Input id="req-title" value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} placeholder="What is your poll about?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-desc">Description (optional)</Label>
              <Textarea id="req-desc" value={requestDescription} onChange={(e) => setRequestDescription(e.target.value)} rows={2} placeholder="Explain your poll idea..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-options">Options * <span className="text-xs text-muted-foreground">(one per line)</span></Label>
              <Textarea id="req-options" value={requestOptions} onChange={(e) => setRequestOptions(e.target.value)} rows={4} placeholder="Option A&#10;Option B&#10;Option C" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submittingRequest}>
              {submittingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmPoll} onOpenChange={(open) => { if (!open) setConfirmPoll(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Your Vote
            </DialogTitle>
            <DialogDescription>
              You are about to vote for: <strong>{confirmPoll?.option}</strong>
              {confirmPoll?.text && confirmPoll.text !== confirmPoll.option && (
                <>
                  <br />
                  With note: <strong>&ldquo;{confirmPoll.text}&rdquo;</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Once confirmed, your vote <strong>cannot</strong> be changed later.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmPoll(null)}>
              Cancel
            </Button>
            <Button onClick={confirmVote} disabled={voting}>
              {voting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MaintenanceGuard>
  );
}
