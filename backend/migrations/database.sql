-- ============================================================
--  DogScan AI — Database Schema
--  Run this on a fresh PostgreSQL database
-- ============================================================

-- ============================================================
--  USERS
-- ============================================================
CREATE TABLE users (
    id               SERIAL          PRIMARY KEY,
    email            VARCHAR(255)    NOT NULL UNIQUE,
    password_hash    VARCHAR(255)    NOT NULL,
    username         VARCHAR(100)    NOT NULL UNIQUE,
    is_admin         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_superadmin    BOOLEAN         NOT NULL DEFAULT FALSE,
    session_version  INTEGER         NOT NULL DEFAULT 1,
    is_banned        BOOLEAN         NOT NULL DEFAULT FALSE,
    banned_until     TIMESTAMP,
    ban_reason       TEXT,
    banned_at        TIMESTAMP,
    banned_by        INTEGER REFERENCES users (id) ON DELETE SET NULL,
    username_changed_at TIMESTAMP,
    email_changed_at    TIMESTAMP,
    password_changed_at TIMESTAMP,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (NOT is_superadmin OR is_admin)
);

CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_username ON users (username);


-- ============================================================
--  BREEDS
-- ============================================================
CREATE TABLE breeds (
    breed_id               SERIAL          PRIMARY KEY,
    class_index            INTEGER         NOT NULL,
    class_name             VARCHAR(100)    NOT NULL,
    display_name           VARCHAR(100)    NOT NULL,
    image_url              VARCHAR(255),

    -- Physical traits
    size                   VARCHAR(20)     NOT NULL
                               CHECK (size IN ('small', 'medium', 'large', 'giant')),
    snout                  VARCHAR(100),
    ears                   VARCHAR(100),
    coat                   VARCHAR(100),
    tail                   VARCHAR(100),

    -- Measurements
    height_min             INTEGER,
    height_max             INTEGER,
    weight_min             INTEGER,
    weight_max             INTEGER,
    lifespan_min           INTEGER,
    lifespan_max           INTEGER,

    -- Classification
    origin                 VARCHAR(100),
    breed_group            VARCHAR(100),
    temperament            TEXT[],

    -- Info
    description            TEXT            NOT NULL,
    health_considerations  TEXT,
    key_health_tips        TEXT,
    popularity_score       INTEGER         NOT NULL DEFAULT 0,

    created_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_name  ON breeds (class_name);
CREATE INDEX idx_name        ON breeds (display_name);
CREATE INDEX idx_size        ON breeds (size);
CREATE INDEX idx_breed_group ON breeds (breed_group);


-- ============================================================
--  SCAN HISTORY
-- ============================================================
CREATE TABLE scan_history (
    id          SERIAL      PRIMARY KEY,
    user_id     INTEGER     NOT NULL
                    REFERENCES users (id) ON DELETE CASCADE,
    image_url   TEXT        NOT NULL,
    scan_type   VARCHAR(20) NOT NULL DEFAULT 'breed'
                    CHECK (scan_type IN ('breed', 'disease')),
    scanned_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scan_history_user_id    ON scan_history (user_id);
CREATE INDEX idx_scan_history_scanned_at ON scan_history (scanned_at DESC);


-- ============================================================
--  SCAN PREDICTIONS
-- ============================================================
CREATE TABLE scan_predictions (
    id           SERIAL          PRIMARY KEY,
    scan_id      INTEGER         NOT NULL
                     REFERENCES scan_history (id) ON DELETE CASCADE,
    breed_id     INTEGER
                     REFERENCES breeds (breed_id) ON DELETE SET NULL,
    rank         SMALLINT        NOT NULL
                     CHECK (rank BETWEEN 1 AND 10),
    class_name   VARCHAR(100)    NOT NULL,
    display_name VARCHAR(100)    NOT NULL,
    confidence   NUMERIC(5, 2)   NOT NULL
                     CHECK (confidence BETWEEN 0 AND 100),

    UNIQUE (scan_id, rank)
);

CREATE INDEX idx_scan_predictions_scan_id ON scan_predictions (scan_id);
CREATE INDEX idx_scan_predictions_breed_id ON scan_predictions (breed_id);


-- ============================================================
--  PUBLIC SCAN USAGE (MONTHLY)
-- ============================================================
CREATE TABLE public_scan_usage (
    id            SERIAL       PRIMARY KEY,
    device_id     VARCHAR(64)  NOT NULL,
    period_start  DATE         NOT NULL,
    used_count    INTEGER      NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (device_id, period_start)
);

CREATE INDEX idx_public_scan_usage_period_start ON public_scan_usage (period_start);


-- ============================================================
--  ADMIN USER ACTIONS (AUDIT LOG)
-- ============================================================
CREATE TABLE admin_user_actions (
    id             SERIAL        PRIMARY KEY,
    admin_user_id  INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    target_user_id INTEGER       REFERENCES users (id) ON DELETE SET NULL,
    action_type    VARCHAR(40)   NOT NULL CHECK (
                      action_type IN (
                        'kick',
                        'ban',
                        'unban',
                        'approve_contribution',
                        'reject_contribution'
                      )
                   ),
    reason         TEXT,
    metadata       JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_actions_admin      ON admin_user_actions (admin_user_id);
CREATE INDEX idx_admin_actions_target     ON admin_user_actions (target_user_id);
CREATE INDEX idx_admin_actions_created_at ON admin_user_actions (created_at DESC);


-- ============================================================
--  SCAN CONTRIBUTIONS (REVIEW QUEUE)
-- ============================================================
CREATE TABLE scan_contributions (
    id                      SERIAL          PRIMARY KEY,
    scan_id                 INTEGER UNIQUE REFERENCES scan_history (id) ON DELETE SET NULL,
    user_id                 INTEGER         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status                  VARCHAR(20)     NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),

    source_image_url        TEXT            NOT NULL,
    original_predictions    JSONB           NOT NULL,

    model_top1_breed_id     INTEGER         REFERENCES breeds (breed_id) ON DELETE SET NULL,
    model_top1_class_name   VARCHAR(100)    NOT NULL,
    model_top1_display_name VARCHAR(100)    NOT NULL,
    model_top1_confidence   NUMERIC(5, 2)   NOT NULL CHECK (model_top1_confidence BETWEEN 0 AND 100),

    consent_given_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at             TIMESTAMP,
    reviewed_by             INTEGER         REFERENCES users (id) ON DELETE SET NULL,
    review_reason           TEXT,

    final_breed_id          INTEGER         REFERENCES breeds (breed_id) ON DELETE SET NULL,
    final_class_name        VARCHAR(100),
    final_display_name      VARCHAR(100)
);

CREATE INDEX idx_scan_contributions_status_submitted ON scan_contributions (status, submitted_at DESC);
CREATE INDEX idx_scan_contributions_user_submitted   ON scan_contributions (user_id, submitted_at DESC);
CREATE INDEX idx_scan_contributions_reviewed_by      ON scan_contributions (reviewed_by);


-- ============================================================
--  APPROVED SAMPLES (IMMUTABLE DATASET ROWS)
-- ============================================================
CREATE TABLE approved_samples (
    id                   SERIAL         PRIMARY KEY,
    contribution_id      INTEGER        NOT NULL UNIQUE REFERENCES scan_contributions (id) ON DELETE RESTRICT,
    user_id              INTEGER        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scan_id              INTEGER        REFERENCES scan_history (id) ON DELETE SET NULL,

    approved_image_url   TEXT           NOT NULL,
    original_image_url   TEXT           NOT NULL,

    final_breed_id       INTEGER        NOT NULL REFERENCES breeds (breed_id) ON DELETE RESTRICT,
    final_class_name     VARCHAR(100)   NOT NULL,
    final_display_name   VARCHAR(100)   NOT NULL,

    original_predictions JSONB          NOT NULL,
    approved_by          INTEGER        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    approved_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note                 TEXT
);

CREATE INDEX idx_approved_samples_approved_at ON approved_samples (approved_at DESC);
CREATE INDEX idx_approved_samples_final_breed ON approved_samples (final_breed_id);


-- ============================================================
--  ASSISTANT THREADS + MESSAGES
-- ============================================================
CREATE TABLE assistant_threads (
    id            SERIAL        PRIMARY KEY,
    user_id       INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_type   VARCHAR(20)   NOT NULL CHECK (thread_type IN ('general', 'scan')),
    scan_context  JSONB,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_assistant_threads_general_unique
    ON assistant_threads (user_id)
    WHERE thread_type = 'general';

CREATE INDEX idx_assistant_threads_user_updated
    ON assistant_threads (user_id, updated_at DESC);

CREATE TABLE assistant_messages (
    id           SERIAL        PRIMARY KEY,
    thread_id    INTEGER       NOT NULL REFERENCES assistant_threads (id) ON DELETE CASCADE,
    role         VARCHAR(20)   NOT NULL CHECK (role IN ('user', 'assistant')),
    content      TEXT          NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assistant_messages_thread_order
    ON assistant_messages (thread_id, id);
