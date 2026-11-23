#!/usr/bin/env python3
"""Genera el tema "Diamante" (azul acero y marino) a partir de los estilos "Perla" (rosa y vino).

Uso (desde la carpeta del proyecto):  python tools/generar_tema_diamante.py
Lee   docs/styles.css  y  docs/admin/css/app.css
Crea  docs/styles-diamante.css  y  docs/admin/css/app-diamante.css
Cada vez que cambies los estilos Perla, vuelve a correr este script.
"""
import colorsys, re, sys, os

AZUL = 214.0   # acero
CIAN = 190.0   # destello de hielo (reemplaza al durazno y al mango)

def mapear(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == 0 or (mx - mn) / mx < 0.03:        # grises y blancos puros: no se tocan
        return None
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    h *= 360
    if h >= 300 or h <= 8:
        nh = AZUL
    elif 8 < h <= 50:
        nh = CIAN
    else:
        return None                              # verdes, azules, etc.: se quedan igual
    ns = min(1.0, s * (0.85 if nh == AZUL else 0.6))
    nl = l
    if nh == AZUL and 0.30 <= l <= 0.56 and s > 0.6:
        nl = l - 0.07                            # azules intensos un poco más oscuros: letra blanca legible
    r2, g2, b2 = colorsys.hls_to_rgb(nh / 360, nl, ns)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)

def convertir(css):
    def hexsub(m):
        t = m.group(1)
        if len(t) == 3:
            t = ''.join(c * 2 for c in t)
        f = mapear(int(t[0:2], 16), int(t[2:4], 16), int(t[4:6], 16))
        return m.group(0) if not f else '#%02X%02X%02X' % f
    def rgbasub(m):
        f = mapear(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        return m.group(0) if not f else 'rgba(%d,%d,%d,' % f
    css = re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', hexsub, css)
    css = re.sub(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,', rgbasub, css)
    return css

PARES = [('docs/styles.css', 'docs/styles-diamante.css'),
         ('docs/admin/css/app.css', 'docs/admin/css/app-diamante.css')]

if __name__ == '__main__':
    raiz = sys.argv[1] if len(sys.argv) > 1 else '.'
    for a, b in PARES:
        src = open(os.path.join(raiz, a), encoding='utf-8').read()
        out = ('/* TEMA DIAMANTE: generado con tools/generar_tema_diamante.py. No editar a mano. */\n'
               + convertir(src))
        open(os.path.join(raiz, b), 'w', encoding='utf-8').write(out)
        print('listo', b, len(out), 'bytes')
