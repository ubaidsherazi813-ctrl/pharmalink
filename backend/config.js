const crypto = require('crypto');
// JWT_SECRET .env mein na ho to har restart par naya random secret banta hai (sirf development ke liye theek)
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set in .env - using a temporary random secret');
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
};
