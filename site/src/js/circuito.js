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
  rx:    {nome:'Receptor RXB6', pinos:{VCC:'alimentação', GND:'negativo', DATA:'dados', DATA2:'dados (repetido)', ANT:'antena'}, internas:[['DATA','DATA2']]},
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
  // só na bancada
  led:   {nome:'LED de teste (no lugar do módulo)', pinos:{A:'perna comprida (+)', K:'perna curta (−)'}},
  r220:  {nome:'Resistor de 220 Ω do LED de teste', valor:220, pinos:{'1':'perna 1', '2':'perna 2'}},
  bloco: {nome:'Bateria com carregador e chave', pinos:{'+':'fio vermelho (depois da chave)', '-':'fio preto'}},
  // só na placa ilhada (não ligam nada sozinhos, só seguram o ESP32 e o RXB6)
  soqE:  {nome:'Soquete de 8 pinos (lado esquerdo do ESP32)', mecanica:true, pinos:{s0:'',s1:'',s2:'',s3:'',s4:'',s5:'',s6:'',s7:''}},
  soqD:  {nome:'Soquete de 8 pinos (lado direito do ESP32)', mecanica:true, pinos:{s0:'',s1:'',s2:'',s3:'',s4:'',s5:'',s6:'',s7:''}},
  soqR:  {nome:'Soquete de 4 pinos (RXB6)', mecanica:true, pinos:{s0:'',s1:'',s2:'',s3:''}},
};
Object.assign(PECAS.esp.pinos, {GPIO2:'livre', '21':'livre', '20':'livre', '10':'livre', '9':'livre', '8':'LED da placa', '7':'livre'});

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

// ---------------------------------------------------------------------
//  FORMAS: onde fica cada perna das peças rígidas, em passos de 2,54 mm,
//  com a peça na posição "rot 0". rot gira de 90 em 90 graus.
// ---------------------------------------------------------------------
const FORMAS = {
  esp:    {pinos:[['GPIO0',0,0],['GPIO1',1,0],['GPIO2',2,0],['GPIO3',3,0],['GPIO4',4,0],['3V3',5,0],['GND',6,0],['5V',7,0],
                  ['21',0,6],['20',1,6],['10',2,6],['9',3,6],['8',4,6],['7',5,6],['GPIO6',6,6],['GPIO5',7,6]]},
  rx:     {pinos:[['VCC',0,0],['DATA',0,1],['DATA2',0,2],['GND',0,3]]},
  to220:  {pinos:[['G',0,0],['D',1,0],['S',2,0]]},
  to92:   {pinos:[['C',0,0],['B',1,0],['E',2,0]]},
  buzzer: {pinos:[['+',0,0],['-',3,0]]},
  tp:     {pinos:[['B+',0,0],['B-',0,1],['OUT+',0,3],['OUT-',0,4]]},
  soq8:   {pinos:[0,1,2,3,4,5,6,7].map(i => ['s'+i,0,i])},
  soq4:   {pinos:[0,1,2,3].map(i => ['s'+i,0,i])},
};
const ROT = {0:(x,y)=>[x,y], 90:(x,y)=>[-y,x], 180:(x,y)=>[-x,-y], 270:(x,y)=>[y,-x]};

// Onde cada perna entra. Protoboard de 830 pontos: colunas 1 a 63, linhas
// a até j e quatro trilhas (T+ e T− em cima, B− e B+ embaixo).
// Placa ilhada 7 × 9 cm: 24 colunas (0 a 23) por 30 linhas (0 a 29), furo "coluna,linha".
// A placa ainda precisa ser conferida com as peças reais (medidas dos anúncios).
const LAYOUT = {
  protoboard: {
    tipo:'protoboard', colunas:63,
    pecas: {
      bloco: {pernas:{'+':'T+1', '-':'T-1'}, fora:true},
      esp:   {forma:'esp', ancora:'d5', rot:0},
      cap:   {pernas:{'+':'b12', '-':'b11'}},
      rx:    {forma:'rx', ancora:'c20', rot:270, empe:true},
      bz:    {forma:'buzzer', ancora:'g40', rot:0},
      q:     {forma:'to92', ancora:'i43', rot:0},
      rb:    {pernas:{'1':'h48', '2':'h44'}},
      rd1:   {pernas:{'1':'T+5', '2':'a5'}},
      rd2:   {pernas:{'1':'c5', '2':'T-3'}},
      bt:    {pernas:{'1':'a6', '2':'T-7'}},
      ma:    {forma:'to220', ancora:'c30', rot:0},
      rga:   {pernas:{'1':'b26', '2':'b30'}},
      rpa:   {pernas:{'1':'a30', '2':'T-31'}},
      mb:    {forma:'to220', ancora:'g36', rot:0},
      rgb:   {pernas:{'1':'h33', '2':'h36'}},
      rpb:   {pernas:{'1':'j36', '2':'B-35'}},
      r220:  {pernas:{'1':'T+28', '2':'a28'}},
      led:   {pernas:{A:'b28', K:'b29'}},
    },
    jumpers: [
      {id:'jT', de:'T-2',  para:'B-2',  cor:'#2b2b2b', nome:'trilha − de cima com a de baixo'},
      {id:'j5V', de:'a12', para:'T+13', cor:'#d4483b', nome:'5V do ESP32 → trilha +'},
      {id:'jGND', de:'a11', para:'T-11', cor:'#2b2b2b', nome:'GND do ESP32 → trilha −'},
      {id:'jRV', de:'a10', para:'a20', cor:'#e58a2b', nome:'3V3 → VCC do RXB6'},
      {id:'jRD', de:'b8',  para:'b21', cor:'#e2b533', nome:'GPIO 3 → DATA do RXB6'},
      {id:'jRG', de:'a23', para:'T-23', cor:'#2b2b2b', nome:'GND do RXB6 → trilha −'},
      {id:'jBZ', de:'b10', para:'f40', cor:'#e58a2b', nome:'3V3 → + do buzzer'},
      {id:'jQE', de:'j45', para:'B-45', cor:'#2b2b2b', nome:'emissor do BC547 → trilha −'},
      {id:'jG5', de:'j12', para:'j48', cor:'#3a78c2', nome:'GPIO 5 → resistor de 1 kΩ'},
      {id:'jG4', de:'c9',  para:'c26', cor:'#3a9a5b', nome:'GPIO 4 → resistor de 100 Ω'},
      {id:'jG6', de:'j11', para:'j33', cor:'#3a9a5b', nome:'GPIO 6 → resistor de 100 Ω'},
      {id:'jAB', de:'d32', para:'f37', cor:'#2b2b2b', nome:'fonte do MOSFET A → dreno do B'},
      {id:'jBS', de:'j38', para:'B-38', cor:'#2b2b2b', nome:'fonte do MOSFET B → trilha −'},
      {id:'jLD', de:'a29', para:'a31', cor:'#7a3fb0', nome:'LED de teste → dreno do MOSFET A'},
    ],
  },
  placa: {
    tipo:'placa', colunas:24, linhas:30,
    pecas: {
      soqE:  {forma:'soq8', ancora:'2,9', rot:0},
      soqD:  {forma:'soq8', ancora:'8,9', rot:0},
      soqR:  {forma:'soq4', ancora:'12,3', rot:0},
      tp:    {forma:'tp', ancora:'9,23', rot:0},
      rd2:   {pernas:{'1':'9,8', '2':'12,8'}},
      rd1:   {pernas:{'1':'13,9', '2':'10,9'}},
      rb:    {pernas:{'1':'17,10', '2':'21,10'}},
      bt:    {pernas:{'1':'10,11', '2':'13,11'}},
      rga:   {pernas:{'1':'11,13', '2':'14,13'}},
      rpa:   {pernas:{'1':'14,14', '2':'14,17'}},
      rgb:   {pernas:{'1':'10,19', '2':'13,19'}},
      rpb:   {pernas:{'1':'14,20', '2':'14,23'}},
      q:     {forma:'to92', ancora:'20,8', rot:0},
      cap:   {pernas:{'+':'9,17', '-':'9,15'}},
      bz:    {forma:'buzzer', ancora:'23,4', rot:180},
      ma:    {forma:'to220', ancora:'15,13', rot:90, deitado:true},
      mb:    {forma:'to220', ancora:'15,19', rot:90, deitado:true},
      esp:   {forma:'esp', ancora:'8,9', rot:90, encaixa:true},
      rx:    {forma:'rx', ancora:'12,3', rot:0, encaixa:true},
    },
    // pontos de referência da tabela de ligações
    pontos: {'placa.CHAVE':'11,28', 'placa.AT+':'20,28', 'bus.+':'15,28', 'bus.-':'18,26'},
    // pontes: estanho ou perna de componente por baixo, ligando furos vizinhos
    pontes: [
      {id:'pBm', furos:['10,26','11,26','12,26','13,26','14,26','15,26','16,26','17,26','18,26','19,26','20,26','21,26','22,26'], nome:'barramento −', linha:2},
      {id:'pBp', furos:['11,28','12,28','13,28','14,28','15,28','16,28','17,28','18,28','19,28','20,28'], nome:'barramento + (pads CHAVE e AT+ nas pontas)', linha:1},
      {id:'pTP', furos:['9,27','10,27','10,26'], nome:'TP4056 OUT− → barramento −', linha:3},
      {id:'pC1', furos:['8,15','9,15'], nome:'GND do ESP32 → − do capacitor', linha:5},
      {id:'pC2', furos:['8,16','8,17','9,17'], nome:'5V do ESP32 → + do capacitor', linha:5},
      {id:'pDV', furos:['8,9','9,9','10,9','9,8'], nome:'GPIO 0 → meio do divisor', linha:12},
      {id:'pBT', furos:['8,10','9,10','9,11','10,11'], nome:'GPIO 1 → botão', linha:13},
      {id:'pG4', furos:['8,13','9,13','10,13','11,13'], nome:'GPIO 4 → resistor de 100 Ω', linha:9},
      {id:'pGA', furos:['15,13','14,13','14,14'], nome:'porta do MOSFET A', linha:9},
      {id:'pGB', furos:['13,19','14,19','15,19','14,20'], nome:'porta do MOSFET B', linha:10},
      {id:'pRB', furos:['14,23','14,24','14,25','14,26'], nome:'10 kΩ da porta B → barramento −', linha:10},
      {id:'pAB', furos:['15,15','16,15','17,15','17,16','17,17','17,18','17,19','17,20','16,20','15,20'], nome:'fonte do A → dreno do B (grossa)', linha:14, grossa:true},
      {id:'pBS', furos:['15,21','15,22','15,23','15,24','15,25','15,26'], nome:'fonte do B → barramento − (grossa)', linha:15, grossa:true},
      {id:'pBZ', furos:['20,4','20,5','20,6','20,7','20,8'], nome:'− do buzzer → coletor do BC547', linha:11},
      {id:'pQB', furos:['21,8','21,9','21,10'], nome:'base do BC547 → resistor de 1 kΩ', linha:11},
      {id:'pQE', furos:['22,8','22,9'], nome:'emissor do BC547', linha:11},
    ],
    // fios encapados por baixo, de um furo a outro
    fios: [
      {id:'f5V', de:'9,17', para:'12,28', cor:'#d4483b', nome:'5V do ESP32 → barramento +', linha:4},
      {id:'fGN', de:'9,15', para:'11,26', cor:'#2b2b2b', nome:'GND do ESP32 → barramento −', linha:4},
      {id:'fD1', de:'13,9', para:'13,28', cor:'#f2f2f2', nome:'100 kΩ de cima → barramento +', linha:12},
      {id:'fD2', de:'12,8', para:'12,26', cor:'#2b2b2b', nome:'100 kΩ de baixo → barramento −', linha:12},
      {id:'fBT', de:'13,11', para:'13,26', cor:'#9a9a9a', nome:'botão → barramento −', linha:13},
      {id:'fRG', de:'12,6', para:'16,26', cor:'#2b2b2b', nome:'GND do RXB6 → barramento −', linha:7},
      {id:'fPA', de:'14,17', para:'17,26', cor:'#2b2b2b', nome:'10 kΩ da porta A → barramento −', linha:9},
      {id:'fQE', de:'22,9', para:'22,26', cor:'#2b2b2b', nome:'emissor do BC547 → barramento −', linha:11},
      {id:'fRV', de:'8,14', para:'12,3', cor:'#e58a2b', nome:'3V3 → VCC do RXB6', linha:6},
      {id:'fBZ', de:'12,3', para:'23,4', cor:'#e58a2b', nome:'3V3 → + do buzzer', linha:6},
      {id:'fRD', de:'8,12', para:'12,4', cor:'#e2b533', nome:'GPIO 3 → DATA do RXB6', linha:7},
      {id:'fG5', de:'2,16', para:'17,10', cor:'#3a78c2', nome:'GPIO 5 → resistor de 1 kΩ', linha:11},
      {id:'fG6', de:'2,15', para:'10,19', cor:'#3a9a5b', nome:'GPIO 6 → resistor de 100 Ω', linha:10},
    ],
    // fios que saem da placa (os 10 fios soltos)
    soltos: [
      ['P:bat.+','H:9,23'], ['P:bat.-','H:9,24'], ['P:usb.+','P:tp.IN+'], ['P:usb.-','P:tp.IN-'],
      ['H:9,26','P:chave.1'], ['P:chave.2','H:11,28'], ['H:20,28','P:at.IN+'], ['P:at.IN-','P:ma.D'],
      ['P:at.OUT1','P:p1.1'], ['P:at.OUT2','P:p2.1'], ['P:rx.ANT','P:ant.1'],
    ],
  },
};

// O que a protoboard tem que formar quando estiver completa (com o LED no lugar do módulo).
const REDES_BANCADA = {
  'Barramento +':       ['bloco.+','esp.5V','cap.+','rd1.1','r220.1'],
  'Barramento −':       ['bloco.-','esp.GND','cap.-','rx.GND','rpa.2','rpb.2','q.E','rd2.2','bt.2','mb.S'],
  '3,3 V':              ['esp.3V3','rx.VCC','bz.+'],
  'Dados do rádio':     ['rx.DATA','esp.GPIO3'],
  'GPIO 4':             ['esp.GPIO4','rga.1'],
  'Porta do MOSFET A':  ['rga.2','ma.G','rpa.1'],
  'GPIO 6':             ['esp.GPIO6','rgb.1'],
  'Porta do MOSFET B':  ['rgb.2','mb.G','rpb.1'],
  'GPIO 5':             ['esp.GPIO5','rb.1'],
  'Base do BC547':      ['rb.2','q.B'],
  'Buzzer −':           ['q.C','bz.-'],
  'Medição da bateria': ['rd1.2','rd2.1','esp.GPIO0'],
  'Botão':              ['esp.GPIO1','bt.1'],
  'LED de teste':       ['r220.2','led.A'],
  'Dreno do MOSFET A':  ['led.K','ma.D'],
  'Entre os MOSFETs':   ['ma.S','mb.D'],
};

// ---------------------------------------------------------------------
//  Geometria dos furos
// ---------------------------------------------------------------------
const LINHA_Y = {a:0,b:1,c:2,d:3,e:4,f:7,g:8,h:9,i:10,j:11};
const TRILHA_Y = {'T-':-3.4,'T+':-2.4,'B-':13.4,'B+':14.4};
function furoXY(tipo, id) {
  if (tipo === 'placa') { const [c, r] = id.split(',').map(Number); return [c, r]; }
  const m = /^([TB][+-])(\d+)$/.exec(id);
  if (m) return [+m[2], TRILHA_Y[m[1]]];
  return [+id.slice(1), LINHA_Y[id[0]]];
}
function furoValido(tipo, id) {
  if (tipo === 'placa') { const m = /^(\d+),(\d+)$/.exec(id); return !!m && +m[1] < 24 && +m[2] < 30; }
  const m = /^([TB][+-])(\d+)$/.exec(id);
  if (m) return +m[2] >= 1 && +m[2] <= 63 && +m[2] % 6 !== 0;
  return /^[a-j]([1-9]|[1-5]\d|6[0-3])$/.test(id);
}
function todosFuros(tipo) {
  const f = [];
  if (tipo === 'placa') { for (let r = 0; r < 30; r++) for (let c = 0; c < 24; c++) f.push(c + ',' + r); return f; }
  for (let c = 1; c <= 63; c++) { 'abcdefghij'.split('').forEach(l => f.push(l + c)); if (c % 6) ['T-','T+','B-','B+'].forEach(t => f.push(t + c)); }
  return f;
}
// Furo mais perto de um ponto (em passos de 2,54 mm). null se longe demais.
function furoPerto(tipo, x, y, max = 0.45) {
  let melhor = null, d = max * max;
  todosFuros(tipo).forEach(id => { const [fx, fy] = furoXY(tipo, id); const dd = (fx - x) ** 2 + (fy - y) ** 2; if (dd < d) { d = dd; melhor = id; } });
  return melhor;
}
// Tira de ligação interna da protoboard (cada furo de uma tira é ligado aos outros).
function tiraDoFuro(id) {
  const m = /^([TB][+-])\d+$/.exec(id);
  if (m) return 'trilha ' + m[1];
  const c = id.slice(1);
  return 'abcde'.includes(id[0]) ? 'coluna ' + c + ' (a-e)' : 'coluna ' + c + ' (f-j)';
}
// Pernas de uma peça num layout: {pino: furo}
function pinosDaPeca(layout, id, ancora, rot) {
  const p = layout.pecas[id];
  if (p.pernas) return Object.assign({}, p.pernas);
  const forma = FORMAS[p.forma];
  const [ax, ay] = furoXY(layout.tipo, ancora || p.ancora);
  const r = ROT[rot === undefined ? p.rot : rot];
  const out = {};
  forma.pinos.forEach(([nome, ox, oy]) => {
    const [dx, dy] = r(ox, oy);
    out[nome] = furoPerto(layout.tipo, ax + dx, ay + dy, 0.2);
  });
  return out;
}

// Junta tudo que fica ligado por fio, ponte, tira da protoboard ou perna no furo.
// opcoes.pecas: lista de peças que entram (padrão: todas). opcoes.soldados: furos soldados (placa).
function redeDoLayout(layout, opcoes = {}) {
  const pai = {};
  const raiz = x => { if (!(x in pai)) pai[x] = x; while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const une = (a, b) => { pai[raiz(a)] = raiz(b); };
  const pecas = opcoes.pecas || Object.keys(layout.pecas);
  const soldado = f => layout.tipo !== 'placa' || !opcoes.soldados || opcoes.soldados.has(f);
  if (layout.tipo === 'protoboard') todosFuros('protoboard').forEach(f => une('H:' + f, 'T:' + tiraDoFuro(f)));
  pecas.forEach(id => {
    if (!layout.pecas[id]) return;
    const pin = pinosDaPeca(layout, id);
    Object.entries(pin).forEach(([n, f]) => { raiz('P:' + id + '.' + n); if (f && !layout.pecas[id].fora && soldado(f)) une('P:' + id + '.' + n, 'H:' + f); else if (f && layout.pecas[id].fora) une('P:' + id + '.' + n, 'H:' + f); });
    ((PECAS[id] && PECAS[id].internas) || []).forEach(([a, b]) => une('P:' + id + '.' + a, 'P:' + id + '.' + b));
  });
  (opcoes.jumpers || layout.jumpers || []).forEach(j => une('H:' + j.de, 'H:' + j.para));
  (opcoes.pontes || layout.pontes || []).forEach(p => p.furos.forEach(f => une('H:' + p.furos[0], 'H:' + f)));
  (opcoes.fios || layout.fios || []).forEach(j => une('H:' + j.de, 'H:' + j.para));
  if (!opcoes.semSoltos) (layout.soltos || []).forEach(([a, b]) => une(a, b));
  Object.entries(layout.pontos || {}).forEach(([p, f]) => une('P:' + p, 'H:' + f));
  return { raiz, une, pai };
}
// Grupos de pernas ligadas (só pernas de peças elétricas, sem soquetes).
function gruposDePernas(rede) {
  const g = {};
  Object.keys(rede.pai).forEach(x => {
    if (!x.startsWith('P:')) return;
    const ref = x.slice(2), peca = ref.split('.')[0];
    if (PECAS[peca] && PECAS[peca].mecanica) return;
    const r = rede.raiz(x); (g[r] = g[r] || []).push(ref);
  });
  return Object.values(g).map(a => a.sort());
}
// Confere um layout contra as redes esperadas. Devolve a lista de problemas.
function conferirLayout(layout, esperado, opcoes) {
  const prob = [];
  const expandir = g => { const s = new Set(g); g.forEach(ref => { const [p, n] = ref.split('.'); ((PECAS[p] && PECAS[p].internas) || []).forEach(([a, b]) => { if (n === a) s.add(p + '.' + b); if (n === b) s.add(p + '.' + a); }); }); return [...s].sort(); };
  const chave = g => g.join(' ');
  const formados = gruposDePernas(redeDoLayout(layout, opcoes)).filter(g => g.length > 1);
  const setF = new Set(formados.map(chave));
  const esp = Object.entries(esperado).map(([n, g]) => [n, expandir(g)]);
  const setE = new Set(esp.map(([, g]) => chave(g)));
  esp.forEach(([n, g]) => { if (!setF.has(chave(g))) prob.push('Não forma "' + n + '" do jeito do esquema'); });
  formados.forEach(g => { if (!setE.has(chave(g))) prob.push('Ligação a mais ou errada: ' + g.join(', ')); });
  // furo usado por duas peças
  const uso = {};
  Object.keys(layout.pecas).forEach(id => { if (PECAS[id] && PECAS[id].mecanica) return; if (layout.pecas[id].encaixa) return; Object.values(pinosDaPeca(layout, id)).forEach(f => { if (!f) prob.push('Peça ' + id + ' com perna fora da placa'); else { if (uso[f]) prob.push('Furo ' + f + ' usado por ' + uso[f] + ' e ' + id); uso[f] = id; } }); });
  return prob;
}

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

const _CIRC = { PECAS, LIGACOES, REDES, REDES_BANCADA, LAYOUT, FORMAS, ROT, furoXY, furoValido, todosFuros, furoPerto, tiraDoFuro, pinosDaPeca, redeDoLayout, gruposDePernas, conferirLayout, redesDasLigacoes, conferirCircuito };
if (typeof window !== 'undefined') window.CIRCUITO = _CIRC;
if (typeof module !== 'undefined') module.exports = _CIRC;
