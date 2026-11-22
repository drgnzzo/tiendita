import { API_URL } from './config.js';

let token = null;
let alExpirar = () => {};

export const setToken = (t) => { token = t; };
export const setAuthHandler = (fn) => { alExpirar = fn; };
export const newReqId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

// Todas las llamadas son POST con text/plain: evita el preflight de CORS que Apps Script no contesta.
export async function api(accion, params = {}) {
  if (!navigator.onLine) return { ok: false, error: 'Sin internet. Revisa tu conexión.', code: 'OFFLINE' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: accion, token: token, ...params }),
      signal: ctrl.signal
    });
    if (!r.ok) return { ok: false, error: 'El servidor no respondió (' + r.status + '). Intenta otra vez.', code: 'HTTP' };
    const data = await r.json();
    if (data && data.code === 'AUTH') alExpirar(data.error);
    return data;
  } catch (e) {
    return {
      ok: false, code: 'NETWORK',
      error: e.name === 'AbortError' ? 'Tardó demasiado. Intenta otra vez.' : 'No se pudo conectar. Revisa tu internet.'
    };
  } finally {
    clearTimeout(timer);
  }
}
