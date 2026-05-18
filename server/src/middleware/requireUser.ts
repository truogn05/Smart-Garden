import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}