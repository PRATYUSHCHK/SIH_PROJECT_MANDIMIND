import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User, FarmerProfile, SellerProfile } from '../models/index.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    language: user.language,
    avatarInitials: user.avatarInitials,
  };
}

export const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Invalid email or password', 400, 'VALIDATION');
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user) throw new AppError('Invalid credentials', 401, 'AUTH');
  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401, 'AUTH');
  res.json({ token: sign(user), user: publicUser(user) });
});

export const demoLogin = asyncHandler(async (req, res) => {
  const role = req.body.role;
  if (!['seller', 'farmer', 'admin', 'buyer'].includes(role)) throw new AppError('Unknown demo role', 400);
  const email = `${role}@mandimind.demo`;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Demo accounts are not seeded yet', 500);
  res.json({ token: sign(user), user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === 'farmer') profile = await FarmerProfile.findOne({ user: req.user._id });
  if (req.user.role === 'seller') profile = await SellerProfile.findOne({ user: req.user._id });
  res.json({ user: publicUser(req.user), profile });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, location, language } = req.body;
  if (name) req.user.name = name;
  if (location) req.user.location = location;
  if (language) req.user.language = language;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
