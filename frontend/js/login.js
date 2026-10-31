import { api, setSession, toast, withLoading, $ } from './common.js';

let mode = 'login';
function setMode(m) {
  mode = m;
  const login = m === 'login';
  $('tabLogin').classList.toggle('active', login);
  $('tabReg').classList.toggle('active', !login);
  $('nameRow').classList.toggle('hidden', login);
  $('submitBtn').textContent = login ? 'Sign In to Dashboard' : 'Complete Registration';
  $('heading').textContent = login ? 'Welcome Back 👋' : 'Create Staff Account';
  $('password').autocomplete = login ? 'current-password' : 'new-password';
  ['eName', 'eEmail', 'ePassword'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '';
  });
}

$('tabLogin').onclick = () => setMode('login');
$('tabReg').onclick = () => setMode('register');
$('togglePw').onclick = () => {
  const p = $('password');
  p.type = p.type === 'password' ? 'text' : 'password';
};

// Agar URL mein ?reg=1 ho to registration tab direct open ho
if (new URLSearchParams(location.search).get('reg')) {
  setMode('register');
}

function validate() {
  let ok = true;
  const set = (id, msg) => {
    const el = $(id);
    if (el) el.textContent = msg;
    if (msg) ok = false;
  };
  const nameVal = $('name').value.trim();
  const emailVal = $('email').value.trim();
  const pVal = $('password').value;

  set('eName', mode === 'register' && nameVal.length < 2 ? 'Please enter your full name' : '');
  set('eEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal) ? '' : 'Please enter a valid email address');
  set('ePassword', mode === 'login' ? (pVal ? '' : 'Please enter your password')
    : (pVal.length >= 8 && /\d/.test(pVal) && /[A-Z]/.test(pVal) ? '' : 'Min 8 characters with at least one number and one capital letter'));
  return ok;
}

$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!validate()) return;
  await withLoading($('submitBtn'), async () => {
    try {
      const body = { email: $('email').value.trim(), password: $('password').value };
      if (mode === 'register') body.name = $('name').value.trim();
      const r = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body });
      setSession(r.data.token, r.data.user);
      location.href = '/dashboard.html';
    } catch (err) { toast(err.message, 'error'); }
  });
});
