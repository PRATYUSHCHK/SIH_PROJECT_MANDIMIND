import { Router } from 'express';
import {
  login,
  loginValidators,
  register,
  registerValidators,
  demoLogin,
  forgotPassword,
  resetPassword,
  me,
  updateMe,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, loginValidators, login);
authRouter.post('/register', authLimiter, registerValidators, register);
authRouter.post('/demo', authLimiter, demoLogin);
authRouter.post('/forgot-password', authLimiter, forgotPassword);
authRouter.post('/reset-password', authLimiter, resetPassword);
authRouter.get('/me', requireAuth, me);
authRouter.patch('/me', requireAuth, updateMe);
