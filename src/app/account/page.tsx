"use client";

import { useState, useRef, useEffect } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Flag, Camera, Globe, MessageCircle, Zap, Copy, Check, Link, ShoppingBag, Eye, Sparkles, Image, Film, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCard } from "@/components/leaderboard/player-card";
import { COUNTRIES, type CardBackground, type CardTitle as CardTitleType } from "@/lib/types";

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
  const [referralLink, setReferralLink] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backgrounds, setBackgrounds] = useState<CardBackground[]>([]);
  const [ownedBgIds, setOwnedBgIds] = useState<string[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [previewBgId, setPreviewBgId] = useState<string | null>(null);
  const [titles, setTitles] = useState<CardTitleType[]>([]);

  useEffect(() => {
    if (profile) {
      setWtUsername(profile.war_thunder_username ?? "");
      setSquadron(profile.squadron_name ?? "");
      setNationality(profile.nationality ?? "");
      setDiscordUsername(profile.discord_username ?? "");
      setCountries(profile.play_countries ?? []);
      setTiers(profile.play_tiers ?? []);
      setPlayMode(profile.play_mode ?? "both");
      setSelectedBgId(profile.selected_card_background_id);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase.from("referral_links").select("code").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setReferralLink(`${window.location.origin}/auth/signup?ref=${data.code}`);
      });
    }
  }, [user]);

  useEffect(() => {
    supabase.from("card_backgrounds").select("*").then(({ data }) => {
      if (data) setBackgrounds(data as CardBackground[]);
    });
    supabase.from("card_titles").select("*").then(({ data }) => {
      if (data) setTitles(data as CardTitleType[]);
    });
    if (user) {
      supabase.from("user_card_backgrounds").select("background_id").eq("user_id", user.id).then(({ data }) => {
        if (data) setOwnedBgIds(data.map((r: { background_id: string }) => r.background_id));
      });
    }
  }, [user]);

  const requestReferralLink = async () => {
    if (!user) return;
    setReferralLoading(true);
    const code = (profile?.username || user.id.slice(0, 8)) + "-" + Math.random().toString(36).slice(2, 8);
    const { error } = await supabase.from("referral_links").insert({ user_id: user.id, code });
    setReferralLoading(false);
    if (error) { toast.error("Failed to create referral link"); return; }
    setReferralLink(`${window.location.origin}/auth/signup?ref=${code}`);
    toast.success("Referral link created!");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buyBackground = async (bg: CardBackground) => {
    if (!user || !profile) return;
    if ((profile.thunder_points ?? 0) < bg.price) {
      toast.error("Not enough Thunder Points!");
      return;
    }
    setBuyingId(bg.id);
    const newPoints = (profile.thunder_points ?? 0) - bg.price;
    const { error: tpError } = await supabase.from("profiles").update({ thunder_points: newPoints }).eq("id", user.id);
    if (tpError) { toast.error("Purchase failed"); setBuyingId(null); return; }
    if (bg.price > 0) {
      const { error: logError } = await supabase.from("thunder_points_log").insert({
        user_id: user.id,
        amount: -bg.price,
        reason: `Purchased card background: ${bg.name}`,
        created_by: user.id,
      });
      if (logError) { toast.error("Purchase failed"); setBuyingId(null); return; }
    }
    const { error: buyError } = await supabase.from("user_card_backgrounds").insert({
      user_id: user.id,
      background_id: bg.id,
    });
    if (buyError) { toast.error("Purchase failed"); setBuyingId(null); return; }
    setOwnedBgIds((prev) => [...prev, bg.id]);
    await refresh();
    toast.success(`Purchased "${bg.name}" background!`);
    setBuyingId(null);
  };

  const selectBackground = async (bgId: string) => {
    if (!user) return;
    setSelectedBgId(bgId);
    const { error } = await supabase.from("profiles").update({ selected_card_background_id: bgId }).eq("id", user.id);
    if (error) { toast.error("Failed to select background"); return; }
    await refresh();
    toast.success("Background selected!");
  };

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

  const selectedBackground = backgrounds.find((b) => b.id === selectedBgId);
  const selectedTitle = profile?.selected_title_id && titles.length > 0 ? titles.find((t) => t.id === profile.selected_title_id) ?? null : null;

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
            <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              <Zap className="h-3 w-3" />
              {profile?.thunder_points ?? 0}
            </div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Player Card
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowCardPreview(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Your card appears when someone clicks your name on the leaderboard.
            {selectedBackground && (
              <span className="block mt-1">
                Current background: <strong>{selectedBackground.name}</strong>
              </span>
            )}
          </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Card Backgrounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backgrounds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading backgrounds...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {backgrounds.map((bg) => {
                const owned = ownedBgIds.includes(bg.id);
                const isSelected = selectedBgId === bg.id;
                return (
                  <div
                    key={bg.id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <div className="h-28 bg-muted relative overflow-hidden">
                      {bg.type === "video" ? (
                        <video src={bg.file_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                      ) : bg.type === "image" ? (
                        <NextImage src={bg.file_url} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundImage: `linear-gradient(135deg, ${bg.gradient_from}, ${bg.gradient_via || bg.gradient_from}, ${bg.gradient_to})` }} />
                      )}
                      {!owned && (profile?.thunder_points ?? 0) < bg.price && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-xs text-white font-medium px-2 py-1 rounded bg-black/60">Too expensive</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {bg.type === "gradient" ? <Palette className="h-3 w-3" /> : bg.type === "image" ? <Image className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                        {bg.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {bg.price}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => { setPreviewBgId(bg.id); setShowCardPreview(true); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </Button>
                        {owned ? (
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={isSelected ? "flex-1 h-8 text-xs" : "flex-1 h-8 text-xs border-primary/40 hover:bg-primary/10"}
                            onClick={() => selectBackground(bg.id)}
                          >
                            {isSelected ? "Selected" : "Equip"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            disabled={(profile?.thunder_points ?? 0) < bg.price || buyingId === bg.id}
                            onClick={() => buyBackground(bg)}
                          >
                            {buyingId === bg.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (profile?.thunder_points ?? 0) < bg.price ? (
                              <>
                                <Zap className="h-3 w-3 mr-1 text-amber-500" />
                                Buy
                              </>
                            ) : (
                              "Buy"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share your referral link and earn rewards when people sign up using it.
          </p>
          {referralLink ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm break-all">{referralLink}</code>
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button onClick={requestReferralLink} disabled={referralLoading}>
              {referralLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Request Referral Link
            </Button>
          )}
        </CardContent>
      </Card>

      <PlayerCard
        data={profile ? { player_name: profile.display_name || profile.username, wins: 0, losses: 0, score: 0, profile } : null}
        open={showCardPreview}
        onOpenChange={(v) => { setShowCardPreview(v); if (!v) setPreviewBgId(null); }}
        cardBackground={backgrounds.find((b) => b.id === (previewBgId || selectedBgId))}
        cardTitle={selectedTitle}
      />
    </div>
  );
}
