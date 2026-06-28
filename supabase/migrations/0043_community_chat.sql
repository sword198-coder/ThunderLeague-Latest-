-- Direct messaging system
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_conversation_participants_user on conversation_participants(user_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_created on messages(created_at);

-- RLS
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Participants can view the conversation
create policy "Participants can view conversation"
  on conversations for select
  using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
  );

create policy "Participants can view participants"
  on conversation_participants for select
  using (auth.uid() = user_id or exists (
    select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  ));

-- Participants can insert participants (for adding people)
create policy "Participants can insert participants"
  on conversation_participants for insert
  with check (auth.uid() = user_id or exists (
    select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  ));

-- Participants can view messages
create policy "Participants can view messages"
  on messages for select
  using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
  );

-- Participants can send messages
create policy "Participants can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id and exists (
      select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- Create conversation function (creates conversation and adds participants atomically)
create or replace function public.create_conversation(participant_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  conv_id uuid;
begin
  insert into public.conversations default values returning id into conv_id;
  
  insert into public.conversation_participants (conversation_id, user_id)
  select conv_id, unnest(participant_ids);
  
  return conv_id;
end;
$$;

-- Update last_active_at on profile when user is active
create or replace function public.update_last_active()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.profiles set last_active_at = now() where id = auth.uid();
  return new;
end;
$$;

-- Trigger to update last_active when a message is sent
drop trigger if exists on_message_sent on messages;
create trigger on_message_sent
  after insert on messages
  for each row
  execute function public.update_last_active();

-- Realtime
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table conversation_participants;
alter publication supabase_realtime add table messages;

-- Also ensure posts, post_likes, post_comments, follows are in realtime
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table post_likes;
alter publication supabase_realtime add table post_comments;
alter publication supabase_realtime add table follows;
