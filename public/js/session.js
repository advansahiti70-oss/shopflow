/**
 * Stores the signed-in user's token and profile in localStorage.
 */
const STORAGE_KEY = 'shopflow.session';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  window.dispatchEvent(new CustomEvent('session:changed'));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('session:changed'));
}

export function getToken() {
  const session = getSession();
  return session ? session.token : null;
}

export function getCurrentUser() {
  const session = getSession();
  return session ? session.user : null;
}

export function isAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.role === 'admin');
}
