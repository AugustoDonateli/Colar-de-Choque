// Confere se a tabela de ligações bate com o esquema elétrico.
// Rodar: node testes/circuito.test.js
const { conferirCircuito, redesDasLigacoes, REDES, LIGACOES } = require('../site/src/js/circuito.js');
const prob = conferirCircuito();
const linhas = LIGACOES.filter(l => l.n).length;
console.log(`${linhas} linhas na tabela, ${Object.keys(REDES).length} redes no esquema, ${redesDasLigacoes().length} redes formadas pela tabela.`);
if (prob.length) { console.log('PROBLEMAS:'); prob.forEach(p => console.log(' - ' + p)); process.exit(1); }
console.log('Tabela e esquema batem.');
// teste do próprio teste: uma ligação errada tem que ser pega
const { redesDasLigacoes: r2 } = require('../site/src/js/circuito.js');
const errada = JSON.parse(JSON.stringify(LIGACOES));
errada.find(l => l.n === 14).liga = [['ma.S', 'bus.-']];   // o erro clássico: fonte do A no −
const chave = g => g.slice().sort().join(' ');
const esquema = new Set(Object.values(REDES).map(chave));
const pegou = r2(errada).some(g => !esquema.has(chave(g)));
console.log(pegou ? 'Erro de propósito (fonte do MOSFET A no −) foi detectado.' : 'FALHA: erro de propósito passou');
process.exit(pegou ? 0 : 1);
