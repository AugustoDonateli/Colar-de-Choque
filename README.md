# Coleira de choque remoto para boi

Protótipo brasileiro e barato de coleira de choque com controle remoto, para treino de cavalos (o boi usa a coleira e o choque faz ele andar ou parar). Uma coleira de teste vai para um comprador usar e dar retorno antes da versão final.

**Situação:** compras em andamento. Firmware v0.1 escrito e testado em simulação. A montagem guiada, com bancada simulada, está pronta no site. Montagem real e testes de bancada ainda não começaram.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `site/` | O site do projeto: aula e modelo 3D, lista de compras, montagem guiada com simulador, testes e firmware. `site/index.html` é gerado a partir de `site/src/` |
| `firmware/coleira/` | Programa do ESP32-C3 (Arduino). O `README.md` de lá explica como gravar e o roteiro de teste |
| `firmware/teste-no-pc/` | Simulação do firmware no computador, com 44 conferências das regras de segurança |
| `testes/` | Testes do site no navegador e conferência do circuito |

## Como funciona, em uma frase por peça

- **Controle de 433 MHz** com 4 botões: A só bipa; B, C e D dão bipe de aviso e choque fraco, médio ou forte.
- **Receptor RXB6** pega o sinal e entrega ao **ESP32-C3 SuperMini**, que confere o código e as regras.
- **Dois MOSFETs IRLZ44N em série** ligam o **módulo de alta tensão**. Os dois precisam ligar ao mesmo tempo, então um queimado sozinho não dá choque.
- O módulo solta pulsos de alta tensão e pouca corrente em **dois pinos de inox** encostados no couro.
- **Bateria 18650** com carregador **TP4056** e conector USB-C vedado.

## Regras de segurança do firmware

- Nenhum choque passa de 1 s.
- Pelo menos 3 s entre um choque e outro.
- No máximo 5 s de choque somados por minuto.
- Bipe de aviso antes de todo choque.
- Choque bloqueado com bateria abaixo de 3,3 V.
- Com USB ligado, o choque é só simulado.
- Corte duro por timer, watchdog de 2 s e resistores que seguram os MOSFETs desligados.

Choque nunca se testa em pessoa.

## Para quem vai mexer no código

Site (precisa de Python 3):

```
python3 site/montar.py          # gera site/index.html a partir de site/src
node testes/circuito.test.js    # confere a tabela de ligações contra o esquema
python3 testes/site_teste.py    # abre o site num Chromium e testa as abas (precisa do Playwright)
```

Firmware no computador (precisa de g++):

```
cd firmware/teste-no-pc
g++ -std=gnu++17 -Imock -x c++ teste.cpp -o teste && ./teste
```

Compilar para o ESP32: Arduino IDE 2, pacote esp32 da Espressif 3.3 ou mais novo, biblioteca rc-switch, placa "ESP32C3 Dev Module" com "USB CDC On Boot" ligado. Detalhes em `firmware/coleira/README.md`.

## Montagem guiada (aba Montar do site)

7 capítulos e 81 passos: antes de começar, conhecer as peças, protoboard por partes, choque com LED de teste, solda (com treino na tela), placa ilhada e caixa com coleira. Cada passo deixa fazer na tela e confere: peça no furo certo, polaridade, jumpers, soldas, pontes e fios. O simulador calcula as tensões (multímetro virtual), roda uma cópia das regras do firmware e mostra a corrente nos fios.

| Arquivo em `site/src/js/` | O que faz |
|---|---|
| `circuito.js` | Peças, tabela de ligações, esquema e o desenho furo a furo da protoboard e da placa |
| `montagem-sim.js` | Rede elétrica, conta das tensões, firmware em JavaScript e multímetro |
| `montagem-pecas.js` | Desenho das peças, da protoboard e da placa |
| `montagem-passos.js` | Os capítulos e os textos de cada passo |
| `montagem-ui.js` | A aba Montar: cliques, conferência, treino de solda e "Não entendi" |

A placa ilhada foi desenhada com as medidas dos anúncios. Confira com as peças reais antes de soldar (capítulo 5, passo 1).

Testes:

```
node testes/layout.test.js       # protoboard e placa batem com o esquema
node testes/sim.test.js          # simulador e firmware em JavaScript
python3 testes/montar_teste.py   # passa pelos 81 passos num navegador
```

## Avisos

Uso só para treino na propriedade. Aparelho de choque é proibido em rodeios (Lei 10.519/2002) e maus-tratos a animais é crime (Lei 9.605/1998).
