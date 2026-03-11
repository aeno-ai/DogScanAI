-- ============================================================
--  DogScan AI - Assistant Module
-- ============================================================

CREATE TABLE IF NOT EXISTS assistant_threads (
    id          SERIAL      PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_type VARCHAR(20) NOT NULL CHECK (thread_type IN ('general', 'scan')),
    scan_context JSONB,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_user_updated
    ON assistant_threads (user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_threads_general_unique
    ON assistant_threads (user_id)
    WHERE thread_type = 'general';

CREATE TABLE IF NOT EXISTS assistant_messages (
    id         SERIAL      PRIMARY KEY,
    thread_id  INTEGER     NOT NULL REFERENCES assistant_threads (id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT        NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_thread_order
    ON assistant_messages (thread_id, id);
