import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types";
import { TournamentsClient } from "./tournaments-client";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });

  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("tournament_id, status");

  const counts = new Map<string, number>();
  if (participants) {
    participants.forEach((p) => {
      if (p.status === "approved") {
        counts.set(p.tournament_id, (counts.get(p.tournament_id) ?? 0) + 1);
      }
    });
  }

  return (
    <TournamentsClient
      initialTournaments={(tournaments ?? []) as Tournament[]}
      initialCounts={counts}
    />
  );
}
