/* =====================================================================
   montagem-pecas.js — desenho das peças, da protoboard e da placa (SVG)
   =====================================================================
   Tudo em "passos" de 2,54 mm (a distância entre dois furos). O desenho
   da placa vira uma imagem por cima da qual o usuário trabalha.
   ===================================================================== */
const DES = (() => {
  const CIR = window.CIRCUITO;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // cores das faixas dos resistores
  const FAIXA = {0:'#1b1b1b', 1:'#7a4a21', 2:'#c62a1e', 3:'#e5821c', 4:'#e8c51e'};
  const FAIXAS = {100:[1,0,1], 220:[2,2,1], 1000:[1,0,2], 10000:[1,0,3], 100000:[1,0,4]};
  const NOME_COR = {0:'preto', 1:'marrom', 2:'vermelho', 3:'laranja', 4:'amarelo'};
  const coresDoResistor = v => (FAIXAS[v] || [0,0,0]).map(i => NOME_COR[i]).join(', ');

  // ---------- peças rígidas, desenhadas no "rot 0" da FORMA ----------
  const RIGIDAS = {
    esp(p) {
      let s = `<rect x="-0.75" y="-0.75" width="9.6" height="7.5" rx="0.5" fill="#17181b" stroke="#000" stroke-width="0.06"/>`;
      s += `<rect x="7.9" y="1.9" width="1.4" height="2.2" rx="0.35" fill="#c9ccd0" stroke="#8e9297" stroke-width="0.08"/>`;
      s += `<rect x="2.6" y="1.9" width="2.2" height="2.2" fill="#2b2d31"/><text x="3.7" y="3.25" font-size="0.6" fill="#ddd" text-anchor="middle">ESP32-C3</text>`;
      s += `<circle cx="6.6" cy="1.5" r="0.32" class="espled" fill="#1d4fd0" opacity="0.25"/>`;
      CIR.FORMAS.esp.pinos.forEach(([n, x, y]) => {
        s += `<rect x="${x - 0.28}" y="${y - 0.28}" width="0.56" height="0.56" fill="#d9b45a"/>`;
        s += `<text x="${x}" y="${y === 0 ? 1.0 : 5.35}" font-size="0.42" fill="#e9e9e9" text-anchor="middle">${esc(n.replace('GPIO', ''))}</text>`;
      });
      return s;
    },
    rx(p, lay) {
      if (lay && lay.empe) {
        let s = `<rect x="-1.1" y="-0.7" width="0.75" height="4.4" rx="0.1" fill="#1f6b3a"/><text x="-0.72" y="1.5" font-size="0.42" fill="#fff" text-anchor="middle" transform="rotate(-90 -0.72 1.5)">RXB6</text>`;
        CIR.FORMAS.rx.pinos.forEach(([n, x, y]) => { s += `<rect x="${x - 0.22}" y="${y - 0.22}" width="0.44" height="0.44" fill="#d9b45a"/>`; });
        return s;
      }
      let s = `<rect x="-11.2" y="-0.8" width="11.8" height="4.6" rx="0.25" fill="#1f6b3a" stroke="#0c3d1f" stroke-width="0.06"/>`;
      s += `<rect x="-7" y="0.3" width="3" height="1.4" rx="0.6" fill="#c9ccd0"/><rect x="-3.5" y="0.4" width="1.8" height="1.6" fill="#16171a"/>`;
      s += `<circle cx="-10.4" cy="1.5" r="0.35" fill="#d9b45a"/><text x="-9.8" y="1.65" font-size="0.45" fill="#fff">ANT</text>`;
      s += `<text x="-5" y="3.3" font-size="0.6" fill="#fff" text-anchor="middle">RXB6 433 MHz</text>`;
      CIR.FORMAS.rx.pinos.forEach(([n, x, y]) => { s += `<rect x="${x - 0.25}" y="${y - 0.25}" width="0.5" height="0.5" fill="#d9b45a"/><text x="-0.5" y="${y + 0.15}" font-size="0.38" fill="#fff" text-anchor="end">${n === 'DATA2' ? 'DATA' : n}</text>`; });
      return s;
    },
    to220(p, lay) {
      const nomes = { ma: 'A', mb: 'B' };
      if (lay && lay.deitado) {
        let s = '';
        [0, 1, 2].forEach(i => { s += `<line x1="${i}" y1="0" x2="${i}" y2="-1.4" stroke="#b9bdc2" stroke-width="0.3"/>`; });
        s += `<rect x="-0.6" y="-5.4" width="3.2" height="4.1" rx="0.15" fill="#16171a"/>`;
        s += `<rect x="-0.6" y="-7.4" width="3.2" height="2.1" fill="#c9ccd0"/><circle cx="1" cy="-6.4" r="0.55" fill="#5a4126"/>`;
        s += `<text x="1" y="-3.6" font-size="0.55" fill="#ddd" text-anchor="middle">IRLZ44N</text><text x="1" y="-2.3" font-size="1" fill="#fff" text-anchor="middle" font-weight="700">${nomes[p] || ''}</text>`;
        return s;
      }
      return `<rect x="-0.65" y="-1.3" width="3.3" height="0.45" fill="#c9ccd0"/><rect x="-0.65" y="-0.85" width="3.3" height="1.4" rx="0.1" fill="#16171a"/>` +
        `<text x="1" y="0.05" font-size="0.48" fill="#ddd" text-anchor="middle">IRLZ44N ${nomes[p] || ''}</text>`;
    },
    to92() {
      return `<path d="M-0.5 0.45 L2.5 0.45 L2.5 -0.2 Q1 -1.4 -0.5 -0.2 Z" fill="#141416"/><text x="1" y="0.25" font-size="0.42" fill="#ddd" text-anchor="middle">BC547</text>`;
    },
    buzzer() {
      return `<circle cx="1.5" cy="0" r="2.35" fill="#141416" stroke="#000" stroke-width="0.08"/><circle cx="1.5" cy="0" r="0.45" fill="#2b2d31"/>` +
        `<text x="0" y="-1.0" font-size="0.9" fill="#fff" text-anchor="middle" font-weight="700">+</text><circle cx="1.5" cy="0" r="2.35" class="bzonda" fill="none" stroke="#e3a000" stroke-width="0.15" opacity="0"/>`;
    },
    tp() {
      let s = `<rect x="-9.6" y="-1.2" width="10.4" height="6.4" rx="0.2" fill="#1d4fa3" stroke="#103066" stroke-width="0.06"/>`;
      s += `<rect x="-10" y="1" width="2.4" height="2" rx="0.3" fill="#c9ccd0"/><rect x="-5.5" y="0.6" width="2" height="1.6" fill="#16171a"/>`;
      s += `<text x="-4.2" y="4.2" font-size="0.7" fill="#fff" text-anchor="middle">TP4056</text>`;
      CIR.FORMAS.tp.pinos.forEach(([n, x, y]) => { s += `<rect x="${x - 0.3}" y="${y - 0.3}" width="0.6" height="0.6" fill="#d9b45a"/><text x="-0.6" y="${y + 0.15}" font-size="0.42" fill="#fff" text-anchor="end">${n}</text>`; });
      return s;
    },
    soq8() { return `<rect x="-0.48" y="-0.5" width="0.96" height="8" rx="0.1" fill="#202124"/>` + [0,1,2,3,4,5,6,7].map(i => `<rect x="-0.17" y="${i - 0.17}" width="0.34" height="0.34" fill="#000"/>`).join(''); },
    soq4() { return `<rect x="-0.48" y="-0.5" width="0.96" height="4" rx="0.1" fill="#202124"/>` + [0,1,2,3].map(i => `<rect x="-0.17" y="${i - 0.17}" width="0.34" height="0.34" fill="#000"/>`).join(''); },
  };

  // ---------- peças de duas pernas, desenhadas entre os dois furos ----------
  function duasPernas(id, a, b) {
    const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, L = Math.hypot(x2 - x1, y2 - y1);
    const perna = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b9bdc2" stroke-width="0.14" stroke-linecap="round"/>`;
    const P = CIR.PECAS[id] || {};
    const t = (inner) => `<g transform="translate(${mx} ${my}) rotate(${ang})">${inner}</g>`;
    if (/^r/.test(id) && P.valor) {
      const bl = Math.min(2.3, L * 0.62), f = FAIXAS[P.valor] || [0,0,0];
      let s = `<rect x="${-bl / 2}" y="-0.36" width="${bl}" height="0.72" rx="0.3" fill="#e2cfa3" stroke="#b49b68" stroke-width="0.05"/>`;
      f.forEach((c, i) => { s += `<rect x="${-bl / 2 + bl * (0.18 + i * 0.17)}" y="-0.36" width="${bl * 0.09}" height="0.72" fill="${FAIXA[c]}"/>`; });
      s += `<rect x="${bl / 2 - bl * 0.2}" y="-0.36" width="${bl * 0.08}" height="0.72" fill="#c59a2b"/>`;
      return perna + t(s);
    }
    if (id === 'led') return perna + t(`<circle r="0.75" class="ledteste" fill="#d23a2e" stroke="#7a1a14" stroke-width="0.06"/><line x1="0.55" y1="-0.55" x2="0.55" y2="0.55" stroke="#7a1a14" stroke-width="0.12"/>`) +
      `<circle cx="${mx}" cy="${my}" r="1.6" class="ledbrilho" fill="#ff5a3c" opacity="0"/>`;
    if (id === 'cap') return perna + t(`<circle r="1.65" fill="#1c2a52" stroke="#0d1530" stroke-width="0.08"/><path d="M0.95 -1.35 A1.65 1.65 0 0 1 0.95 1.35 Z" fill="#c9ccd4"/><text x="1.15" y="0.2" font-size="0.6" fill="#1c2a52" text-anchor="middle">−</text>`);
    if (id === 'bt') return perna + t(`<rect x="-1" y="-1" width="2" height="2" rx="0.15" fill="#2b2d31"/><circle r="0.55" fill="#111214"/>`);
    if (id === 'bloco') return perna;
    return perna + t(`<rect x="-0.6" y="-0.35" width="1.2" height="0.7" fill="#888"/>`);
  }

  // ---------- protoboard ----------
  function protoboard(S) {
    let s = `<rect x="${0.2}" y="-4.6" width="64.3" height="20.2" rx="0.6" fill="#f3f1ea" stroke="#d6d2c6" stroke-width="0.08"/>`;
    s += `<rect x="0.6" y="5.0" width="63.6" height="1.0" fill="#e4e0d4"/>`;
    [['T-', -3.4, '#3a6fd6'], ['T+', -2.4, '#d4483b'], ['B-', 13.4, '#3a6fd6'], ['B+', 14.4, '#d4483b']].forEach(([n, y, c]) => {
      const off = n.endsWith('+') ? (y < 0 ? 0.55 : 0.55) : -0.55;
      s += `<line x1="1" y1="${y + off}" x2="63.8" y2="${y + off}" stroke="${c}" stroke-width="0.07"/>`;
      s += `<text x="0.55" y="${y + 0.18}" font-size="0.55" fill="${c}" text-anchor="middle">${n[1] === '+' ? '+' : '−'}</text>`;
    });
    'abcdefghij'.split('').forEach(l => { const y = CIR.furoXY('protoboard', l + '1')[1]; s += `<text x="0.5" y="${y + 0.18}" font-size="0.5" fill="#8a877f" text-anchor="middle">${l}</text>`; });
    for (let c = 1; c <= 63; c++) if (c === 1 || c % 5 === 0) s += `<text x="${c}" y="-0.75" font-size="0.45" fill="#8a877f" text-anchor="middle">${c}</text>`;
    CIR.todosFuros('protoboard').forEach(f => { const [x, y] = CIR.furoXY('protoboard', f); s += `<rect class="furo" data-f="${f}" x="${x - 0.2}" y="${y - 0.2}" width="0.4" height="0.4" rx="0.06" fill="#4a463e"/>`; });
    return s;
  }

  // ---------- placa ilhada (de cima ou de baixo) ----------
  // De baixo, a placa é espelhada da esquerda para a direita (como quando você vira a placa na mão).
  const espelha = (embaixo, x) => embaixo ? 23 - x : x;
  function placa(embaixo) {
    let s = `<rect x="-1.3" y="-1.3" width="25.6" height="31.6" rx="0.5" fill="#c9a46a" stroke="#a9834a" stroke-width="0.08"/>`;
    for (let r = 0; r < 30; r++) for (let c = 0; c < 24; c++) {
      const x = espelha(embaixo, c);
      s += `<circle class="furo" data-f="${c},${r}" cx="${x}" cy="${r}" r="0.38" fill="#d9b45a"/><circle cx="${x}" cy="${r}" r="0.16" fill="#2a2016" pointer-events="none"/>`;
    }
    for (let c = 0; c < 24; c += 4) s += `<text x="${espelha(embaixo, c)}" y="-0.65" font-size="0.48" fill="#5a4126" text-anchor="middle">${c}</text>`;
    for (let r = 0; r < 30; r += 4) s += `<text x="${embaixo ? 24 : -0.85}" y="${r + 0.17}" font-size="0.48" fill="#5a4126" text-anchor="middle">${r}</text>`;
    s += `<text x="11.5" y="30.05" font-size="0.6" fill="#5a4126" text-anchor="middle">${embaixo ? 'LADO DE BAIXO (soldas)' : 'LADO DE CIMA (peças)'}</text>`;
    return s;
  }

  // posição de um furo no desenho (já espelhada se for de baixo)
  function pos(tipo, f, embaixo) { const [x, y] = CIR.furoXY(tipo, f); return [tipo === 'placa' ? espelha(embaixo, x) : x, y]; }

  // desenha uma peça já colocada. estilo: '' | 'apagada' | 'nova' | 'fantasma' | 'errada'
  function peca(layout, id, opc = {}) {
    const lay = layout.pecas[id]; if (!lay) return '';
    const cls = 'peca ' + (opc.estilo || '');
    if (lay.pernas || opc.pernas) {
      const pp = opc.pernas || lay.pernas; const ks = Object.keys(pp);
      if (id === 'bloco') return blocoBateria(layout, pp, cls);
      const a = pos(layout.tipo, pp[ks[0]], opc.embaixo), b = pos(layout.tipo, pp[ks[1]], opc.embaixo);
      if (opc.embaixo) return `<g class="${cls}" data-p="${id}">${[a, b].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.2" fill="#b9bdc2"/>`).join('')}</g>`;
      return `<g class="${cls}" data-p="${id}">${duasPernas(id, a, b)}</g>`;
    }
    const anc = opc.ancora || lay.ancora, rot = opc.rot === undefined ? lay.rot : opc.rot;
    if (opc.embaixo) {
      const pins = CIR.pinosDaPeca(layout, id, anc, rot);
      return `<g class="${cls}" data-p="${id}">` + Object.entries(pins).filter(([, f]) => f).map(([n, f]) => { const [x, y] = pos(layout.tipo, f, true); return `<circle cx="${x}" cy="${y}" r="0.2" fill="#b9bdc2"/><text x="${x}" y="${y - 0.45}" font-size="0.36" fill="#3b2a17" text-anchor="middle">${esc(n.replace('GPIO', 'G'))}</text>`; }).join('') + `</g>`;
    }
    const [ax, ay] = pos(layout.tipo, anc, false);
    return `<g class="${cls}" data-p="${id}" transform="translate(${ax} ${ay}) rotate(${rot})">${RIGIDAS[lay.forma](id, lay)}</g>`;
  }

  function blocoBateria(layout, pp, cls) {
    const a = pos(layout.tipo, pp['+']), b = pos(layout.tipo, pp['-']);
    let s = `<g class="${cls}" data-p="bloco"><rect x="-10.4" y="1" width="8.6" height="9" rx="0.5" fill="#26282c"/>`;
    s += `<rect x="-9.8" y="2" width="7.4" height="3.2" rx="1.4" fill="#2e7a4d"/><text x="-6.1" y="4" font-size="0.7" fill="#fff" text-anchor="middle">18650</text>`;
    s += `<rect x="-9.8" y="6" width="4" height="3" rx="0.2" fill="#1d4fa3"/><text x="-7.8" y="7.8" font-size="0.5" fill="#fff" text-anchor="middle">TP4056</text>`;
    s += `<rect x="-5.2" y="6.4" width="2.6" height="2.2" rx="0.3" fill="#111" class="chavevis"/><text x="-3.9" y="9.6" font-size="0.5" fill="#bbb" text-anchor="middle">chave</text>`;
    s += `<path d="M-1.8 3 C 0 3, ${a[0] - 1.5} ${a[1]}, ${a[0]} ${a[1]}" stroke="#d4483b" stroke-width="0.22" fill="none"/>`;
    s += `<path d="M-1.8 4.2 C 0 4.2, ${b[0] - 1.5} ${b[1]}, ${b[0]} ${b[1]}" stroke="#2b2b2b" stroke-width="0.22" fill="none"/>`;
    return s + `</g>`;
  }

  // jumper (protoboard) ou fio (placa). por baixo = fio encapado
  function fio(tipo, de, para, cor, opc = {}) {
    const a = pos(tipo, de, opc.embaixo), b = pos(tipo, para, opc.embaixo);
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const k = Math.min(3, 0.18 * L + 0.6), nx = -dy / L * k, ny = dx / L * k;
    const d = `M${a[0]} ${a[1]} Q ${(a[0] + b[0]) / 2 + nx} ${(a[1] + b[1]) / 2 + ny} ${b[0]} ${b[1]}`;
    const w = opc.grossa ? 0.42 : 0.26;
    return `<g class="fio ${opc.estilo || ''}" data-j="${opc.id || ''}"><path d="${d}" stroke="#000" stroke-opacity="0.35" stroke-width="${w + 0.1}" fill="none" stroke-linecap="round"/>` +
      `<path d="${d}" stroke="${cor}" stroke-width="${w}" fill="none" stroke-linecap="round"/>` +
      `<path class="corrente" d="${d}" stroke="#ffe26a" stroke-width="${w * 0.5}" fill="none" stroke-dasharray="0.25 1.1" stroke-linecap="round" opacity="0"/>` +
      `<circle cx="${a[0]}" cy="${a[1]}" r="0.2" fill="#9a9a9a"/><circle cx="${b[0]}" cy="${b[1]}" r="0.2" fill="#9a9a9a"/></g>`;
  }

  // ponte de estanho por baixo
  function ponte(p, opc = {}) {
    const pts = p.furos.map(f => pos('placa', f, true));
    let s = `<g class="ponte ${opc.estilo || ''}">`;
    for (let i = 1; i < pts.length; i++) {
      // liga cada furo ao vizinho mais próximo já desenhado (as pontes podem ter galhos)
      let melhor = pts[0], d = 1e9; for (let j = 0; j < i; j++) { const dd = (pts[j][0] - pts[i][0]) ** 2 + (pts[j][1] - pts[i][1]) ** 2; if (dd < d) { d = dd; melhor = pts[j]; } }
      s += `<line x1="${melhor[0]}" y1="${melhor[1]}" x2="${pts[i][0]}" y2="${pts[i][1]}" stroke="#d6d9dd" stroke-width="${p.grossa ? 0.55 : 0.36}" stroke-linecap="round"/>`;
    }
    return s + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.34" fill="#e3e6ea"/>`).join('') + `</g>`;
  }
  function solda(f) { const [x, y] = pos('placa', f, true); return `<g class="solda"><circle cx="${x}" cy="${y}" r="0.42" fill="#cfd3d8"/><circle cx="${x - 0.1}" cy="${y - 0.12}" r="0.14" fill="#fff" opacity="0.8"/></g>`; }

  // ---------- desenhos avulsos (galeria de peças e de soldas) ----------
  function galeriaPeca(tipo, extra = {}) {
    const W = { resistor: [6, 2], led: [4, 4], cap: [5, 5], mosfet: [5, 4], bc547: [5, 3], esp: [12, 9], rx: [14, 6], buzzer: [7, 6], tp: [12, 8] }[tipo] || [6, 4];
    let corpo = '';
    if (tipo === 'resistor') { const v = extra.valor;
      const f = FAIXAS[v]; corpo = `<line x1="-2.6" y1="0" x2="2.6" y2="0" stroke="#b9bdc2" stroke-width="0.14"/><rect x="-1.2" y="-0.42" width="2.4" height="0.84" rx="0.35" fill="#e2cfa3" stroke="#b49b68" stroke-width="0.05"/>` +
        f.map((c, i) => `<rect x="${-1.2 + 2.4 * (0.18 + i * 0.17)}" y="-0.42" width="0.24" height="0.84" fill="${FAIXA[c]}"/>`).join('') + `<rect x="0.75" y="-0.42" width="0.2" height="0.84" fill="#c59a2b"/>`; }
    if (tipo === 'led') corpo = `<line x1="-0.6" y1="0.2" x2="-0.6" y2="2.2" stroke="#b9bdc2" stroke-width="0.14"/><line x1="0.6" y1="0.2" x2="0.6" y2="1.6" stroke="#b9bdc2" stroke-width="0.14"/><path d="M-1 0.3 L-1 -0.8 A1 1 0 0 1 1 -0.8 L1 0.3 Z" fill="#d23a2e"/><text x="-0.6" y="2.9" font-size="0.5" text-anchor="middle">+ comprida</text><text x="0.9" y="2.3" font-size="0.5" text-anchor="start">− curta</text>`;
    if (tipo === 'cap') corpo = `<rect x="-1.6" y="-2" width="3.2" height="3.4" rx="0.3" fill="#1c2a52"/><rect x="0.6" y="-2" width="0.8" height="3.4" fill="#c9ccd4"/><text x="1" y="0" font-size="0.7" fill="#1c2a52" text-anchor="middle">−</text><line x1="-0.7" y1="1.4" x2="-0.7" y2="2.4" stroke="#b9bdc2" stroke-width="0.14"/><line x1="0.7" y1="1.4" x2="0.7" y2="2.1" stroke="#b9bdc2" stroke-width="0.14"/>`;
    if (tipo === 'mosfet') corpo = `<rect x="-1.6" y="-2.6" width="3.2" height="0.9" fill="#c9ccd0"/><circle cx="0" cy="-2.15" r="0.3" fill="#888"/><rect x="-1.6" y="-1.7" width="3.2" height="2.2" fill="#16171a"/><text x="0" y="-0.5" font-size="0.48" fill="#ddd" text-anchor="middle">IRLZ44N</text>` +
      [-1, 0, 1].map((x, i) => `<line x1="${x}" y1="0.5" x2="${x}" y2="1.7" stroke="#b9bdc2" stroke-width="0.16"/><text x="${x}" y="2.3" font-size="0.5" text-anchor="middle">${'GDS'[i]}</text>`).join('');
    if (tipo === 'bc547') corpo = `<path d="M-1.2 0.4 L1.2 0.4 L1.2 -0.4 Q0 -1.6 -1.2 -0.4 Z" fill="#141416"/><text x="0" y="0.2" font-size="0.4" fill="#ddd" text-anchor="middle">BC547</text>` +
      [-0.9, 0, 0.9].map((x, i) => `<line x1="${x}" y1="0.4" x2="${x}" y2="1.2" stroke="#b9bdc2" stroke-width="0.14"/><text x="${x}" y="1.8" font-size="0.48" text-anchor="middle">${'CBE'[i]}</text>`).join('');
    if (tipo === 'esp') corpo = `<g transform="translate(-4 -3)">${RIGIDAS.esp('esp')}</g>`;
    if (tipo === 'rx') corpo = `<g transform="translate(5.6 -1.5)">${RIGIDAS.rx('rx')}</g>`;
    if (tipo === 'buzzer') corpo = `<g transform="translate(-1.5 0)">${RIGIDAS.buzzer()}</g><text x="-1.5" y="2.9" font-size="0.5" text-anchor="middle">+ (comprida)</text><text x="1.5" y="2.9" font-size="0.5" text-anchor="middle">−</text>`;
    if (tipo === 'tp') corpo = `<g transform="translate(4.4 -2)">${RIGIDAS.tp()}</g>`;
    return `<svg viewBox="${-W[0] / 2} ${-W[1] / 2} ${W[0]} ${W[1]}" class="galeria" role="img">${corpo}</svg>`;
  }

  // solda vista de lado (corte): tipo = boa | fria | pouca | demais | ponte | queimada
  function soldaDeLado(tipo) {
    const placa = `<rect x="-5" y="1" width="10" height="1" fill="#c9a46a"/><rect x="-1.6" y="0.8" width="3.2" height="0.25" fill="#d9b45a"/>`;
    const perna = `<rect x="-0.18" y="-3" width="0.36" height="5" fill="#b9bdc2"/>`;
    const forma = {
      boa: `<path d="M-1.6 0.85 Q-0.4 0.6 -0.2 -1.6 L0.2 -1.6 Q0.4 0.6 1.6 0.85 Z" fill="#d6d9dd"/>`,
      fria: `<ellipse cx="0" cy="-0.1" rx="1.0" ry="0.9" fill="#a4a7ab"/><circle cx="-0.4" cy="-0.3" r="0.15" fill="#8a8d91"/>`,
      pouca: `<path d="M-0.6 0.85 Q-0.25 0.6 -0.2 0.2 L0.2 0.2 Q0.25 0.6 0.6 0.85 Z" fill="#d6d9dd"/>`,
      demais: `<ellipse cx="0" cy="-0.3" rx="1.9" ry="1.6" fill="#d6d9dd"/>`,
      ponte: `<path d="M-1.6 0.85 Q-0.4 0.6 -0.2 -1.4 L0.2 -1.4 Q0.4 0.6 1.6 0.85 Z" fill="#d6d9dd"/><rect x="1.5" y="0.3" width="3" height="0.55" rx="0.25" fill="#d6d9dd"/><rect x="3.2" y="-3" width="0.36" height="5" fill="#b9bdc2"/>`,
      queimada: `<path d="M-1.6 0.85 Q-0.4 0.6 -0.2 -1.4 L0.2 -1.4 Q0.4 0.6 1.6 0.85 Z" fill="#6b5f4f"/><rect x="-1.6" y="0.55" width="3.2" height="0.3" fill="#4a3a28"/>`,
    }[tipo];
    return `<svg viewBox="-5 -3.2 10 5.4" class="galeria solda-lado" role="img">${placa}${perna}${forma}</svg>`;
  }

  return { esc, coresDoResistor, protoboard, placa, peca, fio, ponte, solda, pos, galeriaPeca, soldaDeLado, FAIXAS };
})();
