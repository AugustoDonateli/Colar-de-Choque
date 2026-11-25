# Convenções do projeto

- Textos em português do Brasil, simples e diretos. Sem frases de efeito e sem construções do tipo "não é X, é Y".
- O site é publicado como um arquivo só. Nunca edite `site/index.html` à mão: edite `site/src/` e rode `python3 site/montar.py`.
- O circuito tem uma fonte só: `site/src/js/circuito.js` (peças, ligações, esquema e, depois, o layout por furo). Mudou uma ligação? Rode `node testes/circuito.test.js`.
- O firmware fica em `firmware/coleira/`. Os números ajustáveis e as travas de segurança ficam em `config.h`. Não remova as travas (choque máximo de 1 s, pausa mínima de 3 s, 5 s por minuto).
- Mudou o firmware? Rode a simulação em `firmware/teste-no-pc/` e atualize o `README.md` do firmware e `site/src/js/dados-firmware.js`, que mostram o mesmo conteúdo.
- Antes de publicar o site, rode `python3 testes/site_teste.py`.
- A aba Montar lê o desenho furo a furo de `circuito.js` (LAYOUT). Mudou o layout? Rode `node testes/layout.test.js` e `python3 testes/montar_teste.py`.
- As regras do firmware também estão copiadas em `site/src/js/montagem-sim.js` (FWC e fwPasso). Mudou o `config.h`? Atualize lá e rode `node testes/sim.test.js`.
