"use client";

import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function YouTubeStrip() {
  const [url, setUrl] = useState("https://youtube.com");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "youtube_url").single().then(({ data }) => {
      if (data) setUrl(data.value);
    });
  }, []);

  return (
    <div className="w-full flex flex-col md:flex-row">
      <div className="w-full md:w-1/3 bg-white flex flex-col items-center justify-center py-8 px-4">
        <Play className="h-12 w-12 text-red-600 mb-3" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 font-bold text-lg hover:underline"
        >
          اشتراك
        </a>
      </div>
      <div className="w-full md:w-2/3 bg-red-600 flex flex-col items-center justify-center py-8 px-4">
        <p className="text-white text-center text-lg md:text-xl font-medium leading-relaxed">
          انضم و شاهد فيديوهات للتورنامينتس و الكثير من المحتوي المشوق
        </p>
      </div>
    </div>
  );
}
