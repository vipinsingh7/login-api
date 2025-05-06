const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require('../middleware/auth');
const User = require('../models/user');

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();
const JWT_SECRET = "VipinSingh";

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, gender, dateOfBirth } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'User with this email already exists' });

    const existingName = await User.findOne({ name });
    if (existingName) return res.status(400).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashed,
      gender,
      dateOfBirth,
    });

    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

  user.isLoggedIn = true;
  await user.save();

  res.json({ token });
});

// Get User Details
router.get('/user', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Update User Profile
router.put('/user/update', auth, upload.single('photo'), async (req, res) => {
  const { gender, dateOfBirth } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (req.file) user.photo = req.file.path;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        photo: user.photo,
        isLoggedIn: user.isLoggedIn,
      },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

// Logout
router.get('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isLoggedIn = false;
    await user.save();

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
});


router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(req.file);
    const { originalname, mimetype, buffer } = req.file;
    const user = await User.findById(req.user.id);

    // Convert buffer to base64 string
    const blobText = req.file.buffer.toString('base64');

      user.filename = originalname,
      user.blobText = blobText,
      user.contentType = mimetype

    await user.save();

    res.json({ message: '✅ Image uploaded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '❌ Upload failed.' });
  }
});

//Forget-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetLink = `http://localhost:5001/reset-password/${token}`;
  await transporter.sendMail({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
  });

  res.json({ message: 'Reset link sent to your email' });
});

module.exports = router;
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, gender, dateOfBirth } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      logger.error('User with this email already exists');
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingName = await User.findOne({ name });
    if (existingName) {
      logger.error('Username already taken');
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashed,
      gender,
      dateOfBirth,
    });

    logger.info('Registered successfully');
    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.error('Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.error('Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    user.isLoggedIn = true;
    await user.save();

    logger.info('Logged in successfully');
    res.json({ token });
  } catch (err) {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get User Details
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    logger.info('User details fetched successfully');
    res.json(user);
  } catch (err) {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User Profile
router.put('/user/update', auth, upload.single('photo'), async (req, res) => {
  const { gender, dateOfBirth } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      logger.error('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (req.file) user.photo = req.file.path;

    await user.save();

    logger.info('Profile updated successfully');
    res.json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        photo: user.photo,
        isLoggedIn: user.isLoggedIn,
      },
    });
  } catch (err) {
    logger.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

// Logout
router.get('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      logger.error('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    user.isLoggedIn = false;
    await user.save();

    logger.info('Logged out successfully');
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    logger.error('Logout error:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      logger.error('Invalid or expired token');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    logger.info('Password reset successful');
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Password reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      logger.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const user = await User.findById(req.user.id);

    // Convert buffer to base64 string
    const blobText = req.file.buffer.toString('base64');

    user.filename = originalname;
    user.blobText = blobText;
    user.contentType = mimetype;

    await user.save();

    logger.info('Image uploaded successfully');
    res.json({ message: 'Image uploaded successfully.' });
  } catch (error) {
    logger.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

//Forget-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.error('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:5001/reset-password/${token}`;
    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
    });

    logger.info('Reset link sent to email');
    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});logger.info('Server started successfully');