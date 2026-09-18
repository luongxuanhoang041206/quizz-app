create type challenge_status as enum ('DRAFT', 'ACTIVE', 'CLOSED');
create type challenge_participation_status as enum ('IN_PROGRESS', 'COMPLETED');

create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status challenge_status not null default 'DRAFT',
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_time_range_check check (
    start_at is null or end_at is null or start_at < end_at
  )
);

create table challenge_requirements (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  policy_id text not null,
  asset_name text not null,
  min_quantity bigint not null default 1,
  created_at timestamptz not null default now(),
  constraint challenge_requirements_min_quantity_check check (min_quantity > 0)
);

create table challenge_participations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status challenge_participation_status not null default 'IN_PROGRESS',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint challenge_participations_once_per_user unique (challenge_id, user_id)
);

create index challenge_requirements_challenge_id_idx
  on challenge_requirements(challenge_id);

create index challenge_requirements_asset_identity_idx
  on challenge_requirements(policy_id, asset_name);

create index challenge_participations_user_id_idx
  on challenge_participations(user_id);
