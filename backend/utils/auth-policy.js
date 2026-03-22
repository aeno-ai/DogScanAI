const REGISTRATION_POLICY = {
  policy_key: "registration_scan_policy",
  policy_version: "2026-03-22",
  title: "Scanning Rules & Account Agreement",
  summary:
    "DogScan AI is for responsible dog-photo scanning and training contributions. Please confirm you will use it appropriately before creating an account.",
  rules: [
    "Only scan dog images you own or have permission to use.",
    "Do not upload explicit, violent, hateful, abusive, or illegal content.",
    "Do not spam, troll, or misuse scans or contributions to game the system.",
    "Only share scans for training when the image is appropriate and you have permission to share it.",
    "Violations may lead to rejected contributions, temporary bans, or permanent bans.",
  ],
  consequence_text:
    "If these rules are violated, DogScan AI may restrict account access, reject submissions, or ban the account.",
  checkbox_label:
    "I understand these scanning rules and agree that violations may result in account restrictions or bans.",
};

function isAccepted(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function getRegistrationPolicy() {
  return {
    ...REGISTRATION_POLICY,
    rules: [...REGISTRATION_POLICY.rules],
  };
}

function hasAcceptedCurrentRegistrationPolicy(body) {
  return (
    isAccepted(body?.accept_terms) &&
    String(body?.policy_key || "").trim() === REGISTRATION_POLICY.policy_key &&
    String(body?.policy_version || "").trim() === REGISTRATION_POLICY.policy_version
  );
}

function buildPolicyAcceptanceRequiredResponse() {
  return {
    error: "Policy acceptance is required to create a new account.",
    code: "TERMS_ACCEPTANCE_REQUIRED",
    policy_key: REGISTRATION_POLICY.policy_key,
    policy_version: REGISTRATION_POLICY.policy_version,
  };
}

async function recordPolicyAcceptance(client, userId, req, policy = REGISTRATION_POLICY) {
  await client.query(
    `INSERT INTO user_policy_acceptances (
       user_id,
       policy_key,
       policy_version,
       accepted_ip,
       accepted_user_agent
     )
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, policy_key, policy_version)
     DO NOTHING`,
    [
      userId,
      policy.policy_key,
      policy.policy_version,
      req.ip || null,
      req.headers["user-agent"] || null,
    ]
  );
}

module.exports = {
  buildPolicyAcceptanceRequiredResponse,
  getRegistrationPolicy,
  hasAcceptedCurrentRegistrationPolicy,
  recordPolicyAcceptance,
};
