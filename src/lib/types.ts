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
  nationality: string | null;
  discord_username: string | null;
  thunder_points: number;
  last_active_at: string | null;
  selected_card_background_id: string | null;
  play_countries: string[] | null;
  play_tiers: string[] | null;
  play_mode: "air" | "ground" | "both" | null;
  created_at: string;
};

export type CardBackground = {
  id: string;
  name: string;
  type: "gradient" | "image" | "video";
  gradient_from: string;
  gradient_via: string;
  gradient_to: string;
  file_url: string;
  price: number;
  created_at: string;
};

export type UserCardBackground = {
  id: string;
  user_id: string;
  background_id: string;
  purchased_at: string;
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
  user_id: string | null;
  tier: "low" | "mid" | "high";
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

export type ReferralLink = {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
};

export type ReferralSignup = {
  id: string;
  referral_link_id: string;
  referred_user_id: string;
  verified: boolean;
  created_at: string;
};

export type ThunderPointsLog = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_by: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

export const COUNTRIES = [
  { code: "AF", label: "Afghanistan" },
  { code: "AL", label: "Albania" },
  { code: "DZ", label: "Algeria" },
  { code: "AD", label: "Andorra" },
  { code: "AO", label: "Angola" },
  { code: "AR", label: "Argentina" },
  { code: "AM", label: "Armenia" },
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "AZ", label: "Azerbaijan" },
  { code: "BH", label: "Bahrain" },
  { code: "BD", label: "Bangladesh" },
  { code: "BY", label: "Belarus" },
  { code: "BE", label: "Belgium" },
  { code: "BJ", label: "Benin" },
  { code: "BO", label: "Bolivia" },
  { code: "BA", label: "Bosnia and Herzegovina" },
  { code: "BR", label: "Brazil" },
  { code: "BN", label: "Brunei" },
  { code: "BG", label: "Bulgaria" },
  { code: "KH", label: "Cambodia" },
  { code: "CM", label: "Cameroon" },
  { code: "CA", label: "Canada" },
  { code: "CF", label: "Central African Republic" },
  { code: "TD", label: "Chad" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CO", label: "Colombia" },
  { code: "CD", label: "Congo (DRC)" },
  { code: "CR", label: "Costa Rica" },
  { code: "HR", label: "Croatia" },
  { code: "CU", label: "Cuba" },
  { code: "CY", label: "Cyprus" },
  { code: "CZ", label: "Czech Republic" },
  { code: "DK", label: "Denmark" },
  { code: "DO", label: "Dominican Republic" },
  { code: "EC", label: "Ecuador" },
  { code: "EG", label: "Egypt" },
  { code: "SV", label: "El Salvador" },
  { code: "EE", label: "Estonia" },
  { code: "ET", label: "Ethiopia" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "GA", label: "Gabon" },
  { code: "GE", label: "Georgia" },
  { code: "DE", label: "Germany" },
  { code: "GH", label: "Ghana" },
  { code: "GR", label: "Greece" },
  { code: "GT", label: "Guatemala" },
  { code: "HN", label: "Honduras" },
  { code: "HK", label: "Hong Kong" },
  { code: "HU", label: "Hungary" },
  { code: "IS", label: "Iceland" },
  { code: "IN", label: "India" },
  { code: "ID", label: "Indonesia" },
  { code: "IR", label: "Iran" },
  { code: "IQ", label: "Iraq" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "CI", label: "Ivory Coast" },
  { code: "JM", label: "Jamaica" },
  { code: "JP", label: "Japan" },
  { code: "JO", label: "Jordan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KW", label: "Kuwait" },
  { code: "KG", label: "Kyrgyzstan" },
  { code: "LA", label: "Laos" },
  { code: "LV", label: "Latvia" },
  { code: "LB", label: "Lebanon" },
  { code: "LY", label: "Libya" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lithuania" },
  { code: "LU", label: "Luxembourg" },
  { code: "MO", label: "Macau" },
  { code: "MG", label: "Madagascar" },
  { code: "MY", label: "Malaysia" },
  { code: "MV", label: "Maldives" },
  { code: "MT", label: "Malta" },
  { code: "MX", label: "Mexico" },
  { code: "MD", label: "Moldova" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolia" },
  { code: "ME", label: "Montenegro" },
  { code: "MA", label: "Morocco" },
  { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibia" },
  { code: "NP", label: "Nepal" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "KP", label: "North Korea" },
  { code: "MK", label: "North Macedonia" },
  { code: "NO", label: "Norway" },
  { code: "OM", label: "Oman" },
  { code: "PK", label: "Pakistan" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "RO", label: "Romania" },
  { code: "RU", label: "Russia" },
  { code: "RW", label: "Rwanda" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "SN", label: "Senegal" },
  { code: "RS", label: "Serbia" },
  { code: "SG", label: "Singapore" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
  { code: "ZA", label: "South Africa" },
  { code: "KR", label: "South Korea" },
  { code: "ES", label: "Spain" },
  { code: "LK", label: "Sri Lanka" },
  { code: "SD", label: "Sudan" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "SY", label: "Syria" },
  { code: "TW", label: "Taiwan" },
  { code: "TJ", label: "Tajikistan" },
  { code: "TZ", label: "Tanzania" },
  { code: "TH", label: "Thailand" },
  { code: "TN", label: "Tunisia" },
  { code: "TR", label: "Turkey" },
  { code: "TM", label: "Turkmenistan" },
  { code: "UG", label: "Uganda" },
  { code: "UA", label: "Ukraine" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "UY", label: "Uruguay" },
  { code: "UZ", label: "Uzbekistan" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Vietnam" },
  { code: "YE", label: "Yemen" },
  { code: "ZW", label: "Zimbabwe" },
];

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
