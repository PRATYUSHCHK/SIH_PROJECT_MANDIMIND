import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { User, FarmerProfile, SellerProfile } from '../models/index.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function getInitials(name) {
  if (!name) return 'MM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function publicUser(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    location: user.location || '',
    organizationName: user.organizationName || '',
    primaryCommodity: user.primaryCommodity || '',
    buyerType: user.buyerType || '',
    language: user.language || 'en',
    avatarInitials: user.avatarInitials || getInitials(user.name),
  };
}

export const loginValidators = [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

export const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('role')
    .isIn(['farmer', 'buyer', 'seller'])
    .withMessage('Valid account role is required (Farmer, Buyer, or Seller)'),
  body('location').optional().trim(),
  body('phone').optional().trim(),
  body('organizationName').optional().trim(),
  body('primaryCommodity').optional().trim(),
  body('buyerType').optional().trim(),
];

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg || 'Invalid email or password', 400, 'VALIDATION');
  }

  const email = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid email or password', 401, 'AUTH');

  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'AUTH');

  if (!user.active) throw new AppError('Account is deactivated. Please contact support.', 403, 'AUTH');

  res.json({ token: sign(user), user: publicUser(user) });
});

export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg || 'Validation failed on submitted fields', 400, 'VALIDATION');
  }

  const {
    name,
    email,
    password,
    role,
    phone,
    location,
    organizationName,
    farmName,
    primaryCommodity,
    buyerType,
  } = req.body;

  // Strict security check: Disallow public admin registration
  if (role === 'admin' || req.body.role === 'admin') {
    throw new AppError('Administrator accounts cannot be created through public registration. Please use an authorized administrator invitation.', 403, 'FORBIDDEN');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email address already exists. Please sign in instead.', 409, 'CONFLICT');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const initials = getInitials(name);
  const finalLocation = location?.trim() || 'Hyderabad';
  const finalOrg = organizationName?.trim() || farmName?.trim() || '';

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    phone: phone?.trim() || '',
    location: finalLocation,
    organizationName: finalOrg,
    primaryCommodity: primaryCommodity?.trim() || '',
    buyerType: role === 'buyer' ? (buyerType?.trim() || 'retailer') : '',
    avatarInitials: initials,
    active: true,
  });

  // Automatically create associated role profile for full system integration
  if (role === 'farmer') {
    await FarmerProfile.create({
      user: user._id,
      location: finalLocation,
      landSizeAcres: 2.5,
      soilType: 'red loam',
      irrigation: 'drip',
      budgetInr: 75000,
      season: 'kharif',
      preferredCrops: primaryCommodity ? [primaryCommodity.toLowerCase().trim()] : ['tomato', 'onion'],
    });
  } else if (role === 'seller') {
    await SellerProfile.create({
      user: user._id,
      businessName: finalOrg || `${name.trim()} Trading Co.`,
      homeMarket: finalLocation,
      budgetInr: 50000,
      storageCapacityKg: 4000,
      products: primaryCommodity ? [primaryCommodity.toLowerCase().trim()] : ['tomato', 'onion', 'potato'],
    });
  }

  res.status(201).json({
    token: sign(user),
    user: publicUser(user),
    message: 'Account created successfully',
  });
});

export const demoLogin = asyncHandler(async (req, res) => {
  const role = req.body.role;
  if (!['seller', 'farmer', 'admin', 'buyer'].includes(role)) {
    throw new AppError('Unknown demo role requested', 400, 'BAD_REQUEST');
  }
  const email = `${role}@mandimind.demo`;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Demo accounts are not seeded yet. Please start backend seed script.', 500, 'SERVER_ERROR');
  res.json({ token: sign(user), user: publicUser(user) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Please provide a valid email address', 400, 'VALIDATION');

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Return standard success to prevent email enumeration
    return res.json({
      ok: true,
      message: 'If an account with this email exists, password reset instructions have been generated.',
      simulated: true,
    });
  }

  const token = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  res.json({
    ok: true,
    message: 'Password reset link generated for demo environment.',
    resetToken: token,
    email: user.email,
    simulated: true,
    note: 'In production, this token is securely emailed. In this demo environment, you can use the token directly.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    throw new AppError('Token and new password are required', 400, 'VALIDATION');
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400, 'VALIDATION');
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired password reset token. Please request a new one.', 400, 'AUTH');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    ok: true,
    message: 'Password has been reset successfully. You can now sign in with your new password.',
  });
});

export const me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === 'farmer') profile = await FarmerProfile.findOne({ user: req.user._id });
  if (req.user.role === 'seller') profile = await SellerProfile.findOne({ user: req.user._id });
  res.json({ user: publicUser(req.user), profile });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, location, language, phone, organizationName } = req.body;
  if (name) {
    req.user.name = name.trim();
    req.user.avatarInitials = getInitials(name);
  }
  if (location) req.user.location = location.trim();
  if (language) req.user.language = language;
  if (phone !== undefined) req.user.phone = phone.trim();
  if (organizationName !== undefined) req.user.organizationName = organizationName.trim();
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
