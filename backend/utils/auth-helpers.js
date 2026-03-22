const jwt = require("jsonwebtoken");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_USERNAME_PREFIX = "dogscan";
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.";

const USER_SELECT_COLUMNS = `
  u.id,
  u.email,
  u.username,
  u.created_at,
  u.updated_at,
  u.is_admin,
  u.is_superadmin,
  u.session_version,
  u.is_banned,
  u.banned_until,
  u.ban_reason,
  u.banned_at,
  u.banned_by,
  u.username_changed_at,
  u.email_changed_at,
  u.password_changed_at,
  EXISTS (
    SELECT 1
    FROM user_password_credentials upc
    WHERE upc.user_id = u.id
  ) AS has_password,
  COALESCE(
    ARRAY(
      SELECT DISTINCT uoa.provider
      FROM user_oauth_accounts uoa
      WHERE uoa.user_id = u.id
      ORDER BY uoa.provider
    ),
    ARRAY[]::text[]
  ) AS oauth_providers
`;

function normalizeEmail(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function trimValue(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function getPasswordValidationError(password, label = "Password") {
  const value = typeof password === "string" ? password : "";
  if (value.length < 8) {
    return `${label} must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.`;
  }
  if (!/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return `${label} must include at least 1 uppercase letter, 1 number, and 1 special character.`;
  }
  return null;
}

function toUsernameSeed(raw) {
  const value = trimValue(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (value.length >= 3) return value.slice(0, 32);
  return "";
}

function buildAuthProviders(user) {
  const providers = [];
  if (Boolean(user?.has_password)) providers.push("password");

  for (const provider of user?.oauth_providers ?? []) {
    const normalized = trimValue(provider).toLowerCase();
    if (normalized && !providers.includes(normalized)) {
      providers.push(normalized);
    }
  }

  return providers;
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: user.created_at,
    is_admin: Boolean(user.is_admin),
    is_superadmin: Boolean(user.is_superadmin),
    is_banned: Boolean(user.is_banned),
    banned_until: user.banned_until,
    auth_providers: buildAuthProviders(user),
  };
}

function buildTokenPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    sv: Number(user.session_version ?? 1),
  };
}

function signToken(user) {
  return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function getUserAuthStateById(client, userId) {
  const result = await client.query(
    `SELECT ${USER_SELECT_COLUMNS}
     FROM users u
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function getUserAuthStateByEmail(client, email) {
  const result = await client.query(
    `SELECT ${USER_SELECT_COLUMNS}
     FROM users u
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

async function getUserLoginStateByEmail(client, email) {
  const result = await client.query(
    `SELECT ${USER_SELECT_COLUMNS},
            (
              SELECT upc.password_hash
              FROM user_password_credentials upc
              WHERE upc.user_id = u.id
              LIMIT 1
            ) AS password_hash
     FROM users u
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

async function getUserLoginStateById(client, userId) {
  const result = await client.query(
    `SELECT ${USER_SELECT_COLUMNS},
            (
              SELECT upc.password_hash
              FROM user_password_credentials upc
              WHERE upc.user_id = u.id
              LIMIT 1
            ) AS password_hash
     FROM users u
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function getUserByOAuthSubject(client, provider, providerSubject) {
  const result = await client.query(
    `SELECT ${USER_SELECT_COLUMNS}
     FROM users u
     JOIN user_oauth_accounts uoa
       ON uoa.user_id = u.id
      AND uoa.provider = $1
      AND uoa.provider_subject = $2
     LIMIT 1`,
    [provider, providerSubject]
  );

  return result.rows[0] ?? null;
}

async function upsertPasswordCredential(client, userId, passwordHash) {
  await client.query(
    `INSERT INTO user_password_credentials (user_id, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       updated_at = NOW()`,
    [userId, passwordHash]
  );

  await client.query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

async function linkOAuthAccount(
  client,
  {
    userId,
    provider,
    providerSubject,
    providerEmail = null,
    emailVerified = false,
    profileName = null,
    profileImageUrl = null,
  }
) {
  const subjectConflict = await client.query(
    `SELECT user_id
     FROM user_oauth_accounts
     WHERE provider = $1
       AND provider_subject = $2
     LIMIT 1`,
    [provider, providerSubject]
  );

  if (
    subjectConflict.rows.length > 0 &&
    Number(subjectConflict.rows[0].user_id) !== Number(userId)
  ) {
    const error = new Error("OAuth account is already linked to another user.");
    error.code = "OAUTH_SUBJECT_CONFLICT";
    throw error;
  }

  await client.query(
    `INSERT INTO user_oauth_accounts (
       user_id,
       provider,
       provider_subject,
       provider_email,
       email_verified,
       profile_name,
       profile_image_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       provider_subject = EXCLUDED.provider_subject,
       provider_email = EXCLUDED.provider_email,
       email_verified = EXCLUDED.email_verified,
       profile_name = EXCLUDED.profile_name,
       profile_image_url = EXCLUDED.profile_image_url,
       updated_at = NOW()`,
    [
      userId,
      provider,
      providerSubject,
      providerEmail,
      emailVerified,
      profileName,
      profileImageUrl,
    ]
  );
}

async function generateUniqueUsername(client, rawSeed) {
  const baseSeed =
    toUsernameSeed(rawSeed) ||
    `${DEFAULT_USERNAME_PREFIX}_${Math.floor(Math.random() * 10000)}`;

  let attempt = 0;

  while (attempt < 500) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${baseSeed.slice(0, Math.max(3, 32 - suffix.length))}${suffix}`;
    const exists = await client.query(
      `SELECT 1
       FROM users
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [candidate]
    );

    if (exists.rows.length === 0) {
      return candidate;
    }

    attempt += 1;
  }

  return `${DEFAULT_USERNAME_PREFIX}_${Date.now()}`;
}

async function unbanIfExpired(client, user) {
  if (!user?.is_banned) return user;

  const banEnd = user.banned_until ? new Date(user.banned_until) : null;
  const banEndTime = banEnd ? banEnd.getTime() : NaN;
  const hasExpired = !banEnd || Number.isNaN(banEndTime) || banEndTime <= Date.now();
  if (!hasExpired) return user;

  await client.query(
    `UPDATE users
     SET is_banned = FALSE,
         banned_until = NULL,
         ban_reason = NULL,
         banned_at = NULL,
         banned_by = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return getUserAuthStateById(client, user.id);
}

module.exports = {
  EMAIL_REGEX,
  PASSWORD_POLICY_MESSAGE,
  buildAuthProviders,
  buildTokenPayload,
  generateUniqueUsername,
  getUserAuthStateByEmail,
  getUserAuthStateById,
  getUserByOAuthSubject,
  getUserLoginStateByEmail,
  getUserLoginStateById,
  getPasswordValidationError,
  linkOAuthAccount,
  normalizeEmail,
  serializeUser,
  signToken,
  trimValue,
  unbanIfExpired,
  upsertPasswordCredential,
};
