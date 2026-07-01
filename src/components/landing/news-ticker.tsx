"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NewsTicker({ initialItems, initialInterval }: { initialItems?: string[]; initialInterval?: number }) {
  const [items, setItems] = useState<string[]>(initialItems ?? ["Welcome to BPL — tournaments are now open!"]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const lenRef = useRef(initialItems?.length ?? 1);
  const msRef = useRef((initialInterval ?? 5) * 1000);

  useEffect(() => {
    if (initialItems) {
      if (initialItems.length > 1) {
        timerRef.current = setInterval(() => setCurrent((prev) => (prev + 1) % lenRef.current), msRef.current);
      }
      return;
    }
    const supabase = createClient();
    supabase.from("site_settings").select("key, value").in("key", ["news_items", "news_interval"]).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      let arr = ["Welcome to BPL — tournaments are now open!"];
      if (map.news_items) {
        try {
          const parsed = JSON.parse(map.news_items);
          if (Array.isArray(parsed) && parsed.length > 0) arr = parsed;
        } catch {}
      }
      setItems(arr);
      lenRef.current = arr.length;
      if (map.news_interval) {
        const v = parseInt(map.news_interval) * 1000;
        if (v > 0) msRef.current = v;
      }
      if (arr.length > 1) {
        timerRef.current = setInterval(() => setCurrent((prev) => (prev + 1) % lenRef.current), msRef.current);
      }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [initialItems, initialInterval]);

  const move = (dir: number) => setCurrent((prev) => (prev + dir + items.length) % items.length);

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
        <button onClick={() => move(-1)} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <p className="text-foreground text-sm truncate">{items[current]}</p>
      {items.length > 1 && (
        <button onClick={() => move(1)} className="shrink-0 text-muted-foreground hover:text-foreground">
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
