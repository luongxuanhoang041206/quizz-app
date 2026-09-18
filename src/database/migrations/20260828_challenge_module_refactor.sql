-- Migration: 20260828_challenge_module_refactor.sql
-- Refactor Challenge module schema to support full Challenge, Requirements, and Reward Bundle lifecycle

-- 1. Create or update ENUMs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_status') THEN
    CREATE TYPE challenge_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED');
  ELSE
    ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'SCHEDULED';
    ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'CANCELLED';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_participation_status') THEN
    CREATE TYPE challenge_participation_status AS ENUM ('IN_PROGRESS', 'COMPLETED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_reward_tier') THEN
    CREATE TYPE challenge_reward_tier AS ENUM ('WINNER', 'RUNNER_UP', 'TOP_10', 'PARTICIPATION', 'SPECIAL');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_reward_type') THEN
    CREATE TYPE challenge_reward_type AS ENUM ('NFT', 'TOKEN', 'POINTS', 'ACCESS', 'EXTERNAL');
  END IF;
END$$;

-- 2. Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status challenge_status NOT NULL DEFAULT 'DRAFT',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  max_participants INT,
  reward_claim_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT challenges_time_range_check CHECK (
    start_at IS NULL OR end_at IS NULL OR start_at < end_at
  ),
  CONSTRAINT challenges_max_participants_check CHECK (
    max_participants IS NULL OR max_participants > 0
  )
);

-- In case challenges table already exists, alter missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE challenges ADD COLUMN created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE challenges ADD COLUMN max_participants INT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'reward_claim_deadline'
  ) THEN
    ALTER TABLE challenges ADD COLUMN reward_claim_deadline TIMESTAMPTZ;
  END IF;
END$$;

-- 3. Challenge Requirements Table
CREATE TABLE IF NOT EXISTS challenge_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  policy_id TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  min_quantity BIGINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT challenge_requirements_min_quantity_check CHECK (min_quantity > 0),
  CONSTRAINT challenge_requirements_unique_asset UNIQUE (challenge_id, policy_id, asset_name)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_requirements' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE challenge_requirements ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
  END IF;
END$$;

-- 4. Challenge Rewards Table
CREATE TABLE IF NOT EXISTS challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  tier challenge_reward_tier NOT NULL,
  type challenge_reward_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Challenge Participations Table
CREATE TABLE IF NOT EXISTS challenge_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status challenge_participation_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT challenge_participations_once_per_user UNIQUE (challenge_id, user_id)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS challenges_created_by_idx ON challenges(created_by);
CREATE INDEX IF NOT EXISTS challenges_status_idx ON challenges(status);
CREATE INDEX IF NOT EXISTS challenge_requirements_challenge_id_idx ON challenge_requirements(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_requirements_asset_identity_idx ON challenge_requirements(policy_id, asset_name);
CREATE INDEX IF NOT EXISTS challenge_rewards_challenge_id_idx ON challenge_rewards(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_participations_challenge_id_idx ON challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_participations_user_id_idx ON challenge_participations(user_id);
