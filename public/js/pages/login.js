/**
 * Sign in / create account page.
 * Supports ?redirect=/some/page to return the user where they came from.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { saveSession, getCurrentUser } from '../session.js';
import { errorAlert, setFieldError, EMAIL_PATTERN } from '../ui.js';

initLayout({ activePage: 'login' });

const form = document.getElementById('auth-form');
const errorBox = document.getElementById('auth-error');
const submit = document.getElementById('auth-submit');
const nameField = document.getElementById('name-field');
const passwordHint = document.getElementById('password-hint');
let mode = 'login';

function redirectTarget(user) {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  // Only allow same-site paths to prevent open redirects.
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
  return user.role === 'admin' ? '/admin.html' : '/account.html';
}

const existingUser = getCurrentUser();
if (existingUser) window.location.replace(redirectTarget(existingUser));

function setMode(newMode) {
  mode = newMode;
  const isRegister = mode === 'register';
  document.getElementById('auth-title').textContent = isRegister ? 'Create an account' : 'Sign in';
  document.getElementById('auth-subtitle').textContent = isRegister
    ? 'Save your details and follow your orders in one place.'
    : 'Welcome back. Sign in to track orders and check out faster.';
  submit.textContent = isRegister ? 'Create account' : 'Sign in';
  nameField.hidden = !isRegister;
  passwordHint.hidden = !isRegister;
  form.elements.password.autocomplete = isRegister ? 'new-password' : 'current-password';
  document.getElementById('auth-switch').innerHTML = isRegister
    ? 'Already have an account? <button type="button" data-mode="login">Sign in</button>'
    : 'New to ShopFlow? <button type="button" data-mode="register">Create an account</button>';
  errorBox.innerHTML = '';
  form.querySelectorAll('.input').forEach((input) => setFieldError(input, ''));
}

document.getElementById('auth-switch').addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (button) setMode(button.dataset.mode);
});

function validate() {
  const { name, email, password } = form.elements;
  const errors = [];
  if (mode === 'register' && name.value.trim().length < 2) errors.push([name, 'Please enter your full name.']);
  if (!email.value.trim()) errors.push([email, 'Please enter your email address.']);
  else if (!EMAIL_PATTERN.test(email.value.trim())) errors.push([email, 'Please enter a valid email address, e.g. name@example.com.']);
  if (!password.value) errors.push([password, 'Please enter your password.']);
  else if (mode === 'register' && password.value.length < 8) errors.push([password, 'Your password must be at least 8 characters.']);

  [name, email, password].forEach((input) => setFieldError(input, ''));
  errors.forEach(([input, message]) => setFieldError(input, message));
  if (errors.length) errors[0][0].focus();
  return errors.length === 0;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.innerHTML = '';
  if (!validate()) return;

  const credentials = { email: form.elements.email.value.trim(), password: form.elements.password.value };
  submit.disabled = true;
  submit.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';

  try {
    const { data } = mode === 'register'
      ? await api.register({ ...credentials, name: form.elements.name.value.trim() })
      : await api.login(credentials);
    saveSession(data);
    window.location.href = redirectTarget(data.user);
  } catch (error) {
    let message = error.message;
    if (error.status === 401) message = 'The email or password you entered is incorrect. Please try again.';
    if (error.status === 409) message = 'An account with this email already exists. Try signing in instead.';
    errorBox.innerHTML = errorAlert(message, error.status === 400 ? error.details : []);
    form.elements.password.value = '';
    form.elements.password.focus();
  } finally {
    submit.disabled = false;
    submit.textContent = mode === 'register' ? 'Create account' : 'Sign in';
  }
});

if (new URLSearchParams(window.location.search).get('mode') === 'register') setMode('register');
