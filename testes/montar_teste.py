#!/usr/bin/env python3
"""Passa por TODOS os passos da aba Montar num navegador, como um usuário.

Rodar: python3 testes/montar_teste.py [pasta_dos_prints]
Os passos de colocar, ligar e soldar usam MT.resolverPasso() (o mesmo caminho
do clique certo). Os de testar e medir são feitos pelos controles da tela.
Alguns passos são feitos à mão com o mouse, para testar o arrasto e os erros.
"""
import asyncio, sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from site_teste import servidor, rotas, CHROME, PORTA
from playwright.async_api import async_playwright

PR = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/prints_montar'); PR.mkdir(parents=True, exist_ok=True)
ok = falhas = 0
def conferir(c, t):
    global ok, falhas
    print(f"  [{' OK ' if c else 'FALHOU'}] {t}"); ok += bool(c); falhas += (not c)

async def main():
    srv = servidor()
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=CHROME if Path(CHROME).exists() else None, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await nav.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_FAILED' not in m.text else None)
        await rotas(pg)
        await pg.goto(f'http://127.0.0.1:{PORTA}/index.html#montar'); await pg.wait_for_timeout(800)
        conferir(await pg.is_visible('#mtCard'), 'aba Montar abre com o cartão do passo')
        total = await pg.evaluate('MT.PASSOS.length')
        print(f'  {total} passos no total')

        async def clicar_furo(f):
            await pg.locator(f'#mtSvg .furo[data-f="{f}"]').first.click(force=True)
        async def apertar(b, ms=120):
            el = pg.locator(f'[data-bt="{b}"]'); await el.dispatch_event('mousedown'); await pg.wait_for_timeout(ms); await pg.mouse.up()
        async def chave(on):
            c = pg.locator('#mtChave')
            if await c.count() and (await c.is_checked()) != on: await c.click()
        async def usb(on):
            c = pg.locator('#mtUsb')
            if await c.count() and (await c.is_checked()) != on: await c.click()
        async def feito():
            return await pg.evaluate('MT.feito(MT.passoAtual())')

        prints = {'c0.2': '01_explorar', 'c1.1': '02_resistores', 'c2.5': '03_esp_ligado', 'c3.9': '05_choque_b', 'c3.15': '06_irfz', 'c4.2': '07_soldas', 'c5.13': '09_placa_cima', 'c5.20': '10_placa_baixo', 'c5.28': '11_primeiro_liga', 'c6.1': '12_caixa'}
        for i in range(total):
            P = await pg.evaluate('(() => { const p = MT.passoAtual(); return {id:p.id, tipo:p.tipo, cond:p.cond||null, modo:p.modo||null, v:p.vermelha||null, pr:p.preta||null, chave:!!p.chave, t:p.t}; })()')
            pid, tipo = P['id'], P['tipo']
            if pid == 'c2.3':
                # à mão: pegar, girar duas vezes (começa virada) e soltar no d5
                await pg.click('[data-pegar]'); await pg.keyboard.press('r'); await pg.keyboard.press('r')
                box = await pg.locator('#mtSvg .furo[data-f="d5"]').bounding_box()
                await pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); await pg.wait_for_timeout(100)
                await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                conferir(await feito(), 'ESP32 colocado à mão (pegar, girar com R, soltar no d5)')
            elif pid == 'c2.6':
                await clicar_furo('b11'); await clicar_furo('b12')
                m = await pg.inner_text('#mtMsg')
                conferir('invertido' in m.lower(), f'capacitor invertido é pego: "{m[:60]}..."')
                await clicar_furo('b12'); await clicar_furo('b11')
                conferir(await feito(), 'capacitor certo depois do erro')
            elif pid == 'c2.9':
                await clicar_furo('a10'); await clicar_furo('c20')   # mesma tira do a20: vale
                await clicar_furo('b8'); await clicar_furo('e21')    # mesma tira do b21
                await clicar_furo('c23'); await clicar_furo('T-25')  # vai para a trilha −
                conferir(await feito(), 'jumpers aceitos em qualquer furo da mesma coluna')
            elif tipo == 'medir':
                await pg.click(f'[data-modo="{"cont" if P["modo"] == "cont" else "V"}"]')
                if P['modo'] == 'cont': await chave(False); await usb(False)
                await pg.click('[data-ponta="vermelha"]'); await clicar_furo(P['v'])
                await pg.click('[data-ponta="preta"]'); await clicar_furo(P['pr'])
                if P['chave']: await chave(True)
                await pg.wait_for_timeout(700)
                conferir(await feito(), f'{pid} medir: {await pg.inner_text("#mtVisor")}')
            elif tipo == 'testar':
                c = P['cond']
                if c != 'usb': await usb(False); await chave(True)
                await pg.wait_for_timeout(3300)
                if c == 'rf' or c == 'bipeA': await apertar(0)
                elif c == 'choqueB': await apertar(1)
                elif c == 'segurarD': await apertar(3, 3600)
                elif c == 'pausa':
                    await apertar(3); await pg.wait_for_timeout(1700)
                    for _ in range(4): await apertar(1); await pg.wait_for_timeout(250)
                elif c == 'curto': await pg.wait_for_timeout(2500); await apertar(1)
                elif c == 'usb': await chave(False); await usb(True); await pg.wait_for_timeout(2500); await apertar(2)
                elif c == 'irfz': await apertar(3)
                for _ in range(30):
                    if await feito(): break
                    await pg.wait_for_timeout(200)
                conferir(await feito(), f'{pid} testar ({c})')
                if c == 'usb': await usb(False)
            elif pid == 'c4.3':
                # treino na tela à mão: segura o ferro, espera esquentar, põe estanho, solta
                for _ in range(3):
                    pad = await pg.locator('#mtTrPad').bounding_box()
                    await pg.mouse.move(pad['x'] + pad['width'] / 2, pad['y'] + pad['height'] / 2); await pg.mouse.down()
                    await pg.wait_for_timeout(1400); await pg.keyboard.down('Space'); await pg.wait_for_timeout(1100); await pg.keyboard.up('Space'); await pg.wait_for_timeout(150); await pg.mouse.up()
                    await pg.wait_for_timeout(300)
                    if not await feito(): await pg.click('#mtTrNova')
                conferir(await feito(), f'treino de solda: 3 soldas boas ({await pg.inner_text("#mtTrRes")})')
                await pg.screenshot(path=str(PR / '08_treino.png'))
            else:
                r = await pg.evaluate('MT.resolverPasso()')
                if r != 'ok' and not await feito(): conferir(False, f'{pid} ({tipo}) não resolveu: {r}')
            if pid in prints:
                if pid == 'c3.9': pass
                await pg.wait_for_timeout(300); await pg.screenshot(path=str(PR / (prints[pid] + '.png')))
            if pid == 'c6.1':
                await pg.click('[data-3d]'); await pg.wait_for_timeout(9000)
                conferir(await pg.evaluate("document.body.classList.contains('modo-projeto')"), 'botão "Ver no 3D" abre o 3D')
                await pg.screenshot(path=str(PR / '13_ver_no_3d.png'))
                await pg.click('nav.tabs button[data-tab=montar]'); await pg.wait_for_timeout(400)
            if not await feito(): conferir(False, f'{pid} ficou sem terminar'); break
            if i < total - 1:
                await pg.click('[data-nav="1"]'); await pg.wait_for_timeout(120)
        n = await pg.evaluate('MT.totais().n')
        conferir(n == total, f'todos os passos feitos ({n}/{total})')
        prob = await pg.evaluate("(() => { const c = MT.conteudo('protoboard', false); return CIRCUITO.conferirLayout(CIRCUITO.LAYOUT.protoboard, CIRCUITO.REDES_BANCADA, {pecas:c.pecas, jumpers: CIRCUITO.LAYOUT.protoboard.jumpers.filter(j=>c.jumpers.includes(j.id))}); })()")
        conferir(prob == [], f'protoboard montada pelos passos = esquema da bancada {prob[:3]}')
        prob = await pg.evaluate("(() => { const c = MT.conteudo('placa', false); const L = CIRCUITO.LAYOUT.placa; return CIRCUITO.conferirLayout(L, CIRCUITO.REDES, {pecas:c.pecas, soldados:c.soldados, pontes:L.pontes.filter(p=>c.pontes.includes(p.id)), fios:L.fios.filter(f=>c.fios.includes(f.id))}); })()")
        conferir(prob == [], f'placa montada pelos passos = esquema da coleira {prob[:3]}')
        await pg.goto(f'http://127.0.0.1:{PORTA}/index.html#inicio'); await pg.wait_for_timeout(600)
        conferir('Montar' in await pg.inner_text('#stages') and f'{total}/{total}' in await pg.inner_text('nav.tabs'), 'progresso da montagem aparece nas abas e no Início')
        await pg.screenshot(path=str(PR / '14_inicio.png'))
        print('\nErros no console:', erros[:10] if erros else 'nenhum')
        conferir(not erros, 'nenhum erro de JavaScript')
        await nav.close()
    srv.shutdown()
    print(f'\nResultado: {ok} OK, {falhas} falhas. Prints em {PR}')
    sys.exit(1 if falhas else 0)
asyncio.run(main())
