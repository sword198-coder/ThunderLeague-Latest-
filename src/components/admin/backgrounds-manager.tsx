"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2, Image, Film, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CardBackground } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BackgroundsManager() {
  const [backgrounds, setBackgrounds] = useState<CardBackground[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"gradient" | "image" | "video">("gradient");
  const [price, setPrice] = useState("0");
  const [gradientFrom, setGradientFrom] = useState("#92400e");
  const [gradientVia, setGradientVia] = useState("#d97706");
  const [gradientTo, setGradientTo] = useState("#fbbf24");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchBackgrounds = useCallback(async () => {
    const { data } = await supabase.from("card_backgrounds").select("*").order("created_at", { ascending: true });
    if (data) setBackgrounds(data as CardBackground[]);
  }, [supabase]);

  useEffect(() => {
    fetchBackgrounds();
    const channel = supabase
      .channel("admin-backgrounds")
      .on("postgres_changes", { event: "*", schema: "public", table: "card_backgrounds" }, () => { fetchBackgrounds(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBackgrounds]);

  const handleUpload = async () => {
    if (!file) return null;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `backgrounds/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("card-backgrounds")
      .upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return null; }
    const { data: urlData } = supabase.storage.from("card-backgrounds").getPublicUrl(path);
    setUploading(false);
    return urlData?.publicUrl ?? null;
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    setSaving(true);

    let fileUrl = "";
    if (type === "image" || type === "video") {
      const url = await handleUpload();
      if (!url) { setSaving(false); return; }
      fileUrl = url;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      price: parseInt(price) || 0,
      gradient_from: gradientFrom,
      gradient_via: gradientVia,
      gradient_to: gradientTo,
      file_url: fileUrl,
    };

    const { error } = await supabase.from("card_backgrounds").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Background created!");
    resetForm();
    await fetchBackgrounds();
    setSaving(false);
  };

  const handleDelete = async (bg: CardBackground) => {
    if (bg.file_url) {
      const pathMatch = bg.file_url.match(/\/card-backgrounds\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from("card-backgrounds").remove([pathMatch[1]]);
      }
    }
    const { error } = await supabase.from("card_backgrounds").delete().eq("id", bg.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Background deleted");
    await fetchBackgrounds();
  };

  const resetForm = () => {
    setName("");
    setType("gradient");
    setPrice("0");
    setGradientFrom("#92400e");
    setGradientVia("#d97706");
    setGradientTo("#fbbf24");
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Card Backgrounds Management</h2>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Background
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amber Flame" />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: string | null) => { if (v) setType(v as "gradient" | "image" | "video"); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Price (TP)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" type="number" />
          </div>
          {type === "gradient" && (
            <>
              <div className="space-y-1">
                <Label>From Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                  <Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} placeholder="#92400e" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Via Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={gradientVia} onChange={(e) => setGradientVia(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                  <Input value={gradientVia} onChange={(e) => setGradientVia(e.target.value)} placeholder="#d97706" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>To Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                  <Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} placeholder="#fbbf24" />
                </div>
              </div>
            </>
          )}
          {(type === "image" || type === "video") && (
            <div className="space-y-1">
              <Label>{type === "image" ? "Image" : "Video"} File</Label>
              <Input
                type="file"
                accept={type === "image" ? "image/png,image/jpeg,image/webp,image/gif" : "video/mp4,video/webm,video/quicktime"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleCreate} disabled={saving || uploading}>
            {(saving || uploading) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create
          </Button>
          {type !== "gradient" && (
            <span className="text-xs text-muted-foreground self-center">
              Max 10MB per file
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {backgrounds.map((bg) => (
          <div key={bg.id} className="border rounded-xl overflow-hidden">
            <div className="h-24 relative bg-muted">
              {bg.type === "gradient" ? (
                <div className="w-full h-full" style={{ backgroundImage: `linear-gradient(135deg, ${bg.gradient_from}, ${bg.gradient_via || bg.gradient_from}, ${bg.gradient_to})` }} />
              ) : bg.type === "image" ? (
                <img src={bg.file_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={bg.file_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-semibold truncate flex items-center gap-1">
                {bg.type === "gradient" ? <Palette className="h-3 w-3" /> : bg.type === "image" ? <Image className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                {bg.name}
              </p>
              <p className="text-xs text-muted-foreground">{bg.price} TP</p>
              <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={() => handleDelete(bg)}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
