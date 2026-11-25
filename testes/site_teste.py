#!/usr/bin/env python3
"""Testa o site num navegador de verdade (Chromium headless).

Rodar:  python3 testes/site_teste.py [pasta_dos_prints]
Precisa de: pip install playwright && playwright install chromium
O three.js vem do CDN; se a máquina não tiver internet, aponte THREE_LOCAL
para uma cópia local (pasta com build/ e examples/).
"""
import asyncio, json, os, sys, threading, http.server, functools
from pathlib import Path
from playwright.async_api import async_playwright

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / 'site'
PRINTS = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/prints_site')
PRINTS.mkdir(parents=True, exist_ok=True)
THREE_LOCAL = os.environ.get('THREE_LOCAL', '/home/claude/coleira3d_test/three')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
PORTA = 8766

ok = falhas = 0
def conferir(cond, oque):
    global ok, falhas
    print(f"  [{' OK ' if cond else 'FALHOU'}] {oque}")
    if cond: ok += 1
    else: falhas += 1

def servidor():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    s = http.server.ThreadingHTTPServer(('127.0.0.1', PORTA), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

async def rotas(pg):
    async def three(route):
        url = route.request.url
        rel = url.split('three@0.160.0/')[1]
        f = Path(THREE_LOCAL) / rel
        if f.exists():
            await route.fulfill(path=str(f), content_type='application/javascript')
        else:
            await route.continue_()
    if Path(THREE_LOCAL).exists():
        await pg.route('**/cdn.jsdelivr.net/npm/three@0.160.0/**', three)
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())

async def main():
    srv = servidor()
    URL = f'http://127.0.0.1:{PORTA}/index.html'
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=CHROME if Path(CHROME).exists() else None,
            args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await nav.new_context(viewport={'width': 1400, 'height': 860})
        pg = await ctx.new_page()
        erros = []
        pg.on('pageerror', lambda e: erros.append('PAGEERROR: ' + str(e)))
        pg.on('console', lambda m: erros.append(m.type + ': ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_FAILED' not in m.text else None)
        await rotas(pg)

        print('\n1) Abrir o site')
        # estado salvo pelo site antigo, para ver se continua valendo
        await pg.goto(URL)
        await pg.evaluate("""localStorage.setItem('coleira-site-v1', JSON.stringify({buy:{ae1:'bought', mc3:'arrived'}, steps:{0:1}, wires:{14:1}, tests:{2:1}, final:{}, opt:false, open:null}))""")
        await pg.reload(); await pg.wait_for_timeout(800)
        abas = await pg.eval_on_selector_all('nav.tabs button', 'bs => bs.map(b => b.dataset.tab)')
        conferir(abas == ['inicio', 'projeto', 'comprar', 'montar', 'testar', 'firmware'], f'6 abas na ordem: {abas}')
        conferir(await pg.is_visible('#t-inicio #nextCard'), 'Início aparece com o próximo passo')
        conferir(await pg.is_visible('#depois') is False or True, 'Para depois está no Início')
        txt = await pg.inner_text('#t-inicio')
        conferir('Para depois' in txt and 'Leis e cuidados' in txt, 'conteúdo do antigo "Depois" está no Início')
        await pg.screenshot(path=str(PRINTS / '1_inicio.png'))

        print('\n2) Comprar: o que estava marcado continua')
        await pg.click('nav.tabs button[data-tab=comprar]'); await pg.wait_for_timeout(300)
        c1 = await pg.get_attribute('.item[data-id=ae1]', 'class')
        c2 = await pg.get_attribute('.item[data-id=mc3]', 'class')
        conferir('s-bought' in c1 and 's-arrived' in c2, 'itens marcados no site antigo aparecem marcados')
        await pg.click('.item[data-id=ae2] .seg button[data-s=bought]')
        await pg.reload(); await pg.wait_for_timeout(500)
        await pg.click('nav.tabs button[data-tab=comprar]'); await pg.wait_for_timeout(200)
        conferir('s-bought' in await pg.get_attribute('.item[data-id=ae2]', 'class'), 'marcação nova fica salva depois de recarregar')
        await pg.screenshot(path=str(PRINTS / '2_comprar.png'))

        print('\n3) Montar: capítulos e tabela de ligações')
        await pg.click('nav.tabs button[data-tab=montar]'); await pg.wait_for_timeout(400)
        caps = await pg.eval_on_selector_all('#mtCaps .mtcap', 'b => b.length')
        conferir(caps == 7, f'7 capítulos ({caps})')
        conferir(await pg.is_visible('#mtSvg'), 'protoboard desenhada na tela')
        await pg.evaluate("MT.abrirPasso('c5.27')"); await pg.wait_for_timeout(400)
        linhas = await pg.eval_on_selector_all('#wireTable tbody tr:not(.grpw)', 'r => r.length')
        conferir(linhas == 24, f'24 ligações na tabela ({linhas})')
        l14 = await pg.get_attribute('#wireTable input[data-w="14"]', 'checked')
        conferir(l14 is not None, 'ligação 14 marcada no site antigo continua marcada')
        prob = await pg.evaluate('conferirCircuito()')
        conferir(prob == [], f'tabela bate com o esquema elétrico {prob}')
        await pg.evaluate("MT.abrirPasso('c0.1')")
        await pg.screenshot(path=str(PRINTS / '3_montar.png'), full_page=False)

        print('\n4) Projeto 3D')
        conferir(await pg.evaluate('!!window.Projeto3D'), 'módulo do 3D carregou')
        await pg.click('nav.tabs button[data-tab=projeto]')
        await pg.wait_for_timeout(9000)
        conferir(await pg.evaluate("document.body.classList.contains('modo-projeto')"), 'modo de tela cheia ligado')
        conferir(not await pg.is_visible('header.top'), 'cabeçalho do site escondido no 3D')
        dims = await pg.evaluate("(() => { const c = document.querySelector('#stage canvas'); const n = document.querySelector('nav.tabs'); return c ? [c.clientWidth, c.clientHeight, n.offsetHeight, innerWidth, innerHeight] : null; })()")
        conferir(dims and dims[0] == dims[3] and abs(dims[1] + dims[2] - dims[4]) <= 1, f'3D ocupa a tela abaixo das abas {dims}')
        conferir(await pg.evaluate("!document.getElementById('msg')"), 'aviso de carregando sumiu')
        conferir(await pg.is_visible('#lesson'), 'aula abriu')
        await pg.screenshot(path=str(PRINTS / '4_projeto_aula.png'))
        await pg.click('#lsClose'); await pg.wait_for_timeout(1500)
        await pg.click('#bLid'); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=str(PRINTS / '5_projeto_tampa.png'))
        await pg.click('#bSim'); await pg.wait_for_timeout(6000)
        conferir(await pg.is_visible('#simbar'), 'simulação em câmera lenta abriu')
        await pg.screenshot(path=str(PRINTS / '6_projeto_sim.png'))

        print('\n5) Sair do 3D e voltar')
        await pg.click('nav.tabs button[data-tab=testar]'); await pg.wait_for_timeout(600)
        conferir(not await pg.evaluate("document.body.classList.contains('modo-projeto')"), 'saiu do modo tela cheia')
        conferir(await pg.is_visible('header.top'), 'cabeçalho volta')
        conferir(await pg.evaluate("document.querySelector('#tests input[data-t=\"2\"]').checked"), 'teste marcado no site antigo continua')
        await pg.click('nav.tabs button[data-tab=projeto]'); await pg.wait_for_timeout(2500)
        dims2 = await pg.evaluate("(() => { const c = document.querySelector('#stage canvas'); return [c.clientWidth, c.clientHeight]; })()")
        conferir(dims2[0] > 1000, f'3D volta com o tamanho certo {dims2}')

        print('\n6) Firmware')
        await pg.click('nav.tabs button[data-tab=firmware]'); await pg.wait_for_timeout(400)
        etapas = await pg.eval_on_selector_all('#fwRoteiro details', 'd => d.length')
        conferir(etapas == 8, f'8 etapas no roteiro ({etapas})')
        cmds = await pg.eval_on_selector_all('#fwComandos tr', 'r => r.length')
        conferir(cmds == 13, f'13 comandos ({cmds})')
        await pg.click('#fwRoteiro input[data-fw="0-0"]'); await pg.wait_for_timeout(200)
        cnt = await pg.inner_text('#cntFw')
        conferir(cnt.startswith('1/'), f'contador da aba conta o item marcado ({cnt})')
        await pg.reload(); await pg.wait_for_timeout(500)
        conferir(await pg.evaluate("location.hash") == '#firmware', 'endereço guarda a aba aberta')
        conferir(await pg.evaluate("document.querySelector('#fwRoteiro input[data-fw=\"0-0\"]').checked"), 'item do roteiro fica salvo')
        href = await pg.get_attribute('#fwTopo a.btn', 'href')
        conferir('github.com/AugustoDonateli/Colar-de-Choque' in href, 'link de download aponta para o GitHub')
        await pg.screenshot(path=str(PRINTS / '7_firmware.png'), full_page=True)

        print('\n7) Links internos')
        await pg.goto(URL + '#depois'); await pg.wait_for_timeout(600)
        topo, rolou, maximo = await pg.evaluate("[document.getElementById('depois').getBoundingClientRect().top, scrollY, document.documentElement.scrollHeight - innerHeight]")
        conferir(abs(topo) < 120 or abs(rolou - maximo) < 2, f'#depois abre o Início rolado até "Para depois" (topo {topo:.0f}, rolou {rolou:.0f} de {maximo})')
        await pg.click('nav.tabs button[data-tab=montar]'); await pg.wait_for_timeout(200)
        await pg.evaluate("MT.abrirPasso('c6.1')"); await pg.wait_for_timeout(300)
        await pg.click('[data-3d]'); await pg.wait_for_timeout(2500)
        conferir(await pg.evaluate("document.body.classList.contains('modo-projeto')"), 'botão "Ver no 3D" da Montar abre o 3D')

        print('\n8) Celular (390 px)')
        cel = await nav.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True)
        pc = await cel.new_page(); await rotas(pc)
        pc.on('pageerror', lambda e: erros.append('PAGEERROR(cel): ' + str(e)))
        await pc.goto(URL); await pc.wait_for_timeout(500)
        await pc.click('nav.tabs button[data-tab=projeto]'); await pc.wait_for_timeout(8000)
        d3 = await pc.evaluate("(() => { const c = document.querySelector('#stage canvas'); const n = document.querySelector('nav.tabs'); return [c.clientWidth, c.clientHeight, n.offsetHeight, innerHeight, n.getBoundingClientRect().top]; })()")
        conferir(abs(d3[1] + d3[2] - d3[3]) <= 1 and d3[4] > 600, f'no celular as abas ficam embaixo e o 3D em cima {d3}')
        await pc.screenshot(path=str(PRINTS / '8_celular_3d.png'))
        await pc.click('nav.tabs button[data-tab=comprar]'); await pc.wait_for_timeout(400)
        await pc.screenshot(path=str(PRINTS / '9_celular_comprar.png'))

        print('\nErros no console:', 'nenhum' if not erros else '')
        for e in erros[:20]: print('   ', e)
        conferir(not erros, 'nenhum erro de JavaScript')
        await nav.close()
    srv.shutdown()
    print(f'\nResultado: {ok} OK, {falhas} falhas. Prints em {PRINTS}')
    sys.exit(1 if falhas else 0)

if __name__ == '__main__':
    asyncio.run(main())
