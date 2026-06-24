"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DiscordStrip() {
  const [url, setUrl] = useState("https://discord.gg/thunderleague");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "discord_url").single().then(({ data }) => {
      if (data) setUrl(data.value);
    });
  }, []);

  return (
    <div className="w-full flex flex-col md:flex-row">
      <div className="w-full md:w-2/3 bg-violet-600 flex items-center justify-center py-8 px-4">
        <p className="text-white text-center text-lg md:text-xl font-medium">
          Join our Discord community
        </p>
      </div>
      <div className="w-full md:w-1/3 bg-white flex flex-col items-center justify-center py-8 px-4">
        <MessageCircle className="h-12 w-12 text-violet-600 mb-3" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 font-bold text-lg hover:underline"
        >
          join
        </a>
      </div>
    </div>
  );
}
