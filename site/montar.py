#!/usr/bin/env python3
"""Monta o site num arquivo só (site/index.html) a partir de site/src.

Rodar:  python3 site/montar.py
O site é publicado como um arquivo só, então tudo (estilo, seções e
scripts) é colado dentro do index.html. Edite sempre os arquivos de
site/src e rode este script de novo.
"""
from pathlib import Path
import re, sys

AQUI = Path(__file__).resolve().parent
SRC = AQUI / 'src'

# Ordem importa: os dados vêm antes do app.js, que usa todos eles.
JS_SITE = ['dados-compras.js', 'circuito.js', 'dados-montagem.js', 'dados-testes.js', 'dados-firmware.js', 'montagem-sim.js', 'montagem-pecas.js', 'montagem-passos.js', 'montagem-ui.js', 'app.js']
CSS = ['estilo.css', 'projeto3d.css']

def ler(p):
    return (SRC / p).read_text(encoding='utf-8')

def montar():
    html = ler('pagina.html')
    html = html.replace('/*ESTILO*/', '\n'.join(ler(c) for c in CSS))
    for nome in re.findall(r'<!--SECAO:([a-z0-9-]+)-->', html):
        html = html.replace(f'<!--SECAO:{nome}-->', ler(f'secoes/{nome}.html').rstrip())
    js = '\n\n'.join(f'/* ===== {f} ===== */\n' + ler('js/' + f) for f in JS_SITE)
    js3d = ler('js/projeto3d.js')
    for nome, codigo in (('site', js), ('3D', js3d)):
        if '</script' in codigo.lower():
            sys.exit(f'Erro: o script do {nome} tem "</script" dentro e quebraria a página.')
    html = html.replace('/*JS_SITE*/', js).replace('/*JS_3D*/', js3d)
    sobrou = re.findall(r'/\*(ESTILO|JS_SITE|JS_3D)\*/|<!--SECAO:', html)
    if sobrou:
        sys.exit(f'Erro: marcador não substituído: {sobrou}')
    (AQUI / 'index.html').write_text(html, encoding='utf-8')
    print(f'site/index.html: {len(html.encode("utf-8")) // 1024} KB')

if __name__ == '__main__':
    montar()
