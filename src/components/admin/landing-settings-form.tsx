"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
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
  news_text: z.string().min(1, "News text is required"),
  youtube_url: z.string().url("Must be a valid URL"),
  discord_url: z.string().url("Must be a valid URL"),
  tiktok_url: z.string().url("Must be a valid URL"),
});

type FormData = z.infer<typeof schema>;

export function LandingSettingsForm() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s) => (map[s.key] = s.value));
        reset({
          news_text: map.news_text || "",
          youtube_url: map.youtube_url || "",
          discord_url: map.discord_url || "",
          tiktok_url: map.tiktok_url || "",
        });
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("admin-landing-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const onSubmit = async (data: FormData) => {
    const updates = [
      { key: "news_text", value: data.news_text },
      { key: "youtube_url", value: data.youtube_url },
      { key: "discord_url", value: data.discord_url },
      { key: "tiktok_url", value: data.tiktok_url },
    ];

    const { error } = await supabase.from("site_settings").upsert(
      updates.map((u) => ({ key: u.key, value: u.value })),
      { onConflict: "key" }
    );

    if (error) {
      toast.error("Failed to save settings");
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
    <Card>
      <CardHeader>
        <CardTitle>Landing Page Settings</CardTitle>
        <CardDescription>
          Update the content shown on the public landing page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="news_text">News Bar Text</Label>
            <Textarea id="news_text" {...register("news_text")} rows={2} />
            {errors.news_text && (
              <p className="text-sm text-destructive">{errors.news_text.message}</p>
            )}
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
