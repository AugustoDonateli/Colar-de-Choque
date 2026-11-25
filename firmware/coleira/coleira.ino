// =====================================================================
//  Coleira de choque remoto para boi — firmware v0.1
//  Placa: ESP32-C3 SuperMini ("ESP32C3 Dev Module", USB CDC On Boot: Enabled)
//  Biblioteca: rc-switch (sui77)
// =====================================================================
//  Arquivos (abas na IDE):
//   config.h    números ajustáveis e travas de segurança
//   registro.h  mensagens no Monitor Serial
//   saidas.h    MOSFETs, buzzer e LED
//   memoria.h   controles pareados, contador, calibração
//   bateria.h   leitura da bateria e detecção de USB
//   radio.h     controle 433 MHz e pareamento
//   choque.h    sequência do choque e regras
//   comandos.h  comandos do Monitor Serial
//   sistema.h   botão ao ligar, watchdog, LED, desligar por bateria
//  O README.md explica como gravar e testar, em ordem.
// =====================================================================
#include <Arduino.h>

#include "config.h"
#include "registro.h"
#include "saidas.h"
#include "memoria.h"
#include "bateria.h"
#include "radio.h"
#include "choque.h"
#include "comandos.h"
#include "sistema.h"

void setup() {
  saidasIniciar();              // 1º: MOSFETs em LOW
  setCpuFrequencyMhz(CPU_MHZ);
  registroIniciar();
  memoriaIniciar();
  bateriaIniciar();
  radioIniciar();
  choqueIniciar();

  bool parear = verificarBotaoAoLigar();
  watchdogIniciar();

  registro("Coleira %s ligada. Último reinício: %s.", FW_VERSAO, NOME_REINICIO[ultimoReinicio]);
  registro("Bateria: %u mV (%s). Controles pareados: %u. Digite ajuda para ver os comandos.",
           bat.mv, NOME_BATERIA[bat.estado], controlesQtd());

  if (parear) {
    pareamentoIniciar(false);  // os 2 bipes já tocaram com o botão
  } else {
    ledAcenderPor(1000);
    switch (bat.estado) {
      case BAT_BOA:    sinalCurto(1); break;
      case BAT_BAIXA:  sinalCurto(2); break;
      case BAT_NO_FIM: sinalCurto(3); break;
      case BAT_USB:    sinalCurto(1); break;
    }
    if (controlesQtd() == 0) registro("Nenhum controle pareado. Use o botão ao ligar ou digite parear.");
  }
}

void loop() {
  esp_task_wdt_reset();
  uint32_t agora = millis();

  comandosAtualizar();

  Codigo c;
  if (radioNovoAperto(c)) {
    if (par.ativo) {
      pareamentoReceber(c);
    } else {
      int botao = controleProcurar(c);
      if (botao >= 0) choquePedir((uint8_t)botao, agora);
      else if (radioOuvir) registro("Código não pareado: nada a fazer.");
    }
  }

  pareamentoAtualizar(agora);
  choqueAtualizar(agora);

  bool podeMedir = choqueParado() && (!ch.jaHouveChoque || agora - ch.fimUltimo >= BAT_DESCANSO_MS);
  bateriaAtualizar(agora, podeMedir);
  if (bat.pedeDesligar && choqueParado()) desligarPorBateria();

  buzzerAtualizar(agora);
  ledAtualizar(agora, escolherModoLed());
  memoriaAtualizar(agora, choqueParado());

  delay(1);  // dá folga para o sistema e economiza bateria
}
