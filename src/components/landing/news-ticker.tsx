"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NewsTicker() {
  const [items, setItems] = useState<string[]>(["Welcome to ThunderLeague — tournaments are now open!"]);
  const [interval, setIntervalMs] = useState(5000);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("key, value").in("key", ["news_items", "news_interval"]).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s) => (map[s.key] = s.value));
        if (map.news_items) {
          try {
            const parsed = JSON.parse(map.news_items);
            if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
          } catch {}
        }
        if (map.news_interval) {
          const ms = parseInt(map.news_interval) * 1000;
          if (ms > 0) setIntervalMs(ms);
        }
      }
    });
  }, []);

  const next = useCallback(() => setCurrent((prev) => (prev + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((prev) => (prev - 1 + items.length) % items.length), [items.length]);
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => nextRef.current(), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);

  if (items.length === 0) return null;

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
      {items.length > 1 && (
        <button onClick={prev} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <p className="text-foreground text-sm truncate">{items[current]}</p>
      {items.length > 1 && (
        <button onClick={next} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {items.length > 1 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {current + 1}/{items.length}
        </span>
      )}
    </div>
  );
}
