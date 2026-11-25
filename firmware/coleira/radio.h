// =====================================================================
//  radio.h  —  recebe o controle (RXB6 + rc-switch) e faz o pareamento
// =====================================================================
//  Como um aperto é reconhecido:
//   1. O controle repete o mesmo código várias vezes por segundo
//      enquanto o botão está apertado.
//   2. Só vale depois de 2 códigos iguais seguidos (até 200 ms entre eles).
//      Isso filtra ruído e controle de portão do vizinho.
//   3. Segurar o botão continua sendo UM aperto. Para valer um aperto
//      novo, precisa soltar (300 ms sem receber aquele código).
//
//  Pareamento (aprende um controle novo):
//   - Entra segurando o botão de pareamento ao ligar a chave (1 s),
//     ou com o comando "parear" no Monitor Serial.
//   - Aperte A, B, C e D, nessa ordem. Cada botão aprendido dá bipes
//     (1 para A, 2 para B...). Com 4 botões, salva na hora.
//   - Controle de 3 botões: aperte os 3 e espere 15 s. Salva sozinho.
//   - Parear de novo um controle que já estava salvo substitui o antigo.
// =====================================================================
#pragma once
#include <RCSwitch.h>

static RCSwitch rc;
static bool radioOuvir = false;  // comando "ouvir": mostra tudo que chega

static struct {
  Codigo   ultimo;
  uint32_t ultimoEm;
  uint8_t  iguais;
  bool     apertado;
  Codigo   apertadoCodigo;
  uint32_t apertadoVistoEm;
} rx = {};

static void radioIniciar() {
  rc.enableReceive(digitalPinToInterrupt(PINO_RADIO));
}

// Devolve true quando começa um aperto novo e válido.
static bool radioNovoAperto(Codigo& saida) {
  uint32_t agora = millis();
  bool novo = false;

  while (rc.available() && !novo) {
    Codigo c = {};
    c.valor = (uint32_t)rc.getReceivedValue();
    c.bits = (uint8_t)rc.getReceivedBitlength();
    c.protocolo = (uint8_t)rc.getReceivedProtocol();
    unsigned int pulso = rc.getReceivedDelay();
    rc.resetAvailable();

    bool curto = (c.valor == 0 || c.bits < RADIO_BITS_MIN);
    if (radioOuvir) {
      registro("Recebido: 0x%lX, %u bits, protocolo %u, pulso %u us%s",
               (unsigned long)c.valor, c.bits, c.protocolo, pulso,
               curto ? " (ignorado: ruído)" : "");
    }
    if (curto) continue;

    // Enquanto o mesmo botão continua apertado, só renova o "visto em".
    if (rx.apertado && mesmoCodigo(c, rx.apertadoCodigo)) rx.apertadoVistoEm = agora;

    if (mesmoCodigo(c, rx.ultimo) && agora - rx.ultimoEm <= RADIO_JANELA_MS) {
      if (rx.iguais < 255) rx.iguais++;
    } else {
      rx.iguais = 1;
    }
    rx.ultimo = c;
    rx.ultimoEm = agora;

    if (rx.iguais >= RADIO_QUADROS_IGUAIS && !rx.apertado) {
      rx.apertado = true;
      rx.apertadoCodigo = c;
      rx.apertadoVistoEm = agora;
      saida = c;
      novo = true;
    }
  }

  if (rx.apertado && agora - rx.apertadoVistoEm > RADIO_SOLTOU_MS) rx.apertado = false;
  return novo;
}

// ---------------------------------------------------------------------
//  Pareamento
// ---------------------------------------------------------------------
static struct {
  bool     ativo;
  uint32_t inicio;
  uint32_t ultimoAprendido;
  uint8_t  qtd;
  Codigo   botao[4];
} par = {};

static void pareamentoIniciar(bool avisar = true) {
  if (par.ativo) return;
  memset(&par, 0, sizeof(par));
  par.ativo = true;
  par.inicio = millis();
  if (avisar) sinalCurto(2);
  registro("PAREAMENTO: aperte A, B, C e D, nessa ordem. (%u de %u controles já salvos)",
           controlesQtd(), MAX_CONTROLES);
}

static void pareamentoSair() {
  par.ativo = false;
}

static void pareamentoSalvar() {
  // Tira da memória qualquer controle que tenha um desses códigos
  // (é o mesmo controle sendo pareado de novo).
  for (uint8_t i = 0; i < MAX_CONTROLES; i++) {
    if (!controles[i].usado) continue;
    bool repetido = false;
    for (uint8_t b = 0; b < controles[i].qtdBotoes && b < 4; b++)
      for (uint8_t n = 0; n < par.qtd; n++)
        if (mesmoCodigo(controles[i].botao[b], par.botao[n])) repetido = true;
    if (repetido) {
      registro("O controle %u já estava salvo. Ele será substituído.", i + 1);
      memset(&controles[i], 0, sizeof(Controle));
    }
  }

  int vaga = -1;
  for (uint8_t i = 0; i < MAX_CONTROLES; i++) {
    if (!controles[i].usado) { vaga = i; break; }
  }
  if (vaga < 0) {
    sinalErro();
    registro("Memória cheia (%u controles). Nada foi salvo. Use \"apagar controles\" "
             "ou segure o botão por 10 s ao ligar.", MAX_CONTROLES);
    pareamentoSair();
    return;
  }

  Controle& c = controles[vaga];
  memset(&c, 0, sizeof(c));
  c.usado = 1;
  c.qtdBotoes = par.qtd;
  for (uint8_t n = 0; n < par.qtd; n++) c.botao[n] = par.botao[n];
  controlesSalvar();
  sinalOk();
  registro("Controle salvo na vaga %d com %u botões. Pareamento terminado.", vaga + 1, par.qtd);
  pareamentoSair();
}

static void pareamentoReceber(const Codigo& c) {
  for (uint8_t n = 0; n < par.qtd; n++) {
    if (mesmoCodigo(par.botao[n], c)) {
      registro("Esse botão já foi aprendido como %c. Aperte o próximo.", LETRA[n]);
      return;
    }
  }
  par.botao[par.qtd] = c;
  par.qtd++;
  par.ultimoAprendido = millis();
  sinalCurto(par.qtd);
  registro("Aprendi o botão %c (0x%lX, %u bits).", LETRA[par.qtd - 1], (unsigned long)c.valor, c.bits);
  if (par.qtd >= 4) pareamentoSalvar();
}

static void pareamentoAtualizar(uint32_t agora) {
  if (!par.ativo) return;
  if (par.qtd == 0 && agora - par.inicio >= PAREAR_DESISTE_MS) {
    sinalErro();
    registro("Pareamento cancelado: nenhum botão em %lu s.", (unsigned long)(PAREAR_DESISTE_MS / 1000));
    pareamentoSair();
  } else if (par.qtd > 0 && agora - par.ultimoAprendido >= PAREAR_FIM_MS) {
    registro("Sem botão novo há %lu s. Salvando os %u que aprendi.",
             (unsigned long)(PAREAR_FIM_MS / 1000), par.qtd);
    pareamentoSalvar();
  }
}
