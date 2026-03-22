const { createPublicKey, verify } = require("crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);
const CLOCK_SKEW_SECONDS = 60;

let cachedKeys = [];
let cachedExpiryMs = 0;

class GoogleAuthError extends Error {
  constructor(message, code = "GOOGLE_AUTH_INVALID_TOKEN", status = 401) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
    this.status = status;
  }
}

function base64UrlToBuffer(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function parseJwtSegment(segment) {
  try {
    return JSON.parse(base64UrlToBuffer(segment).toString("utf8"));
  } catch {
    throw new GoogleAuthError("Google ID token is malformed.");
  }
}

function parseJwt(idToken) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) {
    throw new GoogleAuthError("Google ID token is malformed.");
  }

  return {
    header: parseJwtSegment(parts[0]),
    payload: parseJwtSegment(parts[1]),
    signature: base64UrlToBuffer(parts[2]),
    signingInput: Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"),
  };
}

function parseMaxAge(cacheControlHeader) {
  const match = String(cacheControlHeader || "").match(/max-age=(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 3600;
}

async function fetchGoogleJwks(forceRefresh = false) {
  if (!forceRefresh && cachedKeys.length > 0 && Date.now() < cachedExpiryMs) {
    return cachedKeys;
  }

  let response;
  try {
    response = await fetch(GOOGLE_JWKS_URL, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new GoogleAuthError(
      "Google verification service is unavailable.",
      "GOOGLE_AUTH_UNAVAILABLE",
      503
    );
  }

  if (!response.ok) {
    throw new GoogleAuthError(
      "Google verification service is unavailable.",
      "GOOGLE_AUTH_UNAVAILABLE",
      503
    );
  }

  const payload = await response.json();
  cachedKeys = Array.isArray(payload?.keys) ? payload.keys : [];
  cachedExpiryMs = Date.now() + parseMaxAge(response.headers.get("cache-control")) * 1000;
  return cachedKeys;
}

function isAllowedAudience(aud, allowedClientIds) {
  if (!allowedClientIds.length) return false;
  if (typeof aud === "string") return allowedClientIds.includes(aud);
  if (Array.isArray(aud)) {
    return aud.some((value) => allowedClientIds.includes(String(value)));
  }
  return false;
}

function validateClaims(payload, allowedClientIds) {
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload?.exp || 0);
  const iat = Number(payload?.iat || 0);
  const nbf = Number(payload?.nbf || 0);

  if (!GOOGLE_ISSUERS.has(String(payload?.iss || ""))) {
    throw new GoogleAuthError("Google token issuer is invalid.");
  }
  if (!payload?.sub) {
    throw new GoogleAuthError("Google token subject is missing.");
  }
  if (!isAllowedAudience(payload?.aud, allowedClientIds)) {
    throw new GoogleAuthError("Google token audience is invalid.");
  }
  if (!exp || exp <= now - CLOCK_SKEW_SECONDS) {
    throw new GoogleAuthError("Google token has expired.");
  }
  if (iat && iat > now + CLOCK_SKEW_SECONDS) {
    throw new GoogleAuthError("Google token is not valid yet.");
  }
  if (nbf && nbf > now + CLOCK_SKEW_SECONDS) {
    throw new GoogleAuthError("Google token is not valid yet.");
  }
}

function verifySignature({ signingInput, signature, jwk }) {
  const publicKey = createPublicKey({
    key: jwk,
    format: "jwk",
  });

  return verify("RSA-SHA256", signingInput, publicKey, signature);
}

async function verifyGoogleIdToken(idToken, allowedClientIds = []) {
  if (!String(idToken || "").trim()) {
    throw new GoogleAuthError("Google ID token is required.", "GOOGLE_AUTH_MISSING_TOKEN", 400);
  }
  if (!Array.isArray(allowedClientIds) || allowedClientIds.length === 0) {
    throw new GoogleAuthError(
      "Google sign-in is not configured on the server.",
      "GOOGLE_AUTH_NOT_CONFIGURED",
      503
    );
  }

  const parsed = parseJwt(idToken);
  if (parsed.header?.alg !== "RS256" || !parsed.header?.kid) {
    throw new GoogleAuthError("Google token header is invalid.");
  }

  let jwks = await fetchGoogleJwks(false);
  let jwk = jwks.find((item) => item?.kid === parsed.header.kid);

  if (!jwk) {
    jwks = await fetchGoogleJwks(true);
    jwk = jwks.find((item) => item?.kid === parsed.header.kid);
  }

  if (!jwk) {
    throw new GoogleAuthError("Google token key is unavailable.");
  }

  const signatureIsValid = verifySignature({
    signingInput: parsed.signingInput,
    signature: parsed.signature,
    jwk,
  });

  if (!signatureIsValid) {
    throw new GoogleAuthError("Google token signature is invalid.");
  }

  validateClaims(parsed.payload, allowedClientIds);
  return parsed.payload;
}

function getAllowedGoogleClientIds() {
  return String(process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

module.exports = {
  GoogleAuthError,
  getAllowedGoogleClientIds,
  verifyGoogleIdToken,
};
