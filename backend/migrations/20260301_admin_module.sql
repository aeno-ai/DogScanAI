-- ============================================================
-- DogScan AI - Admin Module + Consent Review Schema Patch
-- Apply on existing databases created from migrations/database.sql
-- ============================================================

-- ------------------------------------------------------------
-- USERS: roles, moderation state, session invalidation
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS banned_by INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_users_banned_by'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_banned_by
      FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_superadmin_implies_admin'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_superadmin_implies_admin
      CHECK (NOT is_superadmin OR is_admin);
  END IF;
END $$;

-- ------------------------------------------------------------
-- SCAN HISTORY: explicit mode
-- ------------------------------------------------------------
ALTER TABLE scan_history
  ADD COLUMN IF NOT EXISTS scan_type VARCHAR(20) NOT NULL DEFAULT 'breed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_scan_history_scan_type'
  ) THEN
    ALTER TABLE scan_history
      ADD CONSTRAINT chk_scan_history_scan_type
      CHECK (scan_type IN ('breed', 'disease'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_predictions_breed_id
  ON scan_predictions(breed_id);

-- ------------------------------------------------------------
-- PUBLIC USAGE: monthly persistent demo counters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_scan_usage (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  period_start DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (device_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_public_scan_usage_period_start
  ON public_scan_usage(period_start);

-- ------------------------------------------------------------
-- ADMIN AUDIT TRAIL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_user_actions (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(40) NOT NULL CHECK (
    action_type IN (
      'kick',
      'ban',
      'unban',
      'approve_contribution',
      'reject_contribution'
    )
  ),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin
  ON admin_user_actions(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target
  ON admin_user_actions(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at
  ON admin_user_actions(created_at DESC);

-- ------------------------------------------------------------
-- CONSENT REVIEW QUEUE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_contributions (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER UNIQUE REFERENCES scan_history(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),

  source_image_url TEXT NOT NULL,
  original_predictions JSONB NOT NULL,

  model_top1_breed_id INTEGER REFERENCES breeds(breed_id) ON DELETE SET NULL,
  model_top1_class_name VARCHAR(100) NOT NULL,
  model_top1_display_name VARCHAR(100) NOT NULL,
  model_top1_confidence NUMERIC(5, 2) NOT NULL CHECK (
    model_top1_confidence >= 0 AND model_top1_confidence <= 100
  ),

  consent_given_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_reason TEXT,

  final_breed_id INTEGER REFERENCES breeds(breed_id) ON DELETE SET NULL,
  final_class_name VARCHAR(100),
  final_display_name VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_scan_contributions_status_submitted
  ON scan_contributions(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_contributions_user_submitted
  ON scan_contributions(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_contributions_reviewed_by
  ON scan_contributions(reviewed_by);

-- ------------------------------------------------------------
-- APPROVED SAMPLES: immutable dataset rows
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approved_samples (
  id SERIAL PRIMARY KEY,
  contribution_id INTEGER NOT NULL UNIQUE REFERENCES scan_contributions(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id INTEGER REFERENCES scan_history(id) ON DELETE SET NULL,

  approved_image_url TEXT NOT NULL,
  original_image_url TEXT NOT NULL,

  final_breed_id INTEGER NOT NULL REFERENCES breeds(breed_id) ON DELETE RESTRICT,
  final_class_name VARCHAR(100) NOT NULL,
  final_display_name VARCHAR(100) NOT NULL,

  original_predictions JSONB NOT NULL,
  approved_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_approved_samples_approved_at
  ON approved_samples(approved_at DESC);

CREATE INDEX IF NOT EXISTS idx_approved_samples_final_breed
  ON approved_samples(final_breed_id);
