const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const logger = require('../utils/logger'); // use your logger config
const router = express.Router();

const JWT_SECRET = "VipinSingh";

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP for Signup
router.post('/signup/send-otp', async (req, res) => {
    const { name, email, password, gender, dateOfBirth } = req.body;
  
    try {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ error: 'Email already in use' });
  
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 5 * 60 * 1000;
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        gender,
        dateOfBirth,
        otp,
        otpExpiry,
        isVerified: false,
      });
  
      const test = await transporter.sendMail({
        from: '"MyApp Test" <vipin.singh632@gmil.com>',  // clearly show sender identity
        to: email,
        subject: 'Your Signup OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #2c3e50;">👋 Welcome to MyApp!</h2>
      <p style="font-size: 16px; color: #555;">
        We're excited to have you on board. Use the OTP below to verify your email address:
      </p>
      <div style="font-size: 36px; font-weight: bold; color: #007BFF; margin: 20px 0; text-align: center;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #999;">
        This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.
      </p>
      <p style="font-size: 14px; color: #999;">
        If you did not request this OTP, you can safely ignore this email.
      </p>
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #bbb; text-align: center;">
        &copy; ${new Date().getFullYear()} MyApp. All rights reserved.<br/>
        This is a test message sent from a development server.
      </p>
    </div>
        `,
      });
  
      logger.info(`OTP sent to ${email}`);
      console.log(test);
      res.status(200).json({ message: 'OTP sent to email', userId: user._id });
    } catch (err) {
      console.error('Signup OTP error:', err); // <-- log to terminal
      logger.error('Signup OTP error:', err);
      res.status(500).json({ error: 'Server error during OTP sending' });
    }
  });
// Verify OTP for Signup
router.post('/signup/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry)
      return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    logger.info(`User ${user.email} verified successfully`);
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    logger.error('Signup OTP verification error:', err);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

// Send OTP for Login
router.post('/login/send-otp', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) return res.status(400).json({ error: 'User not found or not verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await transporter.sendMail({
      to: email,
      subject: 'Your Login OTP',
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
    });

    logger.info(`Login OTP sent to ${email}`);
    res.json({ message: 'OTP sent to email', userId: user._id });
  } catch (err) {
    logger.error('Login OTP error:', err);
    res.status(500).json({ error: 'Server error during login OTP' });
  }
});

// Verify OTP for Login
router.post('/login/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry)
      return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isLoggedIn = true;
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    logger.info(`User ${user.email} logged in with OTP`);
    res.json({ message: 'Login successful', token });
  } catch (err) {
    logger.error('Login OTP verification error:', err);
    res.status(500).json({ error: 'Server error during login verification' });
  }
});

module.exports = router;