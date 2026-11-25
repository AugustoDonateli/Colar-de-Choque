// Testa o simulador da bancada: tensões, firmware em JS e multímetro.
// Rodar: node testes/sim.test.js
const C = require('../site/src/js/circuito.js');
global.CIRCUITO = C;
const S = require('../site/src/js/montagem-sim.js');
let ok = 0, falhas = 0;
const conf = (c, t) => { console.log((c ? '  [ OK ] ' : '  [FALHOU] ') + t); c ? ok++ : falhas++; };
const L = C.LAYOUT.protoboard;
function bancadaCompleta(mud) {
  const B = S.novaBancada(L);
  S.bancadaMudar(B, e => { e.pecas = Object.keys(L.pecas); e.jumpers = L.jumpers.map(j => j.id); e.chave = true; e.vbat = 3.9; if (mud) mud(e); });
  S.bancadaAvancar(B, 1500);
  return B;
}
const ev = (B, tipo, desde = 0) => B.eventos.filter(e => e.tipo === tipo && e.t >= desde);
const tempoLed = (B, ms) => { let on = 0; for (let i = 0; i < ms; i += 5) { S.bancadaAvancar(B, 5); if ((B.res.I.led || 0) > 0.008) on += 5; } return on; };

console.log('\n1) Bancada completa ligada na bateria (3,9 V)');
let B = bancadaCompleta();
const m = (a, b) => S.multimetro(B, 'V', a, b);
conf(B.res.espLigado, 'ESP32 liga');
conf(Math.abs(m('a10', 'T-1').v - 3.3) < 0.05, '3V3 medido: ' + m('a10', 'T-1').txt);
conf(Math.abs(m('a5', 'T-1').v - 1.94) < 0.06, 'GPIO 0 (meio do divisor): ' + m('a5', 'T-1').txt);
conf(Math.abs(m('T+1', 'T-1').v - 3.9) < 0.1, 'trilhas: ' + m('T+1', 'T-1').txt);
conf(B.fw.bat === 'boa', 'firmware leu a bateria como boa (' + B.fw.mv + ' mV)');
conf(ev(B, 'bipe').length >= 1, 'bipe de ligar');
conf((B.res.I.led || 0) < 0.0005, 'LED de teste apagado parado');

console.log('\n2) Botão A: só bipe');
let t0 = B.t; S.bancadaApertar(B, 0); S.bancadaAvancar(B, 100); S.bancadaSoltar(B); let led = tempoLed(B, 1200);
conf(ev(B, 'bipe', t0).length >= 1 && led === 0, 'bipe sem LED de teste (LED ' + led + ' ms)');

console.log('\n3) Botão B: 5 pulsos de 30 ms');
S.bancadaAvancar(B, 3500); t0 = B.t; S.bancadaApertar(B, 1); S.bancadaAvancar(B, 100); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(Math.abs(led - 150) <= 15, 'LED de teste aceso ~150 ms (' + led + ')');
conf(ev(B, 'led_teste', t0).length === 5, '5 pulsos (' + ev(B, 'led_teste', t0).length + ')');

console.log('\n4) Botão C: pulsos de 70 ms');
S.bancadaAvancar(B, 3500); S.bancadaApertar(B, 2); S.bancadaAvancar(B, 100); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(Math.abs(led - 350) <= 15, 'LED aceso ~350 ms (' + led + ')');

console.log('\n5) Segurar D por 10 s');
S.bancadaAvancar(B, 3500); t0 = B.t; S.bancadaApertar(B, 3); led = tempoLed(B, 10000); S.bancadaSoltar(B);
conf(Math.abs(led - 1000) <= 15 && ev(B, 'choque', t0).length === 1, 'um choque de 1 s (' + led + ' ms)');

console.log('\n6) B logo depois: pausa de 3 s');
S.bancadaAvancar(B, 3500); S.bancadaApertar(B, 3); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); S.bancadaAvancar(B, 1600);
t0 = B.t; S.bancadaApertar(B, 1); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(led === 0 && B.fw.contador.bloqueios.pausa >= 1, 'B logo depois do D: ignorado, sem LED');

console.log('\n7) Limite de 5 s por minuto');
B = bancadaCompleta(); t0 = B.t;
for (let i = 0; i < 7; i++) { S.bancadaApertar(B, 3); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); S.bancadaAvancar(B, 4550); }
conf(ev(B, 'choque', t0).length === 5, '5 choques de 7 apertos (' + ev(B, 'choque', t0).length + ')');

console.log('\n8) USB ligado com a chave desligada: choque simulado');
B = bancadaCompleta(e => { e.chave = false; e.usb = true; });
S.bancadaAvancar(B, 3000);
conf(B.fw.bat === 'USB ligado', 'firmware detecta USB (' + B.fw.mv + ' mV)');
t0 = B.t; S.bancadaApertar(B, 2); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(led === 0 && ev(B, 'choque', t0).some(e => e.simulado), 'choque simulado, LED apagado');

console.log('\n9) Defeito: MOSFET A em curto');
B = bancadaCompleta(e => { e.defeitos = { curtoA: true }; });
led = tempoLed(B, 2000);
conf(led === 0, 'parado: LED apagado mesmo com o A em curto');
S.bancadaApertar(B, 1); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(led > 450, 'com B: LED acende a janela inteira (' + led + ' ms), porque o MOSFET B ainda corta');

console.log('\n10) Defeito: IRFZ44N no lugar do IRLZ44N');
B = bancadaCompleta(e => { e.defeitos = { irfz: true }; }); t0 = B.t;
S.bancadaApertar(B, 3); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); S.bancadaAvancar(B, 1500);
const fr = ev(B, 'led_fraco', t0), fo = ev(B, 'led_teste', t0);
conf(fr.length >= 1 && fo.length === 0, 'LED fraco (' + (fr[0] ? fr[0].mA.toFixed(1) : '?') + ' mA)');

console.log('\n11) Bateria no fim (3,2 V)');
B = bancadaCompleta(e => { e.vbat = 3.2; });
S.bancadaAvancar(B, 9000);
conf(B.fw.bat === 'no fim', 'firmware vê bateria no fim (' + B.fw.mv + ' mV)');
t0 = B.t; S.bancadaApertar(B, 1); S.bancadaAvancar(B, 50); S.bancadaSoltar(B); led = tempoLed(B, 1500);
conf(led === 0 && B.fw.contador.bloqueios.bateria === 1, 'choque bloqueado');

console.log('\n12) Montagem pela metade: sem o fio de dados do RXB6, o controle não chega');
B = bancadaCompleta(e => { e.jumpers = e.jumpers.filter(j => j !== 'jRD'); });
S.bancadaApertar(B, 0); S.bancadaSoltar(B);
conf(B.eventos.some(e => e.tipo === 'aperto' && !e.chegou), 'aperto não chega no ESP32');

console.log('\n13) Multímetro em continuidade');
B = bancadaCompleta(e => { e.chave = false; });
conf(S.multimetro(B, 'cont', 'a12', 'T+13').bipa === true, '5V do ESP com a trilha +: bipa');
conf(S.multimetro(B, 'cont', 'T+1', 'T-1').bipa === false, 'trilha + com trilha −: não bipa');
B = bancadaCompleta();
conf(S.multimetro(B, 'cont', 'a12', 'T+13').txt === 'Desligue', 'com a chave ligada pede para desligar');

console.log('\n14) Placa ilhada: tudo soldado, primeiro liga');
const P = C.LAYOUT.placa;
const BP = S.novaBancada(P);
const soldados = new Set();
Object.keys(P.pecas).forEach(id => Object.values(C.pinosDaPeca(P, id)).forEach(f => soldados.add(f)));
P.pontes.forEach(p => p.furos.forEach(f => soldados.add(f))); P.fios.forEach(f => { soldados.add(f.de); soldados.add(f.para); });
S.bancadaMudar(BP, e => { e.pecas = Object.keys(P.pecas); e.pontes = P.pontes.map(p => p.id); e.fios = P.fios.map(f => f.id); e.soldados = soldados; e.soltos = true; e.chave = true; e.vbat = 4.0; });
S.bancadaAvancar(BP, 1500);
const mp = (a, b) => S.multimetro(BP, 'V', a, b);
conf(BP.res.espLigado, 'ESP32 liga na placa');
conf(Math.abs(mp('8,16', '8,15').v - 4.0) < 0.1, '5V do ESP32: ' + mp('8,16', '8,15').txt);
conf(Math.abs(mp('8,14', '8,15').v - 3.3) < 0.05, '3V3: ' + mp('8,14', '8,15').txt);
conf(S.rfOk(BP), 'RXB6 alimentado e ligado no GPIO 3');
const t1 = BP.t; S.bancadaApertar(BP, 3); S.bancadaAvancar(BP, 50); S.bancadaSoltar(BP); S.bancadaAvancar(BP, 300);
let maxI = 0; for (let i = 0; i < 300; i += 5) { S.bancadaAvancar(BP, 5); maxI = Math.max(maxI, BP.res.I.modulo || 0); }
conf(maxI > 1.5, 'no choque D o módulo puxa ' + maxI.toFixed(1) + ' A');

console.log(`\nResultado: ${ok} OK, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
