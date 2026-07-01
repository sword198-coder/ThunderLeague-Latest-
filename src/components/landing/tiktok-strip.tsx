"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function TikTokStrip({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "https://tiktok.com/@thunderleague");

  useEffect(() => {
    if (initialUrl) return;
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "tiktok_url").single().then(({ data }) => {
      if (data) setUrl(data.value);
    });
  }, [initialUrl]);

  return (
    <div className="w-full flex flex-col md:flex-row">
      <div className="w-full md:w-1/3 bg-white flex flex-col items-center justify-center py-8 px-4">
        <Image src="/Tiktok Logo.jpg" alt="TikTok" width={48} height={48} className="h-12 w-12 mb-3 object-contain" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-black font-bold text-lg hover:underline"
        >
          Follow
        </a>
      </div>
      <div className="w-full md:w-2/3 bg-black flex items-center justify-center py-8 px-4">
        <p className="text-white text-center text-lg md:text-xl font-medium">
          Follow us on TikTok
        </p>
      </div>
    </div>
  );
}
