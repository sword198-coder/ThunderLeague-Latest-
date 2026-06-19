"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Megaphone, X } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AnnouncementsManager() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Announcement["type"]>("info");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const addOption = () => {
    if (!newOption.trim()) return;
    setOptions([...options, newOption.trim()]);
    setNewOption("");
  };

  const removeOption = (i: number) => {
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Enter title and content"); return; }
    if ((type === "choices" || type === "choices+text") && options.length < 2) { toast.error("Add at least 2 choices"); return; }
    setSending(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: content.trim(),
      type,
      options: (type === "choices" || type === "choices+text") ? options : [],
    });
    if (error) { toast.error(error.message); setSending(false); return; }
    toast.success("Announcement sent");
    setTitle("");
    setContent("");
    setType("info");
    setOptions([]);
    setSending(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Megaphone className="h-5 w-5" /> Announcements
      </h2>

      <Card>
        <CardHeader><CardTitle className="text-sm">Create Announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Important Update" />
          </div>
          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Write your message..." />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: string | null) => v && setType(v as Announcement["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info (just read)</SelectItem>
                <SelectItem value="checkbox">Checkbox (must agree)</SelectItem>
                <SelectItem value="choices">Multiple Choice</SelectItem>
                <SelectItem value="text">Text Answer</SelectItem>
                <SelectItem value="choices+text">Choices + Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === "choices" || type === "choices+text") && (
            <div className="space-y-2 border rounded p-3">
              <Label>Choices</Label>
              <div className="flex gap-2">
                <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add choice..." />
                <Button size="sm" variant="outline" onClick={addOption} disabled={!newOption.trim()}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                    {opt}
                    <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Send Announcement
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sent Announcements</CardTitle></CardHeader>
        <CardContent>
          {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet</p>}
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between p-3 rounded bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{a.type} — {format(new Date(a.created_at), "MMM d, HH:mm")}</p>
                  {a.options.length > 0 && (
                    <p className="text-xs text-muted-foreground/60">Options: {a.options.join(", ")}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
