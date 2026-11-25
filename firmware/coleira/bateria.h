// =====================================================================
//  bateria.h  —  mede a tensão do barramento + e decide o estado
// =====================================================================
//  Lê o meio do divisor 100k/100k no GPIO 0 e multiplica por 2.
//  Estados:
//   boa     — tudo normal
//   baixa   — abaixo de 3,5 V: ainda dá choque, LED avisa
//   no fim  — abaixo de 3,3 V: choque bloqueado
//   USB     — acima de 4,4 V: o USB do computador está empurrando 5 V
//             no barramento. O choque vira "simulado" (sem ligar MOSFET).
//  Abaixo de 3,1 V por 30 s seguidos, a coleira desliga sozinha para não
//  esgotar a bateria (volta ligando a chave de novo, depois de carregar).
//
//  Se o divisor soltar ou quebrar, a leitura vai para 0 V (bloqueia) ou
//  para o máximo (cai em USB, choque simulado). Nos dois casos, sem choque.
// =====================================================================
#pragma once

enum EstadoBateria : uint8_t { BAT_BOA, BAT_BAIXA, BAT_NO_FIM, BAT_USB };
static const char* const NOME_BATERIA[] = { "boa", "baixa", "no fim", "USB ligado" };

static struct {
  uint16_t mv;          // tensão filtrada (média das últimas leituras)
  uint16_t mvBruto;     // última leitura
  EstadoBateria estado;
  uint32_t ultimaMedida;
  uint32_t abaixoDesde; // 0 = não está abaixo do limite de desligar
  bool pedeDesligar;
} bat = {};

static bool modoBancada = false;  // ver comando "bancada" em comandos.h

static uint16_t bateriaLer() {
  uint32_t soma = 0;
  for (uint8_t i = 0; i < 16; i++) soma += analogReadMilliVolts(PINO_BATERIA);
  float mv = (soma / 16.0f) * DIVISOR_BATERIA * calibracao;
  if (mv < 0) mv = 0;
  if (mv > 9999) mv = 9999;
  return (uint16_t)mv;
}

// Com "histerese": para sair de um estado precisa passar um pouco do limite.
// Assim o estado não fica pulando quando a tensão está bem na divisa.
static EstadoBateria bateriaClassificar(uint16_t mv, EstadoBateria atual) {
  if (mv >= USB_ENTRA_MV) return BAT_USB;
  if (atual == BAT_USB && mv >= USB_SAI_MV) return BAT_USB;
  if (mv < BAT_NO_FIM_MV) return BAT_NO_FIM;
  if (atual == BAT_NO_FIM && mv < BAT_NO_FIM_SAI_MV) return BAT_NO_FIM;
  if (mv < BAT_BAIXA_MV) return BAT_BAIXA;
  if ((atual == BAT_BAIXA || atual == BAT_NO_FIM) && mv < BAT_BAIXA_SAI_MV) return BAT_BAIXA;
  return BAT_BOA;
}

static void bateriaIniciar() {
  analogReadResolution(12);
  analogSetPinAttenuation(PINO_BATERIA, ADC_11db);  // mede até uns 2,5 V no pino
  bat.mvBruto = bateriaLer();
  bat.mv = bat.mvBruto;
  bat.estado = bateriaClassificar(bat.mv, BAT_BOA);
  bat.ultimaMedida = millis();
}

// podeMedir: só com a coleira parada e 2 s depois do último choque,
// porque logo depois do choque a tensão ainda está caída.
static void bateriaAtualizar(uint32_t agora, bool podeMedir) {
  if (!podeMedir || agora - bat.ultimaMedida < BAT_INTERVALO_MS) return;
  bat.ultimaMedida = agora;

  uint16_t bruto = bateriaLer();
  bat.mvBruto = bruto;
  // USB entra na hora (é regra de segurança). O resto usa média.
  if (bruto >= USB_ENTRA_MV) bat.mv = bruto;
  else bat.mv = (uint16_t)(((uint32_t)bat.mv * 3 + bruto) / 4);

  EstadoBateria novo = (bruto >= USB_ENTRA_MV) ? BAT_USB : bateriaClassificar(bat.mv, bat.estado);
  if (novo != bat.estado) {
    registro("Bateria: %s -> %s (%u mV)", NOME_BATERIA[bat.estado], NOME_BATERIA[novo], bat.mv);
    if (bat.estado == BAT_USB && modoBancada) {
      modoBancada = false;
      registro("Modo bancada desligado (saiu do USB).");
    }
    bat.estado = novo;
  }

  if (bat.estado == BAT_NO_FIM && bat.mv < BAT_DESLIGA_MV) {
    if (bat.abaixoDesde == 0) bat.abaixoDesde = agora | 1;
    else if (agora - bat.abaixoDesde >= BAT_DESLIGA_APOS_MS) bat.pedeDesligar = true;
  } else {
    bat.abaixoDesde = 0;
  }
}
