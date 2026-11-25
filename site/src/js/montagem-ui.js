/* =====================================================================
   montagem-ui.js — a aba Montar: passos guiados, bancada na tela,
   simulador, multímetro, treino de solda e "Não entendi"
   ===================================================================== */
const MT = (() => {
  const CIR = window.CIRCUITO, SIMU = window.SIM, L = CIR.LAYOUT;
  const q$ = s => document.querySelector(s);
  const esc = DES.esc;
  const st = () => { if (!S.mt) S.mt = {}; const m = S.mt; m.feitos = m.feitos || {}; m.chk = m.chk || {}; m.cap = m.cap || 'c0'; return m; };

  // ---------- passos ----------
  const PASSOS = [];
  CAPITULOS.forEach(c => c.passos.forEach(p => { p.cap = c; PASSOS.push(p); }));
  const feito = p => !!st().feitos[p.id];
  const cap = () => CAPITULOS.find(c => c.id === st().cap) || CAPITULOS[0];
  function passoAtual() {
    const c = cap(); const id = st().passo;
    return c.passos.find(p => p.id === id) || c.passos.find(p => !feito(p)) || c.passos[c.passos.length - 1];
  }
  const totais = () => ({ n: PASSOS.filter(feito).length, t: PASSOS.length });
  const proximoGeral = () => PASSOS.find(p => !feito(p));

  // ---------- o que está na placa ----------
  let prog = null;               // progresso do passo atual (não fica salvo)
  function novoProg(p) { return { id: p.id, pecas: [], jumpers: [], pontes: [], fios: [], soldados: [], cliques: new Set(), tiras: new Set(), selecionada: null, perna1: null, inicio: 0, quizErro: false, boas: 0 }; }
  function conteudo(quadro, incluirProg = true) {
    const c = { pecas: [], jumpers: [], pontes: [], fios: [], soldados: new Set() };
    const lay = L[quadro];
    const add = p => {
      if (p.tipo === 'colocar') c.pecas.push(p.peca);
      if (p.tipo === 'pernas' || p.tipo === 'encaixar') c.pecas.push(...p.pecas);
      if (p.tipo === 'jumper') c.jumpers.push(...p.jumpers);
      if (p.tipo === 'soldar') p.pecas.forEach(id => Object.values(CIR.pinosDaPeca(lay, id)).forEach(f => c.soldados.add(f)));
      if (p.tipo === 'ponte') p.pontes.forEach(id => { c.pontes.push(id); lay.pontes.find(x => x.id === id).furos.forEach(f => c.soldados.add(f)); });
      if (p.tipo === 'fio') p.fios.forEach(id => { c.fios.push(id); const f = lay.fios.find(x => x.id === id); c.soldados.add(f.de); c.soldados.add(f.para); });
    };
    CAPITULOS.filter(k => k.quadro === quadro).forEach(k => k.passos.forEach(p => { if (feito(p)) add(p); }));
    if (incluirProg && prog) { c.pecas.push(...prog.pecas); c.jumpers.push(...prog.jumpers); c.pontes.push(...prog.pontes); c.fios.push(...prog.fios); prog.soldados.forEach(f => c.soldados.add(f));
      prog.pontes.forEach(id => lay.pontes.find(x => x.id === id).furos.forEach(f => c.soldados.add(f))); prog.fios.forEach(id => { const f = lay.fios.find(x => x.id === id); c.soldados.add(f.de); c.soldados.add(f.para); }); }
    return c;
  }

  // ---------- simulador ----------
  const bancadas = {};
  const ctrl = { chave: false, usb: false, vbat: 3.9 };
  function bancada(quadro) {
    if (!bancadas[quadro]) bancadas[quadro] = SIMU.novaBancada(L[quadro]);
    return bancadas[quadro];
  }
  function sincronizar() {
    const k = cap(); if (k.quadro !== 'protoboard' && k.quadro !== 'placa') return null;
    const B = bancada(k.quadro), c = conteudo(k.quadro), p = passoAtual();
    SIMU.bancadaMudar(B, e => {
      e.pecas = c.pecas; e.jumpers = c.jumpers; e.pontes = c.pontes; e.fios = c.fios;
      if (k.quadro === 'placa') { e.soldados = c.soldados; e.soltos = !!(p && (p.id === 'c5.28' || feito(PASSOS.find(x => x.id === 'c5.27')))); }
      e.chave = ctrl.chave; e.usb = ctrl.usb && c.pecas.includes('esp'); e.vbat = ctrl.vbat; e.defeitos = (p && p.defeito && !feito(p)) ? { [p.defeito]: true } : {};
    });
    return B;
  }

  // ---------- áudio do buzzer ----------
  let audio = null, osc = null;
  function som(ligado) {
    try {
      if (ligado && !osc) { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); osc = audio.createOscillator(); const g = audio.createGain(); g.gain.value = 0.04; osc.frequency.value = 2600; osc.type = 'square'; osc.connect(g).connect(audio.destination); osc.start(); }
      if (!ligado && osc) { osc.stop(); osc = null; }
    } catch (e) {}
  }

  // ---------- desenho ----------
  let vista = 'cima', zoom = 1, verCorrente = false, mao = null, hover = null, mostrarAlvo = false, msg = null;
  const pontas = { vermelha: null, preta: null, modo: 'V', escolhendo: null };
  function viewBox(q) {
    const base = q === 'protoboard' ? [-11, -5, 76, 21] : [-2, -2, 28, 33];
    const [x, y, w, h] = base, cx = x + w / 2, cy = y + h / 2, W = w / zoom, H = h / zoom;
    return `${cx - W / 2 + pan[0]} ${cy - H / 2 + pan[1]} ${W} ${H}`;
  }
  let pan = [0, 0];
  function desenhar() {
    sincronizar();
    const k = cap(), q = k.quadro, area = q$('#mtQuadro');
    q$('#mtFerr').hidden = !(q === 'protoboard' || q === 'placa');
    q$('#mtVirar').hidden = q !== 'placa';
    q$('#mtSim').hidden = !(k.sim || (q === 'placa' && passoAtual().tipo === 'medir'));
    if (q === 'galeria' || q === 'solda' || q === '3d') { desenharFigura(k, area); return; }
    const lay = L[q], c = conteudo(q), p = passoAtual(), emb = q === 'placa' && vista === 'baixo';
    let s = `<svg id="mtSvg" viewBox="${viewBox(q)}" class="mtsvg ${q}">`;
    s += q === 'protoboard' ? DES.protoboard() : DES.placa(emb);
    s += `<g id="mtRealce"></g>`;
    const novas = new Set(prog ? [...prog.pecas] : []);
    const apagar = id => !novas.has(id) && p && (p.tipo === 'colocar' || p.tipo === 'pernas') && !feito(p);
    // peças (de cima) ou pernas (de baixo)
    const ordem = Object.keys(lay.pecas).filter(id => c.pecas.includes(id));
    if (emb) {
      (lay.fios || []).filter(f => c.fios.includes(f.id)).forEach(f => { s += DES.fio('placa', f.de, f.para, f.cor, { embaixo: true, id: 'f:' + f.id }); });
      (lay.pontes || []).filter(x => c.pontes.includes(x.id)).forEach(x => { s += DES.ponte(x, { estilo: x.grossa ? 'grossa' : '' }); });
      ordem.forEach(id => { s += DES.peca(lay, id, { embaixo: true }); });
      c.soldados.forEach(f => { s += DES.solda(f); });
    } else {
      if (q === 'placa') (lay.fios || []).filter(f => c.fios.includes(f.id)).forEach(f => { s += DES.fio('placa', f.de, f.para, f.cor, { estilo: 'porbaixo', id: 'f:' + f.id }); });
      ordem.forEach(id => { s += DES.peca(lay, id, { estilo: apagar(id) ? 'apagada' : novas.has(id) ? 'nova' : '' }); });
      (lay.jumpers || []).filter(j => c.jumpers.includes(j.id)).forEach(j => { s += DES.fio(q, j.de, j.para, j.cor, { id: 'j:' + j.id, estilo: prog && prog.jumpers.includes(j.id) ? 'nova' : '' }); });
    }
    // alvo (mostrar onde)
    if (p && !feito(p) && mostrarAlvo) s += alvo(p, lay, emb);
    // peça na mão
    if (mao && hover) s += DES.peca(lay, mao.peca, { ancora: hover, rot: mao.rot, estilo: 'namao' });
    if (prog && prog.perna1 && hover) { const a = DES.pos(q, prog.perna1, emb), b = DES.pos(q, hover, emb); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1d63d8" stroke-width="0.2" stroke-dasharray="0.4 0.3"/><circle cx="${a[0]}" cy="${a[1]}" r="0.4" fill="none" stroke="#1d63d8" stroke-width="0.12"/>`; }
    if (prog && p.tipo === 'ponte') prog.cliques.forEach(f => { const [x, y] = DES.pos('placa', f, true); s += `<circle cx="${x}" cy="${y}" r="0.42" fill="#e3e6ea" stroke="#1d63d8" stroke-width="0.08"/>`; });
    // pontas do multímetro
    [['vermelha', '#d4483b'], ['preta', '#1c1c1a']].forEach(([n, cor]) => { const f = pontas[n]; if (!f) return; const [x, y] = DES.pos(q, f, emb); s += `<g class="ponta"><line x1="${x}" y1="${y}" x2="${x + 0.9}" y2="${y - 2.4}" stroke="${cor}" stroke-width="0.35" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="0.3" fill="${cor}"/></g>`; });
    s += `</svg>`;
    area.innerHTML = s;
    animarEstado();
  }
  function alvo(p, lay, emb) {
    let s = '<g class="alvo">';
    const marca = f => { const [x, y] = DES.pos(lay.tipo, f, emb); return `<circle cx="${x}" cy="${y}" r="0.55" fill="none" stroke="#1d63d8" stroke-width="0.14"/>`; };
    if (p.tipo === 'colocar') s += DES.peca(lay, p.peca, { estilo: 'fantasma' });
    if (p.tipo === 'pernas') p.pecas.filter(id => !prog.pecas.includes(id)).forEach(id => { s += DES.peca(lay, id, { estilo: 'fantasma' }); });
    if (p.tipo === 'jumper') p.jumpers.filter(id => !prog.jumpers.includes(id)).forEach(id => { const j = lay.jumpers.find(x => x.id === id); s += DES.fio(lay.tipo, j.de, j.para, j.cor, { estilo: 'fantasma' }); });
    if (p.tipo === 'fio') p.fios.filter(id => !prog.fios.includes(id)).forEach(id => { const j = lay.fios.find(x => x.id === id); s += DES.fio('placa', j.de, j.para, j.cor, { estilo: 'fantasma', embaixo: emb }); });
    if (p.tipo === 'soldar') furosASoldar(p).filter(f => !prog.soldados.includes(f)).forEach(f => { s += marca(f); });
    if (p.tipo === 'ponte') p.pontes.filter(id => !prog.pontes.includes(id)).forEach(id => lay.pontes.find(x => x.id === id).furos.filter(f => !prog.cliques.has(f)).forEach(f => { s += marca(f); }));
    if (p.tipo === 'medir') [p.vermelha, p.preta].forEach(f => { s += marca(f); });
    return s + '</g>';
  }
  function furosASoldar(p) { const lay = L.placa; const out = []; p.pecas.forEach(id => Object.values(CIR.pinosDaPeca(lay, id)).forEach(f => out.push(f))); return out; }

  // realce da tira da protoboard ao passar o mouse
  function realcar(f) {
    const g = q$('#mtRealce'); if (!g) return;
    const k = cap(); if (!f) { g.innerHTML = ''; return; }
    const emb = k.quadro === 'placa' && vista === 'baixo';
    const furos = k.quadro === 'protoboard' ? CIR.todosFuros('protoboard').filter(x => CIR.tiraDoFuro(x) === CIR.tiraDoFuro(f)) : [f];
    g.innerHTML = furos.map(x => { const [px, py] = DES.pos(k.quadro, x, emb); return `<circle cx="${px}" cy="${py}" r="0.36" fill="#2e7a4d" opacity="0.55"/>`; }).join('');
    const info = q$('#mtFuro'); if (info) info.textContent = k.quadro === 'protoboard' ? `${f} · ${CIR.tiraDoFuro(f)}` : `furo ${f}`;
  }

  function desenharFigura(k, area) {
    const p = passoAtual();
    if (p.tipo === 'treino') { area.innerHTML = treinoHTML(); treinoIniciar(); return; }
    if (p.tipo === 'ver3d') {
      area.innerHTML = `<div class="mtfig texto"><div class="body">${STEPS[p.etapa].html}</div></div>`;
      return;
    }
    const fig = p.figura ? p.figura() : k.quadro === 'solda' ? `<figure>${DES.soldaDeLado('boa')}<figcaption>Solda boa: brilhante, em cone</figcaption></figure>` : '';
    area.innerHTML = `<div class="mtfig">${fig}</div>`;
  }

  // ---------- animação (LED, buzzer, corrente) ----------
  let ultimoLog = '';
  function animarEstado() {
    const k = cap(); const B = bancadas[k.quadro]; const svg = q$('#mtSvg');
    if (!B || !B.res || !svg) return;
    const r = B.res, I = r.I;
    const led = I.led || 0;
    svg.querySelectorAll('.ledbrilho').forEach(e => e.setAttribute('opacity', Math.min(0.9, led * 60).toFixed(2)));
    svg.querySelectorAll('.ledteste').forEach(e => e.setAttribute('fill', led > 0.0005 ? '#ff6a4a' : '#d23a2e'));
    const bz = (I.bz || 0) > 0.005 && B.fw.bz;
    svg.querySelectorAll('.bzonda').forEach(e => e.setAttribute('opacity', bz ? 0.9 : 0));
    som(bz && document.body.classList.contains('modo-montar'));
    svg.querySelectorAll('.espled').forEach(e => e.setAttribute('opacity', r.espLigado && B.fw.led ? 1 : 0.18));
    svg.querySelectorAll('.chavevis').forEach(e => e.setAttribute('fill', ctrl.chave ? '#2e7a4d' : '#111'));
    svg.querySelectorAll('.fio').forEach(g => {
      const id = g.dataset.j; const c = g.querySelector('.corrente'); if (!c) return;
      const i = id ? (I[id] || 0) : 0;
      c.setAttribute('opacity', verCorrente && Math.abs(i) > 0.002 ? 1 : 0);
      c.dataset.v = i;
    });
    // painel
    const v = q$('#mtLeds'); if (v) v.innerHTML = `ESP32 ${r.espLigado ? '<b class="ok">ligado</b>' : 'desligado'} · Buzzer ${bz ? '<b class="ok">apitando</b>' : 'quieto'} · ${k.quadro === 'protoboard' ? 'LED de teste ' + (led > 0.008 ? '<b class="ok">aceso</b>' : led > 0.0005 ? '<b class="warn">fraco</b>' : 'apagado') : 'Módulo ' + ((I.modulo || 0) > 0.5 ? '<b class="warn">soltando faísca</b>' : 'parado')}`;
    const logTxt = B.fw.log.slice(-14).map(l => `[${(l.t / 1000).toFixed(1)} s] ${l.txt}`).join('\n');
    const lg = q$('#mtLog'); if (lg && logTxt !== ultimoLog) { lg.textContent = logTxt || '(nada ainda)'; lg.scrollTop = lg.scrollHeight; ultimoLog = logTxt; }
    medirAtualizar();
  }
  let fase = 0;
  function laco() {
    const ativo = document.body.classList.contains('modo-montar');
    const k = cap();
    if (ativo && (k.quadro === 'protoboard' || k.quadro === 'placa')) {
      const B = bancadas[k.quadro];
      if (B) { SIMU.bancadaAvancar(B, 33); animarEstado(); conferirTeste(); }
      fase = (fase + 0.06) % 100;
      if (verCorrente) document.querySelectorAll('#mtSvg .corrente').forEach(c => { const i = +c.dataset.v || 0; if (Math.abs(i) > 0.002) c.setAttribute('stroke-dashoffset', (-fase * Math.sign(i) * (2 + Math.min(6, Math.log10(Math.abs(i) * 1000 + 1) * 3))).toFixed(2)); });
    } else som(false);
  }

  // ---------- painel do passo ----------
  function render() {
    const k = cap(), p = passoAtual();
    if (!prog || prog.id !== p.id) { prog = novoProg(p); mao = null; mostrarAlvo = false; msg = null; pontas.vermelha = pontas.preta = null; pontas.escolhendo = null; if (p.modo) pontas.modo = p.modo === 'cont' ? 'cont' : 'V'; prog.inicio = (bancadas[k.quadro] || {}).t || 0; aoEntrar(p); }
    // capítulos
    q$('#mtCaps').innerHTML = CAPITULOS.map((c, i) => { const n = c.passos.filter(feito).length; return `<button class="mtcap ${c.id === k.id ? 'on' : ''} ${n === c.passos.length ? 'ok' : ''}" data-cap="${c.id}"><span>${i}</span>${esc(c.t)}<small>${n}/${c.passos.length}</small></button>`; }).join('');
    const i = k.passos.indexOf(p);
    q$('#mtPassos').innerHTML = `<summary>Passo ${i + 1} de ${k.passos.length} · ${esc(k.s)}</summary><ol>` + k.passos.map(x => `<li class="${feito(x) ? 'ok' : ''} ${x === p ? 'on' : ''}"><button data-passo="${x.id}">${feito(x) ? '✓ ' : ''}${esc(x.t)}</button></li>`).join('') + `</ol>`;
    const resumo = !!st().resumo;
    const det = (t, h, aberto) => h ? `<details ${aberto ? 'open' : ''}><summary>${t}</summary><div>${h}</div></details>` : '';
    const lista = a => a && a.length ? `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
    q$('#mtCard').innerHTML = `
      <div class="mtk">Capítulo ${CAPITULOS.indexOf(k)} · passo ${i + 1}</div>
      <h3>${feito(p) ? '<span class="ok">✓</span> ' : ''}${esc(p.t)}</h3>
      <p class="mtfazer">${p.fazer}</p>
      <div id="mtAcao">${acaoHTML(p)}</div>
      <div id="mtMsg" class="mtmsg ${msg ? msg.tipo : ''}" ${msg ? '' : 'hidden'}>${msg ? msg.txt : ''}</div>
      ${det('Por que é assim', p.porque, !resumo)}
      ${det('Como conferir', p.conferir, !resumo)}
      ${det('Erros comuns', lista(p.erros), false)}
      <div class="mtbtns">
        ${i > 0 ? `<button class="btn ghost" data-nav="-1">← Voltar</button>` : ''}
        ${feito(p) ? `<button class="btn ghost" data-refazer>Refazer</button>` : ''}
        ${feito(p) && (i < k.passos.length - 1 || CAPITULOS.indexOf(k) < CAPITULOS.length - 1) ? `<button class="btn" data-nav="1">Próximo passo →</button>` : ''}
        ${!feito(p) && (p.tipo === 'colocar' || p.tipo === 'pernas' || p.tipo === 'jumper' || p.tipo === 'fio' || p.tipo === 'soldar' || p.tipo === 'ponte' || p.tipo === 'medir') ? `<button class="btn ghost" data-alvo>${mostrarAlvo ? 'Esconder onde' : 'Mostrar onde'}</button>` : ''}
      </div>
      <div class="mtperg"><button class="lnk" data-perg>Não entendi este passo</button><form id="mtPergForm" hidden><textarea id="mtPergTxt" rows="2" placeholder="O que ficou confuso?" maxlength="500"></textarea><button class="btn" type="submit">Perguntar ao Claude</button></form><div id="mtResp" class="mtresp" hidden></div></div>
      <label class="toggle mtresumo"><input type="checkbox" id="mtResumo" ${resumo ? 'checked' : ''}> Já sei o básico: esconder as explicações</label>`;
    if (p.tipo === 'pernas' && !prog.selecionada) prog.selecionada = p.pecas.find(id => !prog.pecas.includes(id)) || null;
    if (p.tipo === 'colocar' || p.tipo === 'pernas') vista = 'cima';
    if (p.tipo === 'soldar' || p.tipo === 'ponte' || p.tipo === 'fio') vista = 'baixo';
    if (p.tipo === 'medir' && k.quadro === 'placa') vista = 'baixo';
    const wt = q$('#wireTable'); if (wt && typeof wireTable === 'function') wt.innerHTML = wireTable();
    desenhar(); simPainel();
  }
  function acaoHTML(p) {
    if (p.tipo === 'ver3d') return `<div class="mtbtns"><button class="btn ghost" data-3d>Ver no 3D</button>${feito(p) ? '' : '<button class="btn" data-ok>Feito</button>'}</div><p class="muted">O passo a passo completo está ao lado.</p>`;
    if (feito(p) && !['quiz', 'checklist'].includes(p.tipo)) return `<div class="mtok">Feito.</div>`;
    const lay = L[p.cap.quadro];
    switch (p.tipo) {
      case 'ver': return `${p.tabela ? '<div id="wireTable"></div>' : ''}<button class="btn" data-ok>Entendi</button>`;
      case 'explorar': return `<div class="mthint">Tiras clicadas: <b>${prog.tiras.size}</b> de ${p.n} <span id="mtFuro" class="muted"></span></div>`;
      case 'quiz': return `<div class="mtquiz"><b>${esc(p.pergunta)}</b>${p.opcoes.map((o, i) => `<button data-quiz="${i}" class="${feito(p) && i === p.certa ? 'certa' : ''}">${esc(o)}</button>`).join('')}${feito(p) ? `<p class="mthint">${esc(p.explica)}</p>` : ''}</div>`;
      case 'checklist': { const c = st().chk[p.id] || {}; return `<div class="mtchk">${p.itens.map((t, i) => `<label><input type="checkbox" data-chk="${i}" ${c[i] ? 'checked' : ''}> <span>${t}</span></label>`).join('')}</div>`; }
      case 'colocar': { const P = CIR.PECAS[p.peca]; return `<div class="mthint">Peça: <b>${esc(P.nome)}</b>. Clique em "Pegar", leve até o lugar e clique para soltar. <kbd>R</kbd> gira.</div><div class="mtbtns"><button class="btn" data-pegar>${mao ? 'Soltar da mão' : 'Pegar a peça'}</button>${mao ? `<button class="btn ghost" data-girar>Girar ↻</button>` : ''}</div>`; }
      case 'pernas': return `<div class="mtchips">${p.pecas.map(id => { const P = CIR.PECAS[id]; const ok = prog.pecas.includes(id); return `<button data-sel="${id}" class="${prog.selecionada === id ? 'on' : ''} ${ok ? 'ok' : ''}" ${ok ? 'disabled' : ''}>${ok ? '✓ ' : ''}${esc(P.nome)}${P.valor ? `<small>${DES.coresDoResistor(P.valor)}</small>` : ''}</button>`; }).join('')}</div>` +
          (prog.selecionada ? `<div class="mthint">${pernaInstrucao(p, prog.selecionada)}</div>` : '');
      case 'jumper': case 'fio': { const lista = p.tipo === 'jumper' ? p.jumpers.map(id => lay.jumpers.find(j => j.id === id)) : p.fios.map(id => lay.fios.find(j => j.id === id)); const feitos = p.tipo === 'jumper' ? prog.jumpers : prog.fios;
        return `<div class="mthint">Clique no furo de uma ponta e depois no da outra.${p.tipo === 'fio' ? ' A placa está virada (de baixo).' : ''}</div><ul class="mtlista">${lista.map(j => `<li class="${feitos.includes(j.id) ? 'ok' : ''}"><span class="sw" style="background:${j.cor}"></span>${feitos.includes(j.id) ? '✓ ' : ''}${esc(j.nome)} <small>${j.de} → ${j.para}</small></li>`).join('')}</ul>`; }
      case 'soldar': { const f = furosASoldar(p); return `<div class="mthint">A placa está virada. Clique em cada perna para soldar: <b>${prog.soldados.length}</b> de ${f.length}.</div>`; }
      case 'ponte': return `<div class="mthint">A placa está virada. Clique em cada furo das pontes.</div><ul class="mtlista">${p.pontes.map(id => { const x = lay.pontes.find(y => y.id === id); const n = x.furos.filter(f => prog.cliques.has(f)).length; return `<li class="${prog.pontes.includes(id) ? 'ok' : ''}">${prog.pontes.includes(id) ? '✓ ' : ''}${esc(x.nome)} <small>${n}/${x.furos.length} furos</small></li>`; }).join('')}</ul>`;
      case 'medir': return `<div class="mthint">Use o multímetro abaixo da placa: escolha ${p.modo === 'V' ? '<b>V⎓</b> (tensão)' : '<b>bipe</b> (continuidade)'}, clique em "Ponta vermelha" e num furo, depois em "Ponta preta" e noutro furo.${p.chave ? ' A chave precisa estar ligada.' : ' Chave desligada e sem USB.'}</div>`;
      case 'testar': return `<div class="mthint">Use os controles abaixo da placa (chave, USB e o controle A, B, C, D).${p.defeito ? ' <b>Defeito ligado só neste passo.</b>' : ''}</div>`;
      case 'treino': return `<div class="mthint">Soldas boas: <b id="mtBoas">${prog.boas}</b> de ${p.n}.</div>`;
      case 'encaixar': return `<button class="btn" data-encaixar>Encaixar</button>`;
      case 'ver3d': return `<div class="mtbtns"><button class="btn ghost" data-3d>Ver no 3D</button><button class="btn" data-ok>Feito</button></div><p class="muted">O passo a passo completo está ao lado.</p>`;
    }
    return '';
  }
  function pernaInstrucao(p, id) {
    const lay = L[p.cap.quadro], alvoP = lay.pecas[id].pernas, ks = Object.keys(alvoP);
    const nomes = CIR.PECAS[id].pinos;
    if (prog.perna1) return `Agora clique no furo da outra perna (<b>${esc(nomes[ks[1]])}</b>).`;
    const polar = id === 'led' || id === 'cap' || id === 'bloco';
    return polar ? `Clique primeiro no furo da <b>${esc(nomes[ks[0]])}</b> (${alvoP[ks[0]]}).` : `Clique no furo de uma perna e depois no da outra (${alvoP[ks[0]]} e ${alvoP[ks[1]]}).`;
  }

  // ---------- quando entra num passo ----------
  function aoEntrar(p) {
    const k = p.cap;
    if (p.chave === false) ctrl.chave = false;
    if (p.tipo === 'colocar' || p.tipo === 'pernas' || p.tipo === 'jumper') { if (ctrl.chave) { ctrl.chave = false; } }
    if (k.quadro === 'placa' && p.tipo === 'medir' && p.modo === 'cont') { ctrl.chave = false; ctrl.usb = false; }
    if (p.cond === 'usb') ctrl.chave = false;
    prog.ledAntesAperto = false; prog.apertos = 0; prog.choquesNoInicio = 0;
    const B = bancadas[k.quadro]; if (B) { prog.inicio = B.t; prog.pausas = B.fw.contador.bloqueios.pausa; }
  }
  function concluir(texto) {
    const p = passoAtual(); st().feitos[p.id] = 1; st().passo = p.id; save();
    msg = { tipo: 'ok', txt: texto || 'Certo!' }; mao = null; mostrarAlvo = false;
    if (p.defeito) msg.txt += ' O defeito foi tirado.';
    if (typeof renderTop === 'function') { renderTop(); renderHome(); }
    render();
  }
  function erro(texto) { msg = { tipo: 'erro', txt: texto }; const m = q$('#mtMsg'); if (m) { m.className = 'mtmsg erro'; m.innerHTML = texto; m.hidden = false; } }
  function aviso(texto) { msg = { tipo: 'info', txt: texto }; const m = q$('#mtMsg'); if (m) { m.className = 'mtmsg info'; m.innerHTML = texto; m.hidden = false; } }

  // ---------- cliques na placa ----------
  function furoDoEvento(ev) {
    const svg = q$('#mtSvg'); if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); if (!m) return null;
    const loc = pt.matrixTransform(m.inverse());
    const k = cap(); let x = loc.x;
    if (k.quadro === 'placa' && vista === 'baixo') x = 23 - x;
    return CIR.furoPerto(k.quadro, x, loc.y, 0.55);
  }
  function aoMover(ev) {
    const f = furoDoEvento(ev);
    if (f === hover) return;
    hover = f;
    const p = passoAtual();
    if (mao || (prog && prog.perna1)) desenhar(); else realcar(f);
    if (p.tipo === 'explorar') realcar(f);
  }
  function aoClicar(ev) {
    const f = furoDoEvento(ev); if (!f) return;
    const k = cap(), p = passoAtual(), lay = L[k.quadro];
    if (pontas.escolhendo) { pontas[pontas.escolhendo] = f; pontas.escolhendo = null; simPainel(); desenhar(); return; }
    if (feito(p)) return;
    if (p.tipo === 'explorar') { prog.tiras.add(CIR.tiraDoFuro(f)); if (prog.tiras.size >= p.n) concluir('Isso: cada coluna de 5 furos é uma ligação, e as trilhas da borda vão de ponta a ponta.'); else render(); return; }
    if (p.tipo === 'colocar' && mao) { colocar(f); return; }
    if (p.tipo === 'pernas') { pernas(f); return; }
    if (p.tipo === 'jumper' || p.tipo === 'fio') { ligar(f); return; }
    if (p.tipo === 'soldar') { soldar(f); return; }
    if (p.tipo === 'ponte') { pontear(f); return; }
  }
  function colocar(anc) {
    const p = passoAtual(), lay = L[p.cap.quadro], id = p.peca;
    const certo = CIR.pinosDaPeca(lay, id), meu = CIR.pinosDaPeca(lay, id, anc, mao.rot);
    const igual = Object.keys(certo).every(n => certo[n] === meu[n]);
    if (igual) { prog.pecas.push(id); mao = null; concluir(`${CIR.PECAS[id].nome} no lugar.`); return; }
    if (Object.values(meu).some(f => !f)) { erro('Alguma perna ficou fora da placa. Tente de novo mais para dentro.'); return; }
    const mesmosFuros = Object.values(certo).sort().join() === Object.values(meu).sort().join();
    const errado = Object.keys(certo).find(n => certo[n] !== meu[n]);
    erro(mesmosFuros ? `Está virada: a perna <b>${esc(errado)}</b> caiu no ${meu[errado]}, mas vai no ${certo[errado]}. Aperte R (ou "Girar") e tente de novo.`
      : `Quase: a perna <b>${esc(errado)}</b> caiu no ${meu[errado]}, mas vai no ${certo[errado]}.${mao.rot !== lay.pecas[id].rot ? ' Ela também está girada.' : ''}`);
  }
  function pernas(f) {
    const p = passoAtual(), lay = L[p.cap.quadro], id = prog.selecionada; if (!id) return;
    if (!prog.perna1) { prog.perna1 = f; desenhar(); q$('#mtAcao').innerHTML = acaoHTML(p); return; }
    const a = prog.perna1, b = f; prog.perna1 = null;
    const alvoP = lay.pecas[id].pernas, ks = Object.keys(alvoP);
    const polar = id === 'led' || id === 'cap' || id === 'bloco';
    const ok = (a === alvoP[ks[0]] && b === alvoP[ks[1]]) || (!polar && a === alvoP[ks[1]] && b === alvoP[ks[0]]);
    if (ok) {
      prog.pecas.push(id); prog.selecionada = p.pecas.find(x => !prog.pecas.includes(x)) || null;
      if (p.pecas.every(x => prog.pecas.includes(x))) { concluir('Tudo no lugar.'); return; }
      msg = { tipo: 'ok', txt: `${CIR.PECAS[id].nome} no lugar.` }; render(); return;
    }
    const nomes = CIR.PECAS[id].pinos;
    if (polar && a === alvoP[ks[1]] && b === alvoP[ks[0]]) { erro(`Está invertido: a <b>${esc(nomes[ks[0]])}</b> vai no ${alvoP[ks[0]]}.${id === 'cap' ? ' Capacitor invertido estufa.' : id === 'led' ? ' LED invertido não acende.' : ''}`); desenhar(); return; }
    const qual = [a, b].find(x => !Object.values(alvoP).includes(x));
    erro(`O furo ${qual} não é desse passo. As pernas vão no ${alvoP[ks[0]]} e no ${alvoP[ks[1]]}.`); desenhar();
  }
  function ligar(f) {
    const p = passoAtual(), lay = L[p.cap.quadro];
    if (!prog.perna1) { prog.perna1 = f; desenhar(); return; }
    const a = prog.perna1, b = f; prog.perna1 = null;
    const lista = p.tipo === 'jumper' ? p.jumpers.filter(id => !prog.jumpers.includes(id)).map(id => lay.jumpers.find(j => j.id === id)) : p.fios.filter(id => !prog.fios.includes(id)).map(id => lay.fios.find(j => j.id === id));
    const igual = (x, y) => lay.tipo === 'protoboard' ? CIR.tiraDoFuro(x) === CIR.tiraDoFuro(y) : x === y;
    const achou = lista.find(j => (igual(a, j.de) && igual(b, j.para)) || (igual(a, j.para) && igual(b, j.de)));
    if (!achou) {
      erro(lay.tipo === 'protoboard' ? `Esse jumper liga a ${CIR.tiraDoFuro(a)} com a ${CIR.tiraDoFuro(b)}, e nenhum fio deste passo faz isso. Veja a lista acima.` : `Nenhum fio deste passo vai do ${a} ao ${b}. Veja a lista acima.`);
      desenhar(); return;
    }
    (p.tipo === 'jumper' ? prog.jumpers : prog.fios).push(achou.id);
    const todos = p.tipo === 'jumper' ? p.jumpers.every(id => prog.jumpers.includes(id)) : p.fios.every(id => prog.fios.includes(id));
    if (todos) { concluir('Todos ligados.'); return; }
    msg = { tipo: 'ok', txt: `Ligado: ${achou.nome}.` }; render();
  }
  function soldar(f) {
    const p = passoAtual(), alvo = furosASoldar(p);
    if (vista !== 'baixo') { erro('Vire a placa para soldar.'); return; }
    if (!alvo.includes(f)) { erro(`O furo ${f} não tem perna deste passo. As pernas a soldar estão marcadas com "Mostrar onde".`); return; }
    if (!prog.soldados.includes(f)) prog.soldados.push(f);
    if (alvo.every(x => prog.soldados.includes(x))) { concluir('Tudo soldado. Na real, confira cada uma: brilhante e em cone.'); return; }
    msg = null; render();
  }
  function pontear(f) {
    const p = passoAtual(), lay = L.placa;
    const pon = p.pontes.map(id => lay.pontes.find(x => x.id === id)).filter(x => !prog.pontes.includes(x.id) && x.furos.includes(f));
    if (!pon.length) { erro(`O furo ${f} não faz parte das pontes que faltam neste passo.`); return; }
    prog.cliques.add(f);
    pon.forEach(x => { if (x.furos.every(y => prog.cliques.has(y))) prog.pontes.push(x.id); });
    if (p.pontes.every(id => prog.pontes.includes(id))) { concluir('Pontes prontas. Na real, confira se nenhuma encostou na vizinha.'); return; }
    msg = null; render();
  }

  // ---------- testes do simulador ----------
  let apertoInicio = 0, apertoBotao = -1;
  function conferirTeste() {
    const p = passoAtual(); if (!p || feito(p)) return;
    const B = bancadas[p.cap.quadro]; if (!B) return;
    const ev = (tipo, f) => B.eventos.filter(e => e.tipo === tipo && e.t >= prog.inicio && (!f || f(e)));
    if (p.tipo === 'medir') return;
    if (p.tipo !== 'testar') return;
    const c = p.cond;
    if (c !== 'pausa' && B.fw.contador.bloqueios.pausa > (prog.pausasAvisadas ?? prog.pausas ?? 0)) {
      prog.pausasAvisadas = B.fw.contador.bloqueios.pausa;
      aviso('O firmware ignorou esse aperto: ainda não tinham passado 3 segundos desde o último choque. Espere um pouco e aperte de novo.');
    }
    if (c === 'esp_ligou' && ev('esp_ligou').length) concluir('O ESP32 ligou. O LED azul pisca a cada 3 segundos: é o sinal de "tudo certo".');
    if (c === 'rf' && ev('aperto', e => e.chegou).length) concluir('O código chegou no ESP32. O rádio está funcionando.');
    if (c === 'rf' && ev('aperto', e => !e.chegou).length && !prog.avisouRf) { prog.avisouRf = true; aviso(B.res.espLigado ? 'O aperto não chegou: confira os 3 fios do receptor.' : 'Ligue a chave primeiro.'); }
    if (c === 'bipeA' && ev('aperto', e => e.chegou && e.botao === 0).length && ev('bipe').length) concluir('Bipou. O BC547 está ligando o buzzer.');
    if (c === 'choqueB' && ev('choque', e => e.nivel === 0 && !e.simulado).length && ev('led_teste').length && B.fw.estado === 'parado') concluir('5 pulsos rápidos no LED: é o choque fraco.');
    if (c === 'segurarD' && prog.segurouD) concluir('Um choque só, de 1 segundo, mesmo segurando.');
    if (c === 'pausa' && B.fw.contador.bloqueios.pausa > prog.pausas && ev('choque').length) concluir('O firmware ignorou os apertos dentro dos 3 segundos.');
    if (c === 'curto') {
      if (!prog.curtoParado && B.t - prog.inicio > 2500 && !ev('led_teste').length && B.res.espLigado) { prog.curtoParado = true; aviso('Passaram 3 segundos e o LED não acendeu, mesmo com o curto. Agora aperte o B.'); }
      if (prog.curtoParado && ev('choque', e => !e.simulado).length && ev('led_teste').length && B.fw.estado === 'parado') concluir('Só acendeu quando o ESP32 mandou. Um MOSFET queimado sozinho não dá choque.');
    }
    if (c === 'usb' && ev('choque', e => e.simulado).length && B.fw.estado === 'parado') concluir('Choque simulado: o firmware viu o USB e não ligou os MOSFETs.');
    if (c === 'irfz' && ev('led_fraco').length && B.fw.estado === 'parado') concluir('Com o IRFZ44N o LED quase não acende. Na coleira, o choque sairia fraco.');
  }
  function medirAtualizar() {
    const k = cap(); const B = bancadas[k.quadro]; const tela = q$('#mtVisor'); if (!B || !tela) return;
    const r = SIMU.multimetro(B, pontas.modo, pontas.vermelha, pontas.preta);
    tela.textContent = r.txt; q$('#mtVisorObs').textContent = r.obs || '';
    const p = passoAtual();
    if (p.tipo !== 'medir' || feito(p)) return;
    if (!pontas.vermelha || !pontas.preta) return;
    const kk = B.conexao.raiz, H = f => 'H:' + f;
    const certas = kk(H(pontas.vermelha)) === kk(H(p.vermelha)) && kk(H(pontas.preta)) === kk(H(p.preta));
    const trocadas = kk(H(pontas.vermelha)) === kk(H(p.preta)) && kk(H(pontas.preta)) === kk(H(p.vermelha));
    if (pontas.modo !== (p.modo === 'cont' ? 'cont' : 'V')) return;
    if (p.modo === 'V') {
      if (trocadas && r.v < 0) { if (!prog.avisouTroca) { prog.avisouTroca = true; aviso('Deu negativo: as pontas estão trocadas. A vermelha vai no ponto de tensão mais alta.'); } return; }
      if (certas && r.v >= p.min && r.v <= p.max) concluir(`Mediu ${r.txt}. Está certo.`);
      else if (certas && p.chave && !ctrl.chave && !prog.avisouChave) { prog.avisouChave = true; aviso('As pontas estão no lugar. Agora ligue a chave.'); }
    } else if ((certas || trocadas) && r.bipa === p.bipa && r.txt !== 'Desligue') concluir(p.bipa ? 'Bipou: está ligado.' : 'Não bipou: não tem curto.');
  }

  // ---------- painel do simulador ----------
  function simPainel() {
    const box = q$('#mtSim'); if (box.hidden) return;
    const k = cap();
    box.innerHTML = `
      <div class="mtsimrow">
        <label class="mttog"><input type="checkbox" id="mtChave" ${ctrl.chave ? 'checked' : ''}> Chave</label>
        ${k.quadro === 'protoboard' ? `<label class="mttog"><input type="checkbox" id="mtUsb" ${ctrl.usb ? 'checked' : ''}> USB no ESP32</label>` : ''}
        <label class="mtbat">Bateria <input type="range" id="mtVbat" min="3.0" max="4.2" step="0.05" value="${ctrl.vbat}"> <b id="mtVbatV">${ctrl.vbat.toFixed(2).replace('.', ',')} V</b></label>
      </div>
      <div class="mtsimrow">
        <div class="mtcontrole" aria-label="Controle">${['A', 'B', 'C', 'D'].map((b, i) => `<button data-bt="${i}">${b}</button>`).join('')}<small>controle (segure para manter apertado)</small></div>
        <button class="btn ghost mtpar" data-botao>Botão de pareamento</button>
      </div>
      <div class="mtsimrow mtmult">
        <div class="mtvisor"><div id="mtVisor">- - -</div><div id="mtVisorObs" class="muted"></div></div>
        <div class="seg" role="group" aria-label="Escala">${[['V', 'V⎓ 20'], ['cont', '🔊 bipe']].map(([m, t]) => `<button data-modo="${m}" class="${pontas.modo === m ? 'on' : ''}">${t}</button>`).join('')}</div>
        <button class="btn ghost ${pontas.escolhendo === 'vermelha' ? 'on' : ''}" data-ponta="vermelha"><span class="pv"></span>Ponta vermelha${pontas.vermelha ? ': ' + pontas.vermelha : ''}</button>
        <button class="btn ghost ${pontas.escolhendo === 'preta' ? 'on' : ''}" data-ponta="preta"><span class="pp"></span>Ponta preta${pontas.preta ? ': ' + pontas.preta : ''}</button>
      </div>
      <div id="mtLeds" class="mtleds"></div>
      <details class="mtserial" ${ctrl.usb ? 'open' : ''}><summary>Monitor Serial</summary><pre id="mtLog">(nada ainda)</pre></details>`;
    ultimoLog = '';
    animarEstado();
  }

  // ---------- treino de solda ----------
  let tr = null;
  function treinoHTML() {
    return `<div class="mttreino"><svg id="mtTrSvg" viewBox="-6 -5 12 8"><rect x="-6" y="1" width="12" height="1.2" fill="#c9a46a"/><rect x="-1.7" y="0.8" width="3.4" height="0.28" fill="#d9b45a"/><rect x="-0.18" y="-4" width="0.36" height="6" fill="#b9bdc2"/>
      <path id="mtTrSolda" d="" fill="#d6d9dd"/><g id="mtTrFerro" opacity="0.25"><path d="M2.4 -0.2 L5.8 -3.6 L6.4 -3 L3 0.4 Z" fill="#7a7f86"/><circle cx="2.5" cy="0.1" r="0.3" fill="#e05a2b" id="mtTrPonta"/></g>
      <g id="mtTrFio" opacity="0.25"><path d="M-2.4 -0.1 L-6 -3.2" stroke="#cfd3d8" stroke-width="0.3"/></g><rect x="-3" y="-4.5" width="6" height="5.6" fill="transparent" id="mtTrPad"/></svg>
      <div class="mttrbar"><span>Calor</span><div class="bar"><i id="mtTrCalor"></i></div><span>Estanho</span><div class="bar"><i id="mtTrQtd" style="background:#9aa0a6"></i></div></div>
      <div class="mtbtns"><button class="btn ghost" id="mtTrEstanho">Estanho (segure, ou barra de espaço)</button><button class="btn ghost" id="mtTrNova">Nova solda</button></div>
      <div id="mtTrRes" class="mtmsg" hidden></div><div id="mtTrFig"></div></div>`;
  }
  function treinoIniciar() {
    tr = { ferro: false, estanho: false, calor: 0, qtd: 0, tempo: 0, calorNoEstanho: null, fim: false, t0: performance.now() };
    const pad = q$('#mtTrPad');
    const liga = v => { if (tr.fim) return; tr.ferro = v; if (!v && tr.tempo > 0.2) treinoFim(); };
    pad.addEventListener('mousedown', e => { e.preventDefault(); liga(true); });
    pad.addEventListener('touchstart', e => { e.preventDefault(); liga(true); }, { passive: false });
    window.addEventListener('mouseup', () => { if (tr && tr.ferro) liga(false); });
    window.addEventListener('touchend', () => { if (tr && tr.ferro) liga(false); });
    const b = q$('#mtTrEstanho');
    b.addEventListener('mousedown', () => { tr.estanho = true; }); b.addEventListener('mouseup', () => { tr.estanho = false; }); b.addEventListener('mouseleave', () => { tr.estanho = false; });
    q$('#mtTrNova').addEventListener('click', () => { const r = q$('#mtTrRes'); r.hidden = true; q$('#mtTrFig').innerHTML = ''; treinoIniciar2(); });
    treinoIniciar2();
  }
  function treinoIniciar2() { Object.assign(tr, { ferro: false, estanho: false, calor: 0, qtd: 0, tempo: 0, calorNoEstanho: null, fim: false }); treinoDesenhar(); }
  function treinoPasso(dt) {
    if (!tr || tr.fim || !q$('#mtTrSvg')) return;
    if (tr.ferro) { tr.tempo += dt; tr.calor = Math.min(1.3, tr.calor + dt / 2.2); } else tr.calor = Math.max(0, tr.calor - dt / 1.5);
    if (tr.estanho && tr.ferro) { if (tr.calorNoEstanho === null) tr.calorNoEstanho = tr.calor; tr.qtd = Math.min(1.4, tr.qtd + dt * 0.45); }
    treinoDesenhar();
  }
  function treinoDesenhar() {
    const c = q$('#mtTrCalor'); if (!c) return;
    c.style.width = Math.min(100, tr.calor / 1.3 * 100) + '%'; c.style.background = tr.calor > 1.05 ? '#b3261e' : tr.calor > 0.4 ? '#2e7a4d' : '#a8661a';
    q$('#mtTrQtd').style.width = Math.min(100, tr.qtd / 1.4 * 100) + '%';
    q$('#mtTrFerro').setAttribute('opacity', tr.ferro ? 1 : 0.25);
    q$('#mtTrFio').setAttribute('opacity', tr.estanho ? 1 : 0.25);
    const fria = tr.calorNoEstanho !== null && tr.calorNoEstanho < 0.4, h = Math.min(2.6, tr.qtd * 2.2);
    q$('#mtTrSolda').setAttribute('d', tr.qtd <= 0 ? '' : fria ? `M-${0.5 + h * 0.3} 0.8 A${0.5 + h * 0.3} ${0.4 + h * 0.35} 0 1 1 ${0.5 + h * 0.3} 0.8 Z` : `M-${0.5 + h * 0.45} 0.85 Q-0.4 0.6 -0.2 ${0.6 - h} L0.2 ${0.6 - h} Q0.4 0.6 ${0.5 + h * 0.45} 0.85 Z`);
    q$('#mtTrSolda').setAttribute('fill', tr.tempo > 6 ? '#6b5f4f' : fria ? '#a4a7ab' : '#d6d9dd');
  }
  function treinoFim() {
    tr.fim = true;
    let tipo = 'boa';
    if (tr.qtd < 0.25) tipo = 'pouca';
    else if (tr.calorNoEstanho !== null && tr.calorNoEstanho < 0.4) tipo = 'fria';
    else if (tr.tempo > 6) tipo = 'queimada';
    else if (tr.qtd > 1.15) tipo = 'ponte';
    else if (tr.qtd > 0.8) tipo = 'demais';
    const texto = { boa: 'Solda boa: brilhante e em cone.', pouca: 'Pouco estanho: segure o estanho um pouco mais.', fria: 'Solda fria: você pôs o estanho antes de esquentar. Espere a barra de calor ficar verde.', queimada: 'Ficou tempo demais: o pad pode descolar. Tudo em 3 a 4 segundos.', ponte: 'Estanho demais: escorreu para o furo vizinho (ponte).', demais: 'Estanho demais: virou uma bola. Pare antes.' }[tipo];
    const r = q$('#mtTrRes'); r.hidden = false; r.className = 'mtmsg ' + (tipo === 'boa' ? 'ok' : 'erro'); r.textContent = texto;
    q$('#mtTrFig').innerHTML = DES.soldaDeLado(tipo);
    if (tipo === 'boa' && prog) { prog.boas++; const p = passoAtual(); const el = q$('#mtBoas'); if (el) el.textContent = prog.boas; if (prog.boas >= p.n && !feito(p)) concluir('Três soldas boas. Agora treine na placa de verdade.'); }
  }

  // ---------- Pergunte ao Claude ----------
  let sample = null;
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('sample').then(s => { sample = s; }).catch(() => {});
  async function perguntar(txt) {
    const p = passoAtual(), box = q$('#mtResp'); box.hidden = false;
    if (!sample) { box.textContent = 'O "Perguntar ao Claude" só funciona dentro do Claude. Copie a dúvida e mande no chat.'; return; }
    const k = p.cap, c = (k.quadro === 'protoboard' || k.quadro === 'placa') ? conteudo(k.quadro) : null;
    const contexto = [
      `Projeto: coleira de choque remoto para boi (ESP32-C3, receptor RXB6, 2 MOSFETs IRLZ44N em série, módulo de alta tensão, bateria 18650).`,
      `Capítulo: ${k.t}. Passo: ${p.t}.`, `O que o passo pede: ${String(p.fazer).replace(/<[^>]+>/g, '')}`,
      p.porque ? `Explicação do passo: ${String(p.porque).replace(/<[^>]+>/g, '')}` : '',
      c ? `Já está na ${k.quadro}: ${c.pecas.map(id => CIR.PECAS[id].nome).join(', ') || 'nada'}.` : '',
      msg && msg.tipo === 'erro' ? `Último erro mostrado: ${String(msg.txt).replace(/<[^>]+>/g, '')}` : '',
    ].filter(Boolean).join('\n');
    const instr = 'Você ajuda um estudante que nunca montou eletrônica. Responda em português do Brasil, em frases simples e diretas, no máximo 6 frases. Explique o porquê com uma comparação do dia a dia quando ajudar. Não use frases de efeito nem construções do tipo "não é X, é Y". Nunca sugira testar choque em pessoa. Se a dúvida não tiver a ver com o passo, responda mesmo assim, curto.';
    box.textContent = 'Pensando...';
    try {
      const r = await sample(`${instr}\n\nContexto:\n${contexto}\n\nDúvida do estudante: ${txt}`, { onText: ({ text }) => { box.textContent = text.replace(/\*\*/g, ''); }, modelTier: 'quick' });
      box.textContent = (r.text || '').replace(/\*\*/g, '');
    } catch (e) { box.textContent = e && e.code === 'rate_limited' ? 'Muitas perguntas seguidas. Espere um pouco.' : 'Não consegui responder agora.'; }
  }

  // ---------- eventos ----------
  function ligarEventos() {
    const raiz = q$('#t-montar');
    raiz.addEventListener('click', e => {
      const t = e.target.closest('button, [data-cap]'); if (!t) return;
      const p = passoAtual();
      if (t.dataset.cap) { st().cap = t.dataset.cap; st().passo = null; save(); render(); return; }
      if (t.dataset.passo) { st().passo = t.dataset.passo; save(); render(); return; }
      if (t.dataset.nav) { navegar(+t.dataset.nav); return; }
      if ('refazer' in t.dataset) { delete st().feitos[p.id]; save(); prog = null; render(); renderTop(); renderHome(); return; }
      if ('alvo' in t.dataset) { mostrarAlvo = !mostrarAlvo; render(); return; }
      if ('ok' in t.dataset) { concluir('Feito.'); return; }
      if ('pegar' in t.dataset) { mao = mao ? null : { peca: p.peca, rot: rotInicial(p) }; render(); return; }
      if ('girar' in t.dataset) { girar(); return; }
      if (t.dataset.sel) { prog.selecionada = t.dataset.sel; prog.perna1 = null; render(); return; }
      if (t.dataset.quiz !== undefined) { const i = +t.dataset.quiz; if (i === p.certa) concluir(p.explica); else { t.classList.add('errada'); erro('Não é essa. Leia de novo o texto acima e tente outra.'); } return; }
      if ('encaixar' in t.dataset) { prog.pecas.push(...p.pecas); concluir('Encaixados.'); return; }
      if ('3d' in t.dataset) { go('projeto'); setTimeout(() => window.Projeto3D && window.Projeto3D.mostrar && window.Projeto3D.mostrar(p.a), 50); return; }
      if ('perg' in t.dataset) { q$('#mtPergForm').hidden = !q$('#mtPergForm').hidden; if (!q$('#mtPergForm').hidden) q$('#mtPergTxt').focus(); return; }
      if (t.dataset.modo) { pontas.modo = t.dataset.modo; simPainel(); return; }
      if (t.dataset.ponta) { pontas.escolhendo = pontas.escolhendo === t.dataset.ponta ? null : t.dataset.ponta; simPainel(); aviso(pontas.escolhendo ? `Agora clique no furo onde vai a ponta ${pontas.escolhendo}.` : ''); return; }
      if (t.id === 'mtVirar') { vista = vista === 'cima' ? 'baixo' : 'cima'; desenhar(); return; }
      if (t.id === 'mtZoomMais') { zoom = Math.min(4, zoom * 1.3); desenhar(); return; }
      if (t.id === 'mtZoomMenos') { zoom = Math.max(1, zoom / 1.3); if (zoom === 1) pan = [0, 0]; desenhar(); return; }
      if (t.id === 'mtCorrente') { verCorrente = !verCorrente; t.classList.toggle('on', verCorrente); animarEstado(); return; }
    });
    raiz.addEventListener('submit', e => { if (e.target.id === 'mtPergForm') { e.preventDefault(); const t = q$('#mtPergTxt').value.trim(); if (t) perguntar(t); } });
    raiz.addEventListener('change', e => {
      const t = e.target, p = passoAtual();
      if (t.id === 'mtResumo') { st().resumo = t.checked; save(); render(); return; }
      if (t.dataset.chk !== undefined) { const c = st().chk[p.id] = st().chk[p.id] || {}; if (t.checked) c[t.dataset.chk] = 1; else delete c[t.dataset.chk]; save();
        if (p.itens.every((_, i) => c[i])) { if (!feito(p)) concluir('Tudo pronto.'); } else if (feito(p)) { delete st().feitos[p.id]; save(); render(); } return; }
      if (t.id === 'mtChave') { ctrl.chave = t.checked; if (ctrl.chave && ctrl.usb) aviso('Cuidado: USB e chave ligados juntos. No real, o computador empurra 5 V para a bateria. Desligue a chave para usar o USB.'); sincronizar(); return; }
      if (t.id === 'mtUsb') { ctrl.usb = t.checked; if (ctrl.chave && ctrl.usb) aviso('Cuidado: USB e chave ligados juntos. No real, o computador empurra 5 V para a bateria. Desligue a chave para usar o USB.'); sincronizar(); simPainel(); return; }
      if (t.wire) return;
    });
    raiz.addEventListener('input', e => { if (e.target.id === 'mtVbat') { ctrl.vbat = +e.target.value; q$('#mtVbatV').textContent = ctrl.vbat.toFixed(2).replace('.', ',') + ' V'; sincronizar(); } });
    // controle virtual
    const solta = () => { const k = cap(), B = bancadas[k.quadro]; if (apertoBotao >= 0 && B) { const dur = B.t - apertoInicio; if (apertoBotao === 3 && dur >= 3000) { const ch = B.eventos.filter(x => x.tipo === 'choque' && x.t >= apertoInicio && !x.simulado).length; if (ch === 1 && prog) prog.segurouD = true; } SIMU.bancadaSoltar(B); } apertoBotao = -1; document.querySelectorAll('.mtcontrole button.on').forEach(b => b.classList.remove('on')); };
    raiz.addEventListener('mousedown', e => {
      const b = e.target.closest('[data-bt]'); const par = e.target.closest('[data-botao]');
      const k = cap(), B = bancadas[k.quadro];
      if (b && B) { apertoBotao = +b.dataset.bt; b.classList.add('on'); apertoInicio = B.t; SIMU.bancadaApertar(B, apertoBotao); }
      if (par && B) { SIMU.bancadaMudar(B, x => { x.botao = true; }); }
    });
    window.addEventListener('mouseup', () => { solta(); const k = cap(), B = bancadas[k.quadro]; if (B && B.est.botao) SIMU.bancadaMudar(B, x => { x.botao = false; }); });
    // placa
    const area = q$('#mtQuadro');
    area.addEventListener('mousemove', aoMover);
    area.addEventListener('mouseleave', () => { hover = null; realcar(null); if (mao) desenhar(); });
    area.addEventListener('click', aoClicar);
    area.addEventListener('wheel', e => { const k = cap(); if (!(k.quadro === 'protoboard' || k.quadro === 'placa')) return; e.preventDefault(); zoom = Math.max(1, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); if (zoom === 1) pan = [0, 0]; desenhar(); }, { passive: false });
    let arrasto = null;
    area.addEventListener('mousedown', e => { if (e.button === 1 || e.shiftKey) { arrasto = [e.clientX, e.clientY, pan[0], pan[1]]; e.preventDefault(); } });
    window.addEventListener('mousemove', e => { if (!arrasto) return; const svg = q$('#mtSvg'); if (!svg) return; const s = svg.viewBox.baseVal.width / svg.clientWidth; pan = [arrasto[2] - (e.clientX - arrasto[0]) * s, arrasto[3] - (e.clientY - arrasto[1]) * s]; desenhar(); });
    window.addEventListener('mouseup', () => { arrasto = null; });
    window.addEventListener('keydown', e => {
      if (!document.body.classList.contains('modo-montar')) return;
      if (e.target.closest && e.target.closest('textarea, input')) return;
      if ((e.key === 'r' || e.key === 'R') && mao) { girar(); e.preventDefault(); }
      if (e.key === 'Escape' && mao) { mao = null; render(); }
      if (e.code === 'Space' && tr && passoAtual().tipo === 'treino') { tr.estanho = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => { if (e.code === 'Space' && tr) tr.estanho = false; });
    let ult = performance.now();
    setInterval(() => { const a = performance.now(); const dt = (a - ult) / 1000; ult = a; laco(); if (tr && passoAtual().tipo === 'treino' && document.body.classList.contains('modo-montar')) treinoPasso(dt); }, 33);
  }
  function rotInicial(p) { const lay = L[p.cap.quadro].pecas[p.peca]; const forma = lay.forma; return (forma === 'to92' || forma === 'to220' || forma === 'buzzer' || forma === 'esp') ? (lay.rot + 180) % 360 : lay.rot; }
  function girar() { if (!mao) return; mao.rot = (mao.rot + 90) % 360; desenhar(); }
  function navegar(d) {
    const k = cap(), p = passoAtual(), i = k.passos.indexOf(p);
    if (i + d >= 0 && i + d < k.passos.length) st().passo = k.passos[i + d].id;
    else if (d > 0) { const ci = CAPITULOS.indexOf(k); if (ci < CAPITULOS.length - 1) { st().cap = CAPITULOS[ci + 1].id; st().passo = null; } }
    save(); render();
    q$('#mtCard').scrollIntoView({ block: 'nearest' });
  }

  // ---------- início ----------
  function iniciar() {
    ligarEventos(); render();
  }
  function abrirPasso(id) { const p = PASSOS.find(x => x.id === id); if (!p) return; st().cap = p.cap.id; st().passo = id; save(); render(); }
  // para os testes automáticos: resolve o passo atual do jeito certo
  function resolverPasso() {
    const p = passoAtual(), k = p.cap, lay = L[k.quadro];
    if (feito(p)) return 'já feito';
    switch (p.tipo) {
      case 'ver': case 'ver3d': case 'encaixar': (q$('[data-ok]') || q$('[data-encaixar]')).click(); break;
      case 'explorar': ['a10', 'f20', 'T+5'].forEach(f => { prog.tiras.add(CIR.tiraDoFuro(f)); }); concluir(); break;
      case 'quiz': q$(`[data-quiz="${p.certa}"]`).click(); break;
      case 'checklist': p.itens.forEach((_, i) => { const c = q$(`[data-chk="${i}"]`); if (!c.checked) c.click(); }); break;
      case 'colocar': mao = { peca: p.peca, rot: lay.pecas[p.peca].rot }; colocar(lay.pecas[p.peca].ancora); break;
      case 'pernas': p.pecas.forEach(id => { if (prog.pecas.includes(id)) return; prog.selecionada = id; const pp = lay.pecas[id].pernas, ks = Object.keys(pp); pernas(pp[ks[0]]); pernas(pp[ks[1]]); }); break;
      case 'jumper': p.jumpers.forEach(id => { if (prog.jumpers.includes(id)) return; const j = lay.jumpers.find(x => x.id === id); ligar(j.de); ligar(j.para); }); break;
      case 'fio': p.fios.forEach(id => { if (prog.fios.includes(id)) return; const j = lay.fios.find(x => x.id === id); ligar(j.de); ligar(j.para); }); break;
      case 'soldar': vista = 'baixo'; furosASoldar(p).forEach(f => soldar(f)); break;
      case 'ponte': vista = 'baixo'; p.pontes.forEach(id => lay.pontes.find(x => x.id === id).furos.forEach(f => { if (!feito(p)) pontear(f); })); break;
      case 'treino': prog.boas = p.n; concluir(); break;
      default: return 'manual';
    }
    return feito(p) ? 'ok' : 'falta';
  }
  return { iniciar, render, totais, proximoGeral, abrirPasso, resolverPasso, passoAtual, feito, PASSOS, ctrl, pontas, sincronizar, bancadas, simPainel, conteudo, get prog() { return prog; } };
})();
