"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, Flag, Camera, Globe, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/types";

const WT_NATIONS = [
  { code: "us", label: "USA" },
  { code: "de", label: "Germany" },
  { code: "ru", label: "USSR" },
  { code: "uk", label: "UK" },
  { code: "jp", label: "Japan" },
  { code: "cn", label: "China" },
  { code: "it", label: "Italy" },
  { code: "fr", label: "France" },
  { code: "se", label: "Sweden" },
  
];

const TIERS = [
  { value: "low", label: "Low Tier", desc: "1.0\u20133.0" },
  { value: "mid", label: "Mid Tier", desc: "3.0\u20136.0" },
  { value: "high", label: "High Tier", desc: "6.0\u20138.0" },
  { value: "top", label: "Top Tier", desc: "8.0\u201312.0" },
];

const MODES = [
  { value: "air", label: "Air" },
  { value: "ground", label: "Ground" },
  { value: "both", label: "Both" },
];

export default function AccountPage() {
  const { user, profile, loading, refresh } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [wtUsername, setWtUsername] = useState("");
  const [squadron, setSquadron] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);
  const [nationality, setNationality] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [playMode, setPlayMode] = useState("both");

  useEffect(() => {
    if (profile) {
      setWtUsername(profile.war_thunder_username ?? "");
      setSquadron(profile.squadron_name ?? "");
      setNationality(profile.nationality ?? "");
      setDiscordUsername(profile.discord_username ?? "");
      setCountries(profile.play_countries ?? []);
      setTiers(profile.play_tiers ?? []);
      setPlayMode(profile.play_mode ?? "both");
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.username?.slice(0, 2).toUpperCase() ?? "TL";

  const toggleCountry = (code: string) => {
    setCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleTier = (value: string) => {
    setTiers((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    if (urlData?.publicUrl) {
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
      await refresh();
      toast.success("Avatar updated");
    }

    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        war_thunder_username: wtUsername || null,
        squadron_name: squadron || null,
        nationality: nationality || null,
        discord_username: discordUsername || null,
        play_countries: countries,
        play_tiers: tiers,
        play_mode: playMode,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
      await refresh();
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">My Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <p className="font-semibold text-lg">{profile?.display_name || profile?.username}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Change Avatar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <p className="text-sm font-medium mt-1">{profile?.first_name || "\u2014"}</p>
            </div>
            <div>
              <Label>Last Name</Label>
              <p className="text-sm font-medium mt-1">{profile?.last_name || "\u2014"}</p>
            </div>
          </div>
          <div>
            <Label>Display Name</Label>
            <p className="text-sm font-medium mt-1">{profile?.display_name || "\u2014"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality" className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              Nationality
            </Label>
            <Select value={nationality} onValueChange={(v) => setNationality(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discord" className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              Discord Username
            </Label>
            <Input
              id="discord"
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              placeholder="e.g. user#1234"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>War Thunder Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wt-username">In-Game Username</Label>
            <Input
              id="wt-username"
              value={wtUsername}
              onChange={(e) => setWtUsername(e.target.value)}
              placeholder="Your War Thunder in-game name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="squadron">Squadron</Label>
            <Input
              id="squadron"
              value={squadron}
              onChange={(e) => setSquadron(e.target.value)}
              placeholder="e.g. SkyKnights"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Nations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WT_NATIONS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleCountry(code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                  countries.includes(code)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TIERS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleTier(value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                  tiers.includes(value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {label}
                <span className="ml-1 text-xs opacity-70">({desc})</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlayMode(value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                  playMode === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
