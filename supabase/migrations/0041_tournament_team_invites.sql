-- Tournament team invites table
create table if not exists tournament_team_invites (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  invitee_id uuid not null references profiles(id) on delete cascade,
  slot_number int not null check (slot_number >= 2 and slot_number <= 4),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique(tournament_id, invitee_id)
);

-- Team member data (filled when invite is accepted)
create table if not exists tournament_team_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  team_leader_id uuid not null references profiles(id) on delete cascade,
  in_game_name text not null,
  squadron text not null default '',
  nation text not null,
  vehicle text not null,
  slot_number int not null,
  created_at timestamptz not null default now(),
  unique(tournament_id, user_id)
);

alter table tournament_team_invites enable row level security;
alter table tournament_team_members enable row level security;

-- Everyone can read invites
create policy "Anyone can view team invites"
  on tournament_team_invites for select
  using (true);

-- Users can send invites
create policy "Users can create team invites"
  on tournament_team_invites for insert
  with check (auth.uid() = requester_id);

-- Invitee can update (accept/reject) their own invite
create policy "Invitee can update their invite"
  on tournament_team_invites for update
  using (auth.uid() = invitee_id);

-- Creator can delete invites
create policy "Requester can delete invites"
  on tournament_team_invites for delete
  using (auth.uid() = requester_id);

-- Everyone can view team members
create policy "Anyone can view team members"
  on tournament_team_members for select
  using (true);

-- Users can insert their own team member data
create policy "Users can insert their team data"
  on tournament_team_members for insert
  with check (auth.uid() = user_id);

-- Users can update their own team member data
create policy "Users can update their team data"
  on tournament_team_members for update
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_team_invites_tournament on tournament_team_invites(tournament_id);
create index if not exists idx_team_invites_invitee on tournament_team_invites(invitee_id);
create index if not exists idx_team_members_tournament on tournament_team_members(tournament_id);

-- Enable realtime
alter publication supabase_realtime add table tournament_team_invites;
alter publication supabase_realtime add table tournament_team_members;
