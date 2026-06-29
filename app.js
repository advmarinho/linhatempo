let activityData = readJsonStorage("activityData", {});
let calendarioDireto = readJsonStorage("calendarioDireto", []);
calendarioDireto = calendarioDireto.map(e => normalizarEventoCalendario(e));
migrarCalendarioDiretoLegado();
let dragSource = null;
let calAno = new Date().getFullYear();
let calMes = new Date().getMonth();

function autoResizeTextarea(el){ if(!el) return; el.style.height="auto"; el.style.height=el.scrollHeight+"px"; }
function autoResizeAllTextareas(){ document.querySelectorAll("textarea").forEach(t=>autoResizeTextarea(t)); }

function saveData(){
  localStorage.setItem("activityData", JSON.stringify(activityData));
  saveCalendarioDireto();
  updateProgress(); updateDaysColors(); verificarAtrasos(); renderFluxo(); renderGantt();
  const calPanel=document.getElementById("calendarioPanel");
  if(calPanel && calPanel.style.display!=="none") renderCalendario();
}

function updateMesTexto(){
  const now=new Date();
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  document.getElementById("mesAtual").innerText=`${meses[now.getMonth()]} de ${now.getFullYear()}`;
  document.getElementById("footerAno").innerText=now.getFullYear();
}

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }

function readJsonStorage(key, fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    console.warn(`Não foi possível ler ${key} do localStorage`, e);
    return fallback;
  }
}

function newId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
}

function saveCalendarioDireto(){
  localStorage.setItem("calendarioDireto", JSON.stringify(calendarioDireto));
}

function normalizarEventoCalendario(e={}, day, startYear, startMonth){
  const now=new Date();
  let dia=Number(e.day ?? e.dia ?? day ?? now.getDate());
  if(!dia || isNaN(dia)) dia=now.getDate();
  dia=Math.max(1, Math.min(31, dia));
  let mes=Number(e.startMonth ?? e.mesInicial ?? startMonth ?? now.getMonth());
  if(mes>=1 && mes<=12 && e.startMonth===undefined && e.mesInicial!==undefined) mes=mes-1;
  if(isNaN(mes) || mes<0 || mes>11) mes=now.getMonth();
  let ano=Number(e.startYear ?? e.anoInicial ?? startYear ?? now.getFullYear());
  if(!ano || isNaN(ano)) ano=now.getFullYear();
  return {
    id: e.id || newId(),
    text: e.text || e.titulo || e.atividade || "",
    responsavel: e.responsavel || "",
    prioridade: e.prioridade || "Média",
    status: e.status || "Pendente",
    obs: e.obs || "",
    day: dia,
    startYear: ano,
    startMonth: mes,
    recorrenteMensal: e.recorrenteMensal !== false,
    origem: "CAL"
  };
}

function migrarCalendarioDiretoLegado(){
  if(calendarioDireto.length){ saveCalendarioDireto(); return; }
  const possibleKeys=["calendarData","calendarioData","calendarDirectData","calendarioDiretoData","calendarActivities","calendarioAtividades","atividadesCalendario","atividadesDiretasCalendario"];
  const importados=[];
  possibleKeys.forEach(key=>{
    const legado=readJsonStorage(key,null);
    if(!legado) return;
    if(Array.isArray(legado)){
      legado.forEach(e=>importados.push(normalizarEventoCalendario(e)));
      return;
    }
    if(typeof legado!=="object") return;
    Object.keys(legado).forEach(k=>{
      const valor=legado[k];
      if(/^\d{4}-\d{2}$/.test(k) && valor && typeof valor==="object"){
        const [anoTxt,mesTxt]=k.split("-");
        Object.keys(valor).forEach(dia=>{
          const lista=Array.isArray(valor[dia])?valor[dia]:[valor[dia]];
          lista.filter(Boolean).forEach(e=>importados.push(normalizarEventoCalendario(e, Number(dia), Number(anoTxt), Number(mesTxt)-1)));
        });
      }else if(/^\d{1,2}$/.test(k)){
        const lista=Array.isArray(valor)?valor:[valor];
        lista.filter(Boolean).forEach(e=>importados.push(normalizarEventoCalendario(e, Number(k))));
      }
    });
  });
  if(importados.length){
    calendarioDireto=importados;
    saveCalendarioDireto();
  }
}

function mesSerial(y,m){ return y*12+m; }

function eventoDiretoApareceNoDia(e,y,m,d){
  const totalDias=getDaysInMonth(y,m);
  const diaExibicao=Math.min(Number(e.day)||1,totalDias);
  const inicio=mesSerial(Number(e.startYear),Number(e.startMonth));
  const alvo=mesSerial(y,m);
  return e.recorrenteMensal!==false && alvo>=inicio && diaExibicao===d;
}

function eventosDiretosDoDia(y,m,d){
  return calendarioDireto.filter(e=>eventoDiretoApareceNoDia(e,y,m,d));
}

function sanitizePromptText(s){ return String(s||"").trim(); }

function textoEventoCalendario(a){
  return sanitizePromptText(a.text || a.titulo || a.atividade || "(sem título)");
}

function classeCalendarioPorStatusPrioridade(ev,a){
  if(a.status==="Concluído")         ev.classList.add("ev-done");
  else if(a.prioridade==="Alta")     ev.classList.add("ev-alta");
  else if(a.prioridade==="Média")    ev.classList.add("ev-media");
  else if(a.status==="Em andamento") ev.classList.add("ev-andamento");
}

function addCalendarActivity(day){
  const texto=sanitizePromptText(prompt("Digite a atividade para este dia do calendário:"));
  if(!texto) return;
  const prioridadeRaw=sanitizePromptText(prompt("Prioridade: Baixa, Média ou Alta", "Média"));
  const prioridade=["Baixa","Média","Alta"].includes(prioridadeRaw) ? prioridadeRaw : "Média";
  calendarioDireto.push(normalizarEventoCalendario({
    text:texto,
    prioridade,
    status:"Pendente",
    day,
    startYear:calAno,
    startMonth:calMes,
    recorrenteMensal:true,
    obs:`Criada diretamente no calendário em ${String(day).padStart(2,"0")}/${String(calMes+1).padStart(2,"0")}/${calAno}. Repetição mensal automática.`
  }, day, calAno, calMes));
  saveCalendarioDireto();
  renderCalendario();
}

function editarCalendarioDireto(id){
  const atv=calendarioDireto.find(e=>e.id===id);
  if(!atv) return;
  const acao=sanitizePromptText(prompt(
    `Atividade direta do calendário:\n${atv.text}\n\nDigite:\n1 - Editar texto\n2 - Alternar status Pendente/Concluído\n3 - Excluir esta recorrência mensal\n\nA recorrência mensal começa em ${String(atv.startMonth+1).padStart(2,"0")}/${atv.startYear}.`,
    "1"
  ));
  if(!acao) return;
  if(acao==="1"){
    const novo=sanitizePromptText(prompt("Novo texto da atividade:", atv.text));
    if(novo) atv.text=novo;
  }else if(acao==="2"){
    atv.status=atv.status==="Concluído"?"Pendente":"Concluído";
  }else if(acao==="3"){
    if(confirm("Excluir esta atividade direta do calendário e suas próximas repetições mensais?")){
      calendarioDireto=calendarioDireto.filter(e=>e.id!==id);
    }
  }
  saveCalendarioDireto();
  renderCalendario();
}

function createTimeline(){
  const timeline=document.getElementById("timeline");
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const total=getDaysInMonth(y,m);
  timeline.innerHTML="";
  for(let i=1;i<=total;i++){
    const dt=new Date(y,m,i); const dow=dt.getDay();
    const div=document.createElement("div");
    div.classList.add("day"); div.innerText=i;
    if(dow===6) div.classList.add("saturday");
    if(dow===0) div.classList.add("sunday");
    div.onclick=()=>showDay(i);
    div.ondragover=e=>{e.preventDefault();div.classList.add("drag-target");};
    div.ondragleave=()=>div.classList.remove("drag-target");
    div.ondrop=e=>{e.preventDefault();div.classList.remove("drag-target");dropOnDayCircle(i);};
    timeline.appendChild(div);
  }
}

function updateDaysColors(){
  document.querySelectorAll(".day").forEach(el=>{
    const dia=parseInt(el.innerText); const list=activityData[dia]||[];
    el.classList.remove("concluido");
    if(list.length>0&&list.every(a=>a.status==="Concluído")) el.classList.add("concluido");
  });
}

function highlightDay(day){
  document.querySelectorAll(".day").forEach(d=>d.classList.remove("selected"));
  const found=[...document.querySelectorAll(".day")].find(d=>d.innerText==day);
  if(found) found.classList.add("selected");
}

function showDay(day){
  highlightDay(day);
  const body=document.getElementById("activityBody");
  document.getElementById("selectedDay").innerText=`Dia ${day}`;
  body.innerHTML="";
  if(!activityData[day]) activityData[day]=[];
  activityData[day].forEach((a,i)=>body.appendChild(buildRow(day,i,a)));
  setTimeout(autoResizeAllTextareas,0);
  saveData();
}

function showAllActivities(){
  const body=document.getElementById("activityBody");
  document.getElementById("selectedDay").innerText="Todas as Atividades";
  body.innerHTML="";
  Object.keys(activityData).sort((a,b)=>Number(a)-Number(b)).forEach(day=>{
    activityData[day].forEach((a,i)=>body.appendChild(buildRow(day,i,a)));
  });
  setTimeout(autoResizeAllTextareas,0);
}

function buildRow(day,i,a){
  const tr=document.createElement("tr");
  tr.draggable=true;
  if(a.status==="Concluído")         tr.classList.add("tr-concluido");
  else if(a.status==="Pendente")     tr.classList.add("tr-pendente");
  else if(a.status==="Em andamento") tr.classList.add("tr-andamento");

  tr.addEventListener("dragstart",e=>{
    dragSource={day:Number(day),index:i};
    tr.classList.add("dragging-row");
    e.dataTransfer.effectAllowed="move";
    document.getElementById("dragTooltip").style.display="block";
  });
  tr.addEventListener("dragend",()=>{
    tr.classList.remove("dragging-row");
    document.getElementById("dragTooltip").style.display="none";
    document.querySelectorAll(".drag-over-row").forEach(r=>r.classList.remove("drag-over-row"));
  });
  tr.addEventListener("dragover",e=>{
    e.preventDefault();
    document.querySelectorAll(".drag-over-row").forEach(r=>r.classList.remove("drag-over-row"));
    tr.classList.add("drag-over-row");
  });
  tr.addEventListener("dragleave",()=>tr.classList.remove("drag-over-row"));
  tr.addEventListener("drop",e=>{e.preventDefault();tr.classList.remove("drag-over-row");dropOnRow(Number(day),i);});

  const noCalChecked=a.noCalendario?"ativo":"inativo";
  const noCalIcon=a.noCalendario?"📅":"📋";

  tr.innerHTML=`
    <td><textarea oninput="autoResizeTextarea(this);updateField(${day},${i},'text',this.value)"
                  onchange="updateField(${day},${i},'text',this.value)">${a.text||""}</textarea></td>
    <td><input value="${escHtml(a.responsavel||"")}" onchange="updateField(${day},${i},'responsavel',this.value)"></td>
    <td><select onchange="updateField(${day},${i},'prioridade',this.value)">
      <option ${a.prioridade==="Alta"?"selected":""}>Alta</option>
      <option ${a.prioridade==="Média"?"selected":""}>Média</option>
      <option ${a.prioridade==="Baixa"?"selected":""}>Baixa</option>
    </select></td>
    <td><select onchange="updateField(${day},${i},'status',this.value)">
      <option ${a.status==="Pendente"?"selected":""}>Pendente</option>
      <option ${a.status==="Em andamento"?"selected":""}>Em andamento</option>
      <option ${a.status==="Concluído"?"selected":""}>Concluído</option>
    </select></td>
    <td><input type="date" value="${a.inicio||""}" onchange="updateField(${day},${i},'inicio',this.value)"></td>
    <td><input type="date" value="${a.fim||""}"   onchange="updateField(${day},${i},'fim',this.value)"></td>
    <td><input value="${escHtml(a.depende||"")}"  onchange="updateField(${day},${i},'depende',this.value)"></td>
    <td><textarea oninput="autoResizeTextarea(this);updateField(${day},${i},'obs',this.value)"
                  onchange="updateField(${day},${i},'obs',this.value)">${a.obs||""}</textarea></td>
    <td><span class="flag-cal ${noCalChecked}"
              title="${a.noCalendario?"Remover do calendário":"Adicionar ao calendário"}"
              onclick="toggleCalFlag(${day},${i},this)">${noCalIcon}</span></td>
    <td>
      <button class="action-btn move-btn"   onclick="moveActivity(${day},${i})">↗ Mover</button>
      <button class="action-btn delete-btn" onclick="deleteActivity(${day},${i})">✕ Excluir</button>
    </td>`;
  return tr;
}

function escHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function toggleCalFlag(day,index,el){
  const atv=activityData[day][index];
  atv.noCalendario=!atv.noCalendario;
  el.textContent=atv.noCalendario?"📅":"📋";
  el.className="flag-cal "+(atv.noCalendario?"ativo":"inativo");
  el.title=atv.noCalendario?"Remover do calendário":"Adicionar ao calendário";
  saveData();
}

function updateField(day,index,field,value){
  activityData[day][index][field]=value;
  saveData();
  if(field==="status") showDay(day);
}

function dropOnRow(toDay,toIndex){
  if(!dragSource) return;
  const fromDay=dragSource.day; const fromIndex=dragSource.index;
  if(fromDay===toDay&&fromIndex===toIndex){dragSource=null;return;}
  const atv=activityData[fromDay][fromIndex];
  if(fromDay!==toDay) atv.obs=(atv.obs||"")+` [Movida do dia ${fromDay} → ${toDay} via drag]`;
  if(!activityData[toDay]) activityData[toDay]=[];
  activityData[toDay].splice(toIndex,0,atv);
  let removeIdx=fromIndex;
  if(fromDay===toDay&&fromIndex>=toIndex) removeIdx++;
  activityData[fromDay].splice(removeIdx,1);
  if(activityData[fromDay].length===0) delete activityData[fromDay];
  dragSource=null; saveData();
  const titulo=document.getElementById("selectedDay").innerText;
  if(titulo.startsWith("Dia ")) showDay(toDay); else showAllActivities();
}

function dropOnDayCircle(toDay){
  if(!dragSource) return;
  const fromDay=dragSource.day; const fromIndex=dragSource.index;
  if(fromDay===toDay){dragSource=null;return;}
  const atv=activityData[fromDay][fromIndex];
  atv.obs=(atv.obs||"")+` [Movida do dia ${fromDay} → ${toDay} via drag]`;
  if(!activityData[toDay]) activityData[toDay]=[];
  activityData[toDay].push(atv);
  activityData[fromDay].splice(fromIndex,1);
  if(activityData[fromDay].length===0) delete activityData[fromDay];
  dragSource=null; saveData(); showDay(toDay);
}

function dropOnCalCell(toDay){
  if(!dragSource) return;
  const fromDay=dragSource.day; const fromIndex=dragSource.index;
  if(fromDay===toDay){dragSource=null;renderCalendario();return;}
  const atv=activityData[fromDay][fromIndex];
  atv.obs=(atv.obs||"")+` [Movida do dia ${fromDay} → ${toDay} via calendário]`;
  if(!activityData[toDay]) activityData[toDay]=[];
  activityData[toDay].push(atv);
  activityData[fromDay].splice(fromIndex,1);
  if(activityData[fromDay].length===0) delete activityData[fromDay];
  dragSource=null; saveData(); renderCalendario();
}

function addActivity(){
  let texto=document.getElementById("selectedDay").innerText.trim();
  let day=null;
  if(texto.startsWith("Dia ")) day=parseInt(texto.replace("Dia ",""));
  else if(texto==="Todas as Atividades") day=parseInt(prompt("Dia (1-31):"));
  if(!day||isNaN(day)) day=new Date().getDate();
  if(!activityData[day]) activityData[day]=[];
  activityData[day].unshift({id:newId(),text:"",responsavel:"",prioridade:"Média",status:"Pendente",inicio:"",fim:"",depende:"",obs:"",noCalendario:false});
  saveData(); showDay(day);
}

function deleteActivity(day,index){
  if(!confirm("Excluir esta atividade?")) return;
  activityData[day].splice(index,1);
  if(activityData[day].length===0) delete activityData[day];
  saveData();
  const titulo=document.getElementById("selectedDay").innerText;
  if(titulo.startsWith("Dia ")) showDay(day); else showAllActivities();
}

function setAllActivitiesToPendente(){
  const titulo=document.getElementById("selectedDay").innerText.trim();
  if(!titulo.startsWith("Dia ")){alert("Selecione um dia na Linha do Tempo.");return;}
  const day=parseInt(titulo.replace("Dia ",""));
  if(!activityData[day]||activityData[day].length===0){alert("Não há atividades neste dia.");return;}
  activityData[day].forEach(a=>{a.status="Pendente";}); saveData(); showDay(day);
}

function moveAllWeekendActivitiesToWeekday(){
  const titulo=document.getElementById("selectedDay").innerText.trim();
  if(!titulo.startsWith("Dia ")){alert("Selecione um dia na Linha do Tempo.");return;}
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const total=getDaysInMonth(y,m);
  const day=parseInt(titulo.replace("Dia ",""));
  if(!activityData[day]||activityData[day].length===0){alert("Não há atividades neste dia.");return;}
  const dt=new Date(y,m,day); const dow=dt.getDay();
  if(dow!==6&&dow!==0){alert("O dia selecionado não é sábado/domingo.");return;}
  const alvo=parseInt(prompt(`Para qual dia útil (1-${total}) deseja mover TODAS as atividades deste dia?`));
  if(!alvo||isNaN(alvo)||alvo<1||alvo>total) return;
  const dtAlvo=new Date(y,m,alvo); const dowAlvo=dtAlvo.getDay();
  if(dowAlvo===0||dowAlvo===6){alert("O dia destino precisa ser dia útil (segunda a sexta).");return;}
  if(!activityData[alvo]) activityData[alvo]=[];
  const moved=activityData[day].map(atv=>{atv.obs=(atv.obs||"")+` [Movida em lote do dia ${day} para ${alvo}]`;return atv;});
  activityData[alvo].push(...moved); delete activityData[day];
  saveData(); showDay(alvo);
}

function moveActivity(day,index){
  const novo=parseInt(prompt("Mover para qual dia?"));
  if(!novo||isNaN(novo)) return;
  if(!activityData[novo]) activityData[novo]=[];
  const atv=activityData[day][index];
  atv.obs=(atv.obs||"")+` [Movida do dia ${day}]`;
  activityData[novo].push(atv); activityData[day].splice(index,1);
  if(activityData[day].length===0) delete activityData[day];
  saveData(); showDay(novo);
}

function renderFluxo(){
  const todo=document.getElementById("todo");
  const doing=document.getElementById("doing");
  const done=document.getElementById("done");
  todo.innerHTML="<h3>Pendente</h3>";
  doing.innerHTML="<h3>Em andamento</h3>";
  done.innerHTML="<h3>Concluído</h3>";
  Object.keys(activityData).forEach(day=>{
    activityData[day].forEach(a=>{
      const card=document.createElement("div"); card.classList.add("card");
      if(a.status==="Concluído")         card.classList.add("card-concluido");
      else if(a.atrasada)                card.classList.add("card-atrasado");
      else if(a.status==="Em andamento") card.classList.add("card-andamento");
      else if(a.status==="Pendente")     card.classList.add("card-pendente");
      card.innerHTML=`<b>${a.text||""}</b>Dia: ${day} · ${a.inicio||"—"} → ${a.fim||"—"}`;
      card.onclick=()=>{openPanel("timelinePanel");showDay(day);};
      if(a.status==="Pendente") todo.appendChild(card);
      else if(a.status==="Em andamento") doing.appendChild(card);
      else done.appendChild(card);
    });
  });
}

function filterFluxo(){
  const termo=document.getElementById("searchFluxo").value.toLowerCase();
  document.querySelectorAll("#fluxoBoard .card").forEach(card=>{
    card.style.display=card.innerText.toLowerCase().includes(termo)?"block":"none";
  });
}

function renderGantt(){
  const container=document.getElementById("ganttContainer"); container.innerHTML="";
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const total=getDaysInMonth(y,m); const dayWidth=30;
  const header=document.createElement("div"); header.classList.add("gantt-header");
  for(let d=1;d<=total;d++){const div=document.createElement("div");div.innerText=d;header.appendChild(div);}
  container.appendChild(header);
  Object.keys(activityData).forEach(day=>{
    activityData[day].forEach(a=>{
      if(!a.inicio||!a.fim) return;
      const inicio=new Date(a.inicio); const fim=new Date(a.fim);
      if(inicio.getMonth()!==m&&fim.getMonth()!==m) return;
      const row=document.createElement("div"); row.classList.add("gantt-row");
      const bar=document.createElement("div"); bar.classList.add("gantt-bar");
      if(a.status==="Concluído")      bar.classList.add("concluido");
      else if(a.prioridade==="Alta")  bar.classList.add("prioAlta");
      else if(a.prioridade==="Média") bar.classList.add("prioMedia");
      else bar.classList.add("prioBaixa");
      const start=inicio.getDate(); const end=fim.getDate();
      bar.style.left=(start-1)*dayWidth+"px"; bar.style.width=(end-start+1)*dayWidth+"px";
      bar.innerText=a.text||""; bar.title=a.text||"";
      bar.onclick=()=>{openPanel("timelinePanel");showDay(day);};
      row.appendChild(bar); container.appendChild(row);
    });
  });
}

function calNavegar(delta){
  calMes+=delta;
  if(calMes<0){calMes=11;calAno--;} if(calMes>11){calMes=0;calAno++;}
  renderCalendario();
}

function renderCalendario(){
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  document.getElementById("calMesTexto").innerText=`${meses[calMes]} de ${calAno}`;
  const grid=document.getElementById("calGrid"); grid.innerHTML="";
  ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].forEach(d=>{
    const h=document.createElement("div"); h.className="cal-dow"; h.innerText=d; grid.appendChild(h);
  });
  const primeiroDow=new Date(calAno,calMes,1).getDay();
  const totalDias=getDaysInMonth(calAno,calMes);
  const hoje=new Date();
  for(let i=0;i<primeiroDow;i++){
    const e=document.createElement("div"); e.className="cal-cell cal-empty"; grid.appendChild(e);
  }
  for(let d=1;d<=totalDias;d++){
    const cell=document.createElement("div"); cell.className="cal-cell";
    const dow=new Date(calAno,calMes,d).getDay();
    if(dow===0||dow===6) cell.classList.add("cal-weekend");
    if(d===hoje.getDate()&&calMes===hoje.getMonth()&&calAno===hoje.getFullYear()) cell.classList.add("cal-today");

    const head=document.createElement("div"); head.className="cal-cell-head";
    const num=document.createElement("div"); num.className="cal-day-num"; num.innerText=d; head.appendChild(num);
    const add=document.createElement("button");
    add.type="button"; add.className="cal-add-btn"; add.innerText="+";
    add.title="Adicionar atividade direta no calendário. Ela será repetida nos próximos meses.";
    add.onclick=e=>{e.stopPropagation();addCalendarActivity(d);};
    head.appendChild(add); cell.appendChild(head);

    (activityData[d]||[]).filter(a=>a.noCalendario).forEach(a=>{
      const ev=document.createElement("div"); ev.className="cal-event cal-event-lt";
      classeCalendarioPorStatusPrioridade(ev,a);
      ev.innerHTML=`<span class="cal-event-text">${escHtml(textoEventoCalendario(a))}</span><span class="cal-tag-lt">LT</span>`;
      ev.title=`${a.text} | ${a.responsavel||"—"} | ${a.status} | Mapeada da Linha do Tempo`;
      ev.onclick=e=>{e.stopPropagation();openPanel("timelinePanel");showDay(d);};
      cell.appendChild(ev);
    });

    eventosDiretosDoDia(calAno,calMes,d).forEach(a=>{
      const ev=document.createElement("div"); ev.className="cal-event cal-event-direto";
      classeCalendarioPorStatusPrioridade(ev,a);
      ev.innerHTML=`<span class="cal-event-text">${escHtml(textoEventoCalendario(a))}</span><span class="cal-tag-cal">M</span>`;
      ev.title=`${a.text} | ${a.status} | Atividade direta do calendário com repetição mensal`;
      ev.onclick=e=>{e.stopPropagation();editarCalendarioDireto(a.id);};
      cell.appendChild(ev);
    });

    cell.ondragover=e=>{e.preventDefault();cell.classList.add("cal-drag-over");};
    cell.ondragleave=()=>cell.classList.remove("cal-drag-over");
    cell.ondrop=e=>{e.preventDefault();cell.classList.remove("cal-drag-over");dropOnCalCell(d);};
    grid.appendChild(cell);
  }
}
function updateProgress(){
  let total=0,done=0;
  Object.keys(activityData).forEach(day=>{activityData[day].forEach(a=>{total++;if(a.status==="Concluído")done++;});});
  const pct=total?((done/total)*100).toFixed(1):0;
  document.getElementById("progressLabel").innerText=`Progresso: ${done} de ${total} concluída${total!==1?"s":""}`;
  document.getElementById("progressFill").style.width=pct+"%";
  document.getElementById("progressPct").innerText=pct+"%";
}

function verificarAtrasos(){
  const hoje=new Date();
  Object.keys(activityData).forEach(day=>{
    activityData[day].forEach(a=>{
      if(a.fim&&a.status!=="Concluído"){const f=new Date(a.fim);a.atrasada=f<hoje;}
      else a.atrasada=false;
    });
  });
}

function exportToExcel(){
  let linhas=[];
  Object.keys(activityData).forEach(day=>{
    activityData[day].forEach(a=>{
      linhas.push({Origem:"Linha do Tempo",Dia:day,Atividade:a.text,Responsavel:a.responsavel,Prioridade:a.prioridade,Status:a.status,Inicio:a.inicio,Fim:a.fim,Depende:a.depende,Obs:a.obs,Calendário:a.noCalendario?"Sim":"Não",Recorrência:""});
    });
  });
  calendarioDireto.forEach(a=>{
    linhas.push({Origem:"Calendário direto",Dia:a.day,Atividade:a.text,Responsavel:a.responsavel,Prioridade:a.prioridade,Status:a.status,Inicio:`${String(a.startMonth+1).padStart(2,"0")}/${a.startYear}`,Fim:"",Depende:"",Obs:a.obs,Calendário:"Sim",Recorrência:"Mensal automática"});
  });
  const ws=XLSX.utils.json_to_sheet(linhas);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Atividades");
  XLSX.writeFile(wb,"Gerenciador_RH.xlsx");
}

function exportBackup(){
  const backup={
    version:2,
    exportedAt:new Date().toISOString(),
    activityData,
    calendarioDireto
  };
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="backup_gerenciador.json"; a.click();
}

function importBackup(){ document.getElementById("importFile").click(); }

function handleImportFile(evt){
  const file=evt.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      if(parsed && parsed.activityData){
        activityData=parsed.activityData || {};
        calendarioDireto=(parsed.calendarioDireto || []).map(e=>normalizarEventoCalendario(e));
      }else{
        activityData=parsed || {};
        calendarioDireto=[];
      }
      saveData(); createTimeline(); showAllActivities(); renderCalendario();
      alert("Backup importado com sucesso!");
    }
    catch{alert("Erro ao importar JSON.");}
  };
  reader.readAsText(file);
}

function openPanel(panel){
  document.querySelectorAll(".panel").forEach(p=>p.style.display="none");
  document.getElementById(panel).style.display="block";
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const nb=document.getElementById("nav-"+panel); if(nb) nb.classList.add("active");
  if(panel==="fluxoPanel")      renderFluxo();
  if(panel==="ganttPanel")      renderGantt();
  if(panel==="calendarioPanel") renderCalendario();
}

document.addEventListener("dragover",e=>{
  const tip=document.getElementById("dragTooltip");
  if(tip.style.display==="block"){tip.style.left=(e.clientX+16)+"px";tip.style.top=(e.clientY+10)+"px";}
});

updateMesTexto();
createTimeline();
const hoje=new Date().getDate();
showDay(hoje);
setTimeout(autoResizeAllTextareas,0);
renderFluxo(); updateProgress(); verificarAtrasos(); renderGantt();
