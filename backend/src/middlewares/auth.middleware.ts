import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const token = authHeader.split(' ')[1];

        // Safety check for common frontend "missing token" strings
        if (!token || token === 'undefined' || token === 'null') {
            return res.status(401).json({ message: 'Authentication token is missing' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT secret is not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify and attach
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;

        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};