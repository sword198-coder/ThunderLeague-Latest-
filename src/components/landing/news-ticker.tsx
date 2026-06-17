"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function NewsTicker() {
  const [newsText, setNewsText] = useState(
    "Welcome to ThunderLeague — tournaments are now open!"
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "news_text")
      .single()
      .then(({ data }) => {
        if (data) setNewsText(data.value);
      });
  }, []);

  return (
    <div className="w-full bg-muted border-b border-border py-2 px-4 flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
        <span className="text-red-600 font-bold text-sm uppercase tracking-wider">
          NEWS
        </span>
      </div>
      <p className="text-foreground text-sm truncate">{newsText}</p>
    </div>
  );
}
