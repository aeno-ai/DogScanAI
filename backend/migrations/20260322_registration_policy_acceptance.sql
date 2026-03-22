BEGIN;

CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_key VARCHAR(120) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_ip VARCHAR(64),
  accepted_user_agent TEXT,
  UNIQUE (user_id, policy_key, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_user_policy_acceptances_user_id
  ON user_policy_acceptances (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_policy_acceptances_policy
  ON user_policy_acceptances (policy_key, policy_version);

COMMIT;
