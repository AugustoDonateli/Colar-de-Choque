/* =====================================================================
   circuito.js — o circuito da coleira, numa fonte só
   =====================================================================
   PECAS     cada peça e o nome de cada perna (pino)
   LIGACOES  a tabela de ligações da montagem (Etapa 5). Cada linha diz,
             em texto, de onde até onde vai, e em "liga" quais pernas ela
             une de verdade
   REDES     o esquema elétrico escrito à parte: quais pernas ficam
             ligadas entre si. Serve para conferir a tabela: se alguma
             linha ligar errado, conferirCircuito() acusa
   LAYOUT    em qual furo entra cada perna. Fica vazio por enquanto:
             a protoboard é preenchida na fase 2 e a placa ilhada na
             fase 5, depois de medir as peças
   Nas próximas fases, a bancada simulada e a placa do 3D leem daqui.
   ===================================================================== */
const C = {red:'#d4483b',black:'#2b2b2b',green:'#3a9a5b',yellow:'#e2b533',orange:'#e58a2b',blue:'#3a78c2',white:'#f2f2f2',gray:'#9a9a9a',hv:'#7a3fb0'};

const PECAS = {
  bus:   {nome:'Barramentos da placa', pinos:{'+':'barramento +', '-':'barramento − (GND)'}},
  placa: {nome:'Pads da placa', pinos:{CHAVE:'pad onde chega o fio da chave', 'AT+':'pad de onde sai o + do módulo de alta tensão'}},
  usb:   {nome:'Conector USB-C', pinos:{'+':'positivo, 5 V do carregador de celular', '-':'negativo'}},
  tp:    {nome:'Carregador TP4056', pinos:{'IN+':'entrada +', 'IN-':'entrada −', 'B+':'bateria +', 'B-':'bateria −', 'OUT+':'saída +', 'OUT-':'saída −'}},
  bat:   {nome:'Bateria 18650', pinos:{'+':'polo positivo', '-':'polo negativo'}},
  chave: {nome:'Chave liga/desliga', pinos:{'1':'pino 1', '2':'pino 2'}},
  esp:   {nome:'ESP32-C3 SuperMini', pinos:{
    '5V':'entrada de energia', GND:'negativo', '3V3':'saída de 3,3 V',
    GPIO0:'mede a bateria', GPIO1:'botão de pareamento', GPIO3:'dados do rádio',
    GPIO4:'MOSFET A', GPIO5:'buzzer', GPIO6:'MOSFET B'}},
  cap:   {nome:'Capacitor de 1.000 µF', pinos:{'+':'perna comprida', '-':'perna do lado da faixa branca'}},
  rx:    {nome:'Receptor RXB6', pinos:{VCC:'alimentação', GND:'negativo', DATA:'dados', ANT:'antena'}},
  ant:   {nome:'Antena em mola', pinos:{'1':'ponta soldada'}},
  rga:   {nome:'Resistor de 100 Ω da porta A', valor:100, pinos:{'1':'perna 1', '2':'perna 2'}},
  rpa:   {nome:'Resistor de 10 kΩ da porta A', valor:10000, pinos:{'1':'perna 1', '2':'perna 2'}},
  rgb:   {nome:'Resistor de 100 Ω da porta B', valor:100, pinos:{'1':'perna 1', '2':'perna 2'}},
  rpb:   {nome:'Resistor de 10 kΩ da porta B', valor:10000, pinos:{'1':'perna 1', '2':'perna 2'}},
  rb:    {nome:'Resistor de 1 kΩ da base', valor:1000, pinos:{'1':'perna 1', '2':'perna 2'}},
  q:     {nome:'Transistor BC547', pinos:{C:'coletor', B:'base', E:'emissor'}},
  bz:    {nome:'Buzzer ativo de 3 V', pinos:{'+':'perna comprida', '-':'perna curta'}},
  rd1:   {nome:'Resistor de 100 kΩ do divisor (de cima)', valor:100000, pinos:{'1':'perna 1', '2':'perna 2'}},
  rd2:   {nome:'Resistor de 100 kΩ do divisor (de baixo)', valor:100000, pinos:{'1':'perna 1', '2':'perna 2'}},
  bt:    {nome:'Botão de pareamento', pinos:{'1':'perna 1', '2':'perna 2'}},
  ma:    {nome:'MOSFET A (IRLZ44N)', pinos:{G:'porta', D:'dreno', S:'fonte'}},
  mb:    {nome:'MOSFET B (IRLZ44N)', pinos:{G:'porta', D:'dreno', S:'fonte'}},
  at:    {nome:'Módulo de alta tensão', pinos:{'IN+':'fio fino vermelho', 'IN-':'fio fino verde', OUT1:'saída grossa 1', OUT2:'saída grossa 2'}},
  p1:    {nome:'Pino de inox 1', pinos:{'1':'parafuso'}},
  p2:    {nome:'Pino de inox 2', pinos:{'1':'parafuso'}},
};

const LIGACOES = [
  {grupo:'Na placa: energia'},
  {n:1, de:'Barramento +', para:'Trilha que recebe o fio da chave (pad CHAVE) e vai até o pad AT+', fio:'Trilha vermelha', cor:C.red,
   liga:[['bus.+','placa.CHAVE'],['bus.+','placa.AT+']]},
  {n:2, de:'Barramento −', para:'Trilha ao longo da placa', fio:'Trilha preta', cor:C.black, liga:[]},
  {n:3, de:'TP4056 OUT−', para:'Barramento −', fio:'Trilha preta', cor:C.black, liga:[['tp.OUT-','bus.-']]},
  {n:4, de:'ESP32 5V e GND', para:'5V no barramento +, GND no barramento −', fio:'Trilhas', cor:C.red, liga:[['esp.5V','bus.+'],['esp.GND','bus.-']]},
  {n:5, de:'Capacitor de 1.000 µF', para:'Entre o 5V e o GND do ESP32 (faixa branca no GND)', fio:'—', cor:null, liga:[['cap.+','esp.5V'],['cap.-','esp.GND']]},
  {grupo:'Na placa: sinais'},
  {n:6, de:'ESP32 3V3', para:'VCC do RXB6 e + do buzzer', fio:'Trilha laranja', cor:C.orange, liga:[['esp.3V3','rx.VCC'],['esp.3V3','bz.+']]},
  {n:7, de:'RXB6 DATA e GND', para:'DATA no GPIO 3, GND no barramento −', fio:'Trilha amarela', cor:C.yellow, liga:[['rx.DATA','esp.GPIO3'],['rx.GND','bus.-']]},
  {n:8, de:'Antena em mola', para:'Pino ANT do RXB6', fio:'—', cor:null, liga:[['ant.1','rx.ANT']]},
  {n:9, de:'ESP32 GPIO 4', para:'100 Ω → porta do MOSFET A; 10 kΩ da porta A ao barramento −', fio:'Trilha verde', cor:C.green,
   liga:[['esp.GPIO4','rga.1'],['rga.2','ma.G'],['ma.G','rpa.1'],['rpa.2','bus.-']]},
  {n:10, de:'ESP32 GPIO 6', para:'100 Ω → porta do MOSFET B; 10 kΩ da porta B ao barramento −', fio:'Trilha verde', cor:C.green,
   liga:[['esp.GPIO6','rgb.1'],['rgb.2','mb.G'],['mb.G','rpb.1'],['rpb.2','bus.-']]},
  {n:11, de:'ESP32 GPIO 5', para:'1 kΩ → base do BC547; emissor no −; coletor no buzzer −', fio:'Trilha azul', cor:C.blue,
   liga:[['esp.GPIO5','rb.1'],['rb.2','q.B'],['q.E','bus.-'],['q.C','bz.-']]},
  {n:12, de:'Barramento +', para:'100 kΩ → GPIO 0 → 100 kΩ → barramento −', fio:'Trilha branca', cor:C.white,
   liga:[['bus.+','rd1.1'],['rd1.2','esp.GPIO0'],['esp.GPIO0','rd2.1'],['rd2.2','bus.-']]},
  {n:13, de:'ESP32 GPIO 1', para:'Botão de pareamento; outro lado no barramento −', fio:'Trilha cinza', cor:C.gray, liga:[['esp.GPIO1','bt.1'],['bt.2','bus.-']]},
  {grupo:'Na placa: choque (trilha reforçada)'},
  {n:14, de:'Fonte do MOSFET A (pino da direita)', para:'Dreno do MOSFET B (pino do meio)', fio:'Trilha preta grossa', cor:C.black, destaque:true, liga:[['ma.S','mb.D']]},
  {n:15, de:'Fonte do MOSFET B', para:'Barramento −', fio:'Trilha preta grossa', cor:C.black, liga:[['mb.S','bus.-']]},
  {grupo:'Fios soltos (só 10)'},
  {n:16, de:'USB-C +', para:'TP4056 IN+', fio:'Vermelho', cor:C.red, liga:[['usb.+','tp.IN+']]},
  {n:17, de:'USB-C −', para:'TP4056 IN−', fio:'Preto', cor:C.black, liga:[['usb.-','tp.IN-']]},
  {n:18, de:'Bateria +', para:'TP4056 B+ (sobe pelo furo BAT da placa)', fio:'Vermelho', cor:C.red, liga:[['bat.+','tp.B+']]},
  {n:19, de:'Bateria −', para:'TP4056 B− (sobe pelo furo BAT da placa)', fio:'Preto', cor:C.black, liga:[['bat.-','tp.B-']]},
  {n:20, de:'TP4056 OUT+', para:'Chave, pino 1', fio:'Vermelho grosso', cor:C.red, liga:[['tp.OUT+','chave.1']]},
  {n:21, de:'Chave, pino 2', para:'Pad CHAVE do barramento +', fio:'Vermelho grosso', cor:C.red, liga:[['chave.2','placa.CHAVE']]},
  {n:22, de:'Pad AT+', para:'Módulo de alta tensão, entrada +', fio:'Vermelho grosso', cor:C.red, liga:[['placa.AT+','at.IN+']]},
  {n:23, de:'Módulo de alta tensão, entrada −', para:'Aba do MOSFET A (dreno), com terminal olhal no furo da aba', fio:'Preto grosso', cor:C.black, liga:[['at.IN-','ma.D']]},
  {n:24, de:'Saídas do módulo de alta tensão', para:'Terminais olhal dos dois parafusos de inox', fio:'Fio do módulo, curto', cor:C.hv, liga:[['at.OUT1','p1.1'],['at.OUT2','p2.1']]},
];

const REDES = {
  'USB +':                 ['usb.+','tp.IN+'],
  'USB −':                 ['usb.-','tp.IN-'],
  'Bateria +':             ['bat.+','tp.B+'],
  'Bateria −':             ['bat.-','tp.B-'],
  'Saída do carregador':   ['tp.OUT+','chave.1'],
  'Barramento +':          ['bus.+','placa.CHAVE','placa.AT+','chave.2','esp.5V','cap.+','at.IN+','rd1.1'],
  'Barramento −':          ['bus.-','tp.OUT-','esp.GND','cap.-','rx.GND','rpa.2','rpb.2','q.E','rd2.2','bt.2','mb.S'],
  '3,3 V':                 ['esp.3V3','rx.VCC','bz.+'],
  'Dados do rádio':        ['rx.DATA','esp.GPIO3'],
  'Antena':                ['rx.ANT','ant.1'],
  'GPIO 4':                ['esp.GPIO4','rga.1'],
  'Porta do MOSFET A':     ['rga.2','ma.G','rpa.1'],
  'GPIO 6':                ['esp.GPIO6','rgb.1'],
  'Porta do MOSFET B':     ['rgb.2','mb.G','rpb.1'],
  'GPIO 5':                ['esp.GPIO5','rb.1'],
  'Base do BC547':         ['rb.2','q.B'],
  'Buzzer −':              ['q.C','bz.-'],
  'Medição da bateria':    ['rd1.2','rd2.1','esp.GPIO0'],
  'Botão':                 ['esp.GPIO1','bt.1'],
  'Negativo do módulo':    ['at.IN-','ma.D'],
  'Entre os MOSFETs':      ['ma.S','mb.D'],
  'Alta tensão 1':         ['at.OUT1','p1.1'],
  'Alta tensão 2':         ['at.OUT2','p2.1'],
};

// Onde cada perna entra. A protoboard de 830 pontos tem 63 colunas, linhas
// a até j e quatro trilhas de + e −. A placa ilhada é medida quando chegar.
const LAYOUT = {
  protoboard: {colunas:63, linhas:'abcdefghij', pecas:{}, jumpers:[]},
  placa:      {colunas:null, linhas:null, pecas:{}, pontes:[], fios:[]},
};

// Junta as ligações da tabela e devolve os grupos de pernas que ficam ligadas.
function redesDasLigacoes(ligacoes = LIGACOES) {
  const pai = {};
  const raiz = x => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const add = x => { if (!(x in pai)) pai[x] = x; };
  ligacoes.forEach(l => (l.liga || []).forEach(([a, b]) => { add(a); add(b); pai[raiz(a)] = raiz(b); }));
  const grupos = {};
  Object.keys(pai).forEach(x => { const r = raiz(x); (grupos[r] = grupos[r] || []).push(x); });
  return Object.values(grupos).map(g => g.sort());
}

// Confere a tabela contra o esquema. Devolve a lista de problemas (vazia = tudo certo).
function conferirCircuito() {
  const prob = [];
  const existe = ref => { const [p, n] = ref.split('.'); return PECAS[p] && PECAS[p].pinos && (n in PECAS[p].pinos); };
  LIGACOES.forEach(l => (l.liga || []).forEach(par => par.forEach(ref => { if (!existe(ref)) prob.push(`Linha ${l.n}: a perna ${ref} não existe`); })));
  Object.entries(REDES).forEach(([nome, g]) => g.forEach(ref => { if (!existe(ref)) prob.push(`Rede ${nome}: a perna ${ref} não existe`); }));
  const chave = g => g.slice().sort().join(' ');
  const daTabela = new Set(redesDasLigacoes().map(chave));
  const doEsquema = new Set(Object.values(REDES).map(chave));
  Object.entries(REDES).forEach(([nome, g]) => { if (!daTabela.has(chave(g))) prob.push(`A tabela não forma a rede "${nome}" do jeito do esquema`); });
  redesDasLigacoes().forEach(g => { if (!doEsquema.has(chave(g))) prob.push(`A tabela forma uma ligação que o esquema não tem: ${g.join(', ')}`); });
  return prob;
}

if (typeof window !== 'undefined') window.CIRCUITO = { PECAS, LIGACOES, REDES, LAYOUT, redesDasLigacoes, conferirCircuito };
if (typeof module !== 'undefined') module.exports = { PECAS, LIGACOES, REDES, LAYOUT, redesDasLigacoes, conferirCircuito };
