/* =====================================================================
   montagem-sim.js — o simulador da bancada
   =====================================================================
   1. Monta a rede elétrica a partir do layout (circuito.js): o que está
      ligado por tira da protoboard, perna no furo, ponte, jumper ou fio.
   2. Calcula tensões e correntes (análise nodal, com LED, transistor e
      MOSFET como chaves simples). Serve para o multímetro e para os
      pontinhos de corrente.
   3. Roda uma cópia em JavaScript das regras do firmware v0.1 (mesmos
      números do config.h), que liga os GPIO 4, 5 e 6.
   É simplificado: pega ligação errada e dá valores coerentes, mas a
   conferência final é sempre com o multímetro de verdade.
   ===================================================================== */
(function (raiz) {
const CI = (typeof module !== 'undefined' && typeof require !== 'undefined' && !raiz.CIRCUITO) ? require('./circuito.js') : raiz.CIRCUITO;

// ---------- números do firmware (iguais ao firmware/coleira/config.h) ----------
const FWC = {
  BIPE_SO: 500, BIPE_AVISO: 300, ESPERA: 200,
  NIVEIS: [{nome:'B (fraco)', dur:500, lig:30, des:70}, {nome:'C (médio)', dur:500, lig:70, des:30}, {nome:'D (forte)', dur:1000, lig:1000, des:0}],
  FOLGA: 30, PAUSA: 3000, JANELA: 60000, MAX_JANELA: 5000,
  BAT_BAIXA: 3500, BAT_NO_FIM: 3300, USB: 4400, SOLTOU: 300,
};

// ---------- firmware ----------
function novoFirmware() {
  return { estado:'parado', nivel:-1, desde:0, simulado:false, jaHouve:false, fimUltimo:0, hist:[],
    bz:false, a:false, b:false, bipes:[], ledAte:0, log:[], bat:'boa', mv:0, contador:{bipes:0, choques:[0,0,0], bloqueios:{pausa:0, limite:0, bateria:0}, simulados:0} };
}
function fwLog(fw, t, txt) { fw.log.push({t, txt}); if (fw.log.length > 60) fw.log.shift(); }
function fwBipar(fw, t, lig, des, n) { fw.bipes = []; let x = t; for (let i = 0; i < n; i++) { fw.bipes.push([x, x + lig]); x += lig + des; } }
function fwClassifica(mv) { return mv >= FWC.USB ? 'USB ligado' : mv < FWC.BAT_NO_FIM ? 'no fim' : mv < FWC.BAT_BAIXA ? 'baixa' : 'boa'; }
function fwLigar(fw, t, mv) {
  Object.assign(fw, novoFirmware(), { contador: fw.contador, log: fw.log });
  fw.mv = mv; fw.bat = fwClassifica(mv);
  fw.ledAte = t + 1000;
  fwBipar(fw, t, 80, 150, fw.bat === 'baixa' ? 2 : fw.bat === 'no fim' ? 3 : 1);
  fwLog(fw, t, `Coleira v0.1 ligada. Bateria: ${mv} mV (${fw.bat}).`);
}
function fwUsado(fw, t) { return fw.hist.filter(h => t - h.fim < FWC.JANELA).reduce((a, h) => a + h.ms, 0); }
function fwPedir(fw, t, botao) {
  if (fw.estado !== 'parado') return;
  if (botao === 0) { fw.estado = 'bipe'; fw.nivel = -1; fw.desde = t; fw.bipes = []; fw.contador.bipes++; fwLog(fw, t, 'Botão A: bipe.'); return; }
  const n = botao - 1, dur = FWC.NIVEIS[n].dur, L = 'ABCD'[botao];
  if (fw.bat === 'no fim') { fwBipar(fw, t, 80, 150, 3); fw.contador.bloqueios.bateria++; fwLog(fw, t, `Botão ${L} ignorado: bateria no fim.`); return; }
  if (fw.jaHouve && t - fw.fimUltimo < FWC.PAUSA) { fw.contador.bloqueios.pausa++; fwLog(fw, t, `Botão ${L} ignorado: pausa de 3 s.`); return; }
  if (fwUsado(fw, t) + dur > FWC.MAX_JANELA) { fw.contador.bloqueios.limite++; fwLog(fw, t, `Botão ${L} ignorado: limite de 5 s por minuto.`); return; }
  fw.estado = 'bipe'; fw.nivel = n; fw.desde = t; fw.bipes = [];
}
// avança o firmware até o instante t (chamar em passos de até 5 ms)
function fwPasso(fw, t, mv) {
  if (fw.estado === 'parado' && (!fw.jaHouve || t - fw.fimUltimo > 2000)) {
    fw.mv = Math.round(fw.mv ? (fw.mv * 3 + mv) / 4 : mv); if (mv >= FWC.USB) fw.mv = mv;
    const novo = fwClassifica(fw.mv); if (novo !== fw.bat) { fwLog(fw, t, `Bateria: ${fw.bat} -> ${novo} (${fw.mv} mV)`); fw.bat = novo; }
  }
  const p = t - fw.desde;
  if (fw.estado === 'bipe') {
    if (fw.nivel < 0) { if (p >= FWC.BIPE_SO) { fw.estado = 'parado'; fw.desde = t; } }
    else if (p >= FWC.BIPE_AVISO) { fw.estado = 'espera'; fw.desde = t; }
  } else if (fw.estado === 'espera' && p >= FWC.ESPERA) {
    fw.estado = 'choque'; fw.desde = t; fw.simulado = fw.bat === 'USB ligado' && !fw.bancada;
    fwLog(fw, t, `Choque ${FWC.NIVEIS[fw.nivel].nome} começou${fw.simulado ? ' (simulado)' : ''}.`);
  } else if (fw.estado === 'choque') {
    const N = FWC.NIVEIS[fw.nivel];
    if (p >= N.dur) {
      fw.hist.push({fim:t, ms:N.dur}); fw.jaHouve = true; fw.fimUltimo = t; fw.estado = 'parado'; fw.desde = t;
      if (fw.simulado) fw.contador.simulados++; else fw.contador.choques[fw.nivel]++;
      fwLog(fw, t, `Choque ${N.nome}: ${N.dur} ms${fw.simulado ? ' (SIMULADO, USB ligado)' : ''}. Usado no último minuto: ${fwUsado(fw, t)} de 5000 ms.`);
    }
  }
  // saídas
  const choque = fw.estado === 'choque' && !fw.simulado;
  const N = fw.nivel >= 0 ? FWC.NIVEIS[fw.nivel] : null;
  fw.b = choque;
  fw.a = choque && (N.des === 0 || ((t - fw.desde) % (N.lig + N.des)) < N.lig);
  fw.bz = fw.estado === 'bipe' || fw.bipes.some(([i, f]) => t >= i && t < f);
  fw.led = t < fw.ledAte || choque || (fw.bat === 'USB ligado') || (t % 3000) < 60 || ((fw.bat === 'baixa' || fw.bat === 'no fim') && (t % 3000) >= 250 && (t % 3000) < 310);
}

// ---------- rede elétrica ----------
// estado: {pecas:[ids], jumpers:[ids], pontes:[ids], fios:[ids], soldados:Set, chave, usb, vbat, botao, defeitos:{}, gpio:{a,b,bz}}
function montarRede(layout, est) {
  const opc = { pecas: est.pecas, soldados: est.soldados,
    jumpers: [], pontes: (layout.pontes || []).filter(p => est.pontes.includes(p.id)), fios: [], semSoltos: true };
  const rede = CI.redeDoLayout(layout, opc);
  const no = ref => rede.raiz(ref);
  const elems = [];
  const R = (id, a, b, r) => elems.push({ t:'R', id, a: no(a), b: no(b), r });
  const V = (id, a, b, v, r) => elems.push({ t:'V', id, a: no(a), b: no(b), v, r });
  const D = (id, a, b, vf, rs) => elems.push({ t:'D', id, a: no(a), b: no(b), vf, rs, on: false });
  const tem = id => est.pecas.includes(id);
  const P = (id, n) => 'P:' + id + '.' + n;
  // fios e jumpers viram resistores pequenos (para medir a corrente neles)
  (layout.jumpers || []).forEach(j => { if (est.jumpers.includes(j.id)) R('j:' + j.id, 'H:' + j.de, 'H:' + j.para, 0.02); });
  (layout.fios || []).forEach(f => { if (est.fios.includes(f.id) && (!est.soldados || (est.soldados.has(f.de) && est.soldados.has(f.para)))) R('f:' + f.id, 'H:' + f.de, 'H:' + f.para, 0.02); });
  if (layout.tipo === 'placa' && est.soltos) (layout.soltos || []).forEach(([a, b], i) => R('s:' + i, a, b, 0.02));
  const vb = est.vbat;
  if (tem('bloco') && est.chave) V('bat', P('bloco', '+'), P('bloco', '-'), vb, 0.12);
  if (layout.tipo === 'placa' && est.soltos) {
    V('bat', P('bat', '+'), P('bat', '-'), vb, 0.12);
    R('tp+', P('tp', 'B+'), P('tp', 'OUT+'), 0.05); R('tp-', P('tp', 'B-'), P('tp', 'OUT-'), 0.05);
    if (est.chave) R('chave', P('chave', '1'), P('chave', '2'), 0.02);
    R('modulo', P('at', 'IN+'), P('at', 'IN-'), 1.5);
  }
  const Rv = { rga:100, rgb:100, rpa:10000, rpb:10000, rb:1000, rd1:100000, rd2:100000, r220:220 };
  Object.entries(Rv).forEach(([id, r]) => { if (tem(id)) R(id, P(id, '1'), P(id, '2'), r); });
  if (tem('led')) D('led', P('led', 'A'), P('led', 'K'), 1.9, 15);
  if (tem('bz')) D('bz', P('bz', '+'), P('bz', '-'), 0.4, 110);
  if (tem('bt') && est.botao) R('bt', P('bt', '1'), P('bt', '2'), 0.05);
  if (tem('q')) { D('qbe', P('q', 'B'), P('q', 'E'), 0.65, 30); elems.push({ t:'Q', id:'qce', a: no(P('q', 'C')), b: no(P('q', 'E')), on:false }); }
  ['ma', 'mb'].forEach(m => { if (tem(m)) elems.push({ t:'M', id:m, d: no(P(m, 'D')), s: no(P(m, 'S')), g: no(P(m, 'G')), irfz: !!(est.defeitos || {}).irfz, curto: !!(est.defeitos || {})['curto' + (m === 'ma' ? 'A' : 'B')], r: 1e9 }); });
  if (tem('rx')) elems.push({ t:'RX', id:'rx', a: no(P('rx', 'VCC')), b: no(P('rx', 'GND')), r: 800 });
  let esp = null;
  if (tem('esp')) {
    esp = { v5: no(P('esp', '5V')), gnd: no(P('esp', 'GND')), v33: no(P('esp', '3V3')), g0: no(P('esp', 'GPIO0')), g1: no(P('esp', 'GPIO1')), g3: no(P('esp', 'GPIO3')),
            g4: no(P('esp', 'GPIO4')), g5: no(P('esp', 'GPIO5')), g6: no(P('esp', 'GPIO6')) };
    if (est.usb) V('usb', P('esp', '5V'), P('esp', 'GND'), 4.9, 0.3);
    elems.push({ t:'REG', id:'reg', e: esp, v: 0 });
  }
  // nó de referência (0 V): negativo da bateria, senão o GND do ESP
  const ref = tem('bloco') ? no(P('bloco', '-')) : layout.tipo === 'placa' && est.soltos ? no(P('bat', '-')) : esp ? esp.gnd : null;
  return { rede, elems, esp, ref, no };
}

function resolver(c, est) {
  const nos = new Map(); const idx = n => { if (n === c.ref) return -1; if (!nos.has(n)) nos.set(n, nos.size); return nos.get(n); };
  c.elems.forEach(e => ['a', 'b', 'd', 's', 'g'].forEach(k => { if (e[k] !== undefined) idx(e[k]); }));
  if (c.esp) Object.values(c.esp).forEach(idx);
  const N = nos.size; let Vn = new Float64Array(N);
  const vOf = n => { const i = idx(n); return i < 0 ? 0 : Vn[i]; };
  let gpioLig = false;
  for (let it = 0; it < 90; it++) {
    const G = Array.from({ length: N }, () => new Float64Array(N)), I = new Float64Array(N);
    const addG = (a, b, g) => { const i = idx(a), j = idx(b); if (i >= 0) G[i][i] += g; if (j >= 0) G[j][j] += g; if (i >= 0 && j >= 0) { G[i][j] -= g; G[j][i] -= g; } };
    const addI = (a, b, i0) => { const i = idx(a), j = idx(b); if (i >= 0) I[i] += i0; if (j >= 0) I[j] -= i0; }; // corrente entrando em a, saindo de b
    const fonte = (a, b, v, r) => { addG(a, b, 1 / r); addI(a, b, v / r); };
    for (let i = 0; i < N; i++) G[i][i] += 1e-9;
    c.elems.forEach(e => {
      if (e.t === 'R') addG(e.a, e.b, 1 / e.r);
      else if (e.t === 'V') fonte(e.a, e.b, e.v, e.r);
      else if (e.t === 'D') { if (e.on) fonte(e.a, e.b, e.vf, e.rs); else addG(e.a, e.b, 1e-8); }
      else if (e.t === 'Q') addG(e.a, e.b, e.on ? 1 / 5 : 1e-8);
      else if (e.t === 'M') addG(e.d, e.s, 1 / (e.curto ? 0.01 : e.r));
      else if (e.t === 'RX') addG(e.a, e.b, 1 / e.r);
      else if (e.t === 'REG') {
        const E = e.e; addG(E.v33, E.gnd, 1 / 120);                 // consumo do ESP32
        if (e.v > 0) fonte(E.v33, E.gnd, e.v, 0.5);
        addG(E.g1, E.v33, 1 / 45000);                                 // pull-up do botão
        if (gpioLig) [['g4', est.gpio.a], ['g6', est.gpio.b], ['g5', est.gpio.bz]].forEach(([k, on]) => fonte(E[k], E.gnd, on ? e.v : 0, 25));
      }
    });
    // resolve G·V = I
    const A = G.map((row, i) => { const r = Array.from(row); r.push(I[i]); return r; });
    for (let k = 0; k < N; k++) {
      let p = k; for (let i = k + 1; i < N; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
      [A[k], A[p]] = [A[p], A[k]];
      const d = A[k][k] || 1e-12;
      for (let i = k + 1; i < N; i++) { const f = A[i][k] / d; if (f) for (let j = k; j <= N; j++) A[i][j] -= f * A[k][j]; }
    }
    const X = new Float64Array(N);
    for (let i = N - 1; i >= 0; i--) { let s = A[i][N]; for (let j = i + 1; j < N; j++) s -= A[i][j] * X[j]; X[i] = s / (A[i][i] || 1e-12); }
    Vn = X;
    // atualiza as partes que dependem da tensão
    let mudou = false;
    c.elems.forEach(e => {
      if (e.t === 'D') { const on = vOf(e.a) - vOf(e.b) > e.vf + (e.on ? -0.01 : 0.01); if (on !== e.on) { e.on = on; mudou = true; } }
      else if (e.t === 'Q') { const be = c.elems.find(x => x.id === 'qbe'); const ib = be.on ? (vOf(be.a) - vOf(be.b) - be.vf) / be.rs : 0; const on = ib > 0.0002; if (on !== e.on) { e.on = on; mudou = true; } }
      else if (e.t === 'M') {
        const vgs = vOf(e.g) - vOf(e.s), [v0, v1] = e.irfz ? [3.0, 4.5] : [1.5, 2.6];
        const t = Math.max(0, Math.min(1, (vgs - v0) / (v1 - v0)));
        const r = vgs <= v0 ? 1e9 : Math.pow(10, Math.log10(2000) * (1 - t) + Math.log10(0.04) * t);
        // amortecido: MOSFET em cima de outro (o A) muda a própria Vgs quando a corrente passa
        const lo = Math.log10(e.r), ln = Math.log10(r);
        if (Math.abs(ln - lo) > 0.01) { e.r = Math.pow(10, lo + (ln - lo) * (it < 4 ? 1 : 0.35)); mudou = true; }
      } else if (e.t === 'REG') {
        const v5 = vOf(e.e.v5) - vOf(e.e.gnd);
        const nv = v5 > 3.5 ? 3.3 : v5 > 2.6 ? v5 - 0.15 : 0;
        if (Math.abs(nv - e.v) > 0.005) { e.v = nv; mudou = true; }
        const lig = e.v > 2.8; if (lig !== gpioLig) { gpioLig = lig; mudou = true; }
      }
    });
    if (!mudou && it > 0) break;
  }
  const corrente = e => {
    if (e.t === 'R') return (vOf(e.a) - vOf(e.b)) / e.r;
    if (e.t === 'V') return (e.v - (vOf(e.a) - vOf(e.b))) / e.r;
    if (e.t === 'D') return e.on ? (vOf(e.a) - vOf(e.b) - e.vf) / e.rs : 0;
    if (e.t === 'Q') return e.on ? (vOf(e.a) - vOf(e.b)) / 5 : 0;
    if (e.t === 'M') return (vOf(e.d) - vOf(e.s)) / (e.curto ? 0.01 : e.r);
    return 0;
  };
  const I = {}; c.elems.forEach(e => { I[e.id] = corrente(e); });
  const reg = c.elems.find(e => e.t === 'REG');
  return { v: n => vOf(n), I, espLigado: !!(reg && reg.v > 2.8), v33: reg ? reg.v : 0 };
}

// ---------- bancada: junta rede + firmware + tempo ----------
function novaBancada(layout) {
  return { layout, t: 0, fw: novoFirmware(), espLigadoAntes: false,
    est: { pecas: [], jumpers: [], pontes: [], fios: [], soldados: layout.tipo === 'placa' ? new Set() : null, soltos: false,
           chave: false, usb: false, vbat: 3.9, botao: false, defeitos: {}, gpio: { a: false, b: false, bz: false } },
    apertado: -1, eventos: [], res: null, circ: null, sujo: true };
}
function redeCompleta(B) {
  return CI.redeDoLayout(B.layout, { pecas: B.est.pecas, soldados: B.est.soldados, jumpers: (B.layout.jumpers || []).filter(j => B.est.jumpers.includes(j.id)),
    pontes: (B.layout.pontes || []).filter(p => B.est.pontes.includes(p.id)),
    fios: (B.layout.fios || []).filter(f => B.est.fios.includes(f.id) && (!B.est.soldados || (B.est.soldados.has(f.de) && B.est.soldados.has(f.para)))), semSoltos: true });
}
function bancadaRecalcular(B) { B.circ = montarRede(B.layout, B.est); B.res = resolver(B.circ, B.est); B.conexao = redeCompleta(B); B.sujo = false; }
function rfOk(B) {
  const c = B.circ, r = B.res; if (!c || !c.esp || !B.est.pecas.includes('rx')) return false;
  const rx = c.elems.find(e => e.t === 'RX'); if (!rx) return false;
  const k = B.conexao.raiz;
  return r.v(rx.a) - r.v(rx.b) > 2.5 && k('P:rx.DATA') === k('P:esp.GPIO3') && k('P:rx.GND') === k('P:esp.GND');
}
function evento(B, tipo, dados) { B.eventos.push(Object.assign({ tipo, t: B.t }, dados || {})); if (B.eventos.length > 200) B.eventos.shift(); }
// avança a bancada "ms" milissegundos
function bancadaAvancar(B, ms) {
  if (B.sujo || !B.res) bancadaRecalcular(B);
  const fim = B.t + ms;
  while (B.t < fim) {
    const dt = Math.min(5, fim - B.t); B.t += dt;
    const lig = B.res.espLigado;
    if (lig && !B.espLigadoAntes) { fwLigar(B.fw, B.t, adcMv(B)); evento(B, 'esp_ligou'); }
    if (!lig && B.espLigadoAntes) { evento(B, 'esp_desligou'); }
    B.espLigadoAntes = lig;
    if (!lig) { B.est.gpio = { a: false, b: false, bz: false }; continue; }
    const antes = JSON.stringify([B.fw.a, B.fw.b, B.fw.bz]);
    const estAntes = B.fw.estado;
    fwPasso(B.fw, B.t, adcMv(B));
    if (B.fw.estado === 'choque' && estAntes !== 'choque') evento(B, 'choque', { nivel: B.fw.nivel, simulado: B.fw.simulado });
    const depois = JSON.stringify([B.fw.a, B.fw.b, B.fw.bz]);
    if (antes !== depois) {
      B.est.gpio = { a: B.fw.a, b: B.fw.b, bz: B.fw.bz };
      bancadaRecalcular(B);
      const r = B.res;
      if (r.I.bz > 0.005 && B.fw.bz) evento(B, 'bipe');
      if ((r.I.led || 0) > 0.008) evento(B, 'led_teste', { mA: r.I.led * 1000 });
      else if ((r.I.led || 0) > 0.0005) evento(B, 'led_fraco', { mA: r.I.led * 1000 });
    }
  }
}
function adcMv(B) { const c = B.circ; if (!c || !c.esp) return 0; return Math.round((B.res.v(c.esp.g0) - B.res.v(c.esp.gnd)) * 2 * 1000); }
function bancadaApertar(B, botao) {
  if (B.sujo || !B.res) bancadaRecalcular(B);
  B.apertado = botao;
  const ok = rfOk(B);
  evento(B, 'aperto', { botao, chegou: ok && B.res.espLigado });
  if (ok && B.res.espLigado) { fwLog(B.fw, B.t, `Recebido: 0x5A5A5${[1, 2, 4, 8][botao]} (botão ${'ABCD'[botao]})`); fwPedir(B.fw, B.t, botao); }
}
function bancadaSoltar(B) { B.apertado = -1; }
function bancadaMudar(B, f) { f(B.est); B.sujo = true; bancadaRecalcular(B); }

// ---------- multímetro ----------
// pontas: furos (ou "P:peca.pino"). modo: 'V' ou 'cont'
function multimetro(B, modo, vermelha, preta) {
  if (!vermelha || !preta) return { txt: '- - -', obs: 'Encoste as duas pontas.' };
  if (B.sujo || !B.res) bancadaRecalcular(B);
  const ref = x => x.startsWith('P:') ? x : 'H:' + x;
  const c = B.circ;
  if (modo === 'V') {
    const v = B.res.v(c.no(ref(vermelha))) - B.res.v(c.no(ref(preta)));
    return { v, txt: (Math.abs(v) < 0.005 ? 0 : v).toFixed(2).replace('.', ',') + ' V' };
  }
  const ligada = B.est.chave || B.est.usb;
  if (ligada) return { txt: 'Desligue', obs: 'Continuidade só com tudo desligado: desligue a chave e tire o USB.' };
  // continuidade: só caminhos de menos de 1 Ω (fio, jumper, ponte)
  const rede = B.conexao;
  const bipa = rede.raiz(ref(vermelha)) === rede.raiz(ref(preta));
  return { bipa, txt: bipa ? '0,0 Ω' : '1', obs: bipa ? 'Bipou: os dois pontos estão ligados.' : 'Não bipou: os dois pontos não estão ligados direto.' };
}

const API = { FWC, novoFirmware, fwLigar, fwPasso, fwPedir, montarRede, resolver, novaBancada, bancadaAvancar, bancadaApertar, bancadaSoltar, bancadaMudar, bancadaRecalcular, multimetro, adcMv, rfOk };
if (typeof module !== 'undefined') module.exports = API;
raiz.SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
