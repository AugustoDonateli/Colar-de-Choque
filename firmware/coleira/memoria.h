// =====================================================================
//  memoria.h  —  o que fica guardado mesmo desligando a chave
// =====================================================================
//  Usa a memória flash do ESP32 (biblioteca Preferences). Guarda:
//   - os controles pareados (até 4, com os códigos dos botões A a D)
//   - o contador de uso (bipes, choques, bloqueios, reinícios)
//   - a calibração da leitura da bateria
//  O contador só é gravado com a coleira parada, nunca durante um choque.
// =====================================================================
#pragma once
#include <Preferences.h>
#include <esp_system.h>

static Preferences prefs;

// ---------------------------------------------------------------------
//  Controles
// ---------------------------------------------------------------------
struct Codigo {
  uint32_t valor;
  uint8_t  bits;
  uint8_t  protocolo;
  uint8_t  reservado[2];
};

struct Controle {
  uint8_t usado;
  uint8_t qtdBotoes;      // 4 no chaveiro ABCD, 3 num controle de portão de 3 botões
  uint8_t reservado[2];
  Codigo  botao[4];       // botao[0] = A, [1] = B, [2] = C, [3] = D
};

static Controle controles[MAX_CONTROLES];

static const char LETRA[4] = { 'A', 'B', 'C', 'D' };

static bool mesmoCodigo(const Codigo& x, const Codigo& y) {
  return x.valor == y.valor && x.bits == y.bits;
}

// Devolve 0 a 3 (A a D) se o código for de um controle pareado, ou -1.
static int controleProcurar(const Codigo& c) {
  for (uint8_t i = 0; i < MAX_CONTROLES; i++) {
    if (!controles[i].usado) continue;
    for (uint8_t b = 0; b < controles[i].qtdBotoes && b < 4; b++) {
      if (mesmoCodigo(controles[i].botao[b], c)) return b;
    }
  }
  return -1;
}

static uint8_t controlesQtd() {
  uint8_t n = 0;
  for (uint8_t i = 0; i < MAX_CONTROLES; i++) if (controles[i].usado) n++;
  return n;
}

static void controlesSalvar() {
  prefs.putBytes("controles", controles, sizeof(controles));
}

static void controlesApagar() {
  memset(controles, 0, sizeof(controles));
  controlesSalvar();
}

// ---------------------------------------------------------------------
//  Contador de uso
// ---------------------------------------------------------------------
enum MotivoBloqueio : uint8_t { BLOQ_PAUSA, BLOQ_LIMITE, BLOQ_BATERIA, BLOQ_QTD };
static const char* const NOME_BLOQUEIO[BLOQ_QTD] = { "pausa de 3 s", "limite de 5 s por minuto", "bateria no fim" };

enum MotivoReinicio : uint8_t { REI_LIGOU, REI_SOFTWARE, REI_WATCHDOG, REI_QUEDA_TENSAO, REI_TRAVOU, REI_OUTRO, REI_QTD };
static const char* const NOME_REINICIO[REI_QTD] = {
  "ligou pela chave", "reinício pelo programa ou USB", "watchdog (programa travou)",
  "queda de tensão", "erro grave no programa", "outro"
};

struct Contador {
  uint32_t bipes;                   // botão A
  uint32_t choques[3];              // B, C, D
  uint32_t msChoque;                // tempo total de choque
  uint32_t bloqueios[BLOQ_QTD];
  uint32_t reinicios[REI_QTD];
  uint32_t cortesSeguranca;         // vezes que o corte duro precisou agir
};

static Contador contador;
static bool     contadorMudou = false;
static uint32_t contadorMudouEm = 0;
static MotivoReinicio ultimoReinicio = REI_OUTRO;

static void contadorMarcar() {
  contadorMudou = true;
  contadorMudouEm = millis();
}

static void contadorSalvarAgora() {
  prefs.putBytes("contador", &contador, sizeof(contador));
  contadorMudou = false;
}

static void contadorZerar() {
  memset(&contador, 0, sizeof(contador));
  contadorSalvarAgora();
}

// Grava 2 s depois da última mudança, e só com a coleira parada.
static void memoriaAtualizar(uint32_t agora, bool parado) {
  if (contadorMudou && parado && agora - contadorMudouEm >= 2000) contadorSalvarAgora();
}

// ---------------------------------------------------------------------
//  Calibração da bateria
// ---------------------------------------------------------------------
static float calibracao = 1.0f;

static void calibracaoSalvar(float c) {
  calibracao = c;
  prefs.putFloat("calib", c);
}

// ---------------------------------------------------------------------
static MotivoReinicio lerMotivoReinicio() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:   return REI_LIGOU;
    case ESP_RST_SW:
    case ESP_RST_USB:       return REI_SOFTWARE;
    case ESP_RST_TASK_WDT:
    case ESP_RST_INT_WDT:
    case ESP_RST_WDT:       return REI_WATCHDOG;
    case ESP_RST_BROWNOUT:  return REI_QUEDA_TENSAO;
    case ESP_RST_PANIC:     return REI_TRAVOU;
    default:                return REI_OUTRO;
  }
}

static void memoriaIniciar() {
  prefs.begin("coleira", false);

  if (prefs.getBytesLength("controles") == sizeof(controles)) {
    prefs.getBytes("controles", controles, sizeof(controles));
  } else {
    memset(controles, 0, sizeof(controles));
  }

  if (prefs.getBytesLength("contador") == sizeof(contador)) {
    prefs.getBytes("contador", &contador, sizeof(contador));
  } else {
    memset(&contador, 0, sizeof(contador));
  }

  calibracao = prefs.getFloat("calib", 1.0f);
  if (!(calibracao >= 0.8f && calibracao <= 1.2f)) calibracao = 1.0f;

  ultimoReinicio = lerMotivoReinicio();
  contador.reinicios[ultimoReinicio]++;
  contadorMarcar();
}
