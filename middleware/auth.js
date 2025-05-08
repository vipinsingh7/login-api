const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = "VipinSingh";

module.exports = async function (req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access Denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    req.user = { id: decoded.id }; // Important!
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};
