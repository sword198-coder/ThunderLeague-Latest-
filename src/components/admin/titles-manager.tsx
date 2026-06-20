"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Search, Crown, Sparkles, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CardTitle, Profile } from "@/lib/types";
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

export function TitlesManager() {
  const [titles, setTitles] = useState<CardTitle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [styleType, setStyleType] = useState<"gold" | "gradient" | "glow">("gold");
  const [gradientFrom, setGradientFrom] = useState("#f59e0b");
  const [gradientTo, setGradientTo] = useState("#ef4444");
  const [glowColor, setGlowColor] = useState("#fbbf24");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [grantColor, setGrantColor] = useState("");
  const [granting, setGranting] = useState(false);
  const supabase = createClient();

  const fetchTitles = useCallback(async () => {
    const { data } = await supabase.from("card_titles").select("*").order("created_at", { ascending: true });
    if (data) setTitles(data as CardTitle[]);
  }, [supabase]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, selected_title_id, title_color");
    if (data) setProfiles(data as Profile[]);
  }, [supabase]);

  useEffect(() => {
    fetchTitles();
    fetchProfiles();
  }, [fetchTitles, fetchProfiles]);

  const filteredProfiles = profiles.filter(
    (p) =>
      (p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.username?.toLowerCase().includes(search.toLowerCase())) &&
      search.length > 0
  );

  const handleCreateTitle = async () => {
    if (!name.trim() || !displayText.trim()) { toast.error("Enter name and display text"); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      display_text: displayText.trim(),
      style_type: styleType,
      gradient_from: gradientFrom,
      gradient_to: gradientTo,
      glow_color: glowColor,
    };
    const { error } = await supabase.from("card_titles").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Title created!");
    setName(""); setDisplayText(""); setStyleType("gold");
    await fetchTitles();
    setSaving(false);
  };

  const handleDeleteTitle = async (id: string) => {
    const { error } = await supabase.from("card_titles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Title deleted");
    await fetchTitles();
  };

  const ensureUserTitle = async (userId: string, titleId: string) => {
    const { error: delErr } = await supabase.from("user_titles").delete().eq("user_id", userId).eq("title_id", titleId);
    if (delErr && !delErr.message.includes("No rows")) { return delErr; }
    const { error } = await supabase.from("user_titles").insert({
      user_id: userId,
      title_id: titleId,
    });
    return error;
  };

  const handleGrantTitle = async () => {
    if (!selectedUser || !selectedTitle) { toast.error("Select user and title"); return; }
    setGranting(true);
    const err = await ensureUserTitle(selectedUser.id, selectedTitle);
    if (err) { toast.error(err.message); setGranting(false); return; }
    const updates: Record<string, unknown> = { selected_title_id: selectedTitle };
    if (grantColor) updates.title_color = grantColor;
    const { error: profileErr } = await supabase.from("profiles").update(updates).eq("id", selectedUser.id);
    if (profileErr) { toast.error(profileErr.message); setGranting(false); return; }
    toast.success(`Granted title to ${selectedUser.display_name || selectedUser.username}`);
    setSelectedUser(null);
    setSearch("");
    setSelectedTitle("");
    setGrantColor("");
    await fetchProfiles();
    setGranting(false);
  };

  const quickGrant = async (user: Profile, titleId: string) => {
    setGranting(true);
    const err = await ensureUserTitle(user.id, titleId);
    if (err) { toast.error(err.message); setGranting(false); return; }
    const { error: profileErr } = await supabase.from("profiles").update({ selected_title_id: titleId }).eq("id", user.id);
    if (profileErr) { toast.error(profileErr.message); setGranting(false); return; }
    toast.success(`Title assigned to ${user.display_name || user.username}`);
    await fetchProfiles();
    setGranting(false);
  };

  const handleRemoveTitle = async (userId: string) => {
    const { error: profileErr } = await supabase.from("profiles").update({ selected_title_id: null, title_color: null }).eq("id", userId);
    if (profileErr) { toast.error(profileErr.message); return; }
    const { error: delErr } = await supabase.from("user_titles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); return; }
    toast.success("Title removed from user");
    await fetchProfiles();
  };

  const titleStyle = (t: CardTitle): React.CSSProperties => {
    if (t.style_type === "gold") return { color: "#FFD700", textShadow: "0 0 10px rgba(255,215,0,0.5)" };
    if (t.style_type === "glow") return { color: "#fff", textShadow: `0 0 10px ${t.glow_color || "#fbbf24"}, 0 0 20px ${t.glow_color || "#fbbf24"}` };
    return {};
  };

  const titleClass = (t: CardTitle): string => {
    if (t.style_type === "gradient") return "bg-gradient-to-r bg-clip-text text-transparent";
    return "";
  };

  const titleGradStyle = (t: CardTitle): React.CSSProperties => {
    if (t.style_type === "gradient") return { backgroundImage: `linear-gradient(135deg, ${t.gradient_from || "#f59e0b"}, ${t.gradient_to || "#ef4444"})` };
    return {};
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Title Management</h2>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" /> Create Title
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Champion" />
          </div>
          <div className="space-y-1">
            <Label>Display Text</Label>
            <Input value={displayText} onChange={(e) => setDisplayText(e.target.value)} placeholder="★ Champion ★" />
          </div>
          <div className="space-y-1">
            <Label>Style</Label>
            <Select value={styleType} onValueChange={(v: string | null) => { if (v) setStyleType(v as "gold" | "gradient" | "glow"); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {styleType === "gradient" && (
            <>
              <div className="space-y-1">
                <Label>From Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                  <Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>To Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                  <Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} />
                </div>
              </div>
            </>
          )}
          {styleType === "glow" && (
            <div className="space-y-1">
              <Label>Glow Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={glowColor} onChange={(e) => setGlowColor(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                <Input value={glowColor} onChange={(e) => setGlowColor(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="pt-2">
          <div className="mb-2 p-3 bg-muted rounded text-center">
            <span
              className={styleType === "gradient" ? "bg-gradient-to-r bg-clip-text text-transparent text-lg font-bold" : "text-lg font-bold"}
              style={styleType === "gradient" ? { backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` } : styleType === "glow" ? { color: "#fff", textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}` } : { color: "#FFD700", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}
            >
              {displayText || "Preview"}
            </span>
          </div>
          <Button onClick={handleCreateTitle} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Title
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" /> Grant Title to User
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 relative">
            <Label>User</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
                placeholder="Search by username or display name..."
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {search.length > 0 && !selectedUser && filteredProfiles.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredProfiles.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedUser(p); setSearch(p.display_name || p.username || ""); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                  >
                    <span>{p.display_name || p.username}</span>
                    {p.selected_title_id ? (
                      <span className="text-xs text-muted-foreground">has title</span>
                    ) : (
                      <span className="text-xs text-green-500">no title</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {selectedUser.display_name || selectedUser.username}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Select value={selectedTitle} onValueChange={(v: string | null) => v && setSelectedTitle(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose title..." />
              </SelectTrigger>
              <SelectContent>
                {titles.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className={titleClass(t)} style={t.style_type !== "gradient" ? titleStyle(t) : titleGradStyle(t)}>
                      {t.display_text}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTitle && (
            <div className="space-y-1">
              <Label>Override Color <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={grantColor || "#ffffff"} onChange={(e) => setGrantColor(e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
                <Input value={grantColor} onChange={(e) => setGrantColor(e.target.value)} placeholder="#FFFFFF" />
                {grantColor && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setGrantColor("")}>Clear</Button>}
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleGrantTitle} disabled={granting || !selectedUser || !selectedTitle}>
          {granting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Grant Title
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Sun className="h-4 w-4" /> Created Titles
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
          {titles.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 space-y-2 text-center">
              <p className={`text-sm font-bold ${titleClass(t)}`}
                style={t.style_type !== "gradient" ? titleStyle(t) : titleGradStyle(t)}
              >
                {t.display_text}
              </p>
              <p className="text-xs text-muted-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{t.style_type}</p>
              <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={() => handleDeleteTitle(t.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Sun className="h-4 w-4" /> Users &amp; Titles
        </h3>
        <div className="relative mb-3">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
            placeholder="Filter users by username or display name..."
            className="pl-8"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {profiles
            .filter((p) => !search || p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.username?.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 50)
            .map((p) => {
            const t = titles.find((t) => t.id === p.selected_title_id);
            return (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                    {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                  </div>
                  {t ? (
                    <span className={`text-sm font-bold ml-2 truncate ${t.style_type === "gradient" && !p.title_color ? "bg-clip-text text-transparent" : ""}`}
                      style={p.title_color ? { color: p.title_color } : t.style_type !== "gradient" ? titleStyle(t) : titleGradStyle(t)}
                    >
                      {t.display_text}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">—</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Select onValueChange={(v: string | null) => { if (v) quickGrant(p, v); }}>
                    <SelectTrigger className="h-7 text-xs w-[80px]">
                      <SelectValue placeholder={t ? "Change" : "Assign"} />
                    </SelectTrigger>
                    <SelectContent>
                      {titles.map((title) => (
                        <SelectItem key={title.id} value={title.id}>
                          <span className={titleClass(title)} style={title.style_type !== "gradient" ? titleStyle(title) : titleGradStyle(title)}>
                            {title.display_text}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {p.selected_title_id && (
                    <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleRemoveTitle(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
}
