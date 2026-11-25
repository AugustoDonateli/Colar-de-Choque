# Coleira de choque remoto para boi

Protótipo brasileiro e barato de coleira de choque com controle remoto, para treino de cavalos (o boi usa a coleira e o choque faz ele andar ou parar). Uma coleira de teste vai para um comprador usar e dar retorno antes da versão final.

**Situação:** compras em andamento. Firmware v0.1 escrito e testado em simulação. Montagem e testes de bancada ainda não começaram.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `site/` | O site do projeto: aula e modelo 3D, lista de compras, montagem, testes e firmware. `site/index.html` é gerado a partir de `site/src/` |
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

## Próximos passos

1. ~~Juntar o site de compras e o modelo 3D num site só~~ (feito)
2. Bancada simulada: protoboard na tela, multímetro virtual, controle e corrente aparecendo nos fios
3. Protoboard completa, passo a passo
4. Aula e treino de solda
5. Placa ilhada (depois de medir as peças reais)
6. Caixa e coleira em 3D, passo a passo

## Avisos

Uso só para treino na propriedade. Aparelho de choque é proibido em rodeios (Lei 10.519/2002) e maus-tratos a animais é crime (Lei 9.605/1998).
