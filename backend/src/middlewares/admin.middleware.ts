import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { ADMIN_SCOPE } from '../utils/admin.js';

export interface AdminRequest extends Request {
  admin?: { scope: string; sub?: string };
}

// Verifies a standalone admin token. This is independent of the user `protect`
// middleware — it only accepts tokens minted by the admin login endpoint
// (scope === 'admin').
export const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    if (decoded?.scope !== ADMIN_SCOPE) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired admin session' });
  }
};
