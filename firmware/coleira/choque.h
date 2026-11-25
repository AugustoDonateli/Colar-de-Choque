// =====================================================================
//  choque.h  —  a sequência do choque e as regras de segurança
// =====================================================================
//  Estados:  PARADO -> BIPE -> ESPERA -> CHOQUE -> PARADO
//   A: só BIPE de 0,5 s e volta a PARADO.
//   B, C, D: bipe de 0,3 s, 0,2 s de silêncio, choque do nível.
//
//  Camadas de segurança (qualquer uma sozinha já desliga o choque):
//   1. O loop desliga os MOSFETs no fim da duração do nível.
//   2. Fora do estado CHOQUE, o loop força os dois MOSFETs em LOW a cada volta.
//   3. Corte duro: um timer separado do loop desliga os dois na duração
//      + 30 ms, mesmo que o loop esteja atrasado.
//   4. Watchdog: se o programa travar, a placa reinicia em 2 s e os
//      resistores de 10 kΩ seguram os MOSFETs desligados.
//   5. Dois MOSFETs em série: um queimado em curto sozinho não dá choque.
//
//  Regras antes de aceitar um choque:
//   - bateria no fim: bloqueia (3 bipes curtos)
//   - menos de 3 s desde o fim do último choque: ignora, sem bipe
//   - mais de 5 s de choque somado no último minuto: ignora, sem bipe
//  Bloqueio por pausa ou limite não apita, para o boi não ouvir o aviso
//  sem nada acontecer depois.
//  Com USB ligado (e sem modo bancada) a sequência roda inteira, mas sem
//  ligar os MOSFETs: é o choque "simulado", para testar no computador.
// =====================================================================
#pragma once
#include <esp_timer.h>

enum EstadoChoque : uint8_t { PARADO, BIPE, ESPERA, CHOQUE };
static const char* const NOME_ESTADO[] = { "parado", "bipe", "espera", "choque" };

static struct {
  EstadoChoque estado;
  int8_t   nivel;        // -1 = só bipe (botão A), 0..2 = B, C, D
  uint32_t desde;        // quando entrou no estado atual
  bool     simulado;
  bool     jaHouveChoque;
  uint32_t fimUltimo;    // fim do último choque
} ch = { PARADO, -1, 0, false, false, 0 };

// Histórico curto para o limite de 5 s por minuto
struct ChoqueFeito { uint32_t fim; uint16_t ms; };
static ChoqueFeito historico[16];
static uint8_t historicoPos = 0;

static esp_timer_handle_t timerCorte = nullptr;
static volatile bool corteAgiu = false;

// Roda fora do loop, numa tarefa de prioridade maior que a do loop.
static void corteDuro(void*) {
  mosfetsDesligar();
  corteAgiu = true;
}

static void choqueIniciar() {
  esp_timer_create_args_t args = {};
  args.callback = &corteDuro;
  args.arg = nullptr;
  args.dispatch_method = ESP_TIMER_TASK;
  args.name = "corte";
  esp_timer_create(&args, &timerCorte);
}

static bool choqueParado() { return ch.estado == PARADO; }

static uint32_t choqueUsadoNaJanela(uint32_t agora) {
  uint32_t soma = 0;
  for (auto& h : historico)
    if (h.ms > 0 && agora - h.fim < JANELA_MS) soma += h.ms;
  return soma;
}

static uint32_t choquePausaFaltando(uint32_t agora) {
  if (!ch.jaHouveChoque) return 0;
  uint32_t passou = agora - ch.fimUltimo;
  return passou >= PAUSA_ENTRE_CHOQUES_MS ? 0 : PAUSA_ENTRE_CHOQUES_MS - passou;
}

static void bloquear(MotivoBloqueio motivo, uint8_t botao) {
  contador.bloqueios[motivo]++;
  contadorMarcar();
  registro("Botão %c ignorado: %s.", LETRA[botao], NOME_BLOQUEIO[motivo]);
}

// Chamado quando chega um aperto de um controle pareado. botao: 0=A ... 3=D
static void choquePedir(uint8_t botao, uint32_t agora) {
  if (ch.estado != PARADO) return;  // ocupado: aperto ignorado, nada fica na fila
  if (botao > 3) return;

  if (botao == 0) {  // A: só bipe
    bipeCancelar();
    buzzer(true);
    ch.estado = BIPE;
    ch.nivel = -1;
    ch.desde = agora;
    contador.bipes++;
    contadorMarcar();
    registro("Botão A: bipe.");
    return;
  }

  int8_t nivel = botao - 1;
  uint16_t duracao = NIVEIS[nivel].duracaoMs;

  if (bat.estado == BAT_NO_FIM) {
    sinalCurto(3);
    bloquear(BLOQ_BATERIA, botao);
    return;
  }
  if (choquePausaFaltando(agora) > 0) {
    bloquear(BLOQ_PAUSA, botao);
    return;
  }
  if (choqueUsadoNaJanela(agora) + duracao > CHOQUE_NA_JANELA_MAX_MS) {
    bloquear(BLOQ_LIMITE, botao);
    return;
  }

  bipeCancelar();
  buzzer(true);
  ch.estado = BIPE;
  ch.nivel = nivel;
  ch.desde = agora;
}

static void choqueTerminar(uint32_t agora) {
  mosfetsDesligar();
  esp_timer_stop(timerCorte);  // se já disparou, não faz nada
  const NivelChoque& n = NIVEIS[ch.nivel];

  if (corteAgiu) {
    contador.cortesSeguranca++;
    registro("ATENÇÃO: o corte duro precisou agir (o loop atrasou).");
  }

  historico[historicoPos] = { agora, n.duracaoMs };
  historicoPos = (historicoPos + 1) % 16;
  ch.jaHouveChoque = true;
  ch.fimUltimo = agora;

  if (!ch.simulado) {
    contador.choques[ch.nivel]++;
    contador.msChoque += n.duracaoMs;
  }
  contadorMarcar();
  registro("Choque %s: %u ms%s. Usado no último minuto: %lu de %lu ms.",
           n.nome, n.duracaoMs, ch.simulado ? " (SIMULADO, USB ligado)" : "",
           (unsigned long)choqueUsadoNaJanela(agora), (unsigned long)CHOQUE_NA_JANELA_MAX_MS);

  ch.estado = PARADO;
  ch.desde = agora;
}

static void choqueAtualizar(uint32_t agora) {
  uint32_t passou = agora - ch.desde;

  switch (ch.estado) {
    case PARADO:
      break;

    case BIPE:
      if (ch.nivel < 0) {
        if (passou >= BIPE_SO_MS) {
          buzzer(false);
          ch.estado = PARADO;
          ch.desde = agora;
        }
      } else if (passou >= BIPE_AVISO_MS) {
        buzzer(false);
        ch.estado = ESPERA;
        ch.desde = agora;
      }
      break;

    case ESPERA:
      if (passou >= ESPERA_MS) {
        const NivelChoque& n = NIVEIS[ch.nivel];
        ch.simulado = (bat.estado == BAT_USB && !modoBancada);
        corteAgiu = false;
        // O corte duro é armado ANTES de ligar qualquer MOSFET.
        esp_timer_start_once(timerCorte, (uint64_t)(n.duracaoMs + CORTE_FOLGA_MS) * 1000ULL);
        ch.estado = CHOQUE;
        ch.desde = agora;
        if (!ch.simulado) {
          mosfetB(true);
          mosfetA(true);
        }
        registro("Choque %s começou%s.", n.nome, ch.simulado ? " (simulado)" : "");
      }
      break;

    case CHOQUE: {
      const NivelChoque& n = NIVEIS[ch.nivel];
      if (passou >= n.duracaoMs || corteAgiu) {
        choqueTerminar(agora);
      } else if (!ch.simulado && !corteAgiu) {
        bool pulsoLigado = true;
        if (n.desligadoMs > 0) pulsoLigado = (passou % (n.ligadoMs + n.desligadoMs)) < n.ligadoMs;
        mosfetA(pulsoLigado);
      }
      break;
    }
  }

  // Camada 2: fora do choque, os MOSFETs ficam desligados sempre.
  if (ch.estado != CHOQUE) mosfetsDesligar();
}
