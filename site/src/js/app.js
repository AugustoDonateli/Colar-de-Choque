/* ---------- estado ---------- */
const KEY='coleira-site-v1';
const NOVO=()=>({buy:{},steps:{},wires:{},tests:{},final:{},fw:{},opt:false,open:null});
let S=NOVO();
try{const raw=localStorage.getItem(KEY); if(raw) S=Object.assign(S,JSON.parse(raw));}catch(e){}
if(!S.fw) S.fw={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const brl=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const brl0=v=>'R$ '+Math.round(v).toLocaleString('pt-BR');
const $=s=>document.querySelector(s);

/* ---------- abas ---------- */
document.querySelectorAll('nav.tabs button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
const ABAS=['inicio','projeto','comprar','montar','testar','firmware'];
function medirAbas(){const n=document.querySelector('nav.tabs'); if(n) document.documentElement.style.setProperty('--navh',n.offsetHeight+'px');}
window.addEventListener('resize',medirAbas);
function go(t){
  let alvo=null;
  if(t==='depois'){t='inicio'; alvo='depois';}
  if(!ABAS.includes(t)) t='inicio';
  document.querySelectorAll('nav.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  document.querySelectorAll('section.tab').forEach(s=>s.classList.toggle('on',s.id==='t-'+t));
  document.body.classList.toggle('modo-projeto',t==='projeto');
  medirAbas();
  if(t==='projeto'){
    // o 3D só carrega na primeira vez que a aba abre
    window.projeto3dPedido=true;
    if(window.Projeto3D) window.Projeto3D.iniciar();
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  if(alvo){const el=document.getElementById(alvo); if(el) el.scrollIntoView({block:'start'});}
  else window.scrollTo({top:0});
  try{history.replaceState(null,'','#'+(alvo||t));}catch(e){}
}

/* ---------- comprar ---------- */
const req=()=>ITEMS.filter(i=>!i.opt);
function buyStats(){
  const r=req(); let all=0,left=0,res=0,arrived=0;
  r.forEach(i=>{const s=S.buy[i.id]; if(s!=='have') all+=i.p; if(!s) left+=i.p; if(s) res++; if(s==='have'||s==='arrived') arrived++;});
  const sum=g=>r.filter(i=>i.g===g&&S.buy[i.id]!=='have').reduce((a,i)=>a+i.p,0);
  return {all,left,res,arrived,n:r.length,coleira:sum('ae')+sum('mlc')+sum('mle')+sum('loja')+sum('casa'),banc:sum('banc')};
}
function renderBuy(){
  $('#showOpt').checked=!!S.opt;
  let h='';
  GROUPS.forEach(g=>{
    if(g.id==='opt'&&!S.opt) return;
    const its=ITEMS.filter(i=>i.g===g.id);
    const sub=its.filter(i=>S.buy[i.id]!=='have').reduce((a,i)=>a+i.p,0);
    h+=`<div class="grp"><h3>${g.t}</h3><span class="muted">${g.s} · ${brl0(sub)}</span></div>`;
    its.forEach(i=>{
      const s=S.buy[i.id]||'';
      h+=`<div class="item ${s?'s-'+s:''}" data-id="${i.id}">
        <div class="nm">${i.n}${i.opt?'<span class="tag opt">opcional</span>':''}</div>
        <div class="pr">${i.p===0?'grátis':(i.est?'≈ ':'')+brl(i.p)}${(i.q!=='1'||i.p1)?`<small>${[i.q!=='1'?i.q+' · '+i.pt:'',i.p1?i.p1+' na 1ª compra':''].filter(Boolean).join(' · ')}</small>`:''}</div>
        <div class="ds">${i.d}</div>
        ${i.v?`<div class="vr">Escolha na página: <b>${i.v}</b></div>`:''}
        <div class="row2">
          <div class="seg" role="group" aria-label="Situação">
            <button data-s="have" class="${s==='have'?'on':''}">Já tenho</button>
            <button data-s="bought" class="${s==='bought'?'on':''}">Comprei</button>
            <button data-s="arrived" class="${s==='arrived'?'on':''}">Chegou</button>
          </div>
          ${i.u?`<a class="ln" href="${i.u}" target="_blank" rel="noopener">${i.alt?'Se não achar: ML ↗':'Abrir anúncio ↗'}</a>`:''}
        </div></div>`;
    });
  });
  $('#buyList').innerHTML=h;
  const st=buyStats();
  $('#sumLeft').textContent=brl0(st.left);
  $('#sumCol').textContent=brl0(st.coleira);
  $('#sumBanc').textContent=brl0(st.banc);
  $('#sumCount').textContent=st.res+'/'+st.n;
  $('#buyBar').style.width=(st.arrived/st.n*100)+'%';
  $('#costColeira').textContent=brl0(st.coleira);
  $('#costBanc').textContent=brl0(st.banc);
}
$('#buyList').addEventListener('click',e=>{
  const b=e.target.closest('.seg button'); if(!b) return;
  const id=b.closest('.item').dataset.id, s=b.dataset.s;
  S.buy[id]=S.buy[id]===s?undefined:s; if(!S.buy[id]) delete S.buy[id];
  save(); renderAll();
});
$('#showOpt').addEventListener('change',e=>{S.opt=e.target.checked;save();renderBuy();});

/* ---------- montar ---------- */
function curStep(){for(let i=0;i<STEPS.length;i++) if(!S.steps[i]) return i; return -1;}
function renderSteps(){
  const cur=curStep();
  const openIdx = S.open===null||S.open===undefined ? cur : S.open;
  $('#steps').innerHTML=STEPS.map((st,i)=>{
    const done=!!S.steps[i];
    return `<details class="step ${done?'done':''} ${i===cur?'cur':''}" data-i="${i}" ${i===openIdx?'open':''}>
      <summary><span class="num">${done?'✓':i+1}</span><span class="st"><b>Etapa ${i+1}: ${st.t}</b><span>${st.s}</span></span><span class="chev">›</span></summary>
      <div class="body">${st.html}
        <div class="stepbtns">${done
          ?`<button class="btn ghost" data-undo="${i}">Desmarcar</button>`
          :`<button class="btn ok" data-pass="${i}">Passou ✓</button>`}</div>
      </div></details>`;
  }).join('');
  const wt=$('#wireTable'); if(wt) wt.innerHTML=wireTable();
}
// A tabela sai de LIGACOES (circuito.js), a mesma fonte da bancada simulada.
function wireTable(){
  const rows=LIGACOES.filter(l=>l.n), n=rows.length, d=rows.filter(l=>S.wires[l.n]).length;
  let h=`<p class="muted">${d} de ${n} feitas</p><table class="wires"><thead><tr><th></th><th>#</th><th>De</th><th>Para</th><th class="c-fio">Fio</th></tr></thead><tbody>`;
  LIGACOES.forEach(l=>{
    if(!l.n){h+=`<tr class="grpw"><td colspan="5">${l.grupo}</td></tr>`;return;}
    const k=l.n, done=!!S.wires[k];
    h+=`<tr class="${l.destaque?'hl':''} ${done?'wd':''}"><td><input type="checkbox" data-w="${k}" ${done?'checked':''} aria-label="Ligação ${k} feita"></td><td>${k}</td><td>${l.de}</td><td>${l.para}</td><td class="c-fio">${l.cor?`<span class="sw" style="background:${l.cor}"></span>`:''}${l.fio}</td></tr>`;
  });
  return h+'</tbody></table>';
}
$('#steps').addEventListener('click',e=>{
  const p=e.target.closest('[data-pass]'), u=e.target.closest('[data-undo]');
  if(p){S.steps[p.dataset.pass]=1; S.open=null; save(); renderAll(); const c=curStep(); const el=document.querySelector(`.step[data-i="${c}"]`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}
  if(u){delete S.steps[u.dataset.undo]; save(); renderAll();}
});
$('#steps').addEventListener('change',e=>{
  const w=e.target.closest('[data-w]'); if(!w) return;
  if(w.checked) S.wires[w.dataset.w]=1; else delete S.wires[w.dataset.w];
  save(); $('#wireTable').innerHTML=wireTable(); renderTop();
});
$('#steps').addEventListener('toggle',e=>{
  const d=e.target; if(!d.matches||!d.matches('details.step')) return;
  if(d.open){S.open=+d.dataset.i; save();}
},true);

/* ---------- testar ---------- */
function renderTests(){
  $('#tests').innerHTML=TESTS.map((t,i)=>`<label class="test ${S.tests[i]?'d':''}"><input type="checkbox" data-t="${i}" ${S.tests[i]?'checked':''}><div><b>${i+1}. ${t[0]}</b><div class="how">${t[1]}</div><div class="ok">Passa se: ${t[2]}</div></div></label>`).join('');
  $('#final').innerHTML=FINAL.map((t,i)=>`<label class="test ${S.final[i]?'d':''}"><input type="checkbox" data-f="${i}" ${S.final[i]?'checked':''}><div><b>${t}</b></div></label>`).join('');
  const nt=Object.keys(S.tests).length, nf=Object.keys(S.final).length, all=nt===TESTS.length&&nf===FINAL.length;
  $('#readyBox').innerHTML=all
    ?`<div class="ready yes">Pronta para entregar. Todos os testes e o checklist passaram.</div>`
    :`<div class="ready no">${nt} de ${TESTS.length} testes e ${nf} de ${FINAL.length} itens do checklist. A coleira ainda não está pronta para entregar.</div>`;
}
document.getElementById('t-testar').addEventListener('change',e=>{
  const t=e.target.dataset.t, f=e.target.dataset.f;
  if(t!==undefined){ if(e.target.checked) S.tests[t]=1; else delete S.tests[t]; }
  if(f!==undefined){ if(e.target.checked) S.final[f]=1; else delete S.final[f]; }
  save(); renderAll();
});

/* ---------- firmware ---------- */
const fwChave=(e,i)=>e+'-'+i;
function fwFeitos(){let n=0,t=0; FW_ROTEIRO.forEach((et,e)=>et.itens.forEach((_,i)=>{t++; if(S.fw[fwChave(e,i)]) n++;})); return {n,t};}
function renderFirmware(){
  const f=fwFeitos();
  $('#fwTopo').innerHTML=`<div class="v">Versão ${FW.versao}</div><p>${FW.situacao}</p>
    <div class="links" style="margin-top:0"><a class="btn" href="${FW.zip}" target="_blank" rel="noopener">Baixar do GitHub (.zip) ↗</a><a class="btn ghost" href="${FW.pasta}" target="_blank" rel="noopener">Ver o código ↗</a></div>`;
  $('#fwGravar').innerHTML=FW_GRAVAR.map(t=>`<li>${t}</li>`).join('');
  $('#fwBotoes').innerHTML=FW_BOTOES.map(([b,t])=>`<tr><td><b>${b}</b></td><td>${t}</td></tr>`).join('');
  $('#fwRegras').innerHTML=FW_REGRAS.map(t=>`<li>${t}</li>`).join('');
  $('#fwCamadas').innerHTML=FW_CAMADAS.map(t=>`<li>${t}</li>`).join('');
  $('#fwBipes').innerHTML=FW_BIPES.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('');
  $('#fwLed').innerHTML=FW_LED.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('');
  $('#fwComandos').innerHTML=FW_COMANDOS.map(([a,b])=>`<tr><td><code>${a}</code></td><td>${b}</td></tr>`).join('');
  const aberta=FW_ROTEIRO.findIndex((et,e)=>et.itens.some((_,i)=>!S.fw[fwChave(e,i)]));
  $('#fwRoteiro').innerHTML=FW_ROTEIRO.map((et,e)=>{
    const feitos=et.itens.filter((_,i)=>S.fw[fwChave(e,i)]).length, ok=feitos===et.itens.length;
    return `<details class="fwetapa ${ok?'ok':''}" ${e===aberta?'open':''}><summary>${et.t}<span>${ok?'✓ ':''}${feitos}/${et.itens.length}</span></summary><div class="in">${
      et.itens.map((t,i)=>{const d=!!S.fw[fwChave(e,i)]; return `<label class="fwitem ${d?'d':''}"><input type="checkbox" data-fw="${fwChave(e,i)}" ${d?'checked':''}><span>${t}</span></label>`;}).join('')
    }</div></details>`;
  }).join('');
  const c=$('#cntFw'); c.textContent=f.n+'/'+f.t; c.classList.toggle('done',f.n===f.t);
}
$('#fwRoteiro').addEventListener('change',e=>{
  const k=e.target.dataset.fw; if(!k) return;
  if(e.target.checked) S.fw[k]=1; else delete S.fw[k];
  save(); renderFirmware();
});

/* ---------- inicio ---------- */
function progress(){
  const b=buyStats();
  const buyP=b.arrived/b.n;
  const stepP=Object.keys(S.steps).length/STEPS.length;
  const testP=(Object.keys(S.tests).length+Object.keys(S.final).length)/(TESTS.length+FINAL.length);
  return {b,buyP,stepP,testP,total:(buyP*0.25+stepP*0.5+testP*0.25)};
}
function renderTop(){
  const p=progress(), pct=Math.round(p.total*100);
  $('#topPct').textContent=pct+'%'; $('#topBar').style.width=pct+'%';
  const ns=Object.keys(S.steps).length, nt=Object.keys(S.tests).length;
  const cb=$('#cntBuy'); cb.textContent=p.b.arrived+'/'+p.b.n; cb.classList.toggle('done',p.b.arrived===p.b.n);
  const cs=$('#cntBuild'); cs.textContent=ns+'/'+STEPS.length; cs.classList.toggle('done',ns===STEPS.length);
  const ct=$('#cntTest'); ct.textContent=nt+'/'+TESTS.length; ct.classList.toggle('done',nt===TESTS.length);
}
function renderHome(){
  const p=progress(), b=p.b, cur=curStep();
  const notBought=req().filter(i=>!S.buy[i.id]);
  const waiting=req().filter(i=>S.buy[i.id]==='bought');
  const aeLeft=notBought.filter(i=>i.g==='ae').length;
  let k,t,d,btn,tab,stage;
  if(notBought.length){
    stage=0; k='Agora'; t='Fazer as compras';
    d=aeLeft?`Faltam ${notBought.length} itens (${brl0(b.left)}). Comece pelos ${aeLeft} do AliExpress, que demoram de 2 a 4 semanas para chegar.`:`Faltam ${notBought.length} itens do Mercado Livre e da bancada (${brl0(b.left)}).`;
    btn='Abrir lista de compras'; tab='comprar';
  } else if(waiting.length && cur<=0){
    stage=0; k='Esperando chegar'; t=`${waiting.length} ${waiting.length>1?'itens a caminho':'item a caminho'}`;
    d='Enquanto isso, dá para imprimir as peças 3D (Etapa 3) e testar sozinha cada peça que já chegou (Etapa 1).';
    btn='Ver etapas'; tab='montar';
  } else if(cur!==-1){
    stage=1; k='Próxima etapa'; t=`Etapa ${cur+1}: ${STEPS[cur].t}`; d=STEPS[cur].s+'.'; btn='Abrir etapa'; tab='montar';
  } else if(Object.keys(S.tests).length<TESTS.length||Object.keys(S.final).length<FINAL.length){
    stage=2; k='Agora'; t='Testar antes de entregar'; d=`Faltam ${TESTS.length-Object.keys(S.tests).length} testes e ${FINAL.length-Object.keys(S.final).length} itens do checklist.`; btn='Abrir testes'; tab='testar';
  } else {
    stage=3; k='Pronto'; t='Coleira pronta para entregar'; d='Combine a entrega e o retorno com o comprador. O roteiro de perguntas está em "Para depois", no fim do Início.'; btn='Abrir Para depois'; tab='depois';
  }
  $('#nextCard').innerHTML=`<div class="k">${k}</div><h3>${t}</h3><p>${d}</p><button class="btn" data-go="${tab}">${btn} →</button>`;
  const st=[['Comprar',p.buyP,`${b.arrived}/${b.n}`,'comprar'],['Montar',p.stepP,`${Object.keys(S.steps).length}/${STEPS.length}`,'montar'],['Testar',p.testP,`${Object.keys(S.tests).length}/${TESTS.length}`,'testar'],['Entregar',stage===3?1:0,stage===3?'pronto':'—','depois']];
  $('#stages').innerHTML=st.map((s,i)=>`<button class="stage ${i===stage?'cur':''}" data-go="${s[3]}"><div class="t">${s[0]}<span>${s[2]}</span></div><div class="bar"><i style="width:${Math.round(s[1]*100)}%"></i></div></button>`).join('');
  $('#facts').innerHTML=`
    <div class="fact"><div class="v">${brl0(b.coleira)}</div><div class="l">compras da coleira (sem bancada nem frete)</div></div>
    <div class="fact"><div class="v">${brl0(b.banc)}</div><div class="l">bancada, compra uma vez só</div></div>
    <div class="fact"><div class="v">~6 semanas</div><div class="l">do pedido até a coleira chegar ao comprador</div></div>
    <div class="fact"><div class="v">Firmware v0.1</div><div class="l">pronto e testado em simulação. Falta a bancada (Etapa 2)</div></div>`;
}
document.body.addEventListener('click',e=>{const g=e.target.closest('[data-go]'); if(g) go(g.dataset.go);});

$('#resetBtn').addEventListener('click',()=>{
  if(!S._confirm){S._confirm=1;$('#resetBtn').textContent='Clique de novo para apagar';setTimeout(()=>{delete S._confirm;$('#resetBtn').textContent='Apagar tudo o que marquei';},4000);return;}
  S=NOVO(); save(); renderAll(); $('#resetBtn').textContent='Apagar tudo o que marquei';
});

function renderAll(){renderBuy();renderSteps();renderTests();renderFirmware();renderHome();renderTop();}
renderAll();
function fromHash(){const h=(location.hash||'').slice(1); if(ABAS.includes(h)||h==='depois') go(h);}
medirAbas(); fromHash(); window.addEventListener('hashchange',fromHash);

// Confere a tabela de ligações contra o esquema (aparece no console se algo não bater).
(function(){const p=conferirCircuito(); if(p.length) console.warn('Circuito:',p);})();
