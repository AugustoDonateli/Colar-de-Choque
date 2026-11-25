// =====================================================================
//  config.h  —  tudo que dá para ajustar fica aqui
// =====================================================================
//  Mexa só nos números. Os "static_assert" no fim do arquivo impedem a
//  compilação se algum valor passar dos limites de segurança (por
//  exemplo, um choque maior que 1 segundo). Se der erro de compilação
//  depois de mudar um número, leia a mensagem: ela diz qual regra quebrou.
// =====================================================================
#pragma once
#include <Arduino.h>

#define FW_VERSAO "v0.1"

// ---------------------------------------------------------------------
//  Pinos (iguais à tabela de ligações do site, Etapa 5)
// ---------------------------------------------------------------------
constexpr uint8_t PINO_BATERIA  = 0;  // meio do divisor 100k/100k do barramento +
constexpr uint8_t PINO_BOTAO    = 1;  // botão de pareamento, outro lado no barramento −
constexpr uint8_t PINO_RADIO    = 3;  // DATA do RXB6
constexpr uint8_t PINO_MOSFET_A = 4;  // MOSFET A: faz os pulsos
constexpr uint8_t PINO_BUZZER   = 5;  // base do BC547 (pelo resistor de 1 kΩ)
constexpr uint8_t PINO_MOSFET_B = 6;  // MOSFET B: abre a "janela" do choque
constexpr uint8_t PINO_LED      = 8;  // LED azul da própria placa

// O LED da SuperMini acende com o pino em LOW. Se no teste ele ficar
// invertido (aceso quando devia estar apagado), troque para false.
constexpr bool LED_ACENDE_EM_LOW = true;

// ---------------------------------------------------------------------
//  Botões do controle
//  A = só bipe.  B, C e D = bipe de aviso, pausa curta e choque.
// ---------------------------------------------------------------------
constexpr uint16_t BIPE_SO_MS    = 500;  // botão A
constexpr uint16_t BIPE_AVISO_MS = 300;  // bipe antes de todo choque
constexpr uint16_t ESPERA_MS     = 200;  // silêncio entre o bipe e o choque

// Cada nível: duração total, tempo ligado e tempo desligado de cada pulso.
// desligadoMs = 0 quer dizer choque contínuo (sem pulsos).
// Se na tábua de pregos o B e o C ficarem iguais, mude os pulsos aqui,
// ou volte para níveis por tempo: B 300 ms, C 600 ms, D 1000 ms, todos
// contínuos (ligadoMs = duracaoMs e desligadoMs = 0).
struct NivelChoque {
  const char* nome;
  uint16_t duracaoMs;
  uint16_t ligadoMs;
  uint16_t desligadoMs;
};
constexpr NivelChoque NIVEIS[3] = {
  // nome        duração  ligado  desligado
  { "B (fraco)",   500,     30,      70 },
  { "C (médio)",   500,     70,      30 },
  { "D (forte)",  1000,   1000,       0 },
};

// ---------------------------------------------------------------------
//  Regras de segurança do choque
// ---------------------------------------------------------------------
constexpr uint16_t CHOQUE_MAX_MS           = 1000;   // nenhum choque passa disso
constexpr uint16_t CORTE_FOLGA_MS          = 30;     // corte duro: duração + isto
constexpr uint32_t PAUSA_ENTRE_CHOQUES_MS  = 3000;   // do fim de um choque ao próximo
constexpr uint32_t JANELA_MS               = 60000;  // janela de 1 minuto...
constexpr uint32_t CHOQUE_NA_JANELA_MAX_MS = 5000;   // ...com no máximo 5 s de choque somado

// ---------------------------------------------------------------------
//  Bateria (milivolts no barramento +, já multiplicado pelo divisor)
// ---------------------------------------------------------------------
constexpr float    DIVISOR_BATERIA     = 2.0f;   // 100k/100k divide por 2
constexpr uint16_t BAT_BAIXA_MV        = 3500;   // abaixo: avisa (ainda dá choque)
constexpr uint16_t BAT_BAIXA_SAI_MV    = 3600;   // volta a "boa" só acima disto
constexpr uint16_t BAT_NO_FIM_MV       = 3300;   // abaixo: bloqueia o choque
constexpr uint16_t BAT_NO_FIM_SAI_MV   = 3450;
constexpr uint16_t BAT_DESLIGA_MV      = 3100;   // abaixo disto por 30 s: desliga
constexpr uint32_t BAT_DESLIGA_APOS_MS = 30000;
constexpr uint16_t USB_ENTRA_MV        = 4400;   // acima: USB ligado no ESP32
constexpr uint16_t USB_SAI_MV          = 4300;
constexpr uint32_t BAT_INTERVALO_MS    = 1000;   // mede 1 vez por segundo
constexpr uint32_t BAT_DESCANSO_MS     = 2000;   // espera isso depois de um choque para medir

// ---------------------------------------------------------------------
//  Rádio e pareamento
// ---------------------------------------------------------------------
constexpr uint8_t  MAX_CONTROLES          = 4;      // controles guardados
constexpr uint8_t  RADIO_BITS_MIN         = 12;     // código menor que isto é ruído
constexpr uint8_t  RADIO_QUADROS_IGUAIS   = 2;      // quadros iguais para aceitar
constexpr uint32_t RADIO_JANELA_MS        = 200;    // tempo máximo entre esses quadros
constexpr uint32_t RADIO_SOLTOU_MS        = 300;    // silêncio que conta como "soltou o botão"
constexpr uint32_t BOTAO_PAREAR_MS        = 1000;   // segurar ao ligar: entra no pareamento
constexpr uint32_t BOTAO_APAGAR_MS        = 10000;  // segurar ao ligar: apaga todos os controles
constexpr uint32_t PAREAR_DESISTE_MS      = 60000;  // nenhum botão aprendido nesse tempo: cancela
constexpr uint32_t PAREAR_FIM_MS          = 15000;  // sem botão novo nesse tempo: salva o que aprendeu

// ---------------------------------------------------------------------
//  Sistema
// ---------------------------------------------------------------------
constexpr uint32_t WATCHDOG_MS = 2000;  // se o programa travar, a placa reinicia
constexpr uint32_t CPU_MHZ     = 80;    // 80 MHz gasta menos bateria e sobra velocidade

// ---------------------------------------------------------------------
//  Travas: a compilação para aqui se algum número passar do limite
// ---------------------------------------------------------------------
static_assert(CHOQUE_MAX_MS <= 1000, "Nenhum choque pode passar de 1 segundo");
static_assert(NIVEIS[0].duracaoMs <= CHOQUE_MAX_MS, "Nível B passa do máximo");
static_assert(NIVEIS[1].duracaoMs <= CHOQUE_MAX_MS, "Nível C passa do máximo");
static_assert(NIVEIS[2].duracaoMs <= CHOQUE_MAX_MS, "Nível D passa do máximo");
static_assert(NIVEIS[0].ligadoMs > 0 && NIVEIS[1].ligadoMs > 0 && NIVEIS[2].ligadoMs > 0,
              "Tempo ligado do pulso precisa ser maior que zero");
static_assert(PAUSA_ENTRE_CHOQUES_MS >= 3000, "Pausa entre choques não pode ser menor que 3 s");
static_assert(CHOQUE_NA_JANELA_MAX_MS <= 5000, "Limite por minuto não pode passar de 5 s");
static_assert(CORTE_FOLGA_MS <= 50, "Folga do corte duro grande demais");
static_assert(WATCHDOG_MS >= 1000 && WATCHDOG_MS <= 5000, "Watchdog fora da faixa");
static_assert(BAT_NO_FIM_MV < BAT_BAIXA_MV && BAT_DESLIGA_MV < BAT_NO_FIM_MV,
              "Limites de bateria fora de ordem");
