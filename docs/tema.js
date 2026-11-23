/* TIENDITA: color de la página (Perla / Diamante).
   Se carga en <head>, después de los <link rel="stylesheet" data-tema-css="...">.
   - Aplica el color guardado antes de que se pinte nada (sin parpadeo).
   - Guarda la elección por persona (según su correo) y la última usada en este equipo.
   - Dibuja el botón "Color" en cada lugar con <span data-tema-boton></span>. */
(function () {
  'use strict';
  var TEMAS = [
    { id: 'perla',    nombre: 'Perla',    nota: 'Rosa y vino',        a: '#C98A9B', b: '#F8ECEE', barra: '#5B1624' },
    { id: 'diamante', nombre: 'Diamante', nota: 'Azul acero y marino', a: '#4F7FB5', b: '#E6EEF7', barra: '#0A2A52' }
  ];
  var K_GLOBAL = 'tiendita.tema';
  var K_USER = 'tiendita.tema.u.';
  var doc = document, raiz = doc.documentElement;

  function buscar(id) { for (var i = 0; i < TEMAS.length; i++) if (TEMAS[i].id === id) return TEMAS[i]; return null; }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function correoActual() {
    try {
      var a = JSON.parse(leer('tiendita.sesion.v2') || 'null');
      if (a && a.usuario && a.usuario.correo) return String(a.usuario.correo).toLowerCase();
    } catch (e) {}
    try {
      var s = JSON.parse(sessionStorage.getItem('tiendita_session') || 'null');
      var c = s && (s.correo || (s.usuario && s.usuario.correo));
      if (c) return String(c).toLowerCase();
    } catch (e) {}
    return '';
  }

  var actual = TEMAS[0];

  function aplicar(id) {
    var t = buscar(id) || TEMAS[0];
    actual = t;
    raiz.setAttribute('data-tema', t.id);
    var links = doc.querySelectorAll('link[data-tema-css]');
    for (var i = 0; i < links.length; i++) {
      var es = links[i].getAttribute('data-tema-css');
      // Perla siempre queda activo (base y respaldo); Diamante se suma encima.
      links[i].media = (es === 'perla' || es === t.id) ? 'all' : 'not all';
    }
    var metas = doc.querySelectorAll('meta[name="theme-color"]');
    for (var j = 0; j < metas.length; j++) metas[j].setAttribute('content', t.barra);
    pintarBotones();
  }

  function elegir(id) {
    aplicar(id);
    guardar(K_GLOBAL, actual.id);
    var c = correoActual();
    if (c) guardar(K_USER + c, actual.id);
  }

  // Al entrar: si la persona ya tenía un color guardado, se usa; si no, se queda el actual como suyo.
  function alEntrar(correo) {
    correo = String(correo || '').toLowerCase();
    if (!correo) return;
    var g = leer(K_USER + correo);
    if (g && buscar(g)) { aplicar(g); guardar(K_GLOBAL, g); }
    else guardar(K_USER + correo, actual.id);
  }

  // ---------- estilos del botón (se inyectan una vez) ----------
  function inyectarCSS() {
    if (doc.getElementById('tema-css')) return;
    var st = doc.createElement('style');
    st.id = 'tema-css';
    st.textContent =
      '.tema{display:inline-flex;align-items:center;margin:0 6px}' +
      '.tema__btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px 0 10px;border-radius:999px;border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.92);color:#3A1118;font:600 14px/1 Inter,system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      'html[data-tema="diamante"] .tema__btn{color:#0A2A52}' +
      '.tema__btn:hover{background:#fff}' +
      '.tema__btn:focus-visible,.tema__op:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px rgba(0,0,0,.35)}' +
      '.tema__dot{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.25);flex:none}' +
      '.tema__menu{position:fixed;z-index:2147483000;min-width:240px;max-width:calc(100vw - 24px);padding:8px;border-radius:16px;background:#fff;color:#2A1015;border:2px solid #C98A9B;box-shadow:0 16px 40px rgba(0,0,0,.35)}' +
      'html[data-tema="diamante"] .tema__menu{color:#0F1E33;border-color:#4F7FB5}' +
      '.tema__menu[hidden]{display:none}' +
      '.tema__tit{margin:4px 8px 6px;font:600 12px/1.2 Inter,system-ui,sans-serif;color:#6B5258}' +
      'html[data-tema="diamante"] .tema__tit{color:#4A5F7A}' +
      '.tema__op{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:6px 10px;border:2px solid transparent;border-radius:12px;background:none;color:inherit;font:600 15px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer}' +
      '.tema__op:hover{background:rgba(0,0,0,.06)}' +
      '.tema__op[aria-checked="true"]{border-color:currentColor;background:rgba(0,0,0,.05)}' +
      '.tema__op small{display:block;font:400 12px/1.2 Inter,system-ui,sans-serif;opacity:.75;margin-top:2px}' +
      '.tema__ok{margin-left:auto;font-size:18px;visibility:hidden}' +
      '.tema__op[aria-checked="true"] .tema__ok{visibility:visible}' +
      '.tema--flotante{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;z-index:60;margin:0}' +
      '@media (max-width:639px){.tema{margin:0 4px}.tema__btn{min-width:44px;min-height:44px;padding:0;justify-content:center}.tema__txt{display:none}.tema__dot{width:26px;height:26px}}' +
      '@media (prefers-reduced-motion:no-preference){.tema__dot{transition:transform .2s}.tema__btn:active .tema__dot{transform:scale(.9)}}';
    doc.head.appendChild(st);
  }

  function dot(t) { return 'linear-gradient(135deg,' + t.a + ' 50%,' + t.b + ' 50%)'; }

  var abierto = null;
  function cerrarMenu(devolverFoco) {
    if (!abierto) return;
    var b = abierto.btn;
    abierto.menu.hidden = true;
    b.setAttribute('aria-expanded', 'false');
    abierto = null;
    if (devolverFoco) b.focus();
  }

  function abrirMenu(btn, menu) {
    cerrarMenu(false);
    menu.hidden = false;
    var r = btn.getBoundingClientRect();
    var ancho = menu.offsetWidth;
    var izq = Math.max(12, Math.min(r.right - ancho, innerWidth - ancho - 12));
    menu.style.top = Math.min(r.bottom + 8, innerHeight - menu.offsetHeight - 12) + 'px';
    menu.style.left = izq + 'px';
    btn.setAttribute('aria-expanded', 'true');
    abierto = { btn: btn, menu: menu };
    var sel = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button');
    if (sel) sel.focus();
  }

  function crearBoton() {
    var cont = doc.createElement('div');
    cont.className = 'tema';
    cont.setAttribute('data-tema-widget', '');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'tema__btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="tema__dot" aria-hidden="true"></span><span class="tema__txt">Color</span>';
    var menu = doc.createElement('div');
    menu.className = 'tema__menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    var html = '<p class="tema__tit">Elige tu color</p>';
    TEMAS.forEach(function (t) {
      html += '<button type="button" class="tema__op" role="menuitemradio" data-id="' + t.id + '">' +
        '<span class="tema__dot" aria-hidden="true" style="background:' + dot(t) + '"></span>' +
        '<span>' + t.nombre + '<small>' + t.nota + '</small></span><span class="tema__ok" aria-hidden="true">✓</span></button>';
    });
    menu.innerHTML = html;
    cont.appendChild(btn);
    doc.body.appendChild(menu);       // el menú va en <body>: ningún encabezado lo recorta
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (abierto && abierto.menu === menu) cerrarMenu(false); else abrirMenu(btn, menu);
    });
    menu.addEventListener('click', function (e) {
      var op = e.target.closest ? e.target.closest('.tema__op') : null;
      if (!op) return;
      elegir(op.getAttribute('data-id'));
      cerrarMenu(true);
    });
    menu.addEventListener('keydown', function (e) {
      var ops = Array.prototype.slice.call(menu.querySelectorAll('.tema__op'));
      var i = ops.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); ops[(i + 1) % ops.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ops[(i - 1 + ops.length) % ops.length].focus(); }
    });
    return cont;
  }

  function pintarBotones() {
    var ws = doc.querySelectorAll('[data-tema-widget]');
    for (var i = 0; i < ws.length; i++) {
      var b = ws[i].querySelector('.tema__btn');
      if (!b) continue;
      b.querySelector('.tema__dot').style.background = dot(actual);
      b.setAttribute('aria-label', 'Cambiar color. Ahora: ' + actual.nombre);
      b.title = 'Color: ' + actual.nombre;
    }
    var ops = doc.querySelectorAll('.tema__op');
    for (var j = 0; j < ops.length; j++) ops[j].setAttribute('aria-checked', ops[j].getAttribute('data-id') === actual.id ? 'true' : 'false');
  }

  function montar() {
    inyectarCSS();
    var lugares = doc.querySelectorAll('[data-tema-boton]');
    for (var i = 0; i < lugares.length; i++) {
      if (lugares[i].getAttribute('data-listo')) continue;
      lugares[i].setAttribute('data-listo', '1');
      var w = crearBoton();
      if (lugares[i].hasAttribute('data-flotante')) w.className += ' tema--flotante';
      lugares[i].appendChild(w);
    }
    pintarBotones();
  }

  doc.addEventListener('click', function (e) {
    if (abierto && !(e.target.closest && e.target.closest('.tema__menu'))) cerrarMenu(false);
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(true); });
  addEventListener('resize', function () { cerrarMenu(false); });
  addEventListener('scroll', function () { cerrarMenu(false); }, true);
  addEventListener('storage', function (e) {
    if (e.key === K_GLOBAL && e.newValue && buscar(e.newValue)) aplicar(e.newValue);
  });

  // Color inicial: el de la persona, si ya entró; si no, el último de este equipo.
  var c0 = correoActual();
  aplicar((c0 && leer(K_USER + c0)) || leer(K_GLOBAL) || 'perla');

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', montar); else montar();

  window.TiendiTema = { elegir: elegir, alEntrar: alEntrar, montar: montar, actual: function () { return actual.id; }, temas: TEMAS };
})();
