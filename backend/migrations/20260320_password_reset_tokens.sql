-- ============================================================
-- DogScan AI — Password reset tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                 SERIAL        PRIMARY KEY,
    user_id            INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash         CHAR(64)      NOT NULL UNIQUE,
    expires_at         TIMESTAMP     NOT NULL,
    used_at            TIMESTAMP,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_ip         VARCHAR(64),
    request_user_agent TEXT,
    used_ip            VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user     ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires  ON password_reset_tokens (expires_at);
