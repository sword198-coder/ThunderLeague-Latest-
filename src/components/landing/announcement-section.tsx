"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AnnouncementSection() {
  const [adCode, setAdCode] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "ad_code").single().then(({ data }) => {
      if (data) setAdCode(data.value);
    });
  }, []);

  return (
    <section className="w-full bg-muted/50 border-y border-border">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Official Announcement</h2>
          <p className="text-muted-foreground">الإعلان الرسمي</p>
        </div>
        <div className="max-w-4xl mx-auto bg-background border border-border rounded-xl p-6 min-h-[120px] flex items-center justify-center">
          {adCode ? (
            <div dangerouslySetInnerHTML={{ __html: adCode }} />
          ) : (
            <p className="text-muted-foreground text-sm">Ad space available</p>
          )}
        </div>
      </div>
    </section>
  );
}
