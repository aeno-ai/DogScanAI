const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const axios = require("axios");
const db = require("../config/database");
const auth = require("../middleware/auth");
const { replaceAssistantScanContext } = require("../utils/assistant-context");

const router = express.Router();
const FLASK_URL = process.env.FLASK_API_URL;
const DB_UNAVAILABLE_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "57P01", "57P02", "57P03"]);

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = Math.max(
  1,
  Number.parseInt("6", 10) || 6
);
const MAX_HISTORY_CHARS = Math.max(
  64,
  Number.parseInt( "500", 10) || 500
);

router.use(auth);

function getUserId(req) {
  const id = Number(req.user?.userId ?? req.user?.id);
  return Number.isInteger(id) ? id : null;
}

function isDbUnavailable(err) {
  return DB_UNAVAILABLE_CODES.has(err?.code);
}

function handleDbError(err, res, context) {
  if (isDbUnavailable(err)) {
    return res.status(503).json({ error: "Database unavailable. Please try again." });
  }
  if (err?.code === "42P01") {
    return res.status(500).json({ error: "Assistant tables missing. Run migrations first." });
  }
  console.error(`[${context}] Error:`, err.message);
  return res.status(500).json({ error: "An unexpected error occurred." });
}

function normalizeMessage(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return text.length > MAX_MESSAGE_CHARS ? text.slice(0, MAX_MESSAGE_CHARS) : text;
}

function normalizeHistoryContent(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text.length > MAX_HISTORY_CHARS ? text.slice(0, MAX_HISTORY_CHARS) : text;
}

function normalizeLimit(value, fallback = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
}

async function getThreadForUser(threadId, userId) {
  const result = await db.query(
    `SELECT id, user_id, thread_type, scan_context, created_at, updated_at
     FROM assistant_thread_records_view
     WHERE id = $1 AND user_id = $2`,
    [threadId, userId]
  );
  return result.rows[0] ?? null;
}

router.post("/threads/general", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Invalid auth payload." });

  try {
    const existing = await db.query(
      `SELECT id, user_id, thread_type, scan_context, created_at, updated_at
       FROM assistant_thread_records_view
       WHERE user_id = $1 AND thread_type = 'general'
       LIMIT 1`,
      [userId]
    );

    if (existing.rows[0]) {
      return res.json(existing.rows[0]);
    }

    const inserted = await db.query(
      `INSERT INTO assistant_threads (user_id, thread_type, scan_context)
       VALUES ($1, 'general', NULL)
       RETURNING id`,
      [userId]
    );
    const thread = await getThreadForUser(inserted.rows[0].id, userId);
    return res.status(201).json(thread);
  } catch (err) {
    // Protect against race conditions from double-clicks.
    if (err?.code === "23505") {
      try {
        const retry = await db.query(
          `SELECT id, user_id, thread_type, scan_context, created_at, updated_at
           FROM assistant_thread_records_view
           WHERE user_id = $1 AND thread_type = 'general'
           LIMIT 1`,
          [userId]
        );
        if (retry.rows[0]) return res.json(retry.rows[0]);
      } catch (retryErr) {
        return handleDbError(retryErr, res, "assistant:threads:general:retry");
      }
    }
    return handleDbError(err, res, "assistant:threads:general");
  }
});

router.post("/threads/scan", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Invalid auth payload." });

  const scanContext = req.body?.scan_context;
  if (!scanContext || typeof scanContext !== "object" || Array.isArray(scanContext)) {
    return res.status(400).json({ error: "scan_context object is required." });
  }

  try {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO assistant_threads (user_id, thread_type, scan_context)
         VALUES ($1, 'scan', $2::jsonb)
         RETURNING id`,
        [userId, JSON.stringify(scanContext)]
      );
      await replaceAssistantScanContext(client, inserted.rows[0].id, scanContext);
      const threadResult = await client.query(
        `SELECT id, user_id, thread_type, scan_context, created_at, updated_at
         FROM assistant_thread_records_view
         WHERE id = $1 AND user_id = $2`,
        [inserted.rows[0].id, userId]
      );
      await client.query("COMMIT");
      return res.status(201).json(threadResult.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return handleDbError(err, res, "assistant:threads:scan");
  }
});

router.get("/threads/:threadId/messages", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Invalid auth payload." });

  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread id." });
  }

  const limit = normalizeLimit(req.query.limit, 50);

  try {
    const thread = await getThreadForUser(threadId, userId);
    if (!thread) return res.status(404).json({ error: "Thread not found." });

    const messagesResult = await db.query(
      `SELECT id, thread_id, role, content, created_at
       FROM assistant_messages
       WHERE thread_id = $1
       ORDER BY id DESC
       LIMIT $2`,
      [threadId, limit]
    );

    return res.json({
      thread,
      messages: messagesResult.rows.slice().reverse(),
    });
  } catch (err) {
    return handleDbError(err, res, "assistant:messages:list");
  }
});

router.post("/threads/:threadId/messages", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Invalid auth payload." });

  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread id." });
  }

  const message = normalizeMessage(req.body?.message);
  if (!message) {
    return res.status(400).json({ error: "message is required." });
  }

  try {
    const thread = await getThreadForUser(threadId, userId);
    if (!thread) return res.status(404).json({ error: "Thread not found." });

    const historyResult = await db.query(
      `SELECT role, content
       FROM assistant_messages
       WHERE thread_id = $1
       ORDER BY id DESC
       LIMIT $2`,
      [threadId, MAX_HISTORY_MESSAGES]
    );
    const history = historyResult.rows
      .slice()
      .reverse()
      .map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: normalizeHistoryContent(row.content),
      }))
      .filter((row) => row.content);

    let replyText = "";
    try {
      const flaskResponse = await axios.post(
        `${FLASK_URL}/assistant/chat`,
        {
          message,
          thread_type: thread.thread_type,
          scan_context: thread.scan_context,
          history,
        },
        { timeout: 120000 }
      );
      replyText = typeof flaskResponse.data?.reply === "string" ? flaskResponse.data.reply.trim() : "";
    } catch (err) {
      if (err.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Assistant service unavailable. Start the Flask app with: python app.py",
        });
      }
      const msg = err?.response?.data?.error || err.message || "Assistant request failed.";
      return res.status(502).json({ error: msg });
    }

    if (!replyText) {
      return res.status(502).json({ error: "Assistant returned an empty response." });
    }

    const userMessageResult = await db.query(
      `INSERT INTO assistant_messages (thread_id, role, content)
       VALUES ($1, 'user', $2)
       RETURNING id, thread_id, role, content, created_at`,
      [threadId, message]
    );

    const assistantMessageResult = await db.query(
      `INSERT INTO assistant_messages (thread_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING id, thread_id, role, content, created_at`,
      [threadId, replyText]
    );

    await db.query(
      `UPDATE assistant_threads
       SET updated_at = NOW()
       WHERE id = $1`,
      [threadId]
    );

    return res.json({
      thread_id: threadId,
      user_message: userMessageResult.rows[0],
      assistant_message: assistantMessageResult.rows[0],
    });
  } catch (err) {
    return handleDbError(err, res, "assistant:messages:create");
  }
});

module.exports = router;
