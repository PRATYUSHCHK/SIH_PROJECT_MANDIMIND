import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'seller', 'admin', 'buyer'], required: true },
    phone: { type: String, default: '' },
    location: { type: String, default: 'Hyderabad' },
    organizationName: { type: String, default: '' },
    primaryCommodity: { type: String, default: '' },
    buyerType: {
      type: String,
      enum: ['retailer', 'restaurant', 'hotel', 'processor', 'institutional', 'bulk_consumer', 'fpo', 'wholesaler', 'individual', ''],
      default: '',
    },
    language: { type: String, default: 'en' },
    avatarInitials: { type: String, default: 'MM' },
    active: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
