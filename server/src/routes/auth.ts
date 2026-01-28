import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { createLogger } from "../utils/logger";
import type { AuthUser } from "../middleware/auth";

const router = Router();
const log = createLogger("auth");
const googleClient = new OAuth2Client(config.auth.googleClientId);

function isEmailAllowed(email: string): boolean {
  const lower = email.toLowerCase();
  const { allowedDomains, allowedEmails } = config.auth;

  if (allowedDomains.length === 0 && allowedEmails.length === 0) {
    return true;
  }

  if (allowedEmails.includes(lower)) {
    return true;
  }

  const domain = lower.split("@")[1];
  return allowedDomains.includes(domain);
}

router.post("/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ error: "Missing credential" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.auth.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid token payload" });
      return;
    }

    if (!isEmailAllowed(payload.email)) {
      log.warn({ email: payload.email }, "Unauthorized email attempted login");
      res.status(403).json({ error: "Email not authorized" });
      return;
    }

    const user: AuthUser = {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || "",
    };

    const token = jwt.sign(user, config.auth.jwtSecret, { expiresIn: "7d" });

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: config.nodeEnv === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    log.info({ email: user.email }, "User logged in");
    res.json({ user });
  } catch (err) {
    log.error({ err }, "Google auth verification failed");
    res.status(401).json({ error: "Invalid Google token" });
  }
});

router.get("/me", (req, res) => {
  const token = req.cookies?.session_token;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const user = jwt.verify(token, config.auth.jwtSecret) as AuthUser;
    res.json({ user: { email: user.email, name: user.name, picture: user.picture } });
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("session_token", { path: "/" });
  res.json({ success: true });
});

export default router;
