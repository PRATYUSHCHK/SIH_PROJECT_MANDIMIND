import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'seller', 'admin', 'buyer'], required: true },
    location: { type: String, default: 'Hyderabad' },
    language: { type: String, default: 'en' },
    avatarInitials: { type: String, default: 'MM' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
