// =====================================================================
//  sistema.h  —  botão ao ligar, watchdog, desligar por bateria, LED
// =====================================================================
#pragma once
#include <esp_task_wdt.h>
#include <esp_sleep.h>

// Segurou o botão de pareamento ao ligar?
//  - soltou antes de 1 s: liga normal
//  - 1 s: 2 bipes, LED pisca rápido -> pode soltar, entra no pareamento
//  - 10 s: apaga todos os controles (5 bipes rápidos) e entra no pareamento
static bool verificarBotaoAoLigar() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  delay(30);
  if (digitalRead(PINO_BOTAO) != LOW) return false;

  uint32_t inicio = millis();
  bool avisouPareamento = false;
  while (digitalRead(PINO_BOTAO) == LOW) {
    uint32_t segurando = millis() - inicio;
    buzzerAtualizar(millis());
    if (!avisouPareamento && segurando >= BOTAO_PAREAR_MS) {
      avisouPareamento = true;
      sinalCurto(2);
    }
    if (segurando >= BOTAO_APAGAR_MS) {
      controlesApagar();
      sinalApagouTudo();
      registro("Botão segurado 10 s: todos os controles apagados.");
      while (bipeTocando()) { buzzerAtualizar(millis()); delay(1); }
      break;
    }
    led(avisouPareamento ? (millis() % 200) < 100 : true);
    delay(5);
  }
  led(false);
  return avisouPareamento;
}

static void watchdogIniciar() {
  esp_task_wdt_config_t cfg = {};
  cfg.timeout_ms = WATCHDOG_MS;
  cfg.idle_core_mask = 0;     // vigia só o loop
  cfg.trigger_panic = true;   // travou: reinicia
  if (esp_task_wdt_reconfigure(&cfg) != ESP_OK) esp_task_wdt_init(&cfg);
  esp_task_wdt_add(NULL);     // NULL = esta tarefa (a do loop)
}

static void desligarPorBateria() {
  mosfetsDesligar();
  registro("Bateria esgotada (%u mV). Desligando para proteger a bateria.", bat.mv);
  registro("Carregue e ligue a chave de novo.");
  if (contadorMudou) contadorSalvarAgora();
  bipeCancelar();
  for (uint8_t i = 0; i < 3; i++) {
    buzzer(true);  delay(500); esp_task_wdt_reset();
    buzzer(false); delay(300); esp_task_wdt_reset();
  }
  led(false);
  esp_deep_sleep_start();  // sem forma de acordar: só desligando e ligando a chave
}

static ModoLed escolherModoLed() {
  if (ch.estado == CHOQUE && !ch.simulado) return LED_CHOQUE;
  if (par.ativo) return LED_PAREANDO;
  if (bat.estado == BAT_USB) return modoBancada ? LED_BANCADA : LED_USB;
  if (bat.estado == BAT_BAIXA || bat.estado == BAT_NO_FIM) return LED_BATERIA;
  return LED_NORMAL;
}
