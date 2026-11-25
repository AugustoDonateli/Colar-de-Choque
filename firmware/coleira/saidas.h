// =====================================================================
//  saidas.h  —  MOSFETs, buzzer e LED
// =====================================================================
#pragma once
#include <driver/gpio.h>

// ---------------------------------------------------------------------
//  MOSFETs
//  O choque só sai com os dois ligados ao mesmo tempo (estão em série).
//  B abre a janela do choque inteira. A faz os pulsos dentro dela.
// ---------------------------------------------------------------------
static inline void mosfetA(bool ligado) { gpio_set_level((gpio_num_t)PINO_MOSFET_A, ligado ? 1 : 0); }
static inline void mosfetB(bool ligado) { gpio_set_level((gpio_num_t)PINO_MOSFET_B, ligado ? 1 : 0); }
static inline void mosfetsDesligar() {
  gpio_set_level((gpio_num_t)PINO_MOSFET_A, 0);
  gpio_set_level((gpio_num_t)PINO_MOSFET_B, 0);
}

// ---------------------------------------------------------------------
//  Buzzer: fila de bipes que não trava o programa
// ---------------------------------------------------------------------
static struct {
  uint16_t ligadoMs, desligadoMs;
  uint8_t  faltam;
  bool     tocando;
  uint32_t desde;
} bz = {};

static inline void buzzer(bool ligado) { digitalWrite(PINO_BUZZER, ligado ? HIGH : LOW); }

// Toca "vezes" bipes de "ligadoMs", com "desligadoMs" de silêncio entre eles.
static void bipar(uint16_t ligadoMs, uint16_t desligadoMs, uint8_t vezes) {
  if (vezes == 0) return;
  bz.ligadoMs = ligadoMs;
  bz.desligadoMs = desligadoMs;
  bz.faltam = vezes;
  bz.tocando = true;
  bz.desde = millis();
  buzzer(true);
}

static void bipeCancelar() {
  bz.faltam = 0;
  bz.tocando = false;
  buzzer(false);
}

static bool bipeTocando() { return bz.faltam > 0; }

static void buzzerAtualizar(uint32_t agora) {
  if (bz.faltam == 0) return;
  if (bz.tocando) {
    if (agora - bz.desde >= bz.ligadoMs) {
      buzzer(false);
      bz.tocando = false;
      bz.desde = agora;
      bz.faltam--;
    }
  } else if (agora - bz.desde >= bz.desligadoMs) {
    buzzer(true);
    bz.tocando = true;
    bz.desde = agora;
  }
}

// Sinais sonoros usados no programa (o README tem a tabela completa)
static void sinalCurto(uint8_t vezes) { bipar(80, 150, vezes); }
static void sinalOk()                 { bipar(700, 0, 1); }
static void sinalErro()               { bipar(500, 300, 3); }
static void sinalApagouTudo()         { bipar(60, 60, 5); }

// ---------------------------------------------------------------------
//  LED
// ---------------------------------------------------------------------
enum ModoLed : uint8_t { LED_NORMAL, LED_BATERIA, LED_PAREANDO, LED_USB, LED_BANCADA, LED_CHOQUE };

static uint32_t ledAcesoAte = 0;  // para acender por um tempo (ex.: 1 s ao ligar)

static inline void led(bool aceso) {
  digitalWrite(PINO_LED, (aceso != LED_ACENDE_EM_LOW) ? HIGH : LOW);
}

static void ledAcenderPor(uint32_t ms) { ledAcesoAte = millis() + ms; }

static void ledAtualizar(uint32_t agora, ModoLed modo) {
  bool aceso;
  if ((int32_t)(ledAcesoAte - agora) > 0) {
    aceso = true;
  } else {
    switch (modo) {
      case LED_CHOQUE:   aceso = true; break;                          // aceso durante o choque
      case LED_USB:      aceso = true; break;                          // aceso direto
      case LED_PAREANDO: aceso = (agora % 200) < 100; break;           // pisca rápido
      case LED_BANCADA:  aceso = (agora % 1000) < 500; break;          // pisca devagar
      case LED_BATERIA: {                                              // 2 piscadinhas a cada 3 s
        uint32_t f = agora % 3000;
        aceso = f < 60 || (f >= 250 && f < 310);
        break;
      }
      default:           aceso = (agora % 3000) < 60; break;           // 1 piscadinha a cada 3 s
    }
  }
  led(aceso);
}

// ---------------------------------------------------------------------
//  Primeira coisa do setup: MOSFETs desligados
// ---------------------------------------------------------------------
static void saidasIniciar() {
  // Os resistores de 10 kΩ já seguram as portas em 0 V até aqui.
  // Agora o próprio ESP32 passa a segurar em LOW.
  pinMode(PINO_MOSFET_A, OUTPUT);
  pinMode(PINO_MOSFET_B, OUTPUT);
  mosfetsDesligar();
  pinMode(PINO_BUZZER, OUTPUT);
  buzzer(false);
  pinMode(PINO_LED, OUTPUT);
  led(false);
}
