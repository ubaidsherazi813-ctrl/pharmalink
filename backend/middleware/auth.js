const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

exports.protect = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Login required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Invalid or expired token' }); }
};
exports.adminOnly = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ success: false, error: 'Admin only' });
