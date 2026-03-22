BEGIN;

-- ============================================================
-- BREED CATALOG NORMALIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS breed_profiles (
    breed_id               INTEGER PRIMARY KEY REFERENCES breeds (breed_id) ON DELETE CASCADE,
    description            TEXT         NOT NULL,
    origin                 VARCHAR(100),
    breed_group            VARCHAR(100),
    health_considerations  TEXT,
    key_health_tips        TEXT,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breed_physical_traits (
    breed_id               INTEGER PRIMARY KEY REFERENCES breeds (breed_id) ON DELETE CASCADE,
    snout                  VARCHAR(100),
    ears                   VARCHAR(100),
    coat                   VARCHAR(100),
    tail                   VARCHAR(100),
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breed_measurements (
    breed_id               INTEGER PRIMARY KEY REFERENCES breeds (breed_id) ON DELETE CASCADE,
    height_min             INTEGER,
    height_max             INTEGER,
    weight_min             INTEGER,
    weight_max             INTEGER,
    lifespan_min           INTEGER,
    lifespan_max           INTEGER,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breed_temperaments (
    id                     SERIAL PRIMARY KEY,
    breed_id               INTEGER      NOT NULL REFERENCES breeds (breed_id) ON DELETE CASCADE,
    temperament            VARCHAR(120) NOT NULL,
    sort_order             SMALLINT     NOT NULL DEFAULT 0,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (breed_id, temperament)
);

CREATE INDEX IF NOT EXISTS idx_breed_profiles_origin
    ON breed_profiles (origin);

CREATE INDEX IF NOT EXISTS idx_breed_profiles_group
    ON breed_profiles (breed_group);

CREATE INDEX IF NOT EXISTS idx_breed_temperaments_name
    ON breed_temperaments (temperament);

INSERT INTO breed_profiles (
    breed_id,
    description,
    origin,
    breed_group,
    health_considerations,
    key_health_tips,
    created_at,
    updated_at
)
SELECT
    b.breed_id,
    b.description,
    b.origin,
    b.breed_group,
    b.health_considerations,
    b.key_health_tips,
    COALESCE(b.created_at, CURRENT_TIMESTAMP),
    COALESCE(b.updated_at, CURRENT_TIMESTAMP)
FROM breeds b
ON CONFLICT (breed_id) DO UPDATE SET
    description = EXCLUDED.description,
    origin = EXCLUDED.origin,
    breed_group = EXCLUDED.breed_group,
    health_considerations = EXCLUDED.health_considerations,
    key_health_tips = EXCLUDED.key_health_tips,
    updated_at = EXCLUDED.updated_at;

INSERT INTO breed_physical_traits (
    breed_id,
    snout,
    ears,
    coat,
    tail,
    created_at,
    updated_at
)
SELECT
    b.breed_id,
    b.snout,
    b.ears,
    b.coat,
    b.tail,
    COALESCE(b.created_at, CURRENT_TIMESTAMP),
    COALESCE(b.updated_at, CURRENT_TIMESTAMP)
FROM breeds b
ON CONFLICT (breed_id) DO UPDATE SET
    snout = EXCLUDED.snout,
    ears = EXCLUDED.ears,
    coat = EXCLUDED.coat,
    tail = EXCLUDED.tail,
    updated_at = EXCLUDED.updated_at;

INSERT INTO breed_measurements (
    breed_id,
    height_min,
    height_max,
    weight_min,
    weight_max,
    lifespan_min,
    lifespan_max,
    created_at,
    updated_at
)
SELECT
    b.breed_id,
    b.height_min,
    b.height_max,
    b.weight_min,
    b.weight_max,
    b.lifespan_min,
    b.lifespan_max,
    COALESCE(b.created_at, CURRENT_TIMESTAMP),
    COALESCE(b.updated_at, CURRENT_TIMESTAMP)
FROM breeds b
ON CONFLICT (breed_id) DO UPDATE SET
    height_min = EXCLUDED.height_min,
    height_max = EXCLUDED.height_max,
    weight_min = EXCLUDED.weight_min,
    weight_max = EXCLUDED.weight_max,
    lifespan_min = EXCLUDED.lifespan_min,
    lifespan_max = EXCLUDED.lifespan_max,
    updated_at = EXCLUDED.updated_at;

INSERT INTO breed_temperaments (breed_id, temperament, sort_order)
SELECT
    b.breed_id,
    TRIM(t.temperament),
    GREATEST(0, t.ordinality - 1)::SMALLINT
FROM breeds b
CROSS JOIN LATERAL UNNEST(COALESCE(b.temperament, ARRAY[]::TEXT[])) WITH ORDINALITY AS t(temperament, ordinality)
WHERE NULLIF(TRIM(t.temperament), '') IS NOT NULL
ON CONFLICT (breed_id, temperament) DO UPDATE SET
    sort_order = EXCLUDED.sort_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_breeds_class_index_unique
    ON breeds (class_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_breeds_class_name_lower_unique
    ON breeds ((LOWER(class_name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_breeds_display_name_lower_unique
    ON breeds ((LOWER(display_name)));

CREATE OR REPLACE VIEW breed_catalog_view AS
SELECT
    b.breed_id,
    b.class_index,
    b.class_name,
    b.display_name,
    b.image_url,
    b.size,
    bp.description,
    bpt.snout,
    bpt.ears,
    bpt.coat,
    bpt.tail,
    bm.height_min,
    bm.height_max,
    bm.weight_min,
    bm.weight_max,
    bm.lifespan_min,
    bm.lifespan_max,
    bp.origin,
    bp.breed_group,
    COALESCE(array_remove(array_agg(bt.temperament ORDER BY bt.sort_order), NULL), ARRAY[]::TEXT[]) AS temperament,
    bp.health_considerations,
    bp.key_health_tips,
    b.popularity_score,
    b.created_at,
    b.updated_at
FROM breeds b
LEFT JOIN breed_profiles bp
    ON bp.breed_id = b.breed_id
LEFT JOIN breed_physical_traits bpt
    ON bpt.breed_id = b.breed_id
LEFT JOIN breed_measurements bm
    ON bm.breed_id = b.breed_id
LEFT JOIN breed_temperaments bt
    ON bt.breed_id = b.breed_id
GROUP BY
    b.breed_id,
    bp.breed_id,
    bpt.breed_id,
    bm.breed_id;

-- ============================================================
-- CONTRIBUTION + APPROVED SAMPLE NORMALIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_contribution_predictions (
    id                     SERIAL PRIMARY KEY,
    contribution_id        INTEGER          NOT NULL REFERENCES scan_contributions (id) ON DELETE CASCADE,
    rank                   SMALLINT         NOT NULL CHECK (rank BETWEEN 1 AND 10),
    breed_id               INTEGER          REFERENCES breeds (breed_id) ON DELETE SET NULL,
    class_name             VARCHAR(100)     NOT NULL,
    display_name           VARCHAR(100)     NOT NULL,
    confidence             DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    created_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (contribution_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_scan_contribution_predictions_contribution
    ON scan_contribution_predictions (contribution_id);

CREATE INDEX IF NOT EXISTS idx_scan_contribution_predictions_breed
    ON scan_contribution_predictions (breed_id);

INSERT INTO scan_contribution_predictions (
    contribution_id,
    rank,
    breed_id,
    class_name,
    display_name,
    confidence,
    created_at,
    updated_at
)
SELECT
    sc.id,
    COALESCE(NULLIF(pred.item ->> 'rank', '')::SMALLINT, pred.ordinality::SMALLINT),
    CASE
        WHEN NULLIF(pred.item ->> 'breed_id', '') IS NULL THEN NULL
        ELSE (pred.item ->> 'breed_id')::INTEGER
    END,
    COALESCE(
        NULLIF(pred.item ->> 'class_name', ''),
        NULLIF(pred.item ->> 'display_name', ''),
        'prediction_' || pred.ordinality
    ),
    COALESCE(
        NULLIF(pred.item ->> 'display_name', ''),
        NULLIF(pred.item ->> 'class_name', ''),
        'Prediction ' || pred.ordinality
    ),
    COALESCE(NULLIF(pred.item ->> 'confidence', '')::DOUBLE PRECISION, 0),
    COALESCE(sc.submitted_at, CURRENT_TIMESTAMP),
    COALESCE(sc.updated_at, sc.submitted_at, CURRENT_TIMESTAMP)
FROM scan_contributions sc
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(sc.original_predictions) = 'array' THEN sc.original_predictions
        ELSE '[]'::JSONB
    END
) WITH ORDINALITY AS pred(item, ordinality)
ON CONFLICT (contribution_id, rank) DO UPDATE SET
    breed_id = EXCLUDED.breed_id,
    class_name = EXCLUDED.class_name,
    display_name = EXCLUDED.display_name,
    confidence = EXCLUDED.confidence,
    updated_at = EXCLUDED.updated_at;

CREATE TABLE IF NOT EXISTS scan_contribution_reviews (
    contribution_id        INTEGER PRIMARY KEY REFERENCES scan_contributions (id) ON DELETE CASCADE,
    reviewed_at            TIMESTAMP,
    reviewed_by            INTEGER          REFERENCES users (id) ON DELETE SET NULL,
    review_reason          TEXT,
    final_breed_id         INTEGER          REFERENCES breeds (breed_id) ON DELETE SET NULL,
    final_class_name       VARCHAR(100),
    final_display_name     VARCHAR(100),
    created_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_contribution_reviews_reviewer
    ON scan_contribution_reviews (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_scan_contribution_reviews_final_breed
    ON scan_contribution_reviews (final_breed_id);

INSERT INTO scan_contribution_reviews (
    contribution_id,
    reviewed_at,
    reviewed_by,
    review_reason,
    final_breed_id,
    final_class_name,
    final_display_name,
    created_at,
    updated_at
)
SELECT
    sc.id,
    sc.reviewed_at,
    sc.reviewed_by,
    sc.review_reason,
    sc.final_breed_id,
    sc.final_class_name,
    sc.final_display_name,
    COALESCE(sc.reviewed_at, sc.updated_at, sc.submitted_at, CURRENT_TIMESTAMP),
    COALESCE(sc.updated_at, sc.reviewed_at, sc.submitted_at, CURRENT_TIMESTAMP)
FROM scan_contributions sc
WHERE sc.reviewed_at IS NOT NULL
   OR sc.reviewed_by IS NOT NULL
   OR sc.review_reason IS NOT NULL
   OR sc.final_breed_id IS NOT NULL
   OR sc.final_class_name IS NOT NULL
   OR sc.final_display_name IS NOT NULL
ON CONFLICT (contribution_id) DO UPDATE SET
    reviewed_at = EXCLUDED.reviewed_at,
    reviewed_by = EXCLUDED.reviewed_by,
    review_reason = EXCLUDED.review_reason,
    final_breed_id = EXCLUDED.final_breed_id,
    final_class_name = EXCLUDED.final_class_name,
    final_display_name = EXCLUDED.final_display_name,
    updated_at = EXCLUDED.updated_at;

CREATE TABLE IF NOT EXISTS approved_sample_predictions (
    id                     SERIAL PRIMARY KEY,
    approved_sample_id     INTEGER          NOT NULL REFERENCES approved_samples (id) ON DELETE CASCADE,
    rank                   SMALLINT         NOT NULL CHECK (rank BETWEEN 1 AND 10),
    breed_id               INTEGER          REFERENCES breeds (breed_id) ON DELETE SET NULL,
    class_name             VARCHAR(100)     NOT NULL,
    display_name           VARCHAR(100)     NOT NULL,
    confidence             DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    created_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (approved_sample_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_approved_sample_predictions_sample
    ON approved_sample_predictions (approved_sample_id);

CREATE INDEX IF NOT EXISTS idx_approved_sample_predictions_breed
    ON approved_sample_predictions (breed_id);

INSERT INTO approved_sample_predictions (
    approved_sample_id,
    rank,
    breed_id,
    class_name,
    display_name,
    confidence,
    created_at
)
SELECT
    aps.id,
    COALESCE(NULLIF(pred.item ->> 'rank', '')::SMALLINT, pred.ordinality::SMALLINT),
    CASE
        WHEN NULLIF(pred.item ->> 'breed_id', '') IS NULL THEN NULL
        ELSE (pred.item ->> 'breed_id')::INTEGER
    END,
    COALESCE(
        NULLIF(pred.item ->> 'class_name', ''),
        NULLIF(pred.item ->> 'display_name', ''),
        'prediction_' || pred.ordinality
    ),
    COALESCE(
        NULLIF(pred.item ->> 'display_name', ''),
        NULLIF(pred.item ->> 'class_name', ''),
        'Prediction ' || pred.ordinality
    ),
    COALESCE(NULLIF(pred.item ->> 'confidence', '')::DOUBLE PRECISION, 0),
    COALESCE(aps.approved_at, CURRENT_TIMESTAMP)
FROM approved_samples aps
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(aps.original_predictions) = 'array' THEN aps.original_predictions
        ELSE '[]'::JSONB
    END
) WITH ORDINALITY AS pred(item, ordinality)
ON CONFLICT (approved_sample_id, rank) DO UPDATE SET
    breed_id = EXCLUDED.breed_id,
    class_name = EXCLUDED.class_name,
    display_name = EXCLUDED.display_name,
    confidence = EXCLUDED.confidence;

CREATE OR REPLACE VIEW scan_contribution_records_view AS
SELECT
    sc.id,
    sc.scan_id,
    sc.user_id,
    sc.status,
    sc.source_image_url,
    COALESCE(predictions.original_predictions, sc.original_predictions, '[]'::JSONB) AS original_predictions,
    COALESCE(top_pred.breed_id, sc.model_top1_breed_id) AS model_top1_breed_id,
    COALESCE(top_pred.class_name, sc.model_top1_class_name) AS model_top1_class_name,
    COALESCE(top_pred.display_name, sc.model_top1_display_name) AS model_top1_display_name,
    COALESCE(top_pred.confidence, sc.model_top1_confidence::DOUBLE PRECISION) AS model_top1_confidence,
    sc.consent_given_at,
    sc.submitted_at,
    COALESCE(scr.reviewed_at, sc.reviewed_at) AS reviewed_at,
    COALESCE(scr.reviewed_by, sc.reviewed_by) AS reviewed_by,
    COALESCE(scr.review_reason, sc.review_reason) AS review_reason,
    COALESCE(scr.final_breed_id, sc.final_breed_id) AS final_breed_id,
    COALESCE(scr.final_class_name, sc.final_class_name) AS final_class_name,
    COALESCE(scr.final_display_name, sc.final_display_name) AS final_display_name,
    sc.updated_at
FROM scan_contributions sc
LEFT JOIN scan_contribution_reviews scr
    ON scr.contribution_id = sc.id
LEFT JOIN LATERAL (
    SELECT
        scp.breed_id,
        scp.class_name,
        scp.display_name,
        scp.confidence
    FROM scan_contribution_predictions scp
    WHERE scp.contribution_id = sc.id
    ORDER BY scp.rank ASC
    LIMIT 1
) AS top_pred
    ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', scp.rank,
            'breed_id', scp.breed_id,
            'class_name', scp.class_name,
            'display_name', scp.display_name,
            'confidence', scp.confidence
        )
        ORDER BY scp.rank ASC
    ) AS original_predictions
    FROM scan_contribution_predictions scp
    WHERE scp.contribution_id = sc.id
) AS predictions
    ON TRUE;

-- ============================================================
-- ASSISTANT SCAN CONTEXT NORMALIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS assistant_thread_scan_contexts (
    thread_id               INTEGER PRIMARY KEY REFERENCES assistant_threads (id) ON DELETE CASCADE,
    scan_type               VARCHAR(20)      NOT NULL DEFAULT 'breed'
                                CHECK (scan_type IN ('breed', 'disease')),
    uploaded_image_url      TEXT,
    emotion_class_name      VARCHAR(100),
    emotion_display_name    VARCHAR(100),
    emotion_class_index     INTEGER,
    emotion_confidence      DOUBLE PRECISION
                                CHECK (
                                    emotion_confidence IS NULL
                                    OR (emotion_confidence >= 0 AND emotion_confidence <= 100)
                                ),
    age_class_name          VARCHAR(100),
    age_display_name        VARCHAR(100),
    age_class_index         INTEGER,
    age_confidence          DOUBLE PRECISION
                                CHECK (
                                    age_confidence IS NULL
                                    OR (age_confidence >= 0 AND age_confidence <= 100)
                                ),
    raw_context             JSONB,
    created_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assistant_thread_scan_breeds (
    id                      SERIAL PRIMARY KEY,
    thread_id               INTEGER          NOT NULL REFERENCES assistant_threads (id) ON DELETE CASCADE,
    rank                    SMALLINT         NOT NULL CHECK (rank BETWEEN 1 AND 10),
    breed_id                INTEGER          REFERENCES breeds (breed_id) ON DELETE SET NULL,
    mix_share               DOUBLE PRECISION,
    class_name              VARCHAR(100)     NOT NULL,
    display_name            VARCHAR(100)     NOT NULL,
    confidence              DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    created_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thread_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_assistant_thread_scan_breeds_thread
    ON assistant_thread_scan_breeds (thread_id);

CREATE INDEX IF NOT EXISTS idx_assistant_thread_scan_breeds_breed
    ON assistant_thread_scan_breeds (breed_id);

INSERT INTO assistant_thread_scan_contexts (
    thread_id,
    scan_type,
    uploaded_image_url,
    emotion_class_name,
    emotion_display_name,
    emotion_class_index,
    emotion_confidence,
    age_class_name,
    age_display_name,
    age_class_index,
    age_confidence,
    raw_context,
    created_at,
    updated_at
)
SELECT
    at.id,
    COALESCE(NULLIF(at.scan_context ->> 'scan_type', ''), 'breed'),
    NULLIF(at.scan_context ->> 'uploaded_image_url', ''),
    NULLIF(at.scan_context -> 'emotion' ->> 'class_name', ''),
    NULLIF(at.scan_context -> 'emotion' ->> 'display_name', ''),
    CASE
        WHEN NULLIF(at.scan_context -> 'emotion' ->> 'class_index', '') IS NULL THEN NULL
        ELSE (at.scan_context -> 'emotion' ->> 'class_index')::INTEGER
    END,
    CASE
        WHEN NULLIF(at.scan_context -> 'emotion' ->> 'confidence', '') IS NULL THEN NULL
        ELSE (at.scan_context -> 'emotion' ->> 'confidence')::DOUBLE PRECISION
    END,
    NULLIF(at.scan_context -> 'age' ->> 'class_name', ''),
    NULLIF(at.scan_context -> 'age' ->> 'display_name', ''),
    CASE
        WHEN NULLIF(at.scan_context -> 'age' ->> 'class_index', '') IS NULL THEN NULL
        ELSE (at.scan_context -> 'age' ->> 'class_index')::INTEGER
    END,
    CASE
        WHEN NULLIF(at.scan_context -> 'age' ->> 'confidence', '') IS NULL THEN NULL
        ELSE (at.scan_context -> 'age' ->> 'confidence')::DOUBLE PRECISION
    END,
    at.scan_context,
    at.created_at,
    at.updated_at
FROM assistant_threads at
WHERE at.thread_type = 'scan'
  AND at.scan_context IS NOT NULL
ON CONFLICT (thread_id) DO UPDATE SET
    scan_type = EXCLUDED.scan_type,
    uploaded_image_url = EXCLUDED.uploaded_image_url,
    emotion_class_name = EXCLUDED.emotion_class_name,
    emotion_display_name = EXCLUDED.emotion_display_name,
    emotion_class_index = EXCLUDED.emotion_class_index,
    emotion_confidence = EXCLUDED.emotion_confidence,
    age_class_name = EXCLUDED.age_class_name,
    age_display_name = EXCLUDED.age_display_name,
    age_class_index = EXCLUDED.age_class_index,
    age_confidence = EXCLUDED.age_confidence,
    raw_context = EXCLUDED.raw_context,
    updated_at = EXCLUDED.updated_at;

INSERT INTO assistant_thread_scan_breeds (
    thread_id,
    rank,
    breed_id,
    mix_share,
    class_name,
    display_name,
    confidence,
    created_at
)
SELECT
    at.id,
    COALESCE(NULLIF(pred.item ->> 'rank', '')::SMALLINT, pred.ordinality::SMALLINT),
    CASE
        WHEN NULLIF(pred.item ->> 'breed_id', '') IS NULL THEN NULL
        ELSE (pred.item ->> 'breed_id')::INTEGER
    END,
    CASE
        WHEN NULLIF(pred.item ->> 'mix_share', '') IS NULL THEN NULL
        ELSE (pred.item ->> 'mix_share')::DOUBLE PRECISION
    END,
    COALESCE(
        NULLIF(pred.item ->> 'class_name', ''),
        NULLIF(pred.item ->> 'display_name', ''),
        'prediction_' || pred.ordinality
    ),
    COALESCE(
        NULLIF(pred.item ->> 'display_name', ''),
        NULLIF(pred.item ->> 'class_name', ''),
        'Prediction ' || pred.ordinality
    ),
    COALESCE(NULLIF(pred.item ->> 'confidence', '')::DOUBLE PRECISION, 0),
    at.created_at
FROM assistant_threads at
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(at.scan_context -> 'top_breeds') = 'array' THEN at.scan_context -> 'top_breeds'
        ELSE '[]'::JSONB
    END
) WITH ORDINALITY AS pred(item, ordinality)
WHERE at.thread_type = 'scan'
  AND at.scan_context IS NOT NULL
ON CONFLICT (thread_id, rank) DO UPDATE SET
    breed_id = EXCLUDED.breed_id,
    mix_share = EXCLUDED.mix_share,
    class_name = EXCLUDED.class_name,
    display_name = EXCLUDED.display_name,
    confidence = EXCLUDED.confidence;

CREATE OR REPLACE VIEW assistant_thread_records_view AS
SELECT
    at.id,
    at.user_id,
    at.thread_type,
    COALESCE(
        CASE
            WHEN at.thread_type = 'scan' THEN ctx.scan_context
            ELSE at.scan_context
        END,
        at.scan_context
    ) AS scan_context,
    at.created_at,
    at.updated_at
FROM assistant_threads at
LEFT JOIN LATERAL (
    SELECT jsonb_strip_nulls(
        jsonb_build_object(
            'scan_type', atsc.scan_type,
            'uploaded_image_url', atsc.uploaded_image_url,
            'emotion',
                CASE
                    WHEN atsc.emotion_class_name IS NULL
                     AND atsc.emotion_display_name IS NULL
                     AND atsc.emotion_class_index IS NULL
                     AND atsc.emotion_confidence IS NULL THEN NULL
                    ELSE jsonb_strip_nulls(
                        jsonb_build_object(
                            'class_name', atsc.emotion_class_name,
                            'display_name', atsc.emotion_display_name,
                            'class_index', atsc.emotion_class_index,
                            'confidence', atsc.emotion_confidence
                        )
                    )
                END,
            'age',
                CASE
                    WHEN atsc.age_class_name IS NULL
                     AND atsc.age_display_name IS NULL
                     AND atsc.age_class_index IS NULL
                     AND atsc.age_confidence IS NULL THEN NULL
                    ELSE jsonb_strip_nulls(
                        jsonb_build_object(
                            'class_name', atsc.age_class_name,
                            'display_name', atsc.age_display_name,
                            'class_index', atsc.age_class_index,
                            'confidence', atsc.age_confidence
                        )
                    )
                END,
            'top_breeds',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_strip_nulls(
                                jsonb_build_object(
                                    'rank', atsb.rank,
                                    'breed_id', atsb.breed_id,
                                    'mix_share', atsb.mix_share,
                                    'class_name', atsb.class_name,
                                    'display_name', atsb.display_name,
                                    'confidence', atsb.confidence
                                )
                            )
                            ORDER BY atsb.rank ASC
                        )
                        FROM assistant_thread_scan_breeds atsb
                        WHERE atsb.thread_id = at.id
                    ),
                    '[]'::JSONB
                )
        )
    ) AS scan_context
    FROM assistant_thread_scan_contexts atsc
    WHERE atsc.thread_id = at.id
) AS ctx
    ON TRUE;

COMMIT;
