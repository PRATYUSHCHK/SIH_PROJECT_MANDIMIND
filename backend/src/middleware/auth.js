import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AppError } from './error.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.active) throw new AppError('Account unavailable', 401, 'UNAUTHENTICATED');
    req.user = user;
    next();
  } catch (err) {
    next(err.status ? err : new AppError('Invalid or expired session', 401, 'UNAUTHENTICATED'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have access to this screen', 403, 'FORBIDDEN'));
    }
    next();
  };
}
