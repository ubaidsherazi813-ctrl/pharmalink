const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { store, save } = require('../services/store');
const { genId, ok, bad, logActivity } = require('../services/helpers');
const { protect } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);   // timing attack se bachne ke liye
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const makeToken = u => jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// Simple brute-force limiter: 10 galat koshishein / 15 minute (ip + email)
const attempts = new Map();
function tooMany(key) {
  const a = attempts.get(key);
  return a && a.reset > Date.now() && a.count >= 10;
}
function noteFail(key) {
  const a = attempts.get(key);
  if (!a || a.reset < Date.now()) attempts.set(key, { count: 1, reset: Date.now() + 15 * 60 * 1000 });
  else a.count++;
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (name.length < 2 || name.length > 60) return bad(res, 'Name must be 2-60 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Enter a valid email');
  if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password))
    return bad(res, 'Password needs 8+ characters, one number and one capital letter');
  if (store.users.find(u => u.email === email)) return bad(res, 'This email is already registered', 409);

  const user = {
    id: genId(), name, email, passwordHash: await bcrypt.hash(password, 10),
    role: store.users.size === 0 ? 'admin' : 'pharmacist', createdAt: new Date().toISOString(),
  };
  store.users.insertAtTail(user);
  save('users');
  logActivity(user, 'REGISTER', `${name} registered`);
  ok(res, { token: makeToken(user), user: publicUser(user) }, 'Account created', 201);
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const key = `${req.ip}|${email}`;
  if (tooMany(key)) return bad(res, 'Too many attempts. Try again in 15 minutes', 429);

  const user = store.users.find(u => u.email === email);
  const match = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !match) { noteFail(key); return bad(res, 'Invalid email or password', 401); }

  attempts.delete(key);
  logActivity(user, 'LOGIN', `${user.name} logged in`);
  ok(res, { token: makeToken(user), user: publicUser(user) }, 'Logged in');
});

router.get('/me', protect, (req, res) => {
  const user = store.users.findById(req.user.id);
  if (!user) return bad(res, 'User not found', 404);
  ok(res, publicUser(user));
});

module.exports = router;
