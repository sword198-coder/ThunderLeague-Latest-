"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function AnnouncementModal() {
  const { user } = useAuth();
  const supabase = createClient();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [userAnnouncementId, setUserAnnouncementId] = useState<string | null>(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [choiceResponse, setChoiceResponse] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const checkingRef = useRef(false);

  const checkAnnouncement = async () => {
    if (!user || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const { data: anns } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!anns || anns.length === 0) return;

      const latest = anns[0] as Announcement;
      if (announcement?.id === latest.id) return;

      const { data: existing } = await supabase
        .from("user_announcements")
        .select("id, acknowledged")
        .eq("announcement_id", latest.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.acknowledged) return;

      let uaId = existing?.id;
      if (!uaId) {
        const { data: insertData } = await supabase
          .from("user_announcements")
          .insert({ announcement_id: latest.id, user_id: user.id })
          .select("id")
          .single();
        if (insertData) uaId = insertData.id;
      }

      setUserAnnouncementId(uaId);
      setAnnouncement(latest);
      setCheckboxChecked(false);
      setChoiceResponse("");
      setTextResponse("");
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) { setAnnouncement(null); return; }
    checkAnnouncement();

    const channel = supabase
      .channel("announcements-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => { checkAnnouncement(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAcknowledge = async () => {
    if (!announcement || !userAnnouncementId) return;
    if (announcement.type === "checkbox" && !checkboxChecked) return;
    if ((announcement.type === "choices" || announcement.type === "choices+text") && !choiceResponse) return;
    setSaving(true);
    const updates: Record<string, unknown> = { acknowledged: true };
    if (checkboxChecked) updates.checkbox_checked = true;
    if (choiceResponse) updates.choice_response = choiceResponse;
    if (textResponse) updates.text_response = textResponse;
    await supabase.from("user_announcements").update(updates).eq("id", userAnnouncementId);
    setSaving(false);
    setAnnouncement(null);
  };

  if (!announcement) return null;

  return (
    <Dialog open={!!announcement} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription className="text-sm whitespace-pre-wrap">
            {announcement.content}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {announcement.type === "checkbox" && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={checkboxChecked} onChange={(e) => setCheckboxChecked(e.target.checked)} className="mt-1" />
              <span className="text-sm">I have read and understood</span>
            </label>
          )}

          {(announcement.type === "choices" || announcement.type === "choices+text") && (
            <div className="space-y-2">
              {announcement.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setChoiceResponse(opt)}
                  className={`w-full text-left p-2 rounded border text-sm transition-colors ${choiceResponse === opt ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(announcement.type === "text" || announcement.type === "choices+text") && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Your response (optional)</label>
              <Textarea
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Write your answer..."
                rows={3}
              />
            </div>
          )}
        </div>

        <Button onClick={handleAcknowledge} disabled={saving || (announcement.type === "checkbox" && !checkboxChecked) || ((announcement.type === "choices" || announcement.type === "choices+text") && !choiceResponse)} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
