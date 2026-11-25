/* ---------- lista de compras ---------- */
const AE = 'https://pt.aliexpress.com/w/wholesale-';
const AI = 'https://pt.aliexpress.com/item/';
const ML = 'https://www.mercadolivre.com.br/';
const GROUPS = [
  {id:'ae', t:'AliExpress', s:'Chega em 2 a 4 semanas. Peça primeiro. O imposto (uns 25%) só aparece no fechamento.'},
  {id:'mlc', t:'Mercado Livre: bateria, caixa e fixação', s:'Chega em poucos dias.'},
  {id:'mle', t:'Mercado Livre: eletrônica difícil de achar na cidade', s:'Peças específicas.'},
  {id:'loja', t:'Loja de eletrônica da cidade (avulso)', s:'Leve a lista e peça por unidade. Preços estimados.'},
  {id:'casa', t:'Selaria, armarinho ou o que já tem em casa', s:'Veja antes o que já tem.'},
  {id:'banc', t:'Bancada (compra uma vez só)', s:'Ferramentas para montar e testar.'},
  {id:'opt', t:'Opcionais', s:'Não precisa para a coleira de teste.'}
];
const ITEMS = [
  // AliExpress
  {id:'ae1',g:'ae',n:'Módulo de alta tensão A: cilindro preto',d:'Dá o choque. O modelo mais vendido (mais de 2.000 vendas, nota 4,7), selado em resina, o que ajuda contra umidade. O "400 kV" do anúncio é exagero de vendedor: quem diz a força real é a comparação com o bastão.',v:'cor "400kV" (não pegue o 1000KV)',q:'1',p:14.50,pt:'R$ 14,50',p1:'R$ 8,32',u:AI+'1005005546620479.html'},
  {id:'ae1b',g:'ae',n:'Módulo de alta tensão B: bloco preto 20 kV',d:'O segundo modelo, para comparar com o bastão. Um comprador mediu faísca de 4 mm com 4 V, então deve ser mais fraco que o A. Se o A passar do bastão, este pode ser o certo.',v:'modelo único',q:'1',p:13.52,pt:'R$ 13,52',u:AI+'1005006996173462.html'},
  {id:'ae2',g:'ae',n:'ESP32-C3 SuperMini',d:'O cérebro. Um é reserva. Nota 4,9 com 250 avaliações. Restavam poucas unidades: se esgotar, qualquer "ESP32-C3 SuperMini" com USB-C serve.',v:'cor "ESP32-C3 SuperMini" (não a "Expansion Board"), quantidade 2',q:'2',p:32.28,pt:'R$ 16,14 cada',u:AI+'1005010653281733.html'},
  {id:'ae3',g:'ae',n:'Receptor RXB6 433 MHz',d:'Recebe o sinal do controle. É a plaquinha verde comum e já vem com os pinos soldados. O anúncio só deixa comprar 1 por pessoa nesse preço, então vai sem reserva: se um queimar, o do Mercado Livre (nos opcionais) chega em poucos dias. A antena em mola vem do Mercado Livre.',v:'modelo único, quantidade 1',q:'1',p:10.30,pt:'R$ 10,30',p1:'R$ 6,99',u:AI+'32801947333.html'},
  {id:'ae4',g:'ae',n:'Controle principal: branco comprido, A B C D',d:'Para o peão. O corpo comprido enche a mão, os 4 botões são grandes e ficam em coluna (dá para achar pelo tato, de cima para baixo) e a antena curta ajuda no alcance. É 433 MHz com código EV1527 de fábrica, diferente em cada controle. Não vem pilha: usa a A23 de 12 V, de controle de portão.',v:'cor "ABCD Key", o branco comprido com antena (o primeiro ABCD da lista)',q:'1',p:20.51,pt:'R$ 20,51',p1:'R$ 18,41',u:AI+'1005006282008906.html'},
  {id:'ae4b',g:'ae',n:'Controle reserva: chaveiro fino, A B C D',d:'Também 433 MHz EV1527, com A, B, C e D e 2 pilhas CR2016 inclusas. Mais de 3.000 vendas, nota 4,6. Fica de reserva e serve para comparar: no teste, o peão diz qual prefere e esse vira o padrão das próximas coleiras.',v:'cor "ABCD Key"',q:'1',p:8.99,pt:'R$ 8,99',u:AI+'1005011913090385.html'},
  {id:'ae6',g:'ae',n:'Carregador TP4056 USB-C com proteção',d:'Carrega a bateria e corta a energia se ela descarregar demais ou der curto. É o módulo azul comum, com 3 chips e 6 furos: IN+ e IN− do lado do USB, B+ e B−, OUT+ e OUT−. Nota 4,8 com mais de 1.300 avaliações. Sobram 4 para as próximas e para o caso de queimar um soldando.',v:'cor "5PCS"',q:'pacote com 5',p:12.08,pt:'R$ 12,08',p1:'R$ 6,99',u:AI+'1005009635476640.html'},
  {id:'ae7',g:'ae',n:'Conector USB-C de painel à prova d\'água',d:'Para carregar sem abrir a caixa. Rosqueia na parede e tem tampinha de borracha. Se um carregador USB-C dos dois lados não carregar, é falta do resistor de 5,1 kΩ: use cabo USB-A para USB-C, que sempre carrega, ou solde os 2 resistores de 5,1 kΩ da lista da loja.',v:'cor "2Pin Black", pacote "1Piece"',q:'1',p:17.44,pt:'R$ 17,44',p1:'R$ 8,46',u:AI+'1005012453528943.html'},
  {id:'ae8',g:'ae',n:'Buzzer ativo de 3 V',d:'O bipe antes do choque. Precisa ser o ativo, que apita sozinho com 3 V. O passivo, da mesma página, não serve.',v:'cor "Buzzer Ativo 3V"',q:'pacote com 10',p:11.71,pt:'R$ 11,71',p1:'R$ 6,99',u:AI+'32914327679.html'},
  {id:'ae9',g:'ae',n:'Chave liga/desliga à prova d\'água com capa',d:'Liga e desliga tudo. A capa de borracha veda. Usa o pino do meio e um dos lados. Sobram 4 para as próximas.',v:'cor "3 Pins With Cap", tipo "ON-ON", tamanho "5PCS"',q:'pacote com 5',p:15.73,pt:'R$ 15,73',u:AI+'1005004569494061.html'},
  // ML coleira
  {id:'mc1',g:'mlc',n:'Bateria 18650 Panasonic 3.300 mAh original',d:'A peça mais cara. Fuja de 18650 com "8800 mAh": não existe.',q:'1',p:84.90,pt:'R$ 84,90',u:ML+'bateria-li-ion-36v-3300mah-487a-18650-panasonic-sem-top/up/MLBU3758391289'},
  {id:'mc2',g:'mlc',n:'Suporte para 1 bateria 18650',d:'Não solde direto na bateria.',q:'1',p:12.94,pt:'R$ 12,94',u:ML+'suporte-para-uma-bat-18650-true-hole-com-pinos/up/MLBU1732105640'},
  {id:'mc3',g:'mlc',n:'Caixa hermética 10 × 10 × 7 cm, tampa transparente',d:'IP66. Pela tampa dá para ver o LED do ESP32 e as luzes do carregador sem abrir. Se errar um furo, compre outra.',q:'1',p:28.97,pt:'R$ 28,97',u:ML+'caixa-de-passagem-multitoc-cinza-10x10x7cm-tampa-transparente-cftv-ip66/p/MLB23972265'},
  {id:'mc4',g:'mlc',n:'Porca cega inox M4 (10 peças)',d:'Os pinos que encostam no couro.',q:'1',p:28.99,pt:'R$ 28,99',u:ML+'porca-calota-cega-inox-m4-com-10-pecas/up/MLBU1711250929'},
  {id:'mc5',g:'mlc',n:'Parafuso inox M4 × 16 mm Allen (10 peças)',d:'Passa pelo fundo da caixa e segura a porca cega.',q:'1',p:19.10,pt:'R$ 19,10',u:ML+'10-parafuso-m4-x-16-allen-cilindrica-inox-a2-din-912/p/MLB2112368257'},
  {id:'mc6',g:'mlc',n:'Fivela de engate rápido 50 mm (10 peças)',d:'Fecha a coleira. Nota 4,9 com 79 avaliações. Confira que é 50 mm por dentro, a mesma largura da fita.',q:'1',p:19.89,pt:'R$ 19,89',u:ML+'fecho-para-alca-de-mochila-50mm-engate-rapido-full-10-pcs/p/MLB2115555277'},
  // ML eletronica
  {id:'me1',g:'mle',n:'MOSFET IRLZ44N (3 peças)',d:'As duas chaves do choque, em série. Uma é reserva. Precisa ser IRLZ44N, com L: o IRFZ44N, com F, é parecido e mais fácil de achar, mas não liga direito com os 3,3 V do ESP32.',q:'1',p:28.90,pt:'R$ 28,90',u:ML+'3-pecas-transistor-mosfet-irlz44n-to-220-55v-47a-canal-n/p/MLB2114704193'},
  {id:'me2',g:'mle',n:'Antena em mola 433 MHz',d:'Soldada no receptor, no lugar do fio de 17,3 cm. Se o alcance ficar curto, volte para o fio.',q:'1',p:13.44,pt:'R$ 13,44',u:ML+'antena-rf-helicoidal-433-mhz-sw433-th22/up/MLBU1482529206'},
  // loja da cidade
  {id:'lj1',g:'loja',est:1,alt:1,n:'Resistores 1/4 W avulsos',d:'Peça: 2 de 100 kΩ, 2 de 10 kΩ, 2 de 5,1 kΩ, 1 de 1 kΩ e 2 de 100 Ω.',q:'9',p:3,pt:'centavos cada',u:ML+'kit-600x-resistores-de-precisao-30-valores-14w-1/p/MLB2092732470'},
  {id:'lj2',g:'loja',est:1,alt:1,n:'Transistor BC547',d:'Liga o buzzer. Um é reserva.',q:'2',p:2,pt:'≈ R$ 1 cada',u:ML+'transistor-bc547-npn-para-projetos-10-pecas/p/MLB44332340'},
  {id:'lj3',g:'loja',est:1,alt:1,n:'Capacitor eletrolítico 1.000 µF 16 V',d:'Segura a tensão do ESP quando o choque puxa corrente. Um é reserva.',q:'2',p:4,pt:'≈ R$ 2 cada',u:ML+'capacitor-eletrolitico-1000uf-16v-10-pecas/p/MLB43853621'},
  {id:'lj4',g:'loja',est:1,alt:1,n:'Botão táctil 6 × 6 mm',d:'Botão de pareamento. Um é reserva.',q:'2',p:2,pt:'≈ R$ 1 cada',u:ML+'micro-chave-tactil-push-button-6x6x5mm-4t-10/p/MLB44167964'},
  {id:'lj5',g:'loja',est:1,alt:1,n:'Placa ilhada 7 × 9 cm',d:'Vira a placa de controle. A segunda é para o caso de errar.',q:'2',p:20,pt:'≈ R$ 10 cada',u:ML+'placa-fenolite-perfurada-7x9cm-para-projetos/p/MLB43904850'},
  {id:'lj6',g:'loja',est:1,alt:1,n:'Termo-retrátil, 1 m de 3 mm e 1 m de 6 mm',d:'Cobre cada emenda dos fios soltos.',q:'2 m',p:5,pt:'≈ R$ 5',u:ML+'espaguetetubo-termo-retratil-colorido-kit-com-530/p/MLB44444908'},
  {id:'lj7',g:'loja',est:1,alt:1,n:'Cabinho flexível 0,5 mm², vermelho e preto',d:'2 m de cada, para os 10 fios soltos. Fio de silicone é melhor, mas cabinho comum serve no protótipo. Também tem em loja de material elétrico.',q:'4 m',p:8,pt:'≈ R$ 8',u:ML+'cj22-awg-electrical-wire-flexible-silicone-cables-5-csx-black/p/MLB2112917243'},
  {id:'lj8',g:'loja',est:1,alt:1,n:'Terminal olhal M4',d:'Prende o fio de alta tensão no parafuso de inox.',q:'2',p:2,pt:'≈ R$ 1 cada',u:ML+'terminal-olhal-azul-pre-isolado-15mm-a-25mm-m4-100-pecas/p/MLB27727822'},
  {id:'lj9',g:'loja',est:1,alt:1,n:'Arruela de borracha M4',d:'Veda o furo dos pinos por fora. Tem em loja de ferragens.',q:'2',p:2,pt:'≈ R$ 1 cada',u:ML+'arruela-vedacao-vedante-pvc-flexivel-14-x-5-x-4mm-10un/up/MLBU1962551645'},
  {id:'lj10',g:'loja',est:1,n:'Pilha A23 de 12 V',d:'Do controle principal, que vem sem pilha. É a pilha de controle de portão: tem em loja de eletrônica, chaveiro e mercado.',q:'1',p:6,pt:'≈ R$ 6',u:''},
  {id:'lj11',g:'loja',est:1,alt:1,n:'Barra de pinos fêmea 1 × 40 (2,54 mm)',d:'Vira os soquetes do ESP32 e do RXB6 na placa (corte 2 pedaços de 8 e 1 de 4). O ferro não esquenta os módulos e dá para trocar um queimado sem dessoldar.',q:'1',p:4,pt:'≈ R$ 4',u:'https://lista.mercadolivre.com.br/barra-de-pinos-femea-1x40'},
  // casa / selaria
  {id:'cs1',g:'casa',est:1,alt:1,n:'Fita de poliéster 50 mm, 1,5 m',d:'Na selaria ou no armarinho. No Mercado Livre só vem rolo de 10 m.',q:'1,5 m',p:10,pt:'≈ R$ 10',u:ML+'fita-slackline-poliester-cinta-50mm-preta-cadarco-10mts/up/MLBU1441211367'},
  {id:'cs2',g:'casa',est:1,alt:1,n:'Velcro de costura 50 mm, 10 cm',d:'O elo fraco. A selaria que costurar costuma ter.',q:'10 cm',p:3,pt:'≈ R$ 3',u:ML+'velcro-fecho-hook-loop-preto-50mm-1m-costura-nao-adesivo/p/MLB26802684'},
  {id:'cs3',g:'casa',n:'Silicone neutro (tubo)',d:'Neutro, nunca o acético (cheiro de vinagre), que corrói as placas.',q:'1',p:22.90,pt:'R$ 22,90',u:ML+'silicone-neutro-uso-geral-construcao-tytan-incolor-280g/p/MLB28167603'},
  {id:'cs4',g:'casa',n:'Abraçadeiras de nylon pequenas',d:'Prende fios e placas.',q:'1',p:9.63,pt:'R$ 9,63',u:ML+'abracadeira-nylon-ap-100-m18-preta-de-100-pecas-preto/p/MLB23859436'},
  {id:'cs5',g:'casa',n:'Sílica gel',d:'Reaproveite os saquinhos que vêm em caixa de sapato, bolsa e remédio.',q:'1',p:0,pt:'grátis',u:''},
  // bancada
  {id:'b1',g:'banc',n:'Bastão de choque para gado',d:'Régua para comparar o módulo. Se pegar emprestado, marque "Já tenho".',q:'1',p:189.90,pt:'R$ 189,90',u:ML+'bastao-de-choque-eletrico-para-gado-bovino-com-haste/up/MLBU4354031458'},
  {id:'b2',g:'banc',n:'Multímetro digital Exbom MD-180L',d:'Mede tensão, corrente e curto.',q:'1',p:39.90,pt:'R$ 39,90',u:ML+'multimetro-digital-portatil-md-180l-exbom/up/MLBU4092522745'},
  {id:'b3',g:'banc',n:'Protoboard 830 pontos + 40 jumpers',d:'Para montar e testar antes de soldar.',q:'1',p:25.99,pt:'R$ 25,99',u:ML+'protoboard-breadboard-830-pontos-furos-com-jumper-mxf-40-pcs/p/MLB2130976768'},
  {id:'b4',g:'banc',n:'Estanho + pasta de solda Cobix',d:'Você já tem o ferro.',q:'1',p:29.45,pt:'R$ 29,45',u:ML+'kit-de-solda-estanho-cobix-63x37-e-pasta-para-soldar-eletronica/p/MLB27509228'},
  {id:'b5',g:'banc',est:1,alt:1,n:'Sugador de solda',d:'Para desfazer uma solda errada: esquenta, encosta o sugador e aperta o botão. Ajuda muito quem está começando.',q:'1',p:20,pt:'≈ R$ 20',u:'https://lista.mercadolivre.com.br/sugador-de-solda'},
  // opcionais
  {id:'o1',g:'opt',opt:1,n:'ESP32-C3 no Mercado Livre',d:'Para começar o firmware antes do AliExpress chegar. Comprando este, compre só 1 ESP32 no AliExpress.',q:'1',p:32.49,pt:'R$ 32,49',u:ML+'placa-super-mini-esp32-c3-wifi-e-bluetooth/up/MLBU5819724594'},
  {id:'o2',g:'opt',opt:1,n:'RXB6 no Mercado Livre',d:'Para começar antes do AliExpress chegar, ou como reserva se o do AliExpress queimar.',q:'1',p:29.04,pt:'R$ 29,04',u:ML+'receptor-de-radiofrequencia-rxb6-cristal-433-mhz-gfhgf/p/MLB2087207229'},
  {id:'o3',g:'opt',opt:1,n:'Controle EV1527 no Mercado Livre',d:'Mesmo motivo do de cima.',q:'1',p:24.68,pt:'R$ 24,68',u:ML+'transmissor-de-controle-remoto-sem-fio-rf-433mhz-ev1527-1-4c/p/MLB2071357345'},
  {id:'o4',g:'opt',opt:1,n:'Controle de portão Hombrus 433 MHz, 3 botões',d:'Já homologado na Anatel. Serve para testar se o firmware pareia com controle nacional, pensando na versão para vender. Confira no anúncio se é code learning (HT6P20).',q:'1',p:22.59,pt:'R$ 22,59',u:ML+'controle-remoto-hombrus-chaveiro-433mhz-convencional-sem-fio-3-botoes/p/MLB32021865'},
  {id:'o5',g:'opt',opt:1,n:'Cabo com conector JST XH, 2 vias',d:'Para ligar bateria, chave, USB-C, alta tensão e buzzer por encaixe. Confira quantos cabos vêm no anúncio.',q:'1',p:21.80,pt:'R$ 21,80',u:ML+'cabo-conector-jst-xh-254-mm-2-pinos-2-vias-20-cm/up/MLBU5472070103'}
];
