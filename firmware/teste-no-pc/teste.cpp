// Simulação no PC da lógica do firmware (tempo, rádio, bateria, timer de corte).
#include "Arduino.h"
#include "esp_timer.h"
#include <map>
#include <utility>

namespace sim {
  uint32_t agora = 0;
  int pinos[32] = {};
  uint32_t adcMv = 1950;  // 3,9 V de bateria
  std::string entradaSerial;
  bool imprimir = false;
  sim_timer timer = {};
  int timersCriados = 0;
  uint32_t wdtUltimo = 0, wdtMaiorIntervalo = 0, wdtTimeout = 0;
  bool wdtAtivo = false;
  bool dormiu = false;
  std::map<std::string, std::vector<uint8_t>> flash;
  int gravacoes = 0;
  bool rfCheio = false;
  uint32_t rfValor = 0;
  uint8_t rfBits = 0;
}
MockSerial Serial;
MockESP ESP;

#include "../coleira/coleira.ino"

// ---------------- medição ----------------
struct Quadro { uint32_t valor; uint8_t bits; };
static std::multimap<uint32_t, Quadro> quadros;
struct Janela { uint32_t ini, fim, msA; };
static std::vector<Janela> janelas;
static bool dentro = false;
static uint32_t msBuzzer = 0, msSoA = 0, msSoB = 0;
static uint32_t choqueSemTimerArmado = 0;
static uint32_t soltarBotaoEm = 0;

namespace sim {
void tick(uint32_t ms) {
  for (uint32_t i = 0; i < ms; i++) {
    agora++;
    if (soltarBotaoEm && agora >= soltarBotaoEm) { pinos[PINO_BOTAO] = HIGH; soltarBotaoEm = 0; }
    if (timer.ativo && (uint64_t)agora * 1000ULL >= timer.prazoUs) { timer.ativo = false; timer.cb(timer.arg); }
    while (!quadros.empty() && quadros.begin()->first <= agora) {
      rfCheio = true; rfValor = quadros.begin()->second.valor; rfBits = quadros.begin()->second.bits;
      quadros.erase(quadros.begin());
    }
    bool a = pinos[PINO_MOSFET_A], b = pinos[PINO_MOSFET_B];
    if (pinos[PINO_BUZZER]) msBuzzer++;
    if (a && b) {
      if (!dentro) { janelas.push_back({agora, agora, 0}); dentro = true; }
      janelas.back().fim = agora; janelas.back().msA++;
      if (!timer.ativo) choqueSemTimerArmado++;
    } else {
      dentro = false;
      if (a) msSoA++;
      if (b) msSoB++;
    }
  }
}
}

static void rodar(uint32_t ms) { uint32_t fim = sim::agora + ms; while ((int32_t)(sim::agora - fim) < 0) loop(); }
static void apertar(uint32_t codigo, uint32_t segurarMs, uint8_t bits = 24) {
  for (uint32_t t = 0; t < segurarMs; t += 40) quadros.insert({sim::agora + t + 1, {codigo, bits}});
}
static void comando(const char* c) { sim::entradaSerial += c; sim::entradaSerial += "\n"; }
static void zerarMedidas() { janelas.clear(); msBuzzer = msSoA = msSoB = 0; }

static int falhas = 0, oks = 0;
static void conferir(bool cond, const char* oque) {
  printf("  [%s] %s\n", cond ? " OK " : "FALHOU", oque);
  if (cond) oks++; else falhas++;
}
static uint32_t duracaoJanela(const Janela& j) { return j.fim - j.ini + 1; }

// controle 1 (ABCD) e outros
static const uint32_t A1 = 0x5A5A51, B1 = 0x5A5A52, C1 = 0x5A5A54, D1 = 0x5A5A58;

static void parearControle(uint32_t base, int botoes) {
  comando("parear"); rodar(100);
  for (int i = 0; i < botoes; i++) { apertar(base + i, 300); rodar(1500); }
}

int main(int argc, char** argv) {
  std::string modo = argc > 1 ? argv[1] : "";
  sim::imprimir = (modo == "ver");
  sim::pinos[PINO_BOTAO] = HIGH;  // botão solto
  if (modo == "botao1" || modo == "botao10") {
    sim::imprimir = true;
    // já tem um controle salvo
    Controle c = {}; c.usado = 1; c.qtdBotoes = 4; c.botao[0] = {A1, 24, 1, {0, 0}};
    std::vector<uint8_t> v(sizeof(Controle) * MAX_CONTROLES, 0); memcpy(v.data(), &c, sizeof(c));
    sim::flash["controles"] = v;
    sim::pinos[PINO_BOTAO] = LOW;
    soltarBotaoEm = (modo == "botao1") ? 1500 : 11000;
    setup(); rodar(1000);
    printf("pareando=%d controles=%u buzzer_ms=%u\n", par.ativo, controlesQtd(), msBuzzer);
    return 0;
  }
  setup();
  rodar(500);
  conferir(sim::timersCriados == 1, "timer de corte criado");
  conferir(sim::wdtAtivo && sim::wdtTimeout == 2000, "watchdog de 2 s ligado");
  conferir(bat.estado == BAT_BOA, "bateria 3,9 V = boa");

  printf("\n1) Pareamento com comando, botões A B C D\n");
  comando("parear"); rodar(100);
  // manual: códigos do chaveiro não são sequenciais
  apertar(A1, 300); rodar(1500); apertar(B1, 300); rodar(1500);
  apertar(B1, 300); rodar(1500);  // repetido: deve ignorar
  apertar(C1, 300); rodar(1500); apertar(D1, 300); rodar(1500);
  conferir(!par.ativo, "saiu do pareamento sozinho com 4 botões");
  conferir(controlesQtd() == 1 && controles[0].qtdBotoes == 4, "1 controle com 4 botões salvo");
  conferir(controles[0].botao[1].valor == B1 && controles[0].botao[3].valor == D1, "B e D na ordem certa (repetido ignorado)");
  rodar(3000);

  printf("\n2) Botão A: só bipe\n");
  zerarMedidas(); apertar(A1, 200); rodar(2000);
  conferir(janelas.empty(), "nenhum choque");
  conferir(msBuzzer >= 495 && msBuzzer <= 510, "bipe de ~500 ms");

  printf("\n3) Botão B: bipe 300, espera 200, 500 ms em pulsos 30/70\n");
  zerarMedidas(); uint32_t t0 = sim::agora; apertar(B1, 200); rodar(2000);
  { uint32_t a = 0; for (auto& j : janelas) a += j.msA;
    printf("     começou %u ms após apertar, %zu pulsos, choque real %u ms, B aberto %u ms\n",
           janelas.empty() ? 0 : janelas[0].ini - t0, janelas.size(), a, a + msSoB);
    conferir(janelas.size() == 5, "5 pulsos");
    conferir(a >= 148 && a <= 152 && a + msSoB >= 495 && a + msSoB <= 505, "B aberto ~500 ms, choque real ~150 ms");
    conferir(msSoA == 0, "A nunca ficou ligado sozinho fora da janela"); }
  conferir(msBuzzer >= 295 && msBuzzer <= 305, "bipe de aviso ~300 ms");

  printf("\n4) B de novo 1 s depois: pausa de 3 s bloqueia, sem bipe\n");
  zerarMedidas(); rodar(1000); apertar(B1, 200); rodar(1000);
  conferir(janelas.empty() && msBuzzer == 0, "ignorado sem choque e sem bipe");
  conferir(contador.bloqueios[BLOQ_PAUSA] == 1, "contou 1 bloqueio por pausa");

  printf("\n5) Segurar D por 10 s: um choque só, de 1 s\n");
  rodar(3000); zerarMedidas(); apertar(D1, 10000); rodar(12000);
  conferir(janelas.size() == 1, "1 choque só");
  if (!janelas.empty()) printf("     janela %u ms, A %u ms\n", duracaoJanela(janelas[0]), janelas[0].msA);
  conferir(janelas.size() == 1 && duracaoJanela(janelas[0]) >= 995 && duracaoJanela(janelas[0]) <= 1005, "choque contínuo de ~1000 ms");

  printf("\n6) Nível C: 70/30\n");
  rodar(3000); zerarMedidas(); apertar(C1, 200); rodar(2000);
  conferir(janelas.size() >= 1, "choque aconteceu");
  { uint32_t a = 0; for (auto& j : janelas) a += j.msA; printf("     A+B juntos %u ms em 5 pulsos\n", a);
    conferir(a >= 345 && a <= 355, "C dá ~350 ms de choque real (mais que os 150 do B)"); }

  printf("\n7) Limite de 5 s por minuto (D a cada 4,6 s)\n");
  rodar(61000); zerarMedidas();
  uint32_t antes = contador.bloqueios[BLOQ_LIMITE];
  for (int i = 0; i < 8; i++) { apertar(D1, 200); rodar(4600); }
  printf("     choques: %zu, bloqueados por limite: %u\n", janelas.size(), contador.bloqueios[BLOQ_LIMITE] - antes);
  conferir(janelas.size() == 5, "só 5 choques de 1 s no minuto");
  bool pausaOk = true;
  for (size_t i = 1; i < janelas.size(); i++) if (janelas[i].ini - janelas[i - 1].fim < 3000) pausaOk = false;
  conferir(pausaOk, "sempre 3 s ou mais entre choques");

  printf("\n8) USB ligado: choque simulado, MOSFETs parados\n");
  rodar(61000); sim::adcMv = 2450; rodar(2000);
  conferir(bat.estado == BAT_USB, "detectou USB (4,9 V)");
  zerarMedidas(); apertar(C1, 200); rodar(2000);
  conferir(janelas.empty() && msSoA == 0 && msSoB == 0, "nenhum MOSFET ligou");
  conferir(msBuzzer >= 295, "bipe tocou (sequência simulada)");
  comando("bancada"); rodar(3500); zerarMedidas(); apertar(C1, 200); rodar(2000);
  conferir(modoBancada && janelas.size() >= 1, "modo bancada: MOSFETs ligam com USB");

  printf("\n9) Tira o USB: volta para bateria e desliga o modo bancada\n");
  sim::adcMv = 1950; rodar(8000);
  conferir(bat.estado == BAT_BOA && !modoBancada, "bateria boa e bancada desligada");

  printf("\n10) Bateria no fim (3,2 V): bloqueia com 3 bipes\n");
  sim::adcMv = 1600; rodar(15000);
  conferir(bat.estado == BAT_NO_FIM, "estado no fim");
  zerarMedidas(); apertar(B1, 200); rodar(2000);
  conferir(janelas.empty() && msBuzzer >= 230 && msBuzzer <= 250, "sem choque, 3 bipes curtos");
  sim::adcMv = 1950; rodar(15000);
  conferir(bat.estado == BAT_BOA, "voltou a boa");

  printf("\n11) Corte duro: loop trava no meio do choque D\n");
  rodar(4000); zerarMedidas(); apertar(D1, 200);
  while (ch.estado != CHOQUE) loop();
  sim::tick(1500);  // nenhuma volta do loop por 1,5 s
  conferir(janelas.size() == 1 && duracaoJanela(janelas[0]) <= 1031, "timer cortou em <= 1030 ms sem o loop");
  if (!janelas.empty()) printf("     janela %u ms\n", duracaoJanela(janelas[0]));
  rodar(500);
  conferir(contador.cortesSeguranca == 1 && ch.estado == PARADO, "contou 1 corte de segurança e voltou a parado");

  printf("\n12) Ruído e controle desconhecido\n");
  rodar(4000); zerarMedidas();
  quadros.insert({sim::agora + 1, {B1, 24}}); rodar(1000);       // 1 quadro só
  apertar(0x123456, 500); rodar(1000);                         // não pareado
  apertar(B1 & 0xFF, 500, 8); rodar(1000);                     // curto demais
  conferir(janelas.empty() && msBuzzer == 0, "nada aconteceu");

  printf("\n13) Controle de 3 botões: salva sozinho depois de 15 s\n");
  parearControle(0x700001, 3); rodar(16000);
  conferir(!par.ativo && controlesQtd() == 2, "2 controles salvos");
  conferir(controles[1].qtdBotoes == 3, "o segundo com 3 botões");

  printf("\n14) Parear de novo o mesmo controle substitui\n");
  comando("parear"); rodar(100);
  apertar(A1, 300); rodar(1500); apertar(B1, 300); rodar(1500); apertar(C1, 300); rodar(1500); apertar(D1, 300); rodar(1500);
  conferir(controlesQtd() == 2, "continua 2 controles");

  printf("\n15) Memória cheia\n");
  parearControle(0x710001, 4); parearControle(0x720001, 4); rodar(2000);
  conferir(controlesQtd() == 4, "4 controles");
  parearControle(0x730001, 4); rodar(2000);
  conferir(controlesQtd() == 4 && controleProcurar(Codigo{0x730001, 24, 1, {0, 0}}) < 0, "o 5º não entrou");

  printf("\n16) Nenhum botão no pareamento: cancela em 60 s\n");
  comando("parear"); rodar(61000);
  conferir(!par.ativo, "saiu do pareamento");

  printf("\n17) Comandos não dão choque\n");
  zerarMedidas();
  comando("estado"); comando("contador"); comando("controles"); comando("bipe"); comando("ouvir"); comando("ouvir");
  comando("xyz"); comando("calibrar 3900"); rodar(2000);
  conferir(janelas.empty(), "nenhum choque");
  conferir(calibracao > 0.99f && calibracao < 1.01f, "calibrar 3900 com leitura 3900 mantém fator ~1");

  printf("\n18) Watchdog alimentado sempre\n");
  printf("     maior intervalo entre alimentações: %u ms\n", sim::wdtMaiorIntervalo);
  conferir(sim::wdtMaiorIntervalo < 1600, "bem abaixo de 2 s (o 1,5 s é do teste 11)");
  conferir(choqueSemTimerArmado == 0, "nunca teve choque sem o corte duro armado");
  conferir(sim::gravacoes < 200, "poucas gravações na flash");
  printf("     gravações na flash: %d\n", sim::gravacoes);

  printf("\n19) Bateria esgotada (3,0 V por 30 s): desliga\n");
  sim::adcMv = 1500;
  try { rodar(60000); } catch (DormiuSim&) {}
  conferir(sim::dormiu, "entrou em sono profundo");
  conferir(sim::pinos[PINO_MOSFET_A] == 0 && sim::pinos[PINO_MOSFET_B] == 0, "MOSFETs desligados");

  printf("\nResultado: %d OK, %d falhas\n", oks, falhas);
  return falhas ? 1 : 0;
}
