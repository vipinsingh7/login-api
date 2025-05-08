const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  dateOfBirth: { type: Date },
  isLoggedIn: { type: Boolean, default: false },
  photo: String,
  filename: String,
  blobText: String,
  contentType: String,
  resetToken: String,
  resetTokenExpiry: Date,
  otp: String,
  otpExpiry: Date,
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
