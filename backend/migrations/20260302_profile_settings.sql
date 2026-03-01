-- ============================================================
-- DogScan AI - Profile settings and cooldown timestamps
-- Apply on existing databases created from migrations/database.sql
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS email_changed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL;
