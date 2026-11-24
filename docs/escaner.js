/* TIENDITA - Lector de codigos de barras con la camara.
 * Interruptor: tiendita_escaner.ACTIVO. En false el catalogo usa el boton "Llevar" de siempre.
 * En true, para llevar un producto hay que escanear su codigo.
 * Usa BarcodeDetector si el telefono lo tiene (Android/Chrome) y, si no (iPhone), un lector propio EAN-13/EAN-8/UPC-A.
 */
(function () {
  'use strict';

  var ACTIVO = false; // <-- mañana: cambiar a true cuando todos los productos tengan codigo

  // ---------- Decodificador EAN/UPC sobre una fila de grises ----------
  var L = [[3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]];
  var G = L.map(function (p) { return p.slice().reverse(); });
  var PARIDAD = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

  function mejorDigito(w, tablas) {
    var suma = w[0] + w[1] + w[2] + w[3];
    if (suma <= 0) return null;
    var m = suma / 7, mejor = null;
    for (var t = 0; t < tablas.length; t++) {
      var tabla = tablas[t].tabla;
      for (var d = 0; d < 10; d++) {
        var e = 0;
        for (var i = 0; i < 4; i++) e += Math.abs(w[i] / m - tabla[d][i]);
        if (!mejor || e < mejor.e) mejor = { e: e, d: d, t: tablas[t].nombre };
      }
    }
    return mejor && mejor.e < 1.6 ? mejor : null;
  }

  function checksum(txt) {
    var s = 0, n = txt.length;
    for (var i = 0; i < n - 1; i++) {
      var v = +txt[i];
      s += ((n - 1 - i) % 2 === 1) ? v * 3 : v;
    }
    return ((10 - (s % 10)) % 10) === +txt[n - 1];
  }

  function aRuns(fila) {
    var n = fila.length, suma = 0, i;
    for (i = 0; i < n; i++) suma += fila[i];
    var minV = 255, maxV = 0;
    for (i = 0; i < n; i++) { if (fila[i] < minV) minV = fila[i]; if (fila[i] > maxV) maxV = fila[i]; }
    if (maxV - minV < 40) return null;
    var umbral = (minV + maxV) / 2, runs = [], negro = fila[0] < umbral, cuenta = 1;
    var inicioNegro = negro;
    for (i = 1; i < n; i++) {
      var b = fila[i] < umbral;
      if (b === negro) cuenta++; else { runs.push(cuenta); cuenta = 1; negro = b; }
    }
    runs.push(cuenta);
    return { runs: runs, primeroNegro: inicioNegro };
  }

  function decodificarRuns(runs, primeroNegro) {
    // runs[i] es barra si (i % 2 == 0) == primeroNegro
    for (var i = 1; i + 43 <= runs.length; i++) {
      var esBarra = ((i % 2) === 0) === primeroNegro;
      if (!esBarra) continue;
      var g = runs.slice(i, i + 3), mod = (g[0] + g[1] + g[2]) / 3;
      if (mod < 1 || Math.abs(g[0] - mod) > mod * .7 || Math.abs(g[1] - mod) > mod * .7 || Math.abs(g[2] - mod) > mod * .7) continue;
      // zona blanca previa
      if (runs[i - 1] < mod * 3) continue;
      var r13 = leerEAN(runs, i + 3, 6, 6);
      if (r13) return r13;
      var r8 = leerEAN(runs, i + 3, 4, 4);
      if (r8) return r8;
    }
    return null;
  }

  function leerEAN(runs, p, nIzq, nDer) {
    var necesarios = nIzq * 4 + 5 + nDer * 4 + 3;
    if (p + necesarios > runs.length) return null;
    var izq = '', par = '', k, d, w;
    for (k = 0; k < nIzq; k++) {
      w = runs.slice(p, p + 4); p += 4;
      d = mejorDigito(w, nIzq === 6 ? [{ nombre: 'L', tabla: L }, { nombre: 'G', tabla: G }] : [{ nombre: 'L', tabla: L }]);
      if (!d) return null;
      izq += d.d; par += d.t;
    }
    var medio = runs.slice(p, p + 5); p += 5;
    var mm = (medio[0] + medio[1] + medio[2] + medio[3] + medio[4]) / 5;
    for (k = 0; k < 5; k++) if (Math.abs(medio[k] - mm) > mm * .75) return null;
    var der = '';
    for (k = 0; k < nDer; k++) {
      w = runs.slice(p, p + 4); p += 4;
      d = mejorDigito(w, [{ nombre: 'R', tabla: L }]);
      if (!d) return null;
      der += d.d;
    }
    var codigo;
    if (nIzq === 6) {
      var primero = PARIDAD.indexOf(par);
      if (primero < 0) return null;
      codigo = primero + izq + der;
    } else {
      codigo = izq + der;
    }
    return checksum(codigo) ? codigo : null;
  }

  function decodificarFila(fila) {
    var r = aRuns(fila);
    if (!r) return null;
    var c = decodificarRuns(r.runs, r.primeroNegro);
    if (c) return c;
    var inv = r.runs.slice().reverse();
    // al invertir, el primer run pasa a ser el ultimo; su color depende de la paridad
    var ultimoNegro = ((r.runs.length - 1) % 2 === 0) === r.primeroNegro;
    return decodificarRuns(inv, ultimoNegro);
  }

  function decodificarImagen(gris, ancho, alto) {
    var ys = [.5, .42, .58, .34, .66, .26, .74, .5];
    for (var j = 0; j < ys.length; j++) {
      var y = Math.min(alto - 1, Math.max(0, Math.round(alto * ys[j])));
      var fila = gris.subarray ? gris.subarray(y * ancho, (y + 1) * ancho) : gris.slice(y * ancho, (y + 1) * ancho);
      var c = decodificarFila(fila);
      if (c) return c;
    }
    return null;
  }

  function normalizar(c) { return String(c || '').replace(/\D/g, '').replace(/^0+/, ''); }
  function coincide(a, b) { var x = normalizar(a), y = normalizar(b); return !!x && x === y; }

  // ---------- Interfaz ----------
  var CSS = '' +
    '.esc{position:fixed;inset:0;z-index:9999;background:#1d0f14;display:flex;flex-direction:column;color:#fff;font-family:inherit}' +
    '.esc__top{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 10px}' +
    '.esc__nombre{font-weight:700;font-size:16px;line-height:1.2}' +
    '.esc__x{background:rgba(255,255,255,.14);border:0;color:#fff;width:40px;height:40px;border-radius:50%;font-size:24px;line-height:1}' +
    '.esc__vista{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '.esc__video{width:100%;height:100%;object-fit:cover}' +
    '.esc__marco{position:absolute;left:10%;right:10%;top:50%;height:34%;transform:translateY(-50%);border:3px solid #fff;border-radius:16px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}' +
    '.esc__marco::after{content:"";position:absolute;left:8%;right:8%;top:50%;height:2px;background:#e8647f}' +
    '.esc__pie{padding:14px 16px calc(env(safe-area-inset-bottom,0px) + 16px);text-align:center}' +
    '.esc__msg{font-size:15px;margin:0 0 12px;min-height:22px}' +
    '.esc__msg--mal{color:#ffb4c0;font-weight:700}' +
    '.esc__manual{display:flex;gap:8px}' +
    '.esc__manual input{flex:1;min-width:0;border:0;border-radius:12px;padding:12px;font-size:16px}' +
    '.esc__manual button{border:0;border-radius:12px;padding:12px 16px;font-weight:700;background:#fff;color:#7a1f36}';

  function inyectarCSS() {
    if (document.getElementById('esc-css')) return;
    var s = document.createElement('style');
    s.id = 'esc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }

  /** opts: { nombre, codigo, alAcertar() } */
  function abrir(opts) {
    inyectarCSS();
    var nombre = opts.nombre || '', esperado = opts.codigo || '';
    var el = document.createElement('div');
    el.className = 'esc';
    el.innerHTML =
      '<div class="esc__top"><div class="esc__nombre">' + esc(nombre) + '</div><button class="esc__x" type="button" aria-label="Cerrar">&times;</button></div>' +
      '<div class="esc__vista"><video class="esc__video" playsinline muted autoplay></video><div class="esc__marco"></div></div>' +
      '<div class="esc__pie"><p class="esc__msg">Apunta la cámara al código de barras del producto.</p>' +
      '<form class="esc__manual"><input inputmode="numeric" autocomplete="off" placeholder="O escribe el número del código"><button type="submit">Listo</button></form></div>';
    document.body.appendChild(el);

    var video = el.querySelector('video'), msg = el.querySelector('.esc__msg');
    var stream = null, vivo = true, detector = null, ultimoMal = 0;
    var lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });

    function cerrar() {
      vivo = false;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    function aviso(t, mal) { msg.textContent = t; msg.className = 'esc__msg' + (mal ? ' esc__msg--mal' : ''); }
    function recibido(codigo) {
      if (!vivo) return;
      if (coincide(codigo, esperado)) { cerrar(); if (opts.alAcertar) opts.alAcertar(); return; }
      var ahora = Date.now();
      if (ahora - ultimoMal > 1500) { ultimoMal = ahora; aviso('Ese código no es de ' + nombre + '. Intenta de nuevo.', true); }
    }

    el.querySelector('.esc__x').addEventListener('click', cerrar);
    el.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = el.querySelector('input').value;
      if (normalizar(v)) recibido(v);
    });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      aviso('Este navegador no permite usar la cámara. Escribe el número del código.', true);
      return { cerrar: cerrar };
    }
    if ('BarcodeDetector' in window) {
      try { detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); } catch (e) { detector = null; }
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(function (s) {
        if (!vivo) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; video.srcObject = s;
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        ciclo();
      })
      .catch(function () {
        aviso('No se pudo abrir la cámara. Permite el acceso a la cámara o escribe el número del código.', true);
      });

    function ciclo() {
      if (!vivo) return;
      var listo = video.readyState >= 2 && video.videoWidth > 0;
      var siguiente = function () { setTimeout(ciclo, 120); };
      if (!listo) return siguiente();
      var usar = function () {
        var w = Math.min(video.videoWidth, 960), h = Math.round(video.videoHeight * w / video.videoWidth);
        lienzo.width = w; lienzo.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        var px = ctx.getImageData(0, 0, w, h).data, gris = new Uint8Array(w * h);
        for (var i = 0, j = 0; i < px.length; i += 4, j++) gris[j] = (px[i] * 77 + px[i + 1] * 151 + px[i + 2] * 28) >> 8;
        var c = decodificarImagen(gris, w, h);
        if (c) recibido(c);
        siguiente();
      };
      if (detector) {
        detector.detect(video).then(function (r) {
          if (r && r.length) recibido(r[0].rawValue); else usar();
        }).catch(function () { detector = null; usar(); });
      } else usar();
    }
    return { cerrar: cerrar };
  }

  window.tiendita_escaner = {
    ACTIVO: ACTIVO,
    abrir: abrir,
    coincide: coincide,
    _decodificarFila: decodificarFila,
    _decodificarImagen: decodificarImagen
  };
})();
