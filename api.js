/**
 * TIENDITA — API client v2
 *
 * Wrapper para llamar al backend (Apps Script Web App).
 * Patron: cuando regeneres el deployment, actualiza GAS_URL.
 * POST con Content-Type text/plain para evitar preflight CORS.
 * Apps Script parsea el body con e.postData.contents.
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzGiUz2A5Wy2tUBQcnUBrstB0DZ_YKcDN24cDnD3M7lJcPHdhiNd37veyuDI0U8K2MP/exec';

window.api = {

  async ping()                                    { return this._get({ action: 'ping' }); },
  async login(email)                              { return this._get({ action: 'login', email: email }); },
  async catalogo()                                { return this._get({ action: 'catalogo' }); },
  async buscar(q)                                 { return this._get({ action: 'buscar', q: q }); },
  async perfil(email)                             { return this._get({ action: 'perfil', email: email }); },
  async historial(email)                          { return this._get({ action: 'historial', email: email }); },
  async alertasStock()                            { return this._get({ action: 'alertasStock' }); },
  async dashboardAdmin(email)                     { return this._get({ action: 'dashboardAdmin', email: email }); },
  async comprar(email, items)                     { return this._post({ action: 'comprar', email: email, items: items }); },
  async sugerir(email, tipo, mensaje, calificacion) {
    return this._post({ action: 'sugerir', email: email, tipo: tipo, mensaje: mensaje, calificacion: calificacion });
  },
  async bot(email, query)                         { return this._post({ action: 'bot', email: email, query: query }); },

  // ---- internals ----

  async _get(params) {
    if (!navigator.onLine) return { ok: false, error: 'Sin conexion', code: 'OFFLINE' };
    const qs = new URLSearchParams();
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null) {
        qs.append(k, String(params[k]));
      }
    });
    const url = GAS_URL + '?' + qs.toString();
    try {
      const r = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, code: 'HTTP_ERROR' };
      return await r.json();
    } catch (err) {
      return { ok: false, error: 'Error de red: ' + err.message, code: 'NETWORK' };
    }
  },

  async _post(body) {
    if (!navigator.onLine) return { ok: false, error: 'Sin conexion', code: 'OFFLINE' };
    try {
      const r = await fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, code: 'HTTP_ERROR' };
      return await r.json();
    } catch (err) {
      return { ok: false, error: 'Error de red: ' + err.message, code: 'NETWORK' };
    }
  }
};
