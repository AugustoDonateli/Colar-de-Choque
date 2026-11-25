/* ---------- testes e checklist final ---------- */
const TESTS = [
 ['Comparação com o bastão','Faísca entre duas pontas presas a uma distância fixa, primeiro com o bastão e depois com o módulo; corrente medida no multímetro.','Faísca parecida com a do bastão e corrente até 3 A'],
 ['Disparo sem carga','200 choques de 1 s com os pinos no ar, respeitando a pausa.','O módulo continua funcionando e não esquenta demais'],
 ['Limites do firmware','Segurar o D por 10 s; apertar o B várias vezes seguidas.','O choque para em 1 s; no máximo um choque a cada 3 s'],
 ['Níveis de força','Na tábua de pregos, achar a faísca máxima do B, do C e do D.','B pula menos que C, e C menos que D'],
 ['Segurança dos MOSFETs','Ponte num MOSFET de cada vez, simulando ele queimado em curto.','Sem choque até o ESP mandar'],
 ['Disparo fantasma','1 hora ligada perto de controles de portão, sem apertar nada.','Nenhum bipe e nenhum choque'],
 ['Alcance','Coleira encostada num galão de 20 litros de água, você se afastando com o controle.','10 de 10 toques funcionam a 30 m ou mais'],
 ['Bateria','Ligada sem uso até desligar sozinha; depois, 100 choques com carga cheia.','Pelo menos 2 dias ligada e 100 choques numa carga'],
 ['Água','Mangueira por 5 minutos em todos os lados, depois abrir.','Nenhuma gota dentro'],
 ['Queda e vibração','5 quedas de 1,5 m em chão de terra e 1 minuto sacudindo.','Tudo funciona e nada solta por dentro'],
 ['Sol','2 horas ligada no sol do meio-dia.','Continua funcionando e nada deforma'],
 ['Interferência','20 choques seguidos, respeitando a pausa.','O ESP não reinicia e o pareamento continua salvo'],
 ['Elo fraco','Prender a coleira num poste e puxar com força.','O velcro abre antes de a fita, a fivela ou a caixa quebrar'],
 ['Liga e desliga','Ligar e desligar a chave 20 vezes com os pinos ligados por um fio com folga de 5 mm.','Nenhuma faísca na hora de ligar'],
 ['Carga com carregador de celular','Carregador USB-C para USB-C no conector da caixa, com a chave desligada.','A luz vermelha acende e a bateria enche']
];
const FINAL = ['Controle principal e reserva pareados','Bateria carregada, com 4,1 V ou mais','Contador de choques zerado','Elo fraco inteiro e fivela funcionando','Sachê de sílica gel dentro da caixa','Manual de uso de 1 página impresso junto','Fotos da montagem por dentro guardadas, para comparar quando voltar'];
