import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LandingClient } from "./landing-client";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const settings: Record<string, string> = {};
  data?.forEach((s) => { settings[s.key] = s.value; });

  return <LandingClient settings={settings} />;
}
