// =====================================================================
//  comandos.h  —  comandos digitados no Monitor Serial (115200, "Nova linha")
// =====================================================================
//  Nenhum comando dá choque. Choque só sai pelo botão de um controle pareado.
// =====================================================================
#pragma once

static char comandoTexto[64];
static uint8_t comandoTam = 0;

static void mostrarAjuda() {
  linha("");
  linha("Comandos:");
  linha("  estado              bateria, estado do choque, controles, último reinício");
  linha("  contador            quantos bipes, choques e bloqueios desde que zerou");
  linha("  zerar contador      zera o contador (pede confirmação)");
  linha("  controles           lista os controles pareados");
  linha("  apagar controles    apaga todos os controles (pede confirmação)");
  linha("  parear              entra no pareamento (aperte A, B, C e D)");
  linha("  ouvir               liga/desliga: mostra todo código que o RXB6 recebe");
  linha("  bipe                toca um bipe (teste do buzzer)");
  linha("  calibrar 4870       informa a tensão medida no multímetro, em mV");
  linha("  bancada             com USB: deixa os MOSFETs funcionarem (só com LED no lugar do módulo)");
  linha("  testar watchdog     trava o programa de propósito; a placa deve reiniciar em 2 s");
  linha("  reiniciar           reinicia a placa");
  linha("");
}

static void mostrarEstado() {
  uint32_t agora = millis();
  uint32_t s = agora / 1000;
  linha("");
  linha("Coleira %s | ligada há %02lu:%02lu:%02lu", FW_VERSAO,
        (unsigned long)(s / 3600), (unsigned long)(s / 60 % 60), (unsigned long)(s % 60));
  linha("Bateria: %u mV (%s) | última leitura %u mV | calibração %.3f",
        bat.mv, NOME_BATERIA[bat.estado], bat.mvBruto, calibracao);
  if (bat.estado == BAT_USB)
    linha("  Com USB a leitura é do USB, não da bateria. Choque %s.",
          modoBancada ? "LIGADO (modo bancada)" : "só simulado");
  linha("Choque: %s | usado no último minuto: %lu de %lu ms | pausa faltando: %lu ms",
        NOME_ESTADO[ch.estado], (unsigned long)choqueUsadoNaJanela(agora),
        (unsigned long)CHOQUE_NA_JANELA_MAX_MS, (unsigned long)choquePausaFaltando(agora));
  linha("Controles pareados: %u de %u%s", controlesQtd(), MAX_CONTROLES,
        par.ativo ? " | PAREANDO agora" : "");
  linha("Último reinício: %s", NOME_REINICIO[ultimoReinicio]);
  linha("");
}

static void mostrarContador() {
  linha("");
  linha("Bipes (A): %lu", (unsigned long)contador.bipes);
  linha("Choques: B %lu | C %lu | D %lu | tempo total %.1f s",
        (unsigned long)contador.choques[0], (unsigned long)contador.choques[1],
        (unsigned long)contador.choques[2], contador.msChoque / 1000.0f);
  linha("Ignorados: pausa %lu | limite por minuto %lu | bateria %lu",
        (unsigned long)contador.bloqueios[BLOQ_PAUSA], (unsigned long)contador.bloqueios[BLOQ_LIMITE],
        (unsigned long)contador.bloqueios[BLOQ_BATERIA]);
  linha("Reinícios: chave %lu | programa/USB %lu | watchdog %lu | queda de tensão %lu | erro %lu | outro %lu",
        (unsigned long)contador.reinicios[REI_LIGOU], (unsigned long)contador.reinicios[REI_SOFTWARE],
        (unsigned long)contador.reinicios[REI_WATCHDOG], (unsigned long)contador.reinicios[REI_QUEDA_TENSAO],
        (unsigned long)contador.reinicios[REI_TRAVOU], (unsigned long)contador.reinicios[REI_OUTRO]);
  linha("Cortes de segurança: %lu (o normal é 0)", (unsigned long)contador.cortesSeguranca);
  linha("");
}

static void mostrarControles() {
  linha("");
  if (controlesQtd() == 0) {
    linha("Nenhum controle pareado.");
  }
  for (uint8_t i = 0; i < MAX_CONTROLES; i++) {
    if (!controles[i].usado) continue;
    linha("Controle %u (%u botões):", i + 1, controles[i].qtdBotoes);
    for (uint8_t b = 0; b < controles[i].qtdBotoes && b < 4; b++) {
      const Codigo& c = controles[i].botao[b];
      linha("  %c = 0x%lX, %u bits, protocolo %u", LETRA[b], (unsigned long)c.valor, c.bits, c.protocolo);
    }
  }
  linha("");
}

static void comandoExecutar(char* cmd) {
  // tira espaços do começo e do fim
  while (*cmd == ' ') cmd++;
  size_t n = strlen(cmd);
  while (n > 0 && cmd[n - 1] == ' ') cmd[--n] = 0;
  if (n == 0) return;

  if (!strcmp(cmd, "ajuda") || !strcmp(cmd, "?")) {
    mostrarAjuda();
  } else if (!strcmp(cmd, "estado")) {
    mostrarEstado();
  } else if (!strcmp(cmd, "contador")) {
    mostrarContador();
  } else if (!strcmp(cmd, "zerar contador")) {
    linha("Para zerar mesmo, digite: zerar contador sim");
  } else if (!strcmp(cmd, "zerar contador sim")) {
    contadorZerar();
    registro("Contador zerado.");
  } else if (!strcmp(cmd, "controles")) {
    mostrarControles();
  } else if (!strcmp(cmd, "apagar controles")) {
    linha("Para apagar todos os controles, digite: apagar controles sim");
  } else if (!strcmp(cmd, "apagar controles sim")) {
    controlesApagar();
    sinalApagouTudo();
    registro("Todos os controles foram apagados.");
  } else if (!strcmp(cmd, "parear")) {
    if (!choqueParado()) linha("Espere o choque terminar.");
    else pareamentoIniciar();
  } else if (!strcmp(cmd, "ouvir")) {
    radioOuvir = !radioOuvir;
    registro("Ouvir rádio: %s", radioOuvir ? "LIGADO (aperte botões do controle)" : "desligado");
  } else if (!strcmp(cmd, "bipe")) {
    if (choqueParado()) bipar(200, 0, 1);
  } else if (!strncmp(cmd, "calibrar", 8)) {
    long real = atol(cmd + 8);
    uint16_t lido = bateriaLer();  // já com a calibração atual
    if (real < 2500 || real > 5500) {
      linha("Use: calibrar <mV medidos no multímetro>. Exemplo: calibrar 4870");
    } else if (lido < 1000) {
      linha("Leitura muito baixa (%u mV). Confira o divisor no GPIO 0.", lido);
    } else {
      float nova = calibracao * (float)real / (float)lido;
      if (nova < 0.8f || nova > 1.2f) {
        linha("Diferença grande demais (lido %u mV, medido %ld mV). Confira o divisor e o multímetro.", lido, real);
      } else {
        calibracaoSalvar(nova);
        bat.mvBruto = bateriaLer();
        bat.mv = bat.mvBruto;
        registro("Calibrado: fator %.3f. Agora lê %u mV.", nova, bat.mv);
      }
    }
  } else if (!strcmp(cmd, "bancada")) {
    if (bat.estado != BAT_USB) {
      linha("O modo bancada só existe com USB ligado. Na bateria os MOSFETs já funcionam.");
    } else {
      modoBancada = !modoBancada;
      if (modoBancada) {
        registro("MODO BANCADA LIGADO: com USB, os MOSFETs vão ligar de verdade.");
        linha("  Use só com LED no lugar do módulo de alta tensão. Desliga ao tirar o USB ou reiniciar.");
      } else {
        registro("Modo bancada desligado. Choque volta a ser só simulado no USB.");
      }
    }
  } else if (!strcmp(cmd, "testar watchdog")) {
    if (!choqueParado() || par.ativo) {
      linha("Só com a coleira parada e fora do pareamento.");
    } else {
      mosfetsDesligar();
      registro("Travando o programa de propósito. A placa deve reiniciar em uns 2 s.");
      delay(100);
      volatile uint32_t trava = 0;
      while (true) trava = trava + 1;  // sem alimentar o watchdog
    }
  } else if (!strcmp(cmd, "reiniciar")) {
    if (contadorMudou) contadorSalvarAgora();
    registro("Reiniciando...");
    delay(100);
    ESP.restart();
  } else {
    linha("Não conheço \"%s\". Digite ajuda.", cmd);
  }
}

static void comandosAtualizar() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      comandoTexto[comandoTam] = 0;
      comandoExecutar(comandoTexto);
      comandoTam = 0;
    } else if (comandoTam < sizeof(comandoTexto) - 1) {
      comandoTexto[comandoTam++] = (char)tolower((unsigned char)c);
    }
  }
}
