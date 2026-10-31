import { api, setSession, toast, withLoading, $ } from './common.js';
if (localStorage.getItem('pl_token')) location.href = '/dashboard.html';

let mode = 'login';
function setMode(m) {
  mode = m;
  const login = m === 'login';
  $('tabLogin').classList.toggle('active', login); $('tabReg').classList.toggle('active', !login);
  $('nameRow').classList.toggle('hidden', login);
  $('submitBtn').textContent = login ? 'Login' : 'Create account';
  $('heading').textContent = login ? 'Welcome back 👋' : 'Create your account';
  $('password').autocomplete = login ? 'current-password' : 'new-password';
  ['eName', 'eEmail', 'ePassword'].forEach(id => $(id).textContent = '');
}
$('tabLogin').onclick = () => setMode('login');
$('tabReg').onclick = () => setMode('register');
$('togglePw').onclick = () => { $('password').type = $('password').type === 'password' ? 'text' : 'password'; };

function validate() {
  let ok = true;
  const set = (id, msg) => { $(id).textContent = msg; if (msg) ok = false; };
  set('eName', mode === 'register' && $('name').value.trim().length < 2 ? 'Enter your name' : '');
  set('eEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('email').value.trim()) ? '' : 'Enter a valid email');
  const p = $('password').value;
  set('ePassword', mode === 'login' ? (p ? '' : 'Enter your password')
    : (p.length >= 8 && /\d/.test(p) && /[A-Z]/.test(p) ? '' : 'Min 8 characters, one number, one capital letter'));
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
