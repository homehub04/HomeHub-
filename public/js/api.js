// api.js — thin fetch wrapper shared by every page.

const API_BASE = ''; // same-origin, server also serves these static files

function getToken() { return localStorage.getItem('nzvimbo_token'); }
function setToken(t) { localStorage.setItem('nzvimbo_token', t); }
function clearSession() { localStorage.removeItem('nzvimbo_token'); localStorage.removeItem('nzvimbo_user'); }
function getUser() { const u = localStorage.getItem('nzvimbo_user'); return u ? JSON.parse(u) : null; }
function setUser(u) { localStorage.setItem('nzvimbo_user', JSON.stringify(u)); }

async function api(path, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const resp = await fetch(API_BASE + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`);
  return data;
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function requireLogin() {
  if (!getToken()) { window.location.href = '/index.html'; }
}
