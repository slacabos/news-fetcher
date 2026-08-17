import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

export const devAuthUser: AuthUser = {
  email: "local@news-fetcher.dev",
  name: "Local User",
  picture: "",
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (config.auth.disabled) {
    req.user = devAuthUser;
    next();
    return;
  }

  const token = req.cookies?.session_token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
