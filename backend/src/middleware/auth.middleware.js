const jwt = require("jsonwebtoken");

function extractToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.split(" ")[1];
}

function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Lipseste token-ul" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid" });
  }
}

function requireAdmin(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Lipseste token-ul" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.tip !== "ADMIN") {
      return res.status(403).json({ error: "Acces interzis" });
    }

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid" });
  }
}

function requireManagerGeneral(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Lipseste token-ul" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.tip !== "ADMIN") {
      return res.status(403).json({ error: "Acces interzis" });
    }

    if (payload.rol !== "ManagerGeneral") {
      return res
        .status(403)
        .json({ error: "Acces permis doar managerului general" });
    }

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid" });
  }
}

function requireClient(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Lipseste token-ul" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.tip !== "CLIENT") {
      return res.status(403).json({ error: "Acces interzis" });
    }

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid" });
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireManagerGeneral,
  requireClient,
};