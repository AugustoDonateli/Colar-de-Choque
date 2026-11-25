# Firmware da coleira — v0.1

Programa do ESP32-C3 SuperMini da coleira. Recebe o controle de 433 MHz, faz o bipe e o choque com as regras de segurança, mede a bateria e guarda um contador de uso.

**Situação:** compila sem nenhum aviso (pacote esp32 3.3.13, biblioteca rc-switch 2.6.4) e passou em 44 conferências numa simulação no computador (tempos do choque, pulsos, pausa, limite por minuto, corte duro, USB, bateria, pareamento). Ainda não rodou numa placa de verdade. Siga o roteiro da seção 5 na ordem.

---

## 1. Preparar o computador (uma vez só)

1. Instale a **Arduino IDE 2** (arduino.cc/en/software).
2. **Arquivo → Preferências**. Em "URLs adicionais para Gerenciadores de Placas", cole:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. **Ferramentas → Placa → Gerenciador de placas**. Procure `esp32` e instale **esp32 by Espressif Systems**, versão 3.3 ou mais nova.
4. **Ferramentas → Gerenciar bibliotecas**. Procure `rc-switch` e instale a do **sui77**.

## 2. Gravar na placa

1. Se o ESP32 já estiver na coleira, **desligue a chave antes de ligar o USB**. Com a chave ligada, o computador empurra 5 V para a bateria.
2. Abra o arquivo `coleira.ino`. A pasta precisa se chamar `coleira`, com todos os arquivos `.h` dentro. Eles aparecem como abas.
3. Em **Ferramentas**:
   - Placa: **ESP32C3 Dev Module**
   - USB CDC On Boot: **Enabled** (sem isso o Monitor Serial fica mudo)
   - Porta: a que aparecer quando você liga a placa
4. Clique em **Carregar** (seta para a direita).
5. Se der erro de conexão: segure o botão **BOOT** da placa, aperte e solte o **RESET**, solte o BOOT e clique em Carregar de novo. Quando terminar, aperte RESET.
6. Abra o **Monitor Serial**, escolha **115200** e **Nova linha**. Digite `ajuda`.

## 3. Como a coleira funciona

### Botões do controle

| Botão | O que faz |
|---|---|
| A | Só bipe de 0,5 s |
| B | Bipe de 0,3 s, 0,2 s de silêncio, choque fraco: 0,5 s em pulsos de 30 ms ligado e 70 ms desligado |
| C | Mesma coisa, choque médio: pulsos de 70 ms ligado e 30 ms desligado |
| D | Mesma coisa, choque forte: 1 s direto |

Segurar o botão vale como um aperto só. Para outro choque, solte e aperte de novo.

### Regras (o programa não deixa passar)

- Nenhum choque passa de 1 s.
- Do fim de um choque até o próximo: pelo menos 3 s. Apertou antes, o aperto é ignorado.
- No máximo 5 s de choque somados em 1 minuto.
- Bateria abaixo de 3,3 V: choque bloqueado (3 bipes curtos ao apertar).
- Com USB ligado no ESP32: a sequência roda, aparece no Monitor Serial, mas os MOSFETs não ligam (choque simulado).
- Bloqueio por pausa ou por limite não apita. Assim o boi não ouve o aviso sem nada acontecer depois.

### Camadas que desligam o choque

1. O programa desliga os MOSFETs no fim do tempo do nível.
2. Fora do choque, o programa força os dois MOSFETs desligados o tempo todo.
3. **Corte duro:** um timer separado desliga os dois no tempo do nível + 30 ms, mesmo se o programa principal atrasar.
4. **Watchdog:** se o programa travar, a placa reinicia em 2 s. Os resistores de 10 kΩ seguram os MOSFETs desligados enquanto isso.
5. Dois MOSFETs em série: um queimado em curto sozinho não dá choque.

### Sinais de bipe

| Quando | Som |
|---|---|
| Ligou com bateria boa (ou no USB) | 1 bipe curto e LED aceso por 1 s |
| Ligou com bateria baixa (menos de 3,5 V) | 2 bipes curtos |
| Ligou com bateria no fim (menos de 3,3 V) | 3 bipes curtos |
| Entrou no pareamento | 2 bipes curtos, LED piscando rápido |
| Aprendeu um botão no pareamento | 1 bipe para A, 2 para B, 3 para C, 4 para D |
| Controle salvo | 1 bipe longo |
| Pareamento cancelado ou memória cheia | 3 bipes longos |
| Apagou todos os controles | 5 bipes bem rápidos |
| Apertou B, C ou D com bateria no fim | 3 bipes curtos, sem choque |
| Bateria esgotada, desligando | 3 bipes longos |

A coleira não fica apitando de tempos em tempos com bateria baixa, porque o boi aprenderia que bipe sem choque é normal. O aviso de carga sai ao ligar.

### LED azul da placa

| LED | Quer dizer |
|---|---|
| 1 piscadinha a cada 3 s | Ligada, tudo certo |
| 2 piscadinhas a cada 3 s | Bateria baixa ou no fim |
| Piscando rápido | Pareamento |
| Aceso direto | USB ligado (choque só simulado) |
| Piscando devagar (meio segundo) | Modo bancada |
| Aceso durante o choque | Choque saindo de verdade |

### Pareamento

- **Pelo botão:** segure o botão de pareamento e ligue a chave. Depois de 1 s vêm 2 bipes e o LED pisca rápido: solte.
- **Pelo computador:** digite `parear`.
- Aperte **A, B, C e D, nessa ordem**. Com o quarto botão, salva na hora.
- Controle de 3 botões (o Hombrus, por exemplo): aperte os 3 e espere 15 s. Ele salva o que aprendeu.
- Cabem 4 controles. Parear de novo um controle que já estava salvo substitui o antigo.
- Para apagar todos: segure o botão de pareamento por 10 s ao ligar (5 bipes rápidos), ou digite `apagar controles`.
- Se nenhum botão chegar em 60 s, o pareamento é cancelado.

### Bateria

- Mede o barramento + pelo divisor de 100 kΩ + 100 kΩ no GPIO 0, uma vez por segundo, só com a coleira parada e 2 s depois do último choque.
- Abaixo de 3,1 V por 30 s seguidos, a coleira dá 3 bipes longos e desliga quase tudo para não esgotar a bateria. Para voltar, carregue e ligue a chave de novo. Mesmo assim, desligue a chave assim que puder, porque o receptor continua gastando um pouco.
- Se o divisor soltar, a leitura vai para 0 V (choque bloqueado) ou para o máximo (cai no modo USB, choque simulado). Nos dois casos não sai choque.

## 4. Comandos do Monitor Serial

| Comando | O que faz |
|---|---|
| `ajuda` | Lista os comandos |
| `estado` | Bateria, estado do choque, quanto do limite do minuto já foi usado, controles, motivo do último reinício |
| `contador` | Bipes, choques de cada nível, tempo total, apertos ignorados e reinícios |
| `zerar contador` | Pede confirmação. Para zerar mesmo: `zerar contador sim` |
| `controles` | Lista os controles e os códigos de cada botão |
| `apagar controles` | Pede confirmação: `apagar controles sim` |
| `parear` | Entra no pareamento |
| `ouvir` | Liga e desliga: mostra todo código que o RXB6 recebe |
| `bipe` | Toca um bipe |
| `calibrar 4870` | Corrige a leitura da bateria com o valor do multímetro, em milivolts |
| `bancada` | Com USB ligado, deixa os MOSFETs funcionarem. **Só com LED no lugar do módulo.** Desliga ao tirar o USB ou reiniciar |
| `testar watchdog` | Trava o programa de propósito. A placa tem que reiniciar em uns 2 s |
| `reiniciar` | Reinicia a placa |

Nenhum comando dá choque. Choque só sai pelo botão de um controle pareado.

## 5. Roteiro de teste, em ordem

Marque cada item. Se algum falhar, pare e mande a mensagem do Monitor Serial no chat.

### Etapa A — só o ESP32 no USB

- [ ] Grave e abra o Monitor Serial. Aparece `Coleira v0.1 ligada`.
- [ ] O LED fica aceso direto (USB). Se ele fizer o contrário do que a tabela diz, mude `LED_ACENDE_EM_LOW` para `false` no `config.h`.
- [ ] `estado` responde. Sem o divisor ligado, a bateria mostra um número qualquer. É normal nesta etapa.
- [ ] `testar watchdog`: a placa reinicia sozinha. Depois `estado` mostra "Último reinício: watchdog".

### Etapa B — buzzer (BC547 no GPIO 5)

- [ ] `bipe` apita.
- [ ] O buzzer fica quieto ao ligar a placa, fora o bipe de início. Se der um chiado ao ligar, ponha um resistor de 10 kΩ entre a base do BC547 e o GND.

### Etapa C — receptor RXB6 (DATA no GPIO 3)

- [ ] Digite `ouvir` e aperte os botões do controle. Cada botão mostra um código diferente, repetido enquanto você segura.
- [ ] Linhas marcadas "(ignorado: ruído)" sem apertar nada são normais, desde que sejam códigos curtos.
- [ ] Anote os códigos dos dois controles. Digite `ouvir` de novo para desligar.

### Etapa D — pareamento

- [ ] `parear`, depois A, B, C e D. Bipe longo no fim.
- [ ] `controles` mostra os 4 códigos na ordem certa.
- [ ] Repita com o segundo controle.
- [ ] Desligue e ligue a placa. `controles` continua mostrando os dois.
- [ ] Quando o botão de pareamento estiver soldado: segure, ligue, solte nos 2 bipes, pareie. Depois teste segurar por 10 s (apaga tudo) e pareie os dois de novo.

### Etapa E — protoboard com LED no lugar do módulo

É a etapa "Protoboard e firmware" do site. O LED com resistor de 220 Ω vai do barramento + até o dreno do MOSFET A. Teste de um destes jeitos:
- na bateria: chave ligada e **sem USB** (o LED de teste acende de verdade, mas não tem Monitor Serial);
- ou no USB com o comando `bancada` (o LED de teste acende e o Monitor mostra tudo).

- [ ] A: só apita, LED de teste apagado.
- [ ] B: apita, depois o LED pisca rápido por 0,5 s, fraco.
- [ ] C: igual, mais forte.
- [ ] D: apita e o LED acende direto por 1 s.
- [ ] Segurar D por 10 s: um choque só, de 1 s.
- [ ] B várias vezes seguidas: o LED acende no máximo uma vez a cada 3 s.
- [ ] D a cada 4 ou 5 s, 7 vezes: só 5 acendem. `contador` mostra os ignorados por "limite por minuto".
- [ ] Controle não pareado: nada acontece.
- [ ] Teste da ponte: fio entre dreno e fonte do MOSFET A. O LED só acende quando você aperta um botão. Tire, repita no MOSFET B.

### Etapa F — calibrar a leitura da bateria

Com o USB ligado e a chave **desligada**, o barramento fica com a tensão do USB, que é estável.
- [ ] Meça com o multímetro entre barramento + e barramento −. Por exemplo: 4,87 V.
- [ ] Digite `calibrar 4870` (o valor em milivolts).
- [ ] `estado` mostra perto de 4870 mV e "USB ligado".
- [ ] Se a leitura pular mais de 50 mV entre um `estado` e outro, solde um capacitor de 100 nF entre o GPIO 0 e o GND.

### Etapa G — módulo de alta tensão na tábua de pregos

Troque o LED pelo módulo aprovado, saídas presas nos pregos. Chave ligada, **sem USB**. Mãos longe.
- [ ] Repita os itens da Etapa E.
- [ ] Faísca máxima: B pula menos que C, e C menos que D.
- [ ] Se B e C ficarem iguais, mude os pulsos em `NIVEIS` no `config.h`. Se nada resolver, use níveis por tempo: B 300 ms, C 600 ms, D 1000 ms, todos contínuos (tempo ligado igual à duração e desligado 0). Grave de novo.

### Etapa H — coleira montada (testes do site)

Os que dependem do firmware:
- [ ] **Limites do firmware**: igual à Etapa E.
- [ ] **Disparo fantasma**: 1 hora ligada perto de controles de portão. Depois, no USB (chave desligada), `contador`: nenhum bipe e nenhum choque a mais.
- [ ] **Interferência**: 20 choques seguidos respeitando a pausa. Depois, `contador`: nenhum reinício por "queda de tensão" ou "erro". `controles` continua com os dois.
- [ ] **Bateria**: ligada até desligar sozinha (3 bipes longos), depois 100 choques com carga cheia.
- [ ] Antes de entregar: `zerar contador sim`.

## 6. O que só a bancada vai responder

- Se o LED da placa acende em LOW (o normal da SuperMini) ou em HIGH.
- Se os pulsos de 30/70 e 70/30 dão forças diferentes no módulo, ou se é melhor usar níveis por tempo.
- Se o buzzer chia ao ligar (resolve com 10 kΩ da base ao GND).
- Se a leitura da bateria precisa do capacitor de 100 nF.
- Se o barramento sobe mesmo para uns 4,7 a 5 V com o USB ligado e a chave desligada. Confira com `estado`: tem que aparecer "USB ligado". Se não aparecer, me avise antes de testar com o módulo.
- O alcance real com a antena em mola.

## 7. Segurança nos testes

- Choque nunca se testa em pessoa.
- Chave desligada para mexer na coleira, nos pinos ou para ligar o USB.
- Modo bancada só com LED no lugar do módulo.
- As travas no fim do `config.h` impedem compilar um choque maior que 1 s, pausa menor que 3 s ou mais de 5 s por minuto. Não apague as travas.

## 8. Arquivos

| Arquivo | O que tem |
|---|---|
| `coleira.ino` | `setup()` e `loop()`: liga tudo e chama cada parte |
| `config.h` | Pinos, tempos, limites da bateria e as travas de segurança |
| `registro.h` | Mensagens no Monitor Serial (só escreve com computador ligado) |
| `saidas.h` | MOSFETs, fila de bipes e piscadas do LED |
| `memoria.h` | Controles pareados, contador e calibração, guardados na flash |
| `bateria.h` | Leitura do divisor, estados da bateria e detecção do USB |
| `radio.h` | Recepção do RXB6 e pareamento |
| `choque.h` | Sequência bipe → espera → choque, regras e corte duro |
| `comandos.h` | Comandos do Monitor Serial |
| `sistema.h` | Botão ao ligar, watchdog, escolha do LED e desligamento por bateria |

## 9. Mudanças em relação ao plano

- **Pareamento por ordem** (A, B, C, D) em vez de "qualquer botão". Cada botão do controle manda um código diferente e a ordem não é igual em todo controle. Apertando na ordem, a letra fica certa em qualquer modelo, inclusive no Hombrus de 3 botões.
- **Bateria baixa sem bipe periódico.** O aviso sai ao ligar e quando o choque é bloqueado.
- **USB vira choque simulado** em vez de só bloquear. Dá para testar todas as regras no computador sem ligar o módulo. O comando `bancada` libera os MOSFETs no USB para o teste com LED.
- **Desliga sozinha abaixo de 3,1 V**, para não esgotar a bateria.
