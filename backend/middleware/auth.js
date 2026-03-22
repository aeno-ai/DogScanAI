const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  buildAuthProviders,
  getUserAuthStateById,
  unbanIfExpired,
} = require("../utils/auth-helpers");

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

    const initialUser = await getUserAuthStateById(pool, userId);
    if (!initialUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = await unbanIfExpired(pool, initialUser);
    if (user.is_banned) {
      return res.status(403).json({
        error: "Your account is banned.",
        code: "ACCOUNT_BANNED",
        banned_until: user.banned_until,
        ban_reason: user.ban_reason || null,
      });
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
      auth_providers: buildAuthProviders(user),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authenticateToken;
