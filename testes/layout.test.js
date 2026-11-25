// Confere o desenho furo a furo da protoboard e da placa contra o esquema.
// Rodar: node testes/layout.test.js
const C = require('../site/src/js/circuito.js');
let falhas = 0;
function caso(nome, prob) {
  console.log((prob.length ? 'FALHOU ' : 'OK     ') + nome);
  prob.forEach(p => console.log('   - ' + p));
  if (prob.length) falhas++;
}
caso('Protoboard completa = esquema da bancada (LED no lugar do módulo)', C.conferirLayout(C.LAYOUT.protoboard, C.REDES_BANCADA));
caso('Placa ilhada + fios soltos = esquema da coleira', C.conferirLayout(C.LAYOUT.placa, C.REDES));
caso('Tabela de ligações = esquema da coleira', C.conferirCircuito());
// o teste tem que pegar erro de propósito
const L = JSON.parse(JSON.stringify(C.LAYOUT.placa));
L.pontes.find(p => p.id === 'pAB').furos.push('15,19');           // ponte encostando na porta do MOSFET B
const pegou = C.conferirLayout(L, C.REDES).length > 0;
console.log((pegou ? 'OK     ' : 'FALHOU ') + 'Ponte errada de propósito é detectada');
if (!pegou) falhas++;
// furos das peças rígidas
const pp = C.pinosDaPeca(C.LAYOUT.placa, 'esp');
console.log('ESP na placa:', JSON.stringify(pp));
console.log('ESP na protoboard:', JSON.stringify(C.pinosDaPeca(C.LAYOUT.protoboard, 'esp')));
process.exit(falhas ? 1 : 0);
