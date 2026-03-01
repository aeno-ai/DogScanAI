function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}

function requireSuperadmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user.is_superadmin) {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  return next();
}

module.exports = {
  requireAdmin,
  requireSuperadmin,
};
