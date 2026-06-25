"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) { toast.error("Enter subject and description"); return; }
    if (!user) return;
    setSending(true);

    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("reports").upload(path, file);
      if (uploadErr) { toast.error("Failed to upload image"); setSending(false); return; }
      const { data: urlData } = supabase.storage.from("reports").getPublicUrl(path);
      imageUrl = urlData?.publicUrl ?? null;
    }

    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      subject: subject.trim(),
      description: description.trim(),
      image_url: imageUrl,
    });

    if (error) { toast.error(error.message); setSending(false); return; }
    toast.success("Report submitted");
    setSubject(""); setDescription(""); setFile(null); setPreview(null);
    onOpenChange(false);
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setFile(null); setPreview(null); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a Report</DialogTitle>
          <DialogDescription>Report a player, bug, or any issue you encountered</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Player harassment" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} />
          </div>
          <div className="space-y-1">
            <Label>Attach Image (optional)</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Choose File
              </Button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {file && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{file.name}</span>}
            </div>
            {preview && (
              <div className="relative mt-2 inline-block">
                <img loading="lazy" src={preview} alt="" className="max-h-40 rounded border object-contain" />
                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={sending || !subject.trim() || !description.trim()} className="w-full">
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
