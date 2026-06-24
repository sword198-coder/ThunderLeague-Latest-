"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Upload, Trash2, Plus, Image } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

const schema = z.object({
  youtube_url: z.string().url("Must be a valid URL"),
  discord_url: z.string().url("Must be a valid URL"),
  tiktok_url: z.string().url("Must be a valid URL"),
  news_interval: z.string().min(1, "Required"),
  hero_interval: z.string().min(1, "Required"),
  about_text: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

export function LandingSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [newsItems, setNewsItems] = useState<string[]>([]);
  const [adCode, setAdCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newNewsItem, setNewNewsItem] = useState("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadSettings = async () => {
    const { data } = await supabase.from("site_settings").select("key, value");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      reset({
        youtube_url: map.youtube_url || "",
        discord_url: map.discord_url || "",
        tiktok_url: map.tiktok_url || "",
        news_interval: map.news_interval || "5",
        hero_interval: map.hero_interval || "5",
        about_text: map.about_text || "",
      });
      if (map.hero_images) {
        try { setHeroImages(JSON.parse(map.hero_images)); } catch { setHeroImages([]); }
      }
      if (map.news_items) {
        try { setNewsItems(JSON.parse(map.news_items)); } catch { setNewsItems([]); }
      }
      setAdCode(map.ad_code || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
    const channel = supabase
      .channel("admin-landing-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => { loadSettings(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `hero/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("hero-images").upload(path, file, { upsert: true });
    if (uploadError) {
      if (uploadError.message?.includes("bucket") || uploadError.message?.includes("not found")) {
        toast.error("Storage bucket 'hero-images' does not exist. Create it in Supabase Storage dashboard.");
      } else {
        toast.error(`Upload failed: ${uploadError.message}`);
      }
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(path);
    if (urlData?.publicUrl) {
      setHeroImages((prev) => [...prev, urlData.publicUrl]);
      toast.success("Image added");
    }
    setUploading(false);
  };

  const removeHeroImage = (index: number) => {
    setHeroImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addNewsItem = () => {
    if (!newNewsItem.trim()) return;
    setNewsItems((prev) => [...prev, newNewsItem.trim()]);
    setNewNewsItem("");
  };

  const removeNewsItem = (index: number) => {
    setNewsItems((prev) => prev.filter((_, i) => i !== index));
  };

  const upsertSetting = (key: string, value: string) =>
    supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" });

  const onSubmit = async (data: FormData) => {
    const updates = await Promise.all([
      upsertSetting("youtube_url", data.youtube_url),
      upsertSetting("discord_url", data.discord_url),
      upsertSetting("tiktok_url", data.tiktok_url),
      upsertSetting("news_interval", data.news_interval),
      upsertSetting("hero_interval", data.hero_interval),
      upsertSetting("about_text", data.about_text),
      upsertSetting("hero_images", JSON.stringify(heroImages)),
      upsertSetting("news_items", JSON.stringify(newsItems)),
      upsertSetting("ad_code", adCode),
    ]);

    const hasError = updates.some((r) => r.error);
    if (hasError) {
      toast.error("Failed to save some settings");
      return;
    }
    toast.success("Landing page settings updated!");
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Landing Page Settings</CardTitle>
          <CardDescription>
            Update the content shown on the public landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Hero Images */}
            <div className="space-y-3">
              <Label>Hero Images (Slider)</Label>
              <div className="flex flex-wrap gap-3">
                {heroImages.map((img, i) => (
                  <div key={i} className="relative w-32 h-20 rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeHeroImage(i)}
                      className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full hover:bg-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Label className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleHeroUpload} className="hidden" disabled={uploading} />
                </Label>
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <div className="space-y-1">
                <Label htmlFor="hero_interval">Slide Interval (seconds)</Label>
                <Input id="hero_interval" type="number" min="1" {...register("hero_interval")} className="w-32" />
                {errors.hero_interval && <p className="text-sm text-destructive">{errors.hero_interval.message}</p>}
              </div>
            </div>

            {/* News Items */}
            <div className="space-y-3">
              <Label>News Items</Label>
              <div className="space-y-2">
                {newsItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{i + 1}.</span>
                    <span className="text-sm flex-1 truncate">{item}</span>
                    <button type="button" onClick={() => removeNewsItem(i)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newNewsItem} onChange={(e) => setNewNewsItem(e.target.value)} placeholder="Add news item..." />
                <Button type="button" variant="outline" onClick={addNewsItem}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="news_interval">News Cycle Interval (seconds)</Label>
                <Input id="news_interval" type="number" min="1" {...register("news_interval")} className="w-32" />
                {errors.news_interval && <p className="text-sm text-destructive">{errors.news_interval.message}</p>}
              </div>
            </div>

            {/* Social URLs */}
            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube Channel URL</Label>
              <Input id="youtube_url" {...register("youtube_url")} />
              {errors.youtube_url && <p className="text-sm text-destructive">{errors.youtube_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord_url">Discord Server URL</Label>
              <Input id="discord_url" {...register("discord_url")} />
              {errors.discord_url && <p className="text-sm text-destructive">{errors.discord_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_url">TikTok Channel URL</Label>
              <Input id="tiktok_url" {...register("tiktok_url")} />
              {errors.tiktok_url && <p className="text-sm text-destructive">{errors.tiktok_url.message}</p>}
            </div>

            {/* Ad Code */}
            <div className="space-y-2">
              <Label htmlFor="ad_code">Ad Code (HTML)</Label>
              <Textarea id="ad_code" value={adCode} onChange={(e) => setAdCode(e.target.value)} rows={3} placeholder="Paste ad script or HTML here..." />
            </div>

            {/* About Text */}
            <div className="space-y-2">
              <Label htmlFor="about_text">About Section Text</Label>
              <Textarea id="about_text" {...register("about_text")} rows={4} />
              {errors.about_text && <p className="text-sm text-destructive">{errors.about_text.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
