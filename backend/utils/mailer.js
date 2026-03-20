const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const SMTP_FROM = process.env.SMTP_FROM || "DogScan AI <no-reply@dogscan.ai>";
const SMTP_VERIFY = process.env.SMTP_VERIFY !== "false";
const SMTP_ALLOW_SELF_SIGNED =
  String(process.env.SMTP_ALLOW_SELF_SIGNED || "").toLowerCase() === "true";
const SMTP_TLS_REJECT_UNAUTHORIZED =
  String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "").toLowerCase();

let transporterPromise = null;

function isEmailEnabled() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getFromAddress() {
  return SMTP_FROM;
}

async function getTransporter() {
  if (!isEmailEnabled()) return null;
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const tlsOptions =
      SMTP_ALLOW_SELF_SIGNED || SMTP_TLS_REJECT_UNAUTHORIZED === "false"
        ? { rejectUnauthorized: false }
        : undefined;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      ...(tlsOptions ? { tls: tlsOptions } : {}),
    });

    if (SMTP_VERIFY) {
      await transporter.verify();
    }

    return transporter;
  })();

  try {
    return await transporterPromise;
  } catch (err) {
    transporterPromise = null;
    throw err;
  }
}

module.exports = {
  getTransporter,
  getFromAddress,
  isEmailEnabled,
};
