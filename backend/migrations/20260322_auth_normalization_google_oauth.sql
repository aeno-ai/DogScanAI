BEGIN;

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE scan_contributions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE scan_contributions
SET updated_at = COALESCE(updated_at, reviewed_at, submitted_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS user_password_credentials (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  profile_name VARCHAR(255),
  profile_image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user_id
  ON user_oauth_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_provider_email_ci
  ON user_oauth_accounts (LOWER(provider_email));

INSERT INTO user_password_credentials (user_id, password_hash, created_at, updated_at)
SELECT
  id,
  password_hash,
  COALESCE(created_at, CURRENT_TIMESTAMP),
  COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM users
WHERE password_hash IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci_unique
  ON users (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci_unique
  ON users (LOWER(username));

COMMIT;
