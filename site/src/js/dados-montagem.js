/* ---------- etapas da montagem ---------- */
const STEPS = [
 {t:'Testar cada peça sozinha',s:'Antes de soldar qualquer coisa',html:`
  <p>Peça com defeito descoberta depois de soldada custa horas.</p>
  <ol>
   <li><b>ESP32-C3.</b> Na Arduino IDE, instale o pacote "esp32" da Espressif, escolha a placa "ESP32C3 Dev Module" e ative "USB CDC On Boot". Grave o exemplo Blink com o pino 8. <i>Passa se o LED azul piscar.</i></li>
   <li><b>RXB6.</b> VCC no 3V3, GND no GND, DATA no GPIO 3 e a antena em mola soldada no ANT. Com a biblioteca rc-switch, abra o exemplo ReceiveDemo_Simple e troque <code>enableReceive(0)</code> por <code>enableReceive(3)</code>. Aperte os botões dos dois controles. <i>Passa se cada botão mostrar um número diferente. Anote os 8.</i></li>
   <li><b>MOSFETs.</b> Olhando o lado escrito, com as pernas para baixo: porta, dreno, fonte. Na protoboard, a porta vai no GPIO 4 por um resistor de 100 Ω (e 10 kΩ da porta ao GND), a fonte vai no GND, e um LED com resistor de 220 Ω vai do + da bateria até o dreno. Grave um código que liga e desliga o GPIO 4 a cada segundo. <i>Passa se o LED acompanhar. Repita com o segundo.</i></li>
   <li><b>Buzzer.</b> Ligue pelo BC547 como na tabela da Etapa 5 e acione o GPIO 5. <i>Passa se apitar.</i></li>
   <li><b>Bateria.</b> Carregue pelo TP4056: luz vermelha carregando, azul quando completa. <i>Passa se marcar entre 4,1 e 4,2 V.</i></li>
   <li><b>Módulo de alta tensão.</b> Crave dois pregos numa tábua a 1 cm e prenda neles as saídas. Ligue a entrada na bateria com o multímetro no meio (escala de 10 A) e feche por 1 segundo pelo lado da bateria. Afaste os pregos de 0,5 em 0,5 cm até a faísca parar de pular e anote. Repita com o outro módulo e com o bastão.</li>
  </ol>
  <div class="careful danger"><b>Cuidado:</b> nunca encoste nas saídas do módulo. A distância máxima da faísca serve de régua: quanto maior a tensão, mais longe ela pula.</div>
  <div class="pass"><b>Passa se</b> tudo acima funcionar e algum módulo puxar até 3 A com faísca parecida com a do bastão. Se nenhum passar, a coleira usa a placa do bastão (plano B).</div>`},
 {t:'Protoboard e firmware',s:'Tudo funcionando com um LED no lugar do choque',html:`
  <ol>
   <li>Monte tudo na protoboard seguindo a tabela da Etapa 5, menos o módulo de alta tensão e os parafusos. No lugar do módulo, um LED com resistor de 220 Ω.</li>
   <li>Grave o firmware da coleira (v0.1). O roteiro de gravação e de teste está no README que vem junto.</li>
   <li>Pareie os dois controles: segure o botão de pareamento e ligue a chave. Com 2 bipes e o LED piscando rápido, solte e aperte A, B, C e D, nessa ordem. Um bipe longo quer dizer salvo. Desligue e repita com o segundo controle.</li>
   <li>Confira:
    <ul>
     <li>A só apita.</li>
     <li>B e C apitam e acendem o LED por 0,5 s piscando rápido (no B ele fica mais fraco). D apita e acende direto por 1 s.</li>
     <li>Segurando o D por 10 s, o LED apaga em 1 s.</li>
     <li>Apertando o B várias vezes, o LED acende no máximo uma vez a cada 3 s.</li>
     <li>Um controle não pareado não faz nada.</li>
    </ul></li>
   <li><b>Teste da ponte:</b> ligue um fio entre o dreno e a fonte do MOSFET A, como se ele tivesse queimado em curto. O LED só pode acender quando você apertar um botão. Tire a ponte e repita no MOSFET B.</li>
   <li>Troque o LED pelo módulo aprovado, com as saídas presas nos pregos, e repita o item 4.</li>
   <li><b>Níveis de força:</b> aperte B, C e D e afaste os pregos para achar a faísca máxima de cada um. A do B tem que pular menos que a do C, e a do C menos que a do D. Se ficarem iguais, ajuste os pulsos no firmware ou volte os níveis para tempo (0,3, 0,6 e 1 s).</li>
  </ol>
  <div class="careful"><b>Erros que acontecem aqui:</b><ul>
   <li>Trocar as pernas do MOSFET: confira porta, dreno e fonte pelo lado escrito. O teste da ponte pega MOSFET ligado errado.</li>
   <li>Ligar o USB no ESP32 com a chave ligada: o computador empurra 5 V para a bateria. Desligue a chave antes de gravar.</li>
<li>Testar pelo USB e achar que o choque não funciona: com USB ligado, o firmware só simula o choque e o LED de teste não acende. Teste na bateria, ou digite <b>bancada</b> no Monitor Serial (só com o LED no lugar do módulo).</li>
  </ul></div>
  <div class="pass"><b>Passa se</b> todos os itens do 4, 5 e 7 funcionarem como descrito.</div>`},
 {t:'Imprimir as peças 3D',s:'Na A1 Mini, enquanto as peças não chegam',html:`
  <p>Os arquivos de impressão ainda não existem. As medidas abaixo saíram dos anúncios e já estão no modelo 3D. Falta uma: a medida de dentro da caixa, que a Multitoc não publica em lugar nenhum. Quando a caixa chegar (Mercado Livre, poucos dias), meça por dentro o comprimento, a largura, a altura da base e da tampa e onde ficam as torres dos parafusos, ou tire fotos com uma régua do lado, e mande no chat. Com isso os arquivos são desenhados. O módulo de alta tensão fica preso com abraçadeira, então o suporte não precisa esperar o AliExpress.</p>
  <table class="simple">
   <tr><td>Caixa Multitoc</td><td>10 × 10 × 7 cm por fora, contando a tampa alta. Por dentro: medir.</td></tr>
   <tr><td>Suporte da 18650</td><td>78 × 22 × 22 mm</td></tr>
   <tr><td>Módulo de alta tensão A (cilindro)</td><td>64 mm de comprimento, uns 23 mm de diâmetro (calculado pela foto), fios de 10 cm</td></tr>
   <tr><td>Módulo de alta tensão B (bloco)</td><td>o anúncio não dá a medida; parece ter uns 3 cm</td></tr>
   <tr><td>Placa ilhada</td><td>70 × 90 mm, furos de 1 mm a cada 2,54 mm</td></tr>
   <tr><td>Antena em mola</td><td>27 mm de altura. Se encostar na tampa, solde inclinada.</td></tr>
   <tr><td>Capacitor de 1.000 µF</td><td>10 mm de diâmetro, 18 mm de altura</td></tr>
   <tr><td>Carregador TP4056</td><td>uns 26 × 17 mm, o tamanho padrão desse módulo</td></tr>
   <tr><td>ESP32-C3 SuperMini</td><td>22,5 × 18 mm</td></tr>
   <tr><td>Buzzer</td><td>12 mm de diâmetro, 9,5 mm de altura</td></tr>
   <tr><td>Conector USB-C</td><td>rosca de uns 12 mm (furo de 12 a 13 mm), 14,5 mm de rosca, porca de 3 mm</td></tr>
   <tr><td>Chave liga/desliga</td><td>furo de 6 mm</td></tr>
  </table>
  <p>Confira também a largura da caixa por dentro, entre as paredes e longe das torres dos parafusos. A placa de 9 cm precisa de pelo menos 9,3 cm. Se der menos, a placa é cortada antes de soldar e a posição das peças muda um pouco.</p>
  <ul>
   <li><b>Suporte de 2 andares</b> (PETG): 4 colunas e 2 trilhos que seguram a placa de controle por cima da bateria e do módulo de alta tensão. A trava da bateria vai no mesmo modelo, para a 18650 não soltar quando o boi corre.</li>
   <li><b>Protetor externo</b> (TPU 95A, ou PETG): abraça a caixa, amortece pancada e tem as orelhas de 52 mm para a fita.</li>
   <li><b>Gabarito de furação</b> (PLA, só na bancada): marca os furos no lugar certo.</li>
  </ul>
  <p class="small">3 paredes, 30% a 40% de preenchimento. TPU imprime devagar, uns 25 mm/s. Nunca PLA nas peças que vão no boi: amolece no sol.</p>
  <div class="pass"><b>Passa se</b> uma peça de teste de 1 andar, impressa antes, encaixar na caixa sem forçar e sem folga; depois, o suporte e o protetor completos encaixarem e a placa de 7 × 9 cm assentar nas colunas.</div>`},
 {t:'Preparar a caixa',s:'Furar, instalar pinos, USB-C e chave',html:`
  <ol>
   <li><b>Teste da caixa vazia:</b> papel-toalha dentro, tampa fechada, mangueira por 2 minutos. O papel tem que sair seco.</li>
   <li><b>Marque com o gabarito:</b> 2 furos de 4 mm no fundo, a 4 cm um do outro, no lado onde fica o módulo de alta tensão; USB-C na frente; chave na esquerda. Nenhum furo perto da borda da tampa.</li>
   <li>Fure devagar, com a broca de 4 mm e a escalonada. Tire a rebarba e limpe o pó.</li>
   <li><b>Pinos:</b> de dentro para fora, parafuso, terminal olhal, parede da caixa. Por fora, arruela de borracha e porca cega bem apertada. Silicone em volta do furo dos dois lados.</li>
   <li><b>USB-C:</b> passe, aperte a porca e passe silicone por dentro.</li>
   <li><b>Chave:</b> passe, aperte a porca e coloque a capa por fora.</li>
  </ol>
  <div class="careful"><b>Erros que acontecem aqui:</b><ul>
   <li>Silicone comum (cheiro de vinagre) corrói as placas. Só neutro.</li>
   <li>Terminal olhal frouxo faz o choque falhar e soltar faísca dentro. Risque parafuso e porca com caneta para ver se giraram.</li>
  </ul></div>
  <div class="pass"><b>Passa se</b>, depois de 24 horas de silicone secando, o teste do papel-toalha continuar seco.</div>`},
 {t:'Montar a placa de controle',s:'Tudo numa placa de 7 × 9 cm; marque cada ligação',wires:true,html:`
  <p>Na ordem: solde os módulos pelos pinos (ESP32, RXB6 e TP4056), depois os 2 MOSFETs deitados, os componentes pequenos, e por último faça as trilhas por baixo com estanho ou com sobras de perna de componente. A aba <a href="#projeto" data-go="projeto">Projeto 3D</a> mostra onde fica cada peça e cada trilha. Os fios soltos ficam para o fim.</p>
  <div class="careful danger"><b>MOSFETs (linha 14):</b> olhando o lado escrito, com as pernas para baixo, a ordem é porta, dreno, fonte. A fonte do A vai no dreno do B. Se os dois ficarem com a fonte no −, eles ficam em paralelo e a proteção dupla some. As abas de metal dos dois não podem encostar uma na outra.</div>
  <div id="wireTable"></div>
  <div class="careful"><b>Cuidados:</b><ul>
   <li>As trilhas do choque (linhas 1, 2, 14, 15 e o pad AT+) passam até 3 A. Reforce com bastante estanho ou um pedaço de fio por baixo.</li>
   <li>Capacitor: a faixa branca vai no GND. Invertido, estufa ou estoura.</li>
   <li>Olhe cada solda com o zoom da câmera do celular. Ponte de solda entre pinos vizinhos faz um pino ligar junto com o outro.</li>
   <li>Cubra cada emenda dos fios soltos com termo-retrátil.</li>
   <li>Depois de cada grupo, meça se não há curto entre barramento + e −.</li>
   <li>Fios de alta tensão (linha 24) longe do ESP32 e da antena, a pelo menos o dobro da faísca máxima da Etapa 1.</li>
  </ul></div>
  <div class="pass"><b>Passa se</b>, sem a bateria, o multímetro não apitar na continuidade entre barramento + e −, nem entre B+ e B−.</div>`},
 {t:'Primeiro teste com a caixa aberta',s:'Ligar pela primeira vez, vendo tudo',html:`
  <ol>
   <li>Confira o + do suporte e coloque a bateria com a chave desligada. Invertida, ela queima o TP4056.</li>
   <li>Ligue a chave: o LED azul do ESP32 acende. Com a tampa fechada, ele tem que aparecer pela tampa transparente.</li>
   <li>Meça o pino 5V do ESP32: entre 3,6 e 4,2 V.</li>
   <li>Pareie o controle principal e o reserva.</li>
   <li>Aperte o A: só bipe.</li>
   <li>Prenda um fio entre as porcas cegas com folga de 5 mm no meio. Afaste as mãos e aperte o B: sai uma faísca na folga.</li>
   <li>Repita os testes de limite e de níveis da Etapa 2.</li>
   <li>Compare a tensão da bateria no Monitor Serial com a do multímetro e ajuste o divisor no código se precisar.</li>
   <li>Ligue e desligue a chave 20 vezes com o fio de folga preso. Nenhuma faísca na hora de ligar. Se sair, confira os resistores de 10 kΩ.</li>
   <li>Com a chave desligada, ligue um carregador de celular USB-C para USB-C no conector da caixa. A luz vermelha acende. Se não acender, faltam os resistores de 5,1 kΩ no CC1 e CC2.</li>
  </ol>
  <div class="pass"><b>Passa se</b> tudo funcionar e o ESP32 não reiniciar em nenhum choque. Se reiniciar, afaste os fios de alta tensão e confira o capacitor.</div>`},
 {t:'Fixar, isolar e fechar',s:'Para aguentar o boi correndo e a coleira caindo',html:`
  <ol>
   <li>Andar de baixo: encaixe o suporte, a bateria na trava (com espuma fina do lado) e o módulo de alta tensão.</li>
   <li>Andar de cima: prenda a placa de controle nas colunas com parafusos pequenos.</li>
   <li>Confira se a antena em mola está em pé e longe do módulo de alta tensão.</li>
   <li>Prenda os fios com abraçadeiras. Nenhum fio encosta na borracha da tampa.</li>
   <li>Silicone neutro sobre o módulo de alta tensão, os terminais olhal e as emendas de alta tensão. Verniz para placa (ou esmalte incolor) nas placas, menos nos conectores e no botão.</li>
   <li>Ponha um sachê de sílica gel.</li>
   <li>Deixe secar 24 horas.</li>
   <li>Limpe a borracha da tampa e feche os 4 parafusos plásticos de 1/4 de volta com chave de fenda. Dois deles servem de dobradiça.</li>
   <li>Mangueira por 5 minutos e abra para conferir.</li>
  </ol>
  <div class="careful">Cola quente só como reforço: amolece no sol. Parafuso demais na tampa trinca a caixa.</div>
  <div class="pass"><b>Passa se</b> nada fizer barulho sacudindo a caixa fechada e a mangueira não molhar nada.</div>`},
 {t:'Coleira e posição no pescoço',s:'Firme, e soltando sozinha se enroscar',html:`
  <ol>
   <li>Encaixe o protetor de TPU. Se ficar folgado, 2 parafusos pequenos.</li>
   <li>Passe a fita pelas orelhas e prenda a fivela numa ponta.</li>
   <li><b>Elo fraco:</b> corte a fita longe da caixa e una com 5 cm de velcro costurado (selaria ou costureira). Com um puxão forte, abre.</li>
   <li>Peça ao comprador a medida do pescoço do boi e corte a fita com folga para ajuste.</li>
   <li>No boi: justa, com dois dedos de folga.</li>
   <li>Posição de partida: lateral do pescoço, no terço de cima, porcas cegas no couro, longe da barbela. Ajuste com o comprador no primeiro uso.</li>
   <li>Marque com caneta a posição que funcionou.</li>
  </ol>
  <div class="pass"><b>Passa se</b> a caixa não girar quando o boi mexe a cabeça e o elo abrir no teste do poste.</div>`}
];
