"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Wrench, Globe, Shield, BarChart3, Vote, MessageSquareText, Users, Settings, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PAGES = [
  { key: "tournaments", label: "Tournaments", icon: Globe },
  { key: "leaderboard", label: "Leaderboard", icon: BarChart3 },
  { key: "votes", label: "Votes", icon: Vote },
  { key: "support", label: "Support", icon: MessageSquareText },
  { key: "community", label: "Community", icon: Users },
  { key: "account", label: "Account", icon: Settings },
];

export default function PageMaintenancePage() {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      if (data) {
        const statusKey = data.find((s) => s.key === "page_maintenance");
        const msgKey = data.find((s) => s.key === "maintenance_message");
        const imgKey = data.find((s) => s.key === "maintenance_image");
        if (statusKey) {
          try { setStatus(JSON.parse(statusKey.value)); } catch { setStatus({}); }
        }
        if (msgKey) setMessage(msgKey.value);
        if (imgKey) setImage(imgKey.value);
      }
      setLoading(false);
    };
    load();
  }, []);

  const togglePage = async (key: string) => {
    const newStatus = { ...status, [key]: !status[key] };
    setSaving(key);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "page_maintenance", value: JSON.stringify(newStatus) },
      { onConflict: "key" }
    );
    setSaving(null);
    if (error) { toast.error("Failed to update"); return; }
    setStatus(newStatus);
    toast.success(`${key} page ${newStatus[key] ? "disabled" : "enabled"}`);
  };

  const saveImage = async () => {
    setSaving("img");
    const { error } = await supabase.from("site_settings").upsert(
      { key: "maintenance_image", value: image },
      { onConflict: "key" }
    );
    setSaving(null);
    if (error) { toast.error("Failed to save image"); return; }
    toast.success("Image saved");
  };

  const saveMessage = async () => {
    setSaving("msg");
    const { error } = await supabase.from("site_settings").upsert(
      { key: "maintenance_message", value: message },
      { onConflict: "key" }
    );
    setSaving(null);
    if (error) { toast.error("Failed to save message"); return; }
    toast.success("Message saved");
  };

  if (loading) {
    return (
      <Card><CardContent className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Page Maintenance
          </CardTitle>
          <CardDescription>Disable pages to show a maintenance message to users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAGES.map(({ key, label, icon: Icon }) => {
              const isOff = status[key];
              return (
                <div key={key} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isOff ? "border-red-500/30 bg-red-500/[0.04]" : "border-border/50"}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isOff ? "text-red-400" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{label}</span>
                    {isOff && <span className="text-[10px] text-red-400 font-medium uppercase">Disabled</span>}
                  </div>
                  <Button
                    variant={isOff ? "destructive" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => togglePage(key)}
                    disabled={saving === key}
                  >
                    {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : isOff ? "Enable" : "Disable"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Maintenance Message
          </CardTitle>
          <CardDescription>Message shown on disabled pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="msg">Message</Label>
            <Input id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="This page is under development. It will be available soon." />
          </div>
          <Button onClick={saveMessage} disabled={saving === "msg"} size="sm">
            {saving === "msg" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Maintenance Image
          </CardTitle>
          <CardDescription>Optional image shown on disabled pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="img">Image URL</Label>
            <Input id="img" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/image.png" />
          </div>
          {image && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border/50">
              <Image src={image} alt="Preview" fill className="object-contain" unoptimized />
            </div>
          )}
          <Button onClick={saveImage} disabled={saving === "img"} size="sm">
            {saving === "img" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Image
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
