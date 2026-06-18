export type Profile = {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "super_admin";
  mfa_enrolled: boolean;
  war_thunder_username: string | null;
  squadron_name: string | null;
  play_countries: string[] | null;
  play_tiers: string[] | null;
  play_mode: "air" | "ground" | "both" | null;
  created_at: string;
};

export type LeaderboardEntry = {
  id: string;
  rank: number;
  player_name: string;
  squadron_name: string | null;
  battle_rating: string;
  score: number;
  wins: number;
  losses: number;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
};

export type SiteSetting = {
  key: string;
  value: string;
};

export type Poll = {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  allow_text_response: boolean;
  starts_at: string;
  ends_at: string;
  status: "draft" | "active" | "closed";
  hidden: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Vote = {
  id: string;
  poll_id: string;
  user_id: string;
  selected_option: string;
  text_response: string | null;
  created_at: string;
};

export type Tournament = {
  id: string;
  title: string;
  description: string | null;
  mode: "air" | "ground" | "both";
  tier: "low" | "mid" | "high" | "top";
  battle_rating: string;
  start_date: string;
  end_date: string;
  max_players: number;
  system: "1v1" | "4v4";
  status: "upcoming" | "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentParticipant = {
  id: string;
  tournament_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  in_game_name: string | null;
  squadron: string | null;
  country: string | null;
  vehicle: string | null;
  accepted_terms: boolean;
  created_at: string;
};

export type TournamentMatch = {
  id: string;
  tournament_id: string;
  round: number;
  match_index: number;
  player1_id: string | null;
  player2_id: string | null;
  team1_player_ids: string[];
  team2_player_ids: string[];
  scheduled_at: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  winner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const WT_NATIONS = [
  { code: "us", label: "USA" },
  { code: "de", label: "Germany" },
  { code: "ru", label: "USSR" },
  { code: "uk", label: "UK" },
  { code: "jp", label: "Japan" },
  { code: "cn", label: "China" },
  { code: "it", label: "Italy" },
  { code: "fr", label: "France" },
  { code: "se", label: "Sweden" },
];
