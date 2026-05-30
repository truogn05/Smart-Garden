import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware — attaches user to req.user or sends 401.
 * Reads from httpOnly cookie (browser) with Authorization: Bearer fallback (API clients).
 */
export function requireAuth(req: Request, res: Response): boolean {
  // Try Authorization header first (API clients)
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload) { req.user = payload; return true; }
  }

  // Fall back to httpOnly cookie (browser clients)
  const token = req.cookies?.jwt;
  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return false;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return false;
  }
  req.user = payload;
  return true;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}