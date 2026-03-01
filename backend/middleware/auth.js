const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function readToken(req) {
  return (
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]) ||
    null
  );
}

async function authenticateToken(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: "Access denied. Please login." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId ?? decoded?.id;

    if (!Number.isInteger(Number(userId))) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const result = await pool.query(
      `SELECT
        id, email, username, is_admin, is_superadmin,
        session_version, is_banned, banned_until, ban_reason
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];
    if (user.is_banned) {
      const banEnd = user.banned_until ? new Date(user.banned_until) : null;
      const banEndTime = banEnd ? banEnd.getTime() : NaN;
      const hasExpired = !banEnd || Number.isNaN(banEndTime) || banEndTime <= Date.now();

      if (hasExpired) {
        await pool.query(
          `UPDATE users
           SET is_banned = FALSE,
               banned_until = NULL,
               ban_reason = NULL,
               banned_at = NULL,
               banned_by = NULL
           WHERE id = $1`,
          [user.id]
        );
      } else {
        return res.status(403).json({
          error: "Your account is banned.",
          code: "ACCOUNT_BANNED",
          banned_until: user.banned_until,
          ban_reason: user.ban_reason || null,
        });
      }
    }

    const tokenSessionVersion = Number(decoded?.sv ?? 1);
    if (tokenSessionVersion !== Number(user.session_version ?? 1)) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    req.user = {
      ...decoded,
      id: user.id,
      userId: user.id,
      email: user.email,
      username: user.username,
      is_admin: Boolean(user.is_admin),
      is_superadmin: Boolean(user.is_superadmin),
      session_version: Number(user.session_version ?? 1),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authenticateToken;
