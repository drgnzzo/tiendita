/* Comportamiento de app en celular y tableta: sin zoom, sin selección de texto, sin menú contextual.
   Solo actúa en pantallas táctiles; en computadora todo queda normal. */
(function () {
  'use strict';
  var tactil = false;
  try { tactil = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; } catch (_) {}
  if (!tactil) return;

  var css = '' +
    'html,body{-webkit-text-size-adjust:100%;text-size-adjust:100%;overscroll-behavior:none;-webkit-tap-highlight-color:transparent;}' +
    'html{touch-action:pan-x pan-y;}' +
    'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}' +
    'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;}' +
    'img,svg,a,button{-webkit-user-drag:none;-webkit-touch-callout:none;}' +
    'button,a,.btn,[role="button"],label,select,summary{touch-action:manipulation;}';
  var st = document.createElement('style');
  st.setAttribute('data-app-movil', '');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // Viewport fijo: sin zoom
  var vp = document.querySelector('meta[name="viewport"]');
  var contenido = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  if (vp) vp.setAttribute('content', contenido);

  var campo = function (t) { return t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]'); };
  var opts = { passive: false };

  // Pellizco (iOS Safari) y gestos de zoom
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
    document.addEventListener(n, function (e) { e.preventDefault(); }, opts);
  });
  // Dos dedos = pellizco (Android/otros)
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, opts);
  document.addEventListener('touchstart', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, opts);
  // Doble toque = zoom
  var ultimo = 0;
  document.addEventListener('touchend', function (e) {
    var ahora = Date.now();
    if (ahora - ultimo < 350 && !campo(e.target)) e.preventDefault();
    ultimo = ahora;
  }, opts);
  document.addEventListener('dblclick', function (e) { if (!campo(e.target)) e.preventDefault(); }, opts);
  // Ctrl + rueda / atajos de zoom
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, opts);
  // Menú contextual (mantener presionado) y selección
  document.addEventListener('contextmenu', function (e) { if (!campo(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { if (!campo(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
