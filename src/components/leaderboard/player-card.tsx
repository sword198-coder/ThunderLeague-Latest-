"use client";

import { useState } from "react";
import { Share2, Trophy, Zap, Gamepad2, Globe, MessageCircle, Users, Image, Film, Crown } from "lucide-react";
import type { Profile, CardBackground, CardTitle } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PlayerCardData = {
  player_name: string;
  wins: number;
  losses: number;
  score: number;
  profile: Profile | null;
};

export function PlayerCard({ data, open, onOpenChange, cardBackground, cardTitle }: { data: PlayerCardData | null; open: boolean; onOpenChange: (v: boolean) => void; cardBackground?: CardBackground | null; cardTitle?: CardTitle | null }) {
  const [shared, setShared] = useState(false);

  if (!data) return null;
  const p = data.profile;
  const initials = p?.display_name
    ? p.display_name.slice(0, 2).toUpperCase()
    : data.player_name.slice(0, 2).toUpperCase();

  const bg = cardBackground;
  const bgType = bg?.type || "gradient";
  const title = cardTitle;

  const gradStyle = bg && bgType === "gradient"
    ? { backgroundImage: `linear-gradient(135deg, ${bg.gradient_from}, ${bg.gradient_via || bg.gradient_from}, ${bg.gradient_to})` }
    : bg && (bgType === "image" || bgType === "video")
    ? { backgroundImage: `url(${bg.file_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(135deg, #92400e, #d97706, #fbbf24)" };

  const titleTextColor = p?.title_color || null;

  const titleStyle: React.CSSProperties = titleTextColor
    ? { color: titleTextColor }
    : title?.style_type === "gold"
    ? { color: "#FFD700", textShadow: "0 0 10px rgba(255,215,0,0.5)" }
    : title?.style_type === "glow"
    ? { color: "#fff", textShadow: `0 0 10px ${title.glow_color || "#fbbf24"}, 0 0 20px ${title.glow_color || "#fbbf24"}` }
    : {};

  const titleGradBg = titleTextColor
    ? {}
    : title?.style_type === "gradient"
    ? { backgroundImage: `linear-gradient(135deg, ${title.gradient_from || "#f59e0b"}, ${title.gradient_to || "#ef4444"})` }
    : {};

  const handleShare = async () => {
    const text = `Check out ${data.player_name} on ThunderLeague!\nScore: ${data.score.toLocaleString()} | Wins: ${data.wins} | Losses: ${data.losses}`;
    if (navigator.share) {
      await navigator.share({ title: `${data.player_name} - ThunderLeague`, text });
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
        <div className="relative">
          <div className="aspect-video relative overflow-hidden" style={bgType === "gradient" ? gradStyle : {}}>
            {bgType === "image" && (
              <img src={bg!.file_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {bgType === "video" && (
              <video src={bg!.file_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/30 text-white"
            onClick={handleShare}
          >
            {shared ? <span className="text-xs font-medium">Copied!</span> : <Share2 className="h-4 w-4" />}
          </Button>
          <div className="absolute -bottom-10 left-6">
            <Avatar className="h-20 w-20 ring-4 ring-background">
              <AvatarImage src={p?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="pt-12 pb-4 px-6 space-y-4">
          <div className="pl-0">
            <h2 className="text-xl font-bold">{p?.display_name || data.player_name}</h2>
            {title && (
              <p className={`text-sm font-bold mt-1 ${title.style_type === "gradient" && !p?.title_color ? "bg-clip-text text-transparent" : ""}`}
                style={title.style_type === "gradient" && !p?.title_color ? titleGradBg : titleStyle}
              >
                <Crown className="h-3.5 w-3.5 inline mr-1" />
                {title.display_text}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{data.score.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{data.wins}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" /> Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{data.losses}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{p?.thunder_points ?? 0}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Points</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2 text-sm">
            {p?.war_thunder_username && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /> WT Username</span>
                <span className="font-medium">{p.war_thunder_username}</span>
              </div>
            )}
            {p?.squadron_name && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Squadron</span>
                <span className="font-medium">{p.squadron_name}</span>
              </div>
            )}
            {p?.nationality && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Country</span>
                <span className="font-medium">{p.nationality}</span>
              </div>
            )}
            {p?.discord_username && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Discord</span>
                <span className="font-medium">{p.discord_username}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
