import { NextFunction, Request, Response } from 'express';
import { verifySessionToken } from '../../application/services/sessionService';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifySessionToken(token);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session token' });
  }
}