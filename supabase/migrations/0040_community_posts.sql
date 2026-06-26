-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "Anyone can view posts"
  on posts for select
  using (true);

create policy "Users can create their own posts"
  on posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on posts for delete
  using (auth.uid() = user_id);

-- Post likes table
create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table post_likes enable row level security;

create policy "Anyone can view likes"
  on post_likes for select
  using (true);

create policy "Users can like/unlike"
  on post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their likes"
  on post_likes for delete
  using (auth.uid() = user_id);

-- Post comments table
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table post_comments enable row level security;

create policy "Anyone can view comments"
  on post_comments for select
  using (true);

create policy "Users can comment"
  on post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on post_comments for delete
  using (auth.uid() = user_id);

-- Follows table
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  constraint follower_not_same_as_following check (follower_id <> following_id)
);

alter table follows enable row level security;

create policy "Anyone can view follows"
  on follows for select
  using (true);

create policy "Users can follow/unfollow"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete
  using (auth.uid() = follower_id);

-- Indexes for performance
create index if not exists idx_posts_user_id on posts(user_id);
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_post_likes_post_id on post_likes(post_id);
create index if not exists idx_post_likes_user_id on post_likes(user_id);
create index if not exists idx_post_comments_post_id on post_comments(post_id);
create index if not exists idx_post_comments_created_at on post_comments(created_at);
create index if not exists idx_follows_follower_id on follows(follower_id);
create index if not exists idx_follows_following_id on follows(following_id);

-- Create storage bucket for community post images
insert into storage.buckets (id, name, public) values ('community-posts', 'community-posts', true)
on conflict (id) do nothing;

create policy "Anyone can view community post images"
  on storage.objects for select
  using (bucket_id = 'community-posts');

create policy "Authenticated users can upload community post images"
  on storage.objects for insert
  with check (bucket_id = 'community-posts' and auth.role() = 'authenticated');

create policy "Users can delete their own community post images"
  on storage.objects for delete
  using (bucket_id = 'community-posts' and auth.uid() = owner);

-- Enable realtime for new tables
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table post_likes;
alter publication supabase_realtime add table post_comments;
alter publication supabase_realtime add table follows;
