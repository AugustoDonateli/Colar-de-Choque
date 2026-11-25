// =====================================================================
//  registro.h  —  mensagens no Monitor Serial
// =====================================================================
//  Só escreve se tiver um computador conectado no USB. Sem computador,
//  as mensagens são descartadas e o programa nunca fica esperando.
// =====================================================================
#pragma once
#include <stdarg.h>

static void registroIniciar() {
  Serial.begin(115200);
#if ARDUINO_USB_CDC_ON_BOOT
  // Sem isso, escrever no USB sem ninguém lendo pode travar o loop.
  Serial.setTxTimeoutMs(0);
#endif
}

static void registro(const char* formato, ...) {
  if (!Serial) return;
  char texto[200];
  va_list args;
  va_start(args, formato);
  vsnprintf(texto, sizeof(texto), formato, args);
  va_end(args);
  uint32_t s = millis() / 1000;
  Serial.printf("[%02lu:%02lu:%02lu] %s\n",
                (unsigned long)(s / 3600), (unsigned long)(s / 60 % 60),
                (unsigned long)(s % 60), texto);
}

// Para listas (comando "estado", "contador"...): sem horário na frente.
static void linha(const char* formato, ...) {
  if (!Serial) return;
  char texto[200];
  va_list args;
  va_start(args, formato);
  vsnprintf(texto, sizeof(texto), formato, args);
  va_end(args);
  Serial.println(texto);
}
