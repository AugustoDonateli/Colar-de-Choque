/* ---------- firmware: o que está na aba Firmware ----------
   Mesmo conteúdo do firmware/coleira/README.md do repositório.
   Mudou o firmware? Atualize os dois. */
const REPO = 'https://github.com/AugustoDonateli/Colar-de-Choque';
const FW = {
  versao: 'v0.1',
  situacao: 'Compila sem nenhum aviso e passou em 44 conferências numa simulação no computador. Ainda não rodou numa placa de verdade.',
  pasta: REPO + '/tree/main/firmware/coleira',
  zip: REPO + '/archive/refs/heads/main.zip',
};

const FW_BOTOES = [
  ['A', 'Só bipe de 0,5 s'],
  ['B', 'Bipe de 0,3 s, 0,2 s de silêncio, choque fraco: 0,5 s em pulsos de 30 ms ligado e 70 ms desligado'],
  ['C', 'Mesma coisa, choque médio: pulsos de 70 ms ligado e 30 ms desligado'],
  ['D', 'Mesma coisa, choque forte: 1 s direto'],
];

const FW_REGRAS = [
  'Nenhum choque passa de 1 s.',
  'Do fim de um choque até o próximo: pelo menos 3 s. Apertou antes, o aperto é ignorado.',
  'No máximo 5 s de choque somados em 1 minuto.',
  'Bateria abaixo de 3,3 V: choque bloqueado (3 bipes curtos ao apertar).',
  'Com USB ligado no ESP32: a sequência roda e aparece no Monitor Serial, mas os MOSFETs não ligam (choque simulado).',
  'Bloqueio por pausa ou por limite não apita, para o boi não ouvir o aviso sem nada acontecer depois.',
  'Segurar o botão vale como um aperto só.',
];

const FW_CAMADAS = [
  'O programa desliga os MOSFETs no fim do tempo do nível.',
  'Fora do choque, o programa força os dois MOSFETs desligados o tempo todo.',
  'Corte duro: um timer separado desliga os dois no tempo do nível + 30 ms, mesmo se o programa principal atrasar.',
  'Watchdog: se o programa travar, a placa reinicia em 2 s. Os resistores de 10 kΩ seguram os MOSFETs desligados.',
  'Dois MOSFETs em série: um queimado em curto sozinho não dá choque.',
];

const FW_BIPES = [
  ['Ligou com bateria boa (ou no USB)', '1 bipe curto e LED aceso por 1 s'],
  ['Ligou com bateria baixa (menos de 3,5 V)', '2 bipes curtos'],
  ['Ligou com bateria no fim (menos de 3,3 V)', '3 bipes curtos'],
  ['Entrou no pareamento', '2 bipes curtos, LED piscando rápido'],
  ['Aprendeu um botão no pareamento', '1 bipe para A, 2 para B, 3 para C, 4 para D'],
  ['Controle salvo', '1 bipe longo'],
  ['Pareamento cancelado ou memória cheia', '3 bipes longos'],
  ['Apagou todos os controles', '5 bipes bem rápidos'],
  ['Apertou B, C ou D com bateria no fim', '3 bipes curtos, sem choque'],
  ['Bateria esgotada, desligando', '3 bipes longos'],
];

const FW_LED = [
  ['1 piscadinha a cada 3 s', 'Ligada, tudo certo'],
  ['2 piscadinhas a cada 3 s', 'Bateria baixa ou no fim'],
  ['Piscando rápido', 'Pareamento'],
  ['Aceso direto', 'USB ligado (choque só simulado)'],
  ['Piscando devagar', 'Modo bancada'],
  ['Aceso durante o choque', 'Choque saindo de verdade'],
];

const FW_COMANDOS = [
  ['ajuda', 'Lista os comandos'],
  ['estado', 'Bateria, estado do choque, quanto do limite do minuto já foi usado, controles, motivo do último reinício'],
  ['contador', 'Bipes, choques de cada nível, tempo total, apertos ignorados e reinícios'],
  ['zerar contador', 'Pede confirmação. Para zerar mesmo: zerar contador sim'],
  ['controles', 'Lista os controles e os códigos de cada botão'],
  ['apagar controles', 'Pede confirmação: apagar controles sim'],
  ['parear', 'Entra no pareamento'],
  ['ouvir', 'Liga e desliga: mostra todo código que o RXB6 recebe'],
  ['bipe', 'Toca um bipe'],
  ['calibrar 4870', 'Corrige a leitura da bateria com o valor do multímetro, em milivolts'],
  ['bancada', 'Com USB ligado, deixa os MOSFETs funcionarem. Só com LED no lugar do módulo'],
  ['testar watchdog', 'Trava o programa de propósito. A placa tem que reiniciar em uns 2 s'],
  ['reiniciar', 'Reinicia a placa'],
];

const FW_GRAVAR = [
  'Instale a <b>Arduino IDE 2</b> (arduino.cc/en/software).',
  '<b>Arquivo → Preferências</b>. Em "URLs adicionais para Gerenciadores de Placas", cole <code>https://espressif.github.io/arduino-esp32/package_esp32_index.json</code>.',
  '<b>Ferramentas → Placa → Gerenciador de placas</b>: instale <b>esp32 by Espressif Systems</b>, versão 3.3 ou mais nova.',
  '<b>Ferramentas → Gerenciar bibliotecas</b>: instale <b>rc-switch</b>, do sui77.',
  'Baixe o firmware pelo botão "Baixar do GitHub", no alto desta aba, descompacte e abra <code>firmware/coleira/coleira.ino</code>. A pasta precisa se chamar <code>coleira</code>.',
  'Em Ferramentas: placa <b>ESP32C3 Dev Module</b>, <b>USB CDC On Boot: Enabled</b>, e a porta que aparecer.',
  'Com a <b>chave da coleira desligada</b>, ligue o USB e clique em Carregar. Se der erro de conexão: segure BOOT, aperte e solte RESET, solte BOOT e tente de novo.',
  'Monitor Serial em <b>115200</b> e <b>Nova linha</b>. Digite <code>ajuda</code>.',
];

// Roteiro de teste. Cada item vira uma caixinha que fica salva.
const FW_ROTEIRO = [
  {t:'Etapa A: só o ESP32 no USB', itens:[
    'Grave e abra o Monitor Serial. Aparece "Coleira v0.1 ligada".',
    'O LED fica aceso direto (USB). Se ficar ao contrário, mude LED_ACENDE_EM_LOW para false no config.h.',
    '"estado" responde. Sem o divisor ligado, a bateria mostra um número qualquer. É normal nesta etapa.',
    '"testar watchdog": a placa reinicia sozinha e "estado" mostra "Último reinício: watchdog".',
  ]},
  {t:'Etapa B: buzzer (BC547 no GPIO 5)', itens:[
    '"bipe" apita.',
    'O buzzer fica quieto ao ligar, fora o bipe de início. Se chiar, ponha 10 kΩ entre a base do BC547 e o GND.',
  ]},
  {t:'Etapa C: receptor RXB6 (DATA no GPIO 3)', itens:[
    '"ouvir" e aperte os botões: cada botão mostra um código diferente, repetido enquanto você segura.',
    'Linhas "(ignorado: ruído)" sem apertar nada são normais, desde que sejam códigos curtos.',
    'Anote os códigos dos dois controles e digite "ouvir" de novo para desligar.',
  ]},
  {t:'Etapa D: pareamento', itens:[
    '"parear", depois A, B, C e D. Bipe longo no fim.',
    '"controles" mostra os 4 códigos na ordem certa.',
    'Repita com o segundo controle.',
    'Desligue e ligue a placa: "controles" continua mostrando os dois.',
    'Com o botão de pareamento soldado: segure, ligue, solte nos 2 bipes e pareie. Teste segurar 10 s (apaga tudo) e pareie de novo.',
  ]},
  {t:'Etapa E: protoboard com LED no lugar do módulo', itens:[
    'A: só apita, LED de teste apagado.',
    'B: apita, depois o LED pisca rápido por 0,5 s, fraco.',
    'C: igual, mais forte.',
    'D: apita e o LED acende direto por 1 s.',
    'Segurar D por 10 s: um choque só, de 1 s.',
    'B várias vezes seguidas: o LED acende no máximo uma vez a cada 3 s.',
    'D a cada 4 ou 5 s, 7 vezes: só 5 acendem. "contador" mostra os ignorados por limite por minuto.',
    'Controle não pareado: nada acontece.',
    'Teste da ponte no MOSFET A e depois no B: o LED só acende quando você aperta um botão.',
  ]},
  {t:'Etapa F: calibrar a leitura da bateria', itens:[
    'USB ligado e chave desligada: meça com o multímetro entre barramento + e barramento −.',
    'Digite "calibrar" e o valor em milivolts (exemplo: calibrar 4870).',
    '"estado" mostra perto desse valor e "USB ligado".',
    'Se a leitura pular mais de 50 mV entre um "estado" e outro, solde um capacitor de 100 nF entre o GPIO 0 e o GND.',
  ]},
  {t:'Etapa G: módulo de alta tensão na tábua de pregos', itens:[
    'Chave ligada, sem USB, mãos longe. Repita os itens da Etapa E.',
    'Faísca máxima: B pula menos que C, e C menos que D.',
    'Se B e C ficarem iguais, mude os pulsos em NIVEIS no config.h, ou use níveis por tempo (B 300 ms, C 600 ms, D 1000 ms).',
  ]},
  {t:'Etapa H: coleira montada', itens:[
    'Disparo fantasma: 1 hora perto de controles de portão. Depois, "contador": nenhum bipe ou choque a mais.',
    'Interferência: 20 choques seguidos. "contador" sem reinício por queda de tensão ou erro, e "controles" com os dois.',
    'Bateria: ligada até desligar sozinha (3 bipes longos), depois 100 choques com carga cheia.',
    'Antes de entregar: "zerar contador sim".',
  ]},
];
