/*  Focal — Task Management App
 *  Copyright (c) 2026 Luciano Cunha. All rights reserved.
 *  License: CC BY-NC 4.0
 */

// ═══ STATE ═══
// State
let S = loadS();
let showDone=false, hideConf=true, activeF=new Set(['all']), curView='today', showBacklog=false, wrStage=0;
let demoMode=false;
let wrKeptIds=new Set();
let eId=null, eSec=null, dragId=null, dragSec=null, modalConns=[], modalOutcomes=[];
let matrixSectionFilter=new Set(['all']), matrixMode='view', pmFilter='all', pmFocus=false;
let kanbanSectionFilter=new Set(['all']);
let ctxTaskId=null,ctxTaskSec=null,ctxTaskCol=null,ctxView=null;
let personFilter=[];
let _editGrpId=null, _newGrpMembers=[], _newGrpName='', _pplLetter='';
let analyticsP='month';

// ═══ PERSISTENCE ═══
const DEFAULT_OUTCOMES=[
  {id:'arr',       name:'ARR',                 color:'#059669', active:true, sort:0},
  {id:'nrr',       name:'NRR',                 color:'#2563EB', active:true, sort:1},
  {id:'ebitda',    name:'EBITDA',              color:'#D97706', active:true, sort:2},
  {id:'board',     name:'Board Commitments',   color:'#DC2626', active:true, sort:3},
  {id:'people',    name:'Leadership / People', color:'#7C3AED', active:true, sort:4},
  {id:'strategic', name:'Strategic Projects',  color:'#00B5B0', active:true, sort:5},
];
function migrateV82(d){ if(!d.outcomes) d.outcomes=JSON.parse(JSON.stringify(DEFAULT_OUTCOMES)); if(!d.personGroups) d.personGroups=[]; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(!t.outcomes) t.outcomes=[]; if(t.lastPrioritizedAt===undefined) t.lastPrioritizedAt=null; if(t.pData===undefined) t.pData=null; if(t.type==='recurring'&&!t.rInterval) t.rInterval='monthly'; })); if(d.settings&&!d.settings.theme) d.settings.theme='light'; }
function rebuildSecDropdown(){
  const sel=document.getElementById('fSec');
  if(!sel) return;
  sel.innerHTML=S.sections.map(s=>`<option value="${escAttr(s.id)}">${escHtml((s.icon||'')+' '+s.title)}</option>`).join('');
}

function loadS(){
  try{
    const fv1=localStorage.getItem('focal_v1');
    if(fv1){ const d=JSON.parse(fv1); if(!d.inbox) d.inbox=[]; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(!t.lastStatusChange) t.lastStatusChange=t.due||new Date().toISOString().split('T')[0]; if(t.kanbanCol===undefined) t.kanbanCol=null; if(t.status==='Done'&&t.kanbanCol===null) t.kanbanCol='done'; if(!t.url) t.url=''; if(t.parent===undefined) t.parent=null; if(t.decided===undefined) t.decided=false; if(!t.kanbanColSince) t.kanbanColSince=null; })); if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; migrateV82(d); return d; }
    const v5=localStorage.getItem('ceo_v5');
    if(v5){ const d=JSON.parse(v5); if(!d.inbox) d.inbox=[]; if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(!t.lastStatusChange) t.lastStatusChange=t.due||new Date().toISOString().split('T')[0]; if(t.kanbanCol===undefined) t.kanbanCol=null; if(t.status==='Done'&&t.kanbanCol===null) t.kanbanCol='done'; if(!t.url) t.url=''; if(t.parent===undefined) t.parent=null; if(t.decided===undefined) t.decided=false; if(!t.kanbanColSince) t.kanbanColSince=null; })); migrateV82(d); localStorage.setItem('focal_v1',JSON.stringify(d)); localStorage.removeItem('ceo_v5'); return d; }
    const cur=localStorage.getItem('ceo_v4');
    if(cur){ const d=JSON.parse(cur); if(!d.inbox) d.inbox=[]; if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(!t.lastStatusChange) t.lastStatusChange=t.due||new Date().toISOString().split('T')[0]; if(t.kanbanCol===undefined) t.kanbanCol=null; if(t.status==='Done'&&t.kanbanCol===null) t.kanbanCol='done'; if(!t.url) t.url=''; if(t.parent===undefined) t.parent=null; if(t.decided===undefined) t.decided=false; if(!t.kanbanColSince) t.kanbanColSince=null; })); migrateV82(d); localStorage.setItem('focal_v1',JSON.stringify(d)); localStorage.removeItem('ceo_v4'); return d; }
    const old=localStorage.getItem('ceo_v3');
    if(old){
      const oldS=JSON.parse(old);
      const fresh=clone(FILE_DATA);
      fresh.sections.forEach(sec=>{
        const oldSec=oldS.sections&&oldS.sections.find(s=>s.id===sec.id);
        if(!oldSec) return;
        sec.tasks.forEach(t=>{
          const ot=oldSec.tasks&&oldSec.tasks.find(x=>x.id===t.id);
          if(!ot) return;
          ['status','note','due','connections','priority','urgent','confidential','type','rInterval'].forEach(k=>{
            if(ot[k]!==undefined) t[k]=ot[k];
          });
        });
        (oldSec.tasks||[]).forEach(ot=>{
          if(!sec.tasks.find(t=>t.id===ot.id)) sec.tasks.push(ot);
        });
      });
      (oldS.sections||[]).forEach(os=>{
        if(!fresh.sections.find(s=>s.id===os.id)) fresh.sections.push(os);
      });
      if(oldS.knownConnections) fresh.knownConnections=[...new Set([...fresh.knownConnections,...oldS.knownConnections])];
      fresh.inbox = fresh.inbox || [];
      fresh.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.kanbanCol===undefined) t.kanbanCol=null; if(t.status==='Done'&&t.kanbanCol===null) t.kanbanCol='done'; if(!t.url) t.url=''; if(t.parent===undefined) t.parent=null; }));
      migrateV82(fresh);
      localStorage.setItem('focal_v1',JSON.stringify(fresh));
      localStorage.removeItem('ceo_v3');
      return fresh;
    }
    const d=clone(FILE_DATA); if(!d.inbox) d.inbox=[]; migrateV82(d);
    return d;
  } catch(err){
    // Corrupted JSON or unreadable storage — preserve the bad blob so user can recover it,
    // then fall back to demo seed. Warn loudly on next paint.
    try{
      const bad=localStorage.getItem('focal_v1');
      if(bad){ const k='focal_v1_corrupted_'+Date.now(); try{ localStorage.setItem(k,bad); }catch{} }
    }catch{}
    setTimeout(()=>{ try{ showToast('⚠️ Stored data was unreadable — restored demo. A backup was saved as focal_v1_corrupted_*. Open DevTools → Application → Local Storage to recover.', 10000); }catch{} }, 800);
    console.error('Focal: loadS recovered from corrupted storage:', err);
    const d=clone(FILE_DATA); if(!d.inbox) d.inbox=[]; if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.decided===undefined) t.decided=false; if(!t.kanbanColSince) t.kanbanColSince=null; })); migrateV82(d); return d;
  }
}
// _saveWarned debounces the quota toast so we don't spam the user on every action while full.
let _saveWarned=0;
function saveS(){
  try{ localStorage.setItem('focal_v1',JSON.stringify(S)); }
  catch(err){
    const isQuota=err&&(err.name==='QuotaExceededError'||err.code===22||err.code===1014||/quota/i.test(err.message||''));
    console.error('Focal: saveS failed', err);
    // Try a one-time emergency trim of analytics log to free space.
    if(isQuota){
      try{
        const log=JSON.parse(localStorage.getItem('focal_log')||'{"events":[],"weeks":[]}');
        log.events=(log.events||[]).slice(-200);
        log.weeks=(log.weeks||[]).slice(-26);
        localStorage.setItem('focal_log',JSON.stringify(log));
        localStorage.setItem('focal_v1',JSON.stringify(S));
        // fall through to bkSync below
      }catch{
        const now=Date.now();
        if(now-_saveWarned>5000){ _saveWarned=now; try{ showToast('⚠️ Browser storage full — your change was NOT saved. Export data or remove old tasks/notes.', 8000); }catch{} }
        return;
      }
    } else {
      const now=Date.now();
      if(now-_saveWarned>5000){ _saveWarned=now; try{ showToast('⚠️ Save failed — check console.', 8000); }catch{} }
      return;
    }
  }
  // Mirror to auto-backup file (debounced) if connected. Never blocks the local save.
  try{ if(typeof bkSync==='function') bkSync(false); }catch{}
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function genId(p){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

// ═══ CONSTANTS ═══
const PC={P1:'bp1',P2:'bp2',P3:'bp3',P4:'bp4'};
const PO=['P1','P2','P3','P4'];
const PL={P1:'Critical',P2:'High',P3:'Medium',P4:'Low'};
const PR={P1:'rp1',P2:'rp2',P3:'rp3',P4:'rp4'};
const SC={'To Do':'btodo','In Progress':'bprog',Done:'bdone',Backlog:'bbacklog'};
const SO=['To Do','In Progress','Done','Backlog'];
const AGE_THRESH={'To Do':{y:14,r:30},'In Progress':{y:7,r:21},'Backlog':{y:30,r:90}};
// Strict ISO date validator: accepts YYYY-MM-DD with a real calendar date (no Feb 30, etc).
function isValidISODate(s){
  if(!s||typeof s!=='string') return false;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,dd]=s.split('-').map(Number);
  if(y<1900||y>2999||m<1||m>12||dd<1||dd>31) return false;
  const d=new Date(s+'T00:00:00');
  return !isNaN(d.getTime())&&d.getFullYear()===y&&d.getMonth()===m-1&&d.getDate()===dd;
}
// Parse an ISO date string to local-midnight Date, or return null if invalid/empty/junk.
function safeDate(s){ return isValidISODate(s)?new Date(s+'T00:00:00'):null; }
function ageDays(t){
  const d=safeDate(t.lastStatusChange);
  if(!d) return 0;
  const today=new Date();today.setHours(0,0,0,0);
  const diff=Math.floor((today-d)/86400000);
  return isFinite(diff)?diff:0;
}
function ageLevel(t){ if(t.status==='Done') return 'none'; const th=AGE_THRESH[t.status]; if(!th) return 'none'; const d=ageDays(t); return d>=th.r?'red':d>=th.y?'yellow':'none'; }
function ageTip(t){ const lv=ageLevel(t); if(lv==='none') return ''; const dueD=safeDate(t.due); if(dueD){ const today=new Date();today.setHours(0,0,0,0); const daysUntil=Math.floor((dueD-today)/86400000); if(daysUntil<=0) return `Overdue by ${-daysUntil} day${-daysUntil===1?'':'s'} — needs attention`; return `Due in ${daysUntil} day${daysUntil===1?'':'s'} — time to schedule`; } const d=ageDays(t); const act=t.status==='Backlog'?'activate or delete':'update status or move to backlog'; return `${t.status} for ${d} day${d===1?'':'s'} — consider ${act}`; }

// ═══ UTILITIES ═══
function ldStr(d){ return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
// Add N months, clamping to last day of target month (so Jan 31 + 1mo = Feb 28/29, not Mar 3).
function addMonthsClamped(d,n){
  const targetMonth=d.getMonth()+n;
  const day=d.getDate();
  const r=new Date(d.getFullYear(),targetMonth,1,12,0,0,0);
  const lastDayOfTarget=new Date(r.getFullYear(),r.getMonth()+1,0).getDate();
  r.setDate(Math.min(day,lastDayOfTarget));
  return r;
}
function ds(due){ const d=safeDate(due); if(!d) return 'e'; const t=new Date();t.setHours(0,0,0,0); if(d<t) return 'u'; const eow=new Date(t);eow.setDate(t.getDate()+(7-t.getDay())%7); return d<=eow?'s':'n'; }
function dsNW(due){ const d=safeDate(due); if(!d) return false; const t=new Date();t.setHours(0,0,0,0); if(d<t) return false; const eow=new Date(t);eow.setDate(t.getDate()+(7-t.getDay())%7); if(d<=eow) return false; const enw=new Date(eow);enw.setDate(eow.getDate()+7); return d<=enw; }
function fd(due){ const d=safeDate(due); return d?d.toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—'; }
function ft(id,sec){ const s=S.sections.find(x=>x.id===sec); return s?s.tasks.find(t=>t.id===id):null; }

function allConns(){ const set=new Set([...(S.knownConnections||[]),...(FILE_DATA.knownConnections||[])]); S.sections.forEach(sec=>sec.tasks.forEach(t=>(t.connections||[]).forEach(c=>set.add(c)))); return [...set].sort(); }
function addKnownConn(name){ if(!S.knownConnections) S.knownConnections=[]; if(!S.knownConnections.includes(name)){ S.knownConnections.push(name); populatePersonFilter(); } }

document.getElementById('vbadge').textContent=`v${VER} · ${VDATE}`;
// pills start dim by default (Done hidden, Conf hidden, Backlog hidden) — no init classes needed

// ═══ SEARCH ═══
// Search autocomplete
let srchFocusIdx=-1;
function srchInput(){
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='kanban') renderKanban();
  if(curView==='today') renderToday();
  const q=(document.getElementById('srch').value||'').toLowerCase().trim();
  const sug=document.getElementById('srchSug');
  if(!q){sug.classList.remove('on');sug.innerHTML='';srchFocusIdx=-1;return;}
  const matches=[];
  S.sections.forEach(sec=>sec.tasks.forEach(t=>{
    if(t.status==='Done'&&!showDone) return;
    if(hideConf&&t.confidential) return;
    if(!matchesAll(t)) return;
    const hay=(t.task+' '+(t.note||'')+' '+(t.connections||[]).join(' ')).toLowerCase();
    if(!hay.includes(q)) return;
    const connMatch=(t.connections||[]).find(c=>c.toLowerCase().includes(q));
    const meta=connMatch?`${sec.title.replace(/ — .*/,'')} · ${connMatch}`:sec.title.replace(/ — .*/,'');
    matches.push({text:t.task,meta,id:t.id,secId:sec.id});
  }));
  if(!matches.length){sug.classList.remove('on');sug.innerHTML='';return;}
  srchFocusIdx=-1;
  sug.innerHTML=matches.slice(0,10).map((m,i)=>`<div class="srch-opt" data-id="${escAttr(m.id)}" data-sec="${escAttr(m.secId)}" data-text="${escAttr(m.text)}" onmousedown="srchPick('${escJs(m.id)}','${escJs(m.secId)}')"><span class="srch-opt-label">${highlight(m.text,q)}</span><span class="srch-opt-meta">${escHtml(m.meta)}</span></div>`).join('');
  sug.classList.add('on');
}
// HTML-escape: safe for both element content AND attribute values (single OR double quoted).
function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/`/g,'&#96;'); }
// escAttr kept as alias for callers; identical to escHtml now that escHtml handles quotes.
function escAttr(s){ return escHtml(s); }
// Escape a string for safe embedding inside a JS single-quoted string literal (e.g. onclick="fn('${escJs(name)}')").
// Belt-and-braces alongside escHtml — protects against names containing apostrophes or backslashes.
function escJs(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,'\\\'').replace(/</g,'\\u003C'); }
function highlight(text,q){
  const i=text.toLowerCase().indexOf(q);
  if(i<0) return escHtml(text);
  return escHtml(text.slice(0,i))+'<strong>'+escHtml(text.slice(i,i+q.length))+'</strong>'+escHtml(text.slice(i+q.length));
}
function dT(s){ if(!demoMode) return escHtml(s); return escHtml(s.replace(/\S+/g,w=>'●'.repeat(w.length))); }
function srchPick(id,secId){
  const el=document.querySelector(`.srch-opt[data-id="${id}"]`);
  const text=el?el.dataset.text:'';
  document.getElementById('srch').value=text;
  document.getElementById('srchSug').classList.remove('on');
  srchFocusIdx=-1;
  if(curView==='matrix'){
    renderMatrix();
  } else if(curView==='kanban'){
    renderKanban();
    setTimeout(()=>{ const kc=document.getElementById('kc-'+id); if(kc) kc.scrollIntoView({behavior:'smooth',block:'center'}); },80);
  } else if(curView==='today'){
    renderToday();
  } else {
    if(curView!=='tasks') sw('tasks');
    applyF();
    setTimeout(()=>{ const el=document.getElementById('row-'+id); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); },80);
  }
}
function srchKeydown(e){
  const sug=document.getElementById('srchSug');
  const items=[...sug.querySelectorAll('.srch-opt')];
  if(e.key==='ArrowDown'){e.preventDefault();srchFocusIdx=Math.min(srchFocusIdx+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('focused',i===srchFocusIdx));}
  else if(e.key==='ArrowUp'){e.preventDefault();srchFocusIdx=Math.max(srchFocusIdx-1,0);items.forEach((el,i)=>el.classList.toggle('focused',i===srchFocusIdx));}
  else if(e.key==='Enter'&&srchFocusIdx>=0&&items[srchFocusIdx]){
    const el=items[srchFocusIdx]; srchPick(el.dataset.id,el.dataset.sec);
  } else if(e.key==='Enter'&&srchFocusIdx<0){
    applyF(); if(curView==='matrix') renderMatrix();
    sug.classList.remove('on');
  } else if(e.key==='Escape'){sug.classList.remove('on');srchFocusIdx=-1;}
}
document.addEventListener('click',e=>{ if(!e.target.closest('.srch-wrap')) document.getElementById('srchSug').classList.remove('on'); });

// ═══ SECTION MANAGER ═══
// Section Manager
// openSecMgr() removed — use openSettingsPanel('categories')
const ICON_LIST=["📌","✅","🎯","📋","💼","📊","📈","💰","👥","🤝","👤","🏆","🎓","🌐","💬","📧","🚀","⚡","🔑","💡","🛠","⚙️","🔧","📦","🔥","⭐","🌟","🔔","🏅","🎁","🌱","🔐","🏛","🎗","🗂","🤖","💻","🎨","🌍","🏠"];
let _newSecIcon="📌";
function renderSecMgr(){
  const body=document.getElementById('secMgrBody');
  const rows=S.sections.map((sec)=>`
    <div class="sec-mgr-row" draggable="true" data-sid="${sec.id}" ondragstart="secDragStart(event,'${sec.id}')" ondragover="secDragOver(event)" ondrop="secDrop(event,'${sec.id}')" ondragend="secDragEnd()">
      <span class="sec-mgr-drag">⠣</span>
      <span class="sec-mgr-icon-btn" onclick="toggleSecIconPicker('${sec.id}')" title="Change icon">${sec.icon||"📌"}</span>
      <span class="sec-mgr-name">${escHtml(sec.title)}</span>
      <button class="sec-mgr-del" onclick="delSection('${sec.id}')" title="Delete category">🗑</button>
    </div>
    <div id="icon-picker-${sec.id}" style="display:none;padding:0 8px 8px">
      <div class="icon-grid">${ICON_LIST.map(ic=>`<span class="icon-opt${(sec.icon||"📌")===ic?' sel':''}" onclick="pickSecIcon('${sec.id}','${ic}')">${ic}</span>`).join('')}</div>
    </div>`).join('');
  body.innerHTML=rows+`
    <div class="sec-add-row" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;gap:6px;align-items:center">
        <span class="sec-mgr-icon-btn" id="newSecIconDisplay" onclick="toggleNewIconPicker()" title="Choose icon">${_newSecIcon}</span>
        <input class="sec-add-inp" id="newSecName" placeholder="New category name…" onkeydown="if(event.key==='Enter')addSection()" style="flex:1">
        <button class="bpri" style="padding:8px 16px;font-size:13px" onclick="addSection()">+ Add</button>
      </div>
      <div id="new-icon-picker" style="display:none">
        <div class="icon-grid">${ICON_LIST.map(ic=>`<span class="icon-opt${_newSecIcon===ic?' sel':''}" onclick="setNewSecIcon('${ic}')">${ic}</span>`).join('')}</div>
      </div>
    </div>`;
}
function toggleSecIconPicker(secId){
  const el=document.getElementById('icon-picker-'+secId);
  if(!el) return;
  const vis=el.style.display==='none';
  // close all pickers first
  document.querySelectorAll('[id^="icon-picker-"],[id="new-icon-picker"]').forEach(x=>x.style.display='none');
  if(vis) el.style.display='';
}
function toggleNewIconPicker(){
  const el=document.getElementById('new-icon-picker');
  if(!el) return;
  document.querySelectorAll('[id^="icon-picker-"]').forEach(x=>x.style.display='none');
  el.style.display=el.style.display==='none'?'':'none';
}
function pickSecIcon(secId,icon){
  const sec=S.sections.find(s=>s.id===secId); if(!sec) return;
  sec.icon=icon; saveS(); renderSecMgr();
}
function setNewSecIcon(icon){
  _newSecIcon=icon;
  const d=document.getElementById('newSecIconDisplay'); if(d) d.textContent=icon;
  const p=document.getElementById('new-icon-picker'); if(p) p.style.display='none';
  // Update selected state in grid
  renderSecMgr();
}

let secDragSrc=null;
function secDragStart(e,id){ secDragSrc=id; e.dataTransfer.effectAllowed='move'; e.currentTarget.style.opacity='.4'; }
function secDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.style.background='var(--teal-dim)'; }
function secDragEnd(){ document.querySelectorAll('.sec-mgr-row').forEach(r=>{ r.style.opacity=''; r.style.background=''; }); }
function secDrop(e,targetId){
  e.preventDefault(); e.currentTarget.style.background='';
  if(secDragSrc===targetId) return;
  const arr=S.sections;
  const from=arr.findIndex(s=>s.id===secDragSrc);
  const to=arr.findIndex(s=>s.id===targetId);
  if(from<0||to<0) return;
  const [item]=arr.splice(from,1); arr.splice(to,0,item);
  saveS(); renderSecMgr();
}
function addSection(){
  const name=document.getElementById('newSecName').value.trim();
  if(!name){showToast('Please enter a category name');return;}
  const id='sec_'+Date.now().toString(36);
  S.sections.push({id,icon:_newSecIcon,title:name,tasks:[]});
  _newSecIcon="📌";
  saveS(); renderSecMgr(); showToast('Category added: '+name);
}

function delSection(id){
  const sec=S.sections.find(s=>s.id===id);
  if(!sec) return;
  const taskCount=sec.tasks.filter(t=>t.status!=='Done').length;
  if(taskCount>0&&!confirm(`Delete "${sec.title}"? It has ${taskCount} open task(s). They will be lost.`)) return;
  S.sections=S.sections.filter(s=>s.id!==id);
  saveS(); renderSecMgr(); showToast('Category deleted');
}

// ═══ MATRIX FILTER ═══
// Matrix Filter Bar
function renderMatrixFilter(){
  const bar=document.getElementById('mfbar');
  // Mode toggle (always shown)
  let html=`<div class="mfbar-modes"><span class="mpill ${matrixMode==='view'?'on':''}" onclick="setMatrixMode('view')">View</span><span class="mpill ${matrixMode==='prioritize'?'on':''}" onclick="setMatrixMode('prioritize')">✦ Prioritize</span></div><span class="mfbar-sep"></span>`;
  if(matrixMode==='view'){
    // Section filter pills
    html+=`<span class="mfbar-label">Filter:</span>`;
    html+=`<span class="mpill ${matrixSectionFilter.has('all')?'on':''}" onclick="setMatrixFilter('all',event)">All</span>`;
    S.sections.forEach(s=>{ html+=`<span class="mpill ${matrixSectionFilter.has(s.id)?'on':''}" onclick="setMatrixFilter('${escJs(s.id)}',event)">${escHtml(s.icon||'')} ${escHtml(s.title.replace(/ — .*/,''))}</span>`; });
  } else {
    // Triage filter chips
    const filters=[['all','All'],['needs-review','Needs Review'],['no-outcomes','No Outcomes'],['due-week','Due This Week'],['overdue','Overdue']];
    filters.forEach(([k,l])=>{ html+=`<span class="mpill ${pmFilter===k?'on':''}" onclick="setPmFilter('${k}')">${l}</span>`; });
    html+=`<span class="mfbar-sep"></span>`;
    html+=`<button class="pq-focus-btn ${pmFocus?'on':''}" onclick="togglePmFocus()">⚡ Focus 10</button>`;
    html+=`<button class="pq-focus-btn" style="margin-left:auto" onclick="openSettingsPanel('outcomes')">📊 Outcomes</button>`;
  }
  bar.innerHTML=html;
}
function setMatrixFilter(id,evt){
  const multi=evt&&(evt.ctrlKey||evt.metaKey);
  if(!multi||id==='all'){ matrixSectionFilter=new Set([id]); }
  else { matrixSectionFilter.delete('all'); if(matrixSectionFilter.has(id)) matrixSectionFilter.delete(id); else matrixSectionFilter.add(id); if(matrixSectionFilter.size===0) matrixSectionFilter=new Set(['all']); }
  renderMatrixFilter(); renderMatrix();
}
function setPmFilter(k){ pmFilter=k; renderMatrixFilter(); renderTriageQueue(); }
function togglePmFocus(){ pmFocus=!pmFocus; renderMatrixFilter(); renderTriageQueue(); }
function setMatrixMode(m){
  matrixMode=m;
  document.getElementById('pm-view-wrap').style.display=m==='view'?'':'none';
  document.getElementById('pm-prio-wrap').style.display=m==='prioritize'?'':'none';
  renderMatrixFilter();
  if(m==='prioritize'){ renderGuardrail(); renderTriageQueue(); renderMiniMatrix(); }
  else renderMatrix();
}

// ═══ OUTCOMES ═══
// Outcome Manager
function outcomeById(id){ return (S.outcomes||[]).find(o=>o.id===id); }
function outcomeNames(ids){ return (ids||[]).map(id=>{ const o=outcomeById(id); return o?o.name:''; }).filter(Boolean).join(' & '); }
function openOutcomeMgr(){ openSettingsPanel('outcomes'); }
function closeOutcomeMgr(){ closeSettings(); }
function pmOvlClose(e){ if(e.target===document.getElementById('pm-ovl')) closeOutcomeMgr(); }
function renderOutcomesTab(){
  const el=document.getElementById('outcomesMgrBody'); if(!el) return;
  const outs=S.outcomes||[];
  const preset=['#059669','#2563EB','#D97706','#DC2626','#7C3AED','#00B5B0','#F59E0B','#6366F1'];
  const colorOpts=preset.map(c=>`<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:transform .1s" onclick="omPickColor('${c}')" data-c="${c}"></span>`).join('');
  const rows=outs.map(o=>`<div class="om-row"><span class="om-dot" style="background:${o.color}"></span><span class="om-name">${escHtml(o.name)}</span><button class="om-toggle ${o.active?'on':''}" onclick="toggleOutcomeActive('${o.id}')">${o.active?'Active':'Inactive'}</button><button class="om-del" onclick="deleteOutcome('${o.id}')" title="Remove">×</button></div>`).join('');
  el.innerHTML=`<div class="mb"><div class="om-list">${rows||'<p style="color:var(--muted);font-size:13px">No outcomes yet.</p>'}</div><div class="om-add"><input class="fi" id="om-name" placeholder="New outcome name (e.g. ARR)" onkeydown="if(event.key==='Enter')addOutcome()"><div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:6px" id="om-color-pick">${colorOpts}</div><button class="bpri" style="margin-top:8px" onclick="addOutcome()">+ Add Outcome</button></div></div>`;
  window._omColor=preset[0];
  el.querySelectorAll('#om-color-pick [data-c]').forEach((e,i)=>{ if(i===0){e.style.transform='scale(1.25)';e.style.borderColor='var(--galaxy)';} });
}
function renderOutcomeMgr(){ renderOutcomesTab(); }
function omPickColor(c){ window._omColor=c; document.querySelectorAll('#om-color-pick [data-c]').forEach(el=>{ const sel=el.dataset.c===c; el.style.transform=sel?'scale(1.25)':''; el.style.borderColor=sel?'var(--galaxy)':'transparent'; }); }
function addOutcome(){ const inp=document.getElementById('om-name'); const n=(inp.value||'').trim(); if(!n) return; const id='oc'+Date.now().toString(36); const color=window._omColor||'#00B5B0'; S.outcomes.push({id,name:n,color,active:true,sort:S.outcomes.length}); saveS(); renderOutcomesTab(); if(matrixMode==='prioritize') renderTriageQueue(); }
function deleteOutcome(id){ S.outcomes=S.outcomes.filter(o=>o.id!==id); S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.outcomes) t.outcomes=t.outcomes.filter(x=>x!==id); })); saveS(); renderOutcomesTab(); if(matrixMode==='prioritize') renderTriageQueue(); }
function toggleOutcomeActive(id){ const o=outcomeById(id); if(o){ o.active=!o.active; saveS(); renderOutcomesTab(); } }
function renderModalOutcomes(){
  const el=document.getElementById('fOutcomeChips'); if(!el) return;
  const active=(S.outcomes||[]).filter(o=>o.active).sort((a,b)=>a.sort-b.sort);
  el.innerHTML=active.map(o=>{ const sel=modalOutcomes.includes(o.id); return `<span class="om-chip ${sel?'sel':''}" style="${sel?`background:${o.color};border-color:${o.color}`:''}" onclick="toggleModalOutcome('${o.id}')">${escHtml(o.name)}</span>`; }).join('');
}
function toggleModalOutcome(id){ if(modalOutcomes.includes(id)){ modalOutcomes=modalOutcomes.filter(x=>x!==id); } else { if(modalOutcomes.length>=2){ showToast('Max 2 outcomes per task'); return; } modalOutcomes.push(id); } renderModalOutcomes(); }

// ═══ STATS ═══
// Stats
function statClick(f){ sw('tasks'); const pill=document.querySelector(`.pill[data-f="${f}"]`); if(pill) setF(f,pill); }
function renderStats(){
  let p1=0,prog=0,due=0,open=0,ov=0,conf=0,back=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Backlog'){ back++; return; }
    if(t.status==='Done') return;
    open++; if(t.priority==='P1') p1++; if(t.status==='In Progress') prog++;
    const d=ds(t.due); if(d==='s'||d==='u') due++; if(d==='u') ov++;
    if(t.confidential) conf++;
  }));
  let kbTod=0; S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.kanbanCol==='today') kbTod++; }));
  const bb=document.getElementById('btnBacklog'); if(bb) bb.style.display=back>0?'':'none';
  let aging=0; S.sections.forEach(s=>s.tasks.forEach(t=>{ if(ageLevel(t)!=='none') aging++; }));
  const ap=document.getElementById('pill-aging'); if(ap){ ap.textContent=`⏱ Aging${aging?` (${aging})`:''}`; ap.style.display=aging>0?'':'none'; }
  document.getElementById('sbar').innerHTML=`
    <div class="si" onclick="statClick('p1')" title="Filter: P1 Critical"><div class="sn r">${p1}</div><div class="sl">P1 Critical</div></div>
    <div class="si" onclick="statClick('prog')" title="Filter: In Progress"><div class="sn t">${prog}</div><div class="sl">In Progress</div></div>
    <div class="si" onclick="statClick('week')" title="Filter: Due Soon"><div class="sn a">${due}</div><div class="sl">Due Soon</div></div>
    ${ov?`<div class="si" onclick="statClick('overdue')" title="Filter: Overdue"><div class="sn r">${ov}</div><div class="sl">Overdue</div></div>`:''}
    ${conf?`<div class="si" onclick="statClick('conf')" title="Filter: Confidential"><div class="sn v">${conf}</div><div class="sl">Confidential</div></div>`:''}
    ${back?`<div class="si" onclick="statClick('backlog')" title="Filter: Backlog"><div class="sn" style="color:var(--st-back)">${back}</div><div class="sl">Backlog</div></div>`:''}
    ${kbTod>0?`<div class="si" onclick="sw('kanban')" title="${kbTod} task${kbTod===1?'':'s'} in Kanban Today — click to open"><div class="sn t">${kbTod}</div><div class="sl">In Kanban</div></div>`:''}
    ${(()=>{const n=getTriageQueue(true).length;return n>0?`<div class="si" onclick="sw('matrix');matrixMode='prioritize';renderMatrix()" title="${n} task${n===1?'':'s'} need priority review — click to open Matrix Prioritize"><div class="sn" style="color:var(--teal)">${n}</div><div class="sl">To Prioritize</div></div>`:'';})()}
    <div class="si" onclick="statClick('all')" title="Show all tasks"><div class="sn">${open}</div><div class="sl">Total Open</div></div>
  `;
  const tt=document.getElementById('tab-today');
  if(tt){ const {plan:_tp,overdue:_to,week:_tw}=getTodayTasks(); const n=_tp.length+_to.length+_tw.length; tt.innerHTML=`⚡ Today${n>0?` <span class="tbadge">${n}</span>`:''}`; }
  updateInboxBadge();
}

// ═══ RENDERING ═══
// Render All
function renderAll(){
  const body=S.sections.length
    ? `<div style="display:flex;flex-direction:column;gap:20px">${S.sections.map(renderSec).join('')}</div>`
    : `<div class="empty-pad"><strong>No sections yet</strong>Open Settings (⚙️) → Categories to add your first section. Each section groups related tasks.</div>`;
  document.getElementById('view-tasks').innerHTML=body;
  renderStats(); applyF(); populatePersonFilter();
  if(curView==='today') renderToday();
  if(curView==='matrix') renderMatrix();
  if(curView==='review') renderReview();
  if(curView==='kanban') renderKanban();
}

// Utility: order tasks so subtasks follow their parent immediately
function orderedWithChildren(tasks){
  const visited=new Set();
  const result=[];
  const addT=(t)=>{if(visited.has(t.id))return;visited.add(t.id);result.push(t);tasks.filter(c=>c.parent===t.id).forEach(addT);};
  tasks.filter(t=>!t.parent||!tasks.some(x=>x.id===t.parent)).forEach(addT);
  tasks.filter(t=>!visited.has(t.id)).forEach(t=>result.push(t));
  return result;
}

// Section
function renderSec(sec){
  const sorted=orderedWithChildren([...sec.tasks].sort((a,b)=>PO.indexOf(a.priority)-PO.indexOf(b.priority)));
  const open=sorted.filter(t=>t.status!=='Done').length;
  const rows=sorted.map(t=>renderRow(t,sec.id)).join('')||`<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--dim);font-size:14px">No tasks — quick-add below</td></tr>`;
  return `
  <div class="sc" id="sec-${sec.id}">
    <div class="sh" onclick="togSec('${escJs(sec.id)}')">
      <span class="si3">${escHtml(sec.icon)}</span>
      <span class="sname">${escHtml(sec.title)}</span>
      <span class="sbadge">${open} open</span>
      <span class="chev">▾</span>
    </div>
    <div class="sbody">
      <table>
        <thead><tr>
          <th class="tc"></th>
          <th>Task</th>
          <th class="cw1">Priority</th>
          <th class="cw2">Status</th>
          <th class="cw3">Due Date</th>
          <th class="cw6">Connections</th>
          <th class="cw7" title="Confidential">🔒</th>
          <th class="cw4" title="Type">Type</th>
          <th class="cw5"></th>
        </tr></thead>
        <tbody id="tb-${sec.id}">${rows}</tbody>
      </table>
      <div class="ar">
        <input class="ai" id="qa-${escAttr(sec.id)}" placeholder="+ Quick add to ${escAttr(sec.title.split('—')[0].trim())}…" onkeydown="quickAdd(event,'${escJs(sec.id)}')">
      </div>
    </div>
  </div>`;
}

function renderRow(t,secId){
  const isDone=t.status==='Done';
  const isConf=!!t.confidential;
  const aLevel=ageLevel(t);
  const aDot=aLevel!=='none'?`<span class="age-dot" style="background:${aLevel==='red'?'var(--p1)':'var(--amber)'}" title="${ageTip(t)}"></span>`:'';
  const dCls={'e':'de','n':'dn','s':'ds','u':'du'}[ds(t.due)]||'dn';
  const conns=(t.connections||[]);
  const connHtml=conns.length
    ?`<div class="conn-tags">${conns.map(c=>`<span class="conn-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escHtml(c)}</span>`).join('')}</div>`
    :`<span style="color:var(--dim);font-size:12px">—</span>`;
  const typeHtml=t.type==='recurring'
    ?`<span class="ticon rec" title="Recurring — ${t.rInterval||'monthly'}" onclick="togType('${t.id}','${secId}')">🔁</span>`
    :t.type==='decision'
    ?`<span class="ticon ${t.decided?'decided':'decision'}" title="Decision — ${t.decided?'Decided':'Pending'}" onclick="togDecided('${t.id}','${secId}')">⚖️</span>`
    :`<span class="ticon" title="One-time" onclick="togType('${t.id}','${secId}')">1×</span>`;
  const confHtml=isConf
    ?`<button class="lockbtn lock-on" onclick="togConfRow('${t.id}','${secId}')" title="Confidential — click to remove">🔒</button>`
    :`<button class="lockbtn lock-off" onclick="togConfRow('${t.id}','${secId}')" title="Mark as confidential">🔓</button>`;
  const statusShort=t.status==='In Progress'?'In Prog':t.status;
  const mobMeta=`<div class="mob-meta">
    <span class="badge ${PC[t.priority]}" onclick="oPriDrop(event,'${t.id}','${secId}')" style="position:relative">
      <span class="bd"></span>${t.priority}
      <div class="drop" id="mpd-${t.id}">${PO.map(p=>`<div class="di" onclick="setPri('${t.id}','${secId}','${p}')">${p}</div>`).join('')}</div>
    </span>
    <span class="badge ${SC[t.status]}" onclick="oStatDrop(event,'${t.id}','${secId}')" style="position:relative">
      <span class="bd"></span>${statusShort}
      <div class="drop" id="msd-${t.id}">${SO.map(s=>`<div class="di" onclick="setStat('${t.id}','${secId}','${s}')">${s}</div>`).join('')}</div>
    </span>
    ${t.due?`<span class="dcell ${dCls}" onclick="oDp(event,'${t.id}','${secId}')" style="position:relative">📅 ${fd(t.due)}<div class="dp" id="mdp-${t.id}"></div></span>`:''}
    ${conns.slice(0,2).map(c=>`<span class="conn-tag" title="${escAttr(c)}">${escHtml(c)}</span>`).join('')}
    ${isConf?`<button class="lockbtn lock-on" onclick="togConfRow('${t.id}','${secId}')">🔒</button>`:`<button class="lockbtn lock-off" onclick="togConfRow('${t.id}','${secId}')">🔓</button>`}
    ${t.type==='recurring'?`<span class="ticon rec">🔁</span>`:''}
  </div>`;

  return `
  <tr id="row-${t.id}" class="${isDone?'donerow ':''} ${PR[t.priority]||''} ${isConf?'conf-row':''} ${aLevel==='yellow'?'age-y':aLevel==='red'?'age-r':''} ${t.parent?'tr-sub':''}"
    data-id="${t.id}" data-sec="${secId}" data-conf="${isConf?'1':'0'}"
    draggable="true"
    ondragstart="dStart(event,'${t.id}','${secId}')"
    ondragover="dOver(event)"
    ondragleave="dLeave(event)"
    ondrop="dDrop(event,'${t.id}','${secId}')"
    oncontextmenu="rowCtxMenu(event,'${t.id}','${secId}')">
    <td class="tc"><div class="cbtn ${isDone?'done':''}" onclick="togComplete('${t.id}','${secId}')"></div></td>
    <td>
      <div class="tn" contenteditable="false" ondblclick="startEdit(this)" onblur="saveEdit(this,'${t.id}','${secId}','task')" onkeydown="editKey(event,this)">${aDot}${dT(t.task)}</div>
      ${t.note?`<div class="tnote" contenteditable="false" ondblclick="startEdit(this)" onblur="saveEdit(this,'${t.id}','${secId}','note')" onkeydown="editKey(event,this)">${dT(t.note)}</div>`:''}
      ${t.url?`<a class="turl-link" href="${escAttr(t.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${escAttr(t.url)}">&#128279; Link</a>`:''}
      ${mobMeta}
    </td>
    <td class="cw1">
      <div class="bw">
        <span class="badge ${PC[t.priority]}" onclick="oPriDrop(event,'${t.id}','${secId}')">
          <span class="bd"></span>${t.priority} <span style="font-weight:400;opacity:.7">— ${PL[t.priority]}</span>
        </span>
        <div class="drop" id="pd-${t.id}">
          ${PO.map(p=>`<div class="di" onclick="setPri('${t.id}','${secId}','${p}')"><span class="badge ${PC[p]}" style="pointer-events:none"><span class="bd"></span>${p}</span>${PL[p]}</div>`).join('')}
        </div>
      </div>
    </td>
    <td class="cw2">
      <div class="bw">
        <span class="badge ${SC[t.status]}" onclick="oStatDrop(event,'${t.id}','${secId}')">
          <span class="bd"></span>${t.status}
        </span>
        <div class="drop" id="sd-${t.id}">
          ${SO.map(s=>`<div class="di" onclick="setStat('${t.id}','${secId}','${s}')"><span class="badge ${SC[s]}" style="pointer-events:none"><span class="bd"></span></span>${s}</div>`).join('')}
        </div>
      </div>
    </td>
    <td class="cw3" style="position:relative">
      <div class="bw">
        <span class="dcell ${dCls}" onclick="oDp(event,'${t.id}','${secId}')">📅 ${fd(t.due)}</span>
        <div class="dp" id="dp-${t.id}"></div>
      </div>
    </td>
    <td class="cw6" style="position:relative">
      <div class="conn-inline" onclick="oConnPop(event,'${t.id}','${secId}')" title="Click to edit connections">
        ${connHtml}
      </div>
      <div class="conn-pop" id="cp-${t.id}"></div>
    </td>
    <td class="cw7 tc">${confHtml}</td>
    <td class="cw4 tc">${typeHtml}</td>
    <td class="cw5">
      <div class="rac">
        <button class="abt em" onclick="emailTask('${t.id}','${secId}')" title="Email task">✉️</button>
        <button class="abt" onclick="openEdit('${t.id}','${secId}')" title="Edit">✏️</button>
        <button class="abt del" onclick="delTask('${t.id}','${secId}')" title="Delete">🗑</button>
      </div>
    </td>
  </tr>`;
}

function togSec(id){ document.getElementById('sec-'+id).classList.toggle('collapsed'); }

// ═══ TASK ACTIONS ═══
function cascadeSubtasksDone(parentId){
  const today=new Date().toISOString().split('T')[0];
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.parent===parentId&&t.status!=='Done'){
      t.status='Done';t.lastStatusChange=today;t.kanbanCol='done';
      count+=1+cascadeSubtasksDone(t.id);
    }
  }));
  return count;
}
function cascadeKanbanCol(parentId,toCol){
  const kcol=toCol==='pool'?null:toCol;
  const today=new Date().toISOString().split('T')[0];
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.parent===parentId){
      const wasInDone=t.kanbanCol==='done';
      t.kanbanCol=kcol;
      if(wasInDone&&toCol!=='done'){t.status='To Do';t.lastStatusChange=today;}
      cascadeKanbanCol(t.id,toCol);
    }
  }));
}
function togComplete(id,secId){
  const sec=S.sections.find(s=>s.id===secId);
  if(!sec) return;
  const t=sec.tasks.find(x=>x.id===id);
  if(!t) return;
  const today=new Date().toISOString().split('T')[0];
  if(t.status==='Done'){
    t.status='To Do'; t.lastStatusChange=today; if(t.kanbanCol==='done') t.kanbanCol=null; logEvent('reopen',id,{s:secId}); showToast('Task reopened');
  } else if(t.type==='recurring'){
    const interval=t.rInterval||'monthly'; let newDue='';
    if(isValidISODate(t.due)){ let d=new Date(t.due+'T12:00:00'); if(interval==='monthly') d=addMonthsClamped(d,1); else if(interval==='weekly') d.setDate(d.getDate()+7); else if(interval==='quarterly') d=addMonthsClamped(d,3); newDue=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
    const arc=clone(t); arc.id=genId('a'); arc.status='Done'; arc.kanbanCol='done'; arc.note=(t.note?t.note+' ':'')+'[completed '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})+']'; sec.tasks.push(arc);
    t.due=newDue; t.status='To Do'; t.lastStatusChange=today; t.kanbanCol=null; logEvent('done',arc.id,{s:secId,p:t.priority,age:ageDays(t),r:1,oc:(t.outcomes||[])}); showToast(`🔁 Next cycle set${newDue?' to '+fd(newDue):''}`);
  } else { t.status='Done'; t.lastStatusChange=today; t.kanbanCol='done'; const sc=cascadeSubtasksDone(t.id); logEvent('done',id,{s:secId,p:t.priority,age:ageDays(t),oc:(t.outcomes||[])}); showToast(sc?`✓ Done (+${sc} subtask${sc>1?'s':''})`:' ✓ Task completed'); }
  saveS(); renderAll();
  if(curView==='today') renderToday();
  if(curView==='kanban') renderKanban();
}

function oPriDrop(e,id,secId){ e.stopPropagation(); closeDrops(); positionDrop(e.currentTarget, document.getElementById('pd-'+id)); }
function setPri(id,secId,pri){ const t=ft(id,secId); const old=t.priority; t.priority=pri; if(old!==pri) logEvent('priority',id,{from:old,to:pri}); closeDrops(); saveS(); renderAll(); showToast('Priority → '+pri); }
function oStatDrop(e,id,secId){ e.stopPropagation(); closeDrops(); positionDrop(e.currentTarget, document.getElementById('sd-'+id)); }
function setStat(id,secId,stat){ const t=ft(id,secId); const old=t.status; t.status=stat; t.lastStatusChange=new Date().toISOString().split('T')[0]; if(stat==='Done'){t.kanbanCol='done';cascadeSubtasksDone(id);logEvent('done',id,{s:secId,p:t.priority,age:ageDays(t),oc:(t.outcomes||[])});}else if(t.kanbanCol==='done') t.kanbanCol=null; if(old!==stat) logEvent('status',id,{from:old,to:stat}); closeDrops(); saveS(); renderAll(); showToast('Status → '+stat); }

function positionDrop(anchor, dropEl){
  const r=anchor.getBoundingClientRect();
  const vh=window.innerHeight;
  const spaceBelow=vh-r.bottom;
  dropEl.style.left=r.left+'px';
  if(spaceBelow<220 && r.top>220){
    dropEl.style.top='';
    dropEl.style.bottom=(vh-r.top+4)+'px';
  } else {
    dropEl.style.bottom='';
    dropEl.style.top=(r.bottom+4)+'px';
  }
  dropEl.classList.add('on');
}
function closeDrops(e){
  document.querySelectorAll('.drop.on').forEach(d=>d.classList.remove('on'));
  if(!e||!e.target||!e.target.closest('.dp')){
    document.querySelectorAll('.dp.on').forEach(d=>{d.classList.remove('on');d.style.top='';d.style.bottom='';d.style.left='';});
  }
}
document.addEventListener('click',closeDrops);

function togConfRow(id,secId){
  const t=ft(id,secId);
  if(!t) return;
  if(cpId){const op=document.getElementById('cp-'+cpId);if(op)op.classList.remove('on');cpId=null;}
  t.confidential=!t.confidential;
  saveS(); renderAll();
  showToast(t.confidential?'🔒 Marked confidential':'Confidential flag removed');
}

function toggleConfView(){
  hideConf=!hideConf;
  document.getElementById('btnConf').classList.toggle('on-conf',!hideConf);
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='today') renderToday();
  if(curView==='kanban') renderKanban();
  showToast(hideConf?'🔒 Confidential tasks hidden':'Confidential tasks visible');
}

function togType(id,secId){ const t=ft(id,secId); t.type=t.type==='recurring'?'once':'recurring'; if(!t.rInterval) t.rInterval='monthly'; saveS(); renderAll(); showToast(t.type==='recurring'?'🔁 Set to recurring':'Set to one-time'); }

function startEdit(el){ el.contentEditable='true'; el.focus(); const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r); }
function editKey(e,el){ if(e.key==='Enter'){e.preventDefault();el.blur();} if(e.key==='Escape'){el.contentEditable='false';renderAll();} }
function saveEdit(el,id,secId,field){ el.contentEditable='false'; const val=el.textContent.trim(); const t=ft(id,secId); if(!t) return; if(field==='task') t.task=val; if(field==='note') t.note=val; saveS(); showToast('Saved'); }

// ═══ DATE PICKER ═══
let dpT=null,dpMode='day',dpY,dpM;
function oDp(e,id,secId){ e.stopPropagation(); closeDrops(); dpT={id,secId}; const t=ft(id,secId); const today=new Date(); const d=safeDate(t.due); if(d){dpY=d.getFullYear();dpM=d.getMonth();}else{dpY=today.getFullYear();dpM=today.getMonth();} dpMode='day'; const dpEl=document.getElementById('dp-'+id); renderDp(dpEl); positionDrop(e.currentTarget, dpEl); }
function renderDp(el){
  const today=new Date();today.setHours(0,0,0,0);
  const t=ft(dpT.id,dpT.secId); const sel=safeDate(t.due);
  const mname=new Date(dpY,dpM,1).toLocaleString('en-US',{month:'long',year:'numeric'});
  const dpElId=document.getElementById('dp-'+dpT.id)?'dp-'+dpT.id:'mdp-'+dpT.id;
  let h=`<div class="dptabs"><div class="dptab ${dpMode==='day'?'on':''}" onclick="event.stopPropagation();dpMode='day';renderDp(document.getElementById('${dpElId}'))">Day</div><div class="dptab ${dpMode==='week'?'on':''}" onclick="event.stopPropagation();dpMode='week';renderDp(document.getElementById('${dpElId}'))">Week</div></div>`;
  if(dpMode==='day'){
    const first=new Date(dpY,dpM,1); const startDow=first.getDay(); const dim=new Date(dpY,dpM+1,0).getDate();
    h+=`<div class="dpnav"><button class="dpa" onclick="event.stopPropagation();dpNav(-1)">◀</button><span class="dpm">${mname}</span><button class="dpa" onclick="event.stopPropagation();dpNav(1)">▶</button></div><div class="dpg">`;
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>h+=`<div class="dpdn">${d}</div>`);
    for(let i=0;i<startDow;i++) h+=`<div class="dpd om"></div>`;
    for(let d=1;d<=dim;d++){
      const date=new Date(dpY,dpM,d); const iso=`${dpY}-${String(dpM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isSel=sel&&date.getTime()===sel.getTime(); const isTod=date.getTime()===today.getTime(); const isPast=date<today;
      let cls='dpd'; if(isTod) cls+=' tod'; if(isSel) cls+=' sel'; if(isPast&&!isSel) cls+=' past';
      h+=`<div class="${cls}" onclick="selDay('${iso}')">${d}</div>`;
    }
    h+=`</div>`;
  } else {
    h+=`<div class="dpwr">`;
    const mon=new Date(today); const dow=today.getDay(); mon.setDate(today.getDate()-(dow===0?6:dow-1));
    for(let w=0;w<8;w++){
      const ws=new Date(mon);ws.setDate(mon.getDate()+w*7); const we=new Date(ws);we.setDate(ws.getDate()+6);
      const isoE=we.toISOString().split('T')[0];
      const lbl=w===0?'This Week':w===1?'Next Week':`Week of ${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
      h+=`<div class="dpwrow" onclick="selWeek('${isoE}')"><span>${lbl}</span><span style="font-size:10px;opacity:.6">${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${we.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>`;
    }
    h+=`</div>`;
  }
  h+=`<button class="dpclear" onclick="clrDue()">Clear Date</button>`;
  el.innerHTML=h;
}
function setDpMode(m){event&&event.stopPropagation&&event.stopPropagation();dpMode=m;const el=document.getElementById('dp-'+dpT.id)||document.getElementById('mdp-'+dpT.id);if(el)renderDp(el);}
function dpNav(d){event&&event.stopPropagation&&event.stopPropagation();dpM+=d;if(dpM>11){dpM=0;dpY++;}else if(dpM<0){dpM=11;dpY--;}const el=document.getElementById('dp-'+dpT.id)||document.getElementById('mdp-'+dpT.id);if(el&&el.classList.contains('on'))renderDp(el);}
function selDay(iso){ft(dpT.id,dpT.secId).due=iso;closeDrops();saveS();renderAll();showToast('Due: '+fd(iso));}
function selWeek(end){ft(dpT.id,dpT.secId).due=end;closeDrops();saveS();renderAll();showToast('Due: week of '+fd(end));}
function clrDue(){ft(dpT.id,dpT.secId).due='';closeDrops();saveS();renderAll();showToast('Date cleared');}

// ═══ EMAIL & DELETE ═══
function emailTask(id,secId){
  const t=ft(id,secId);
  const sub=encodeURIComponent(t.task);
  const conns=(t.connections||[]).join(', ');
  const body=encodeURIComponent((t.note?t.note+'\n\n':'')+(t.due?'Due: '+fd(t.due)+'\n':'')+(conns?'Related to: '+conns+'\n':''));
  window.location.href=`mailto:?subject=${sub}&body=${body}`;
}

function delTask(id,secId){ if(!confirm('Delete this task?')) return; const sec=S.sections.find(s=>s.id===secId); sec.tasks=sec.tasks.filter(t=>t.id!==id); S.sections.forEach(s=>s.tasks.forEach(t=>{if(t.parent===id)t.parent=null;})); saveS();renderAll();showToast('Deleted'); }
function quickAdd(e,secId){ if(e.key!=='Enter') return; const inp=document.getElementById('qa-'+secId); const val=inp.value.trim(); if(!val) return; const nid=genId(secId[0]); S.sections.find(s=>s.id===secId).tasks.push({id:nid,priority:'P3',task:val,status:'To Do',due:'',note:'',url:'',type:'once',urgent:0,confidential:false,connections:[],kanbanCol:null,lastStatusChange:new Date().toISOString().split('T')[0],parent:null}); logEvent('create',nid,{s:secId,p:'P3'}); inp.value=''; saveS();renderAll();showToast('Task added'); setTimeout(()=>{const el=document.getElementById('qa-'+secId);if(el)el.focus();},50); }

// ═══ CONNECTIONS ═══
// Inline Connection Popover
let cpId=null,cpSec=null;
function oConnPop(e,id,secId){
  e.stopPropagation();
  closeDrops();
  const existing=document.querySelector('.conn-pop.on');
  if(existing&&cpId===id){existing.classList.remove('on');cpId=null;return;}
  cpId=id;cpSec=secId;
  const pop=document.getElementById('cp-'+id);
  renderConnPop(pop,id,secId);
  const r=e.currentTarget.getBoundingClientRect();
  const vh=window.innerHeight;
  pop.style.left=r.left+'px';
  if(vh-r.bottom<180&&r.top>180){pop.style.bottom=(vh-r.top+4)+'px';pop.style.top='';}
  else{pop.style.top=(r.bottom+4)+'px';pop.style.bottom='';}
  pop.classList.add('on');
  setTimeout(()=>{const inp=pop.querySelector('.cp-inp');if(inp)inp.focus();},50);
}
function renderConnPop(pop,id,secId){
  const t=ft(id,secId);
  const conns=t.connections||[];
  const chips=conns.map(c=>`<span class="cp-chip">${escHtml(c)}<button class="cp-chip-x" onclick="event.stopPropagation();removeConnInline('${id}','${secId}','${escAttr(c)}')">×</button></span>`).join('');
  pop.innerHTML=`
    <div class="conn-pop-chips" id="cpc-${id}">${chips||'<span style="color:var(--dim);font-size:11px">No connections yet</span>'}</div>
    <div class="cp-input-row" style="position:relative">
      <input class="cp-inp" id="cpi-${id}" placeholder="Add name…" autocomplete="off"
        oninput="cpSuggest('${id}','${secId}',this)"
        onkeydown="cpKeydown(event,'${id}','${secId}')">
      <div class="cp-sug" id="cps-${id}"></div>
    </div>`;
}
function removeConnInline(id,secId,name){
  const t=ft(id,secId);
  t.connections=(t.connections||[]).filter(c=>c!==name);
  saveS();
  const pop=document.getElementById('cp-'+id);
  renderConnPop(pop,id,secId);
  const cell=document.querySelector(`#row-${id} .conn-inline`);
  if(cell) cell.innerHTML=buildConnHtml(t.connections||[]);
  showToast('Connection removed');
}
function addConnInline(id,secId,name){
  if(!name.trim()) return;
  const t=ft(id,secId);
  if(!t.connections) t.connections=[];
  if(!t.connections.includes(name)){t.connections.push(name);addKnownConn(name);}
  saveS();
  const pop=document.getElementById('cp-'+id);
  renderConnPop(pop,id,secId);
  const cell=document.querySelector(`#row-${id} .conn-inline`);
  if(cell) cell.innerHTML=buildConnHtml(t.connections);
  showToast('Connection added');
  setTimeout(()=>{const inp=document.getElementById('cpi-'+id);if(inp)inp.focus();},40);
}
function cpSuggest(id,secId,inp){
  const v=inp.value.trim().toLowerCase();
  const sug=document.getElementById('cps-'+id);
  const t=ft(id,secId);
  const cur=t.connections||[];
  if(!v){sug.classList.remove('on');return;}
  const matches=allConns().filter(c=>c.toLowerCase().includes(v)&&!cur.includes(c));
  if(!matches.length){sug.classList.remove('on');return;}
  sug.innerHTML=matches.slice(0,7).map(c=>`<div class="cp-sug-item" onmousedown="event.preventDefault();addConnInline('${id}','${secId}','${escAttr(c)}')"> ${escHtml(c)}</div>`).join('');
  sug.classList.add('on');
}
function cpKeydown(e,id,secId){
  if(e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();if(v){addConnInline(id,secId,v);e.target.value='';document.getElementById('cps-'+id).classList.remove('on');}}
  if(e.key==='Escape'){document.getElementById('cp-'+id).classList.remove('on');cpId=null;}
}
function buildConnHtml(conns){
  if(!conns||!conns.length) return `<span style="color:var(--dim);font-size:12px">—</span>`;
  return `<div class="conn-tags">${conns.map(c=>`<span class="conn-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escHtml(c)}</span>`).join('')}</div>`;
}
document.addEventListener('click',e=>{
  if(cpId&&!e.target.closest('.conn-pop')&&!e.target.closest('.conn-inline')){
    const pop=document.getElementById('cp-'+cpId);
    if(pop)pop.classList.remove('on');
    cpId=null;
  }
});

// Connection Autocomplete (modal)
function connSuggest(){ const v=document.getElementById('fConnInput').value.trim().toLowerCase(); const sug=document.getElementById('connSug'); if(!v){sug.classList.remove('on');return;} const matches=allConns().filter(c=>c.toLowerCase().includes(v)&&!modalConns.includes(c)); if(!matches.length){sug.classList.remove('on');return;} sug.innerHTML=matches.slice(0,8).map(c=>`<div class="conn-opt" onclick="addConn('${escAttr(c)}')"><span class="conn-av">${escHtml(c[0].toUpperCase())}</span>${escHtml(c)}</div>`).join(''); sug.classList.add('on'); }
function connKeydown(e){ if(e.key==='Enter'){e.preventDefault();const v=document.getElementById('fConnInput').value.trim();if(v) addConn(v);} if(e.key==='Escape') document.getElementById('connSug').classList.remove('on'); }
function addConn(name){ if(!modalConns.includes(name)){modalConns.push(name);addKnownConn(name);} document.getElementById('fConnInput').value=''; document.getElementById('connSug').classList.remove('on'); renderConnChips(); }
function removeConn(name){ modalConns=modalConns.filter(c=>c!==name); renderConnChips(); }
function renderConnChips(){ document.getElementById('connChips').innerHTML=modalConns.map(c=>`<span class="conn-chip">${escHtml(c)}<button onclick="removeConn('${escAttr(c)}')">×</button></span>`).join(''); }

function confSelectStyle(){ const el=document.getElementById('fConf'); el.classList.toggle('fconf-yes',el.value==='1'); }

// ═══ MODAL ═══
// Modal
function openAdd(secId){
  eId=null;eSec=null;modalConns=[];modalOutcomes=[]; editingParent=null;
  document.getElementById('fParentRow').style.display='none';
  rebuildSecDropdown();
  document.getElementById('mtitle').textContent='Add Task';
  document.getElementById('fTask').value=''; document.getElementById('fNote').value=''; document.getElementById('fUrl').value='';
  document.getElementById('fSec').value=secId||S.sections[0]?.id||'monthly'; document.getElementById('fPri').value='P2';
  document.getElementById('fStat').value='To Do'; document.getElementById('fDue').value='';
  document.getElementById('fType').value='once'; document.getElementById('fRInterval').value='monthly';
  document.getElementById('fUrg').value='0';
  document.getElementById('fConf').value='0'; confSelectStyle();
  document.getElementById('fDecided').value='0'; document.getElementById('fDecidedRow').style.display='none';
  const riEl=document.getElementById('fRInterval'); if(riEl) riEl.closest('.fg').style.display='none';
  document.getElementById('fConnInput').value=''; renderConnChips();
  renderModalOutcomes();
  document.getElementById('mDelBtn').style.display='none';
  syncAiVisibility();
  document.getElementById('ovl').classList.add('on');
  setTimeout(()=>document.getElementById('fTask').focus(),80);
}
function openEdit(id,secId){
  const t=ft(id,secId); eId=id;eSec=secId;modalConns=[...(t.connections||[])];modalOutcomes=[...(t.outcomes||[])];
  rebuildSecDropdown();
  document.getElementById('mtitle').textContent='Edit Task';
  document.getElementById('fTask').value=t.task; document.getElementById('fNote').value=t.note||''; document.getElementById('fUrl').value=t.url||'';
  document.getElementById('fSec').value=secId; document.getElementById('fPri').value=t.priority||'P2';
  document.getElementById('fStat').value=t.status; document.getElementById('fDue').value=t.due||'';
  const tType=t.type||'once';
  document.getElementById('fType').value=tType; document.getElementById('fRInterval').value=t.rInterval||'monthly';
  const riEl2=document.getElementById('fRInterval'); if(riEl2) riEl2.closest('.fg').style.display=tType==='recurring'?'':'none';
  document.getElementById('fUrg').value=t.urgent?'1':'0';
  document.getElementById('fConf').value=t.confidential?'1':'0'; confSelectStyle();
  document.getElementById('fDecided').value=t.decided?'1':'0'; document.getElementById('fDecidedRow').style.display=tType==='decision'?'':'none';
  document.getElementById('fConnInput').value=''; renderConnChips();
  renderModalOutcomes();
  // parent tracking
  editingParent=t.parent||null;
  const pr=document.getElementById('fParentRow');
  if(editingParent){
    let pt=null; S.sections.forEach(s=>s.tasks.forEach(x=>{if(x.id===editingParent)pt=x;}));
    if(pt){document.getElementById('fParentName').textContent=pt.task;pr.style.display='';}
    else{editingParent=null;pr.style.display='none';}
  } else pr.style.display='none';
  document.getElementById('mDelBtn').style.display='';
  syncAiVisibility();
  document.getElementById('ovl').classList.add('on');
  setTimeout(()=>document.getElementById('fTask').focus(),80);
}
function closeModal(){ document.getElementById('ovl').classList.remove('on'); document.getElementById('connSug').classList.remove('on'); newTaskKanbanCol=null; }
function modalDeleteTask(){ const id=eId,sec=eSec; closeModal(); delTask(id,sec); }
function modalHasContent(){ return !!(document.getElementById('fTask')?.value.trim()); }
function ovlClose(e){ if(e.target===document.getElementById('ovl')&&!modalHasContent()) closeModal(); }

function saveTask(){
  const val=document.getElementById('fTask').value.trim();
  if(!val){document.getElementById('fTask').style.borderColor='var(--p1)';return;}
  document.getElementById('fTask').style.borderColor='';
  const ns=document.getElementById('fSec').value;
  const newStat=document.getElementById('fStat').value;
  const today=new Date().toISOString().split('T')[0];
  const oldTask=eId?{...ft(eId,eSec)}:null;
  const taskType=document.getElementById('fType').value;
  // Reject malformed dates from imports / older browsers — only accept ISO YYYY-MM-DD.
  const rawDue=document.getElementById('fDue').value;
  const safeDue=(rawDue===''||isValidISODate(rawDue))?rawDue:'';
  if(rawDue&&!safeDue) showToast('⚠️ Due date ignored — use YYYY-MM-DD format');
  const obj={
    task:val, note:document.getElementById('fNote').value.trim(), url:document.getElementById('fUrl').value.trim(),
    priority:document.getElementById('fPri').value, status:newStat,
    due:safeDue, type:taskType,
    rInterval:document.getElementById('fRInterval').value,
    urgent:parseInt(document.getElementById('fUrg').value),
    confidential:document.getElementById('fConf').value==='1',
    connections:[...modalConns],
    outcomes:[...modalOutcomes],
    decided: taskType==='decision' ? document.getElementById('fDecided').value==='1' : (oldTask?oldTask.decided:false),
    kanbanCol: newStat==='Done' ? 'done' : (oldTask ? (oldTask.kanbanCol==='done' ? null : (oldTask.kanbanCol||null)) : (newTaskKanbanCol??null)),
    lastStatusChange:(oldTask&&oldTask.status===newStat&&oldTask.lastStatusChange)?oldTask.lastStatusChange:today,
    lastPrioritizedAt: oldTask ? (oldTask.lastPrioritizedAt||null) : null,
    pData: oldTask ? (oldTask.pData||null) : null,
    parent: editingParent||null,
    kanbanColSince: oldTask ? (oldTask.kanbanColSince||null) : null,
  };
  if(eId){
    if(eSec!==ns){ const os=S.sections.find(s=>s.id===eSec); const idx=os.tasks.findIndex(t=>t.id===eId); const[mv]=os.tasks.splice(idx,1); Object.assign(mv,obj); S.sections.find(s=>s.id===ns).tasks.push(mv); }
    else { Object.assign(ft(eId,eSec),obj); }
    if(obj.status==='Done'&&oldTask&&oldTask.status!=='Done'){cascadeSubtasksDone(eId);logEvent('done',eId,{s:ns,p:obj.priority,age:ageDays(obj),oc:(obj.outcomes||[])});}
    if(oldTask&&oldTask.priority!==obj.priority) logEvent('priority',eId,{from:oldTask.priority,to:obj.priority});
    if(oldTask&&oldTask.status!==obj.status) logEvent('status',eId,{from:oldTask.status,to:obj.status});
    // Log connection adds
    const newConns=obj.connections||[]; const oldConns=(oldTask&&oldTask.connections)||[];
    newConns.filter(c=>!oldConns.includes(c)).forEach(c=>logEvent('conn_add',eId,{conn:c}));
    // Log outcome links
    const newOc=obj.outcomes||[]; const oldOc=(oldTask&&oldTask.outcomes)||[];
    newOc.filter(o=>!oldOc.includes(o)).forEach(o=>logEvent('outcome_link',eId,{oc:o}));
    showToast('Task updated');
  } else {
    const colLabel=newTaskKanbanCol==='today'?'Today':newTaskKanbanCol==='week'?'This Week':newTaskKanbanCol?newTaskKanbanCol:null;
    obj.id=genId(ns[0]); S.sections.find(s=>s.id===ns).tasks.push(obj); logEvent('create',obj.id,{s:ns,p:obj.priority,oc:(obj.outcomes||[])}); showToast(colLabel?'Task added → '+colLabel:'Task added');
  }
  newTaskKanbanCol=null;
  closeModal();saveS();renderAll();
  if(curView==='kanban') renderKanban();
  if(_etPendingId){etMarkProcessed(_etPendingId);_etPendingId=null;}
}

// ═══ DRAG & DROP ═══
// Drag and Drop
function dStart(e,id,secId){ dragId=id;dragSec=secId;e.dataTransfer.effectAllowed='move';setTimeout(()=>{const r=document.getElementById('row-'+id);if(r)r.classList.add('dragging');},0); }
function dOver(e){ e.preventDefault();e.currentTarget.classList.add('dragover'); }
function dLeave(e){ e.currentTarget.classList.remove('dragover'); }
function dDrop(e,tId,tSec){
  e.preventDefault();e.currentTarget.classList.remove('dragover');
  if(dragId===tId){dragId=null;dragSec=null;return;}
  const cId=dragId,cSec=dragSec;
  dragId=null;dragSec=null;
  kShowSubDlg(cId,cSec,null,tId,tSec,null,e.clientX,e.clientY,
    'No, just reorder',
    ()=>{
      const ss=S.sections.find(s=>s.id===cSec);
      const ts=S.sections.find(s=>s.id===tSec);
      if(!ss||!ts) return;
      const si=ss.tasks.findIndex(t=>t.id===cId);
      const ti=ts.tasks.findIndex(t=>t.id===tId);
      if(si===-1) return;
      const[mv]=ss.tasks.splice(si,1);ts.tasks.splice(ti,0,mv);
      saveS();renderAll();showToast('Reordered');
    });
}

// ═══ FILTERS ═══
// Filters — activeF is a Set; Ctrl/Cmd+click adds/removes; plain click is exclusive
function _fMatch(f,t){
  if(f==='all') return true;
  if(f==='p1') return t.priority==='P1';
  if(f==='p2') return t.priority==='P2';
  if(f==='prog') return t.status==='In Progress';
  if(f==='rec') return t.type==='recurring';
  if(f==='conf') return !!t.confidential;
  if(f==='backlog') return t.status==='Backlog';
  if(f==='aging') return ageLevel(t)!=='none';
  if(f==='overdue') return ds(t.due)==='u';
  if(f==='week'){ const d=safeDate(t.due); if(!d) return false; const td=new Date();td.setHours(0,0,0,0); const eow=new Date(td);eow.setDate(td.getDate()+(7-td.getDay())%7); return d>=td&&d<=eow; }
  return false;
}
function matchesFilter(t){ for(const f of activeF){ if(_fMatch(f,t)) return true; } return false; }
function matchesPerson(t){
  if(!personFilter.length) return true;
  const tc=(t.connections||[]).map(c=>c.toLowerCase());
  return personFilter.some(sel=>{
    const grp=(S.personGroups||[]).find(g=>g.name.toLowerCase()===sel.toLowerCase());
    if(grp) return tc.includes(grp.name.toLowerCase())||(grp.members||[]).some(m=>tc.includes(m.toLowerCase()));
    return tc.includes(sel.toLowerCase());
  });
}
function matchesAll(t){ return matchesFilter(t)&&matchesPerson(t); }
function _syncPills(){ document.querySelectorAll('.pill').forEach(p=>{ const on=activeF.has(p.dataset.f); p.classList.toggle('on',on); p.setAttribute('aria-pressed',String(on)); }); }
function setF(f,el,evt){
  if(el&&el.classList.contains('pill-disabled')) return;
  const multi=evt&&(evt.ctrlKey||evt.metaKey);
  if(!multi||f==='all'){
    if(f!=='all'&&activeF.has(f)&&activeF.size===1) activeF=new Set(['all']);
    else activeF=new Set([f]);
  } else {
    activeF.delete('all');
    if(activeF.has(f)) activeF.delete(f); else activeF.add(f);
    if(activeF.size===0) activeF=new Set(['all']);
  }
  _syncPills(); applyF();
}
function applyF(){
  const q=document.getElementById('srch').value.toLowerCase();
  document.querySelectorAll('tbody tr[data-id]').forEach(row=>{
    const id=row.dataset.id,secId=row.dataset.sec;
    const sec=S.sections.find(s=>s.id===secId); const t=sec&&sec.tasks.find(x=>x.id===id);
    if(!t) return;
    if(hideConf&&t.confidential){ row.classList.add('conf-hidden'); return; }
    row.classList.remove('conf-hidden');
    let vis=true;
    if(t.status==='Backlog'&&!showBacklog&&!activeF.has('backlog')){row.classList.add('hid');return;}
    if(!showDone&&t.status==='Done'){row.classList.add('hid');return;}
    row.classList.remove('hid');
    if(!matchesFilter(t)) vis=false;
    if(vis&&!matchesPerson(t)) vis=false;
    if(q&&vis){ const hay=(t.task+' '+(t.note||'')+' '+(t.connections||[]).join(' ')).toLowerCase(); if(!hay.includes(q)) vis=false; }
    row.classList.toggle('hid',!vis);
  });
  S.sections.forEach(s=>{ const b=document.querySelector(`#sec-${s.id} .sbadge`); if(b) b.textContent=s.tasks.filter(t=>t.status!=='Done'&&t.status!=='Backlog').length+' open'; });
  if(curView==='today') renderToday();
  if(curView==='kanban') renderKanban();
  if(curView==='matrix') renderMatrix();
}

function toggleBacklogView(){
  showBacklog=!showBacklog;
  const btn=document.getElementById('btnBacklog');
  if(btn) btn.classList.toggle('on-backlog',showBacklog);
  applyF();
}
function toggleDemo(){
  demoMode=!demoMode;
  document.getElementById('btnDemo').classList.toggle('on-demo',demoMode);
  const renders={tasks:renderAll,today:renderToday,matrix:renderMatrix,kanban:renderKanban,review:renderReview};
  if(renders[curView]) renders[curView]();
  showToast(demoMode?'Demo mode on — task names masked':'Demo mode off');
}
function toggleDone(){
  showDone=!showDone;
  document.getElementById('btnDone').classList.toggle('on',showDone);
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='today') renderToday();
}

function sw(v){ logEvent('view',v,{}); curView=v; document.querySelectorAll('.vpanel').forEach(p=>p.classList.remove('on')); document.querySelectorAll('.vtab').forEach(t=>{ t.classList.remove('on'); t.setAttribute('aria-selected','false'); t.setAttribute('tabindex','-1'); }); document.querySelectorAll('.nit').forEach(n=>n.classList.remove('on')); document.getElementById('view-'+v).classList.add('on'); const tab=document.getElementById('tab-'+v); if(tab){ tab.classList.add('on'); tab.setAttribute('aria-selected','true'); tab.setAttribute('tabindex','0'); } const mnav=document.getElementById('mnav-'+v); if(mnav) mnav.classList.add('on'); const noFilters=v==='inbox'||v==='review'||v==='analytics'; const noBacklog=v==='today'||v==='kanban'||v==='matrix'; document.querySelectorAll('.pill').forEach(p=>p.classList.toggle('pill-disabled',noFilters||(noBacklog&&p.dataset.f==='backlog'))); if((noFilters||noBacklog)&&activeF.has('backlog')){ activeF=new Set(['all']); _syncPills(); } if(v==='tasks') renderAll(); if(v==='today') renderToday(); if(v==='matrix') renderMatrix(); if(v==='inbox'){etLoad();renderInbox();} if(v==='review') renderReview(); if(v==='kanban') renderKanban(); if(v==='analytics') renderAnalytics(); }

// ═══ TODAY ═══
// Today View
function getTodayTasks(){
  const q=(document.getElementById('srch').value||'').toLowerCase().trim();
  const plan=[],overdue=[],week=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done') return;
    if(t.status==='Backlog') return;
    if(hideConf&&t.confidential) return;
    if(!matchesAll(t)) return;
    if(q){const hay=(t.task+' '+(t.note||'')+' '+(t.connections||[]).join(' ')).toLowerCase();if(!hay.includes(q)) return;}
    if(t.kanbanCol==='today'){ plan.push({...t,secId:s.id}); return; }
    const d=ds(t.due);
    if(d==='u') overdue.push({...t,secId:s.id});
    else if(d==='s') week.push({...t,secId:s.id});
  }));
  return {plan,overdue,week};
}
function renderToday(){
  const d=new Date();
  document.getElementById('tdH').textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('tdS').textContent="Today's committed tasks · overdue · due this week";
  const {plan,overdue,week}=getTodayTasks();
  if(!plan.length&&!overdue.length&&!week.length){document.getElementById('tdC').innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted);font-size:15px">🎉 No urgent tasks today. You are on top of it.</div>`;return;}
  // Build a flat map of all tasks for parent lookup
  const allTaskMap={};
  S.sections.forEach(s=>s.tasks.forEach(t=>{allTaskMap[t.id]={...t,secId:s.id};}));
  // Group subtasks under their parents within each bucket
  const orderBucket=(arr)=>{
    const ids=new Set(arr.map(t=>t.id));
    // If a subtask's parent isn't in this bucket, add parent label context to the card
    return orderedWithChildren(arr);
  };
  let h='';
  if(plan.length){
    const capCls=plan.length>=5?'over':plan.length>=4?'warn':'ok';
    const capTip=plan.length>=5?`⚠ ${plan.length} tasks — consider reducing focus`:plan.length>=4?`${plan.length} tasks — at capacity`:`${plan.length} task${plan.length===1?'':'s'}`;
    h+=`<div class="tsec"><div class="tsect" style="color:var(--teal)">📊 Today's Plan<span class="today-cap ${capCls}" title="${capTip}">${capTip}</span></div>`;orderBucket(plan).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;
  }
  if(overdue.length){h+=`<div class="tsec"><div class="tsect" style="color:var(--p1)">🔴 Overdue</div>`;orderBucket(overdue).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;}
  if(week.length){h+=`<div class="tsec"><div class="tsect" style="color:var(--amber)">📅 Due This Week</div>`;orderBucket(week).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;}
  document.getElementById('tdC').innerHTML=h;
}
function todayCard(t,allTaskMap){
  const d=ds(t.due); const conns=(t.connections||[]).slice(0,3);
  const isSub=!!t.parent;
  let parentLabel='';
  if(isSub&&allTaskMap){
    const p=allTaskMap[t.parent];
    if(p) parentLabel=`<div style="font-size:10px;color:var(--teal);font-weight:600;margin-bottom:2px">↳ ${dT(p.task)}</div>`;
  }
  return `<div class="tcard ${t.confidential?'conf-card':''} ${isSub?'tcard-sub':''}" onclick="openEdit('${t.id}','${t.secId}')" oncontextmenu="rowCtxMenu(event,'${t.id}','${t.secId}')">
    <div class="cbtn ${t.status==='Done'?'done':''}" onclick="event.stopPropagation();togComplete('${t.id}','${t.secId}')"></div>
    <div class="tcb">
      ${parentLabel}
      <div class="tcn">${dT(t.task)}${t.confidential?' <span style="font-size:11px;color:var(--conf);font-weight:600">🔒</span>':''}</div>
      <div class="tcm">
        <span class="badge ${PC[t.priority]}" style="font-size:10px;padding:2px 7px;pointer-events:none"><span class="bd"></span>${t.priority}</span>
        ${t.due?`<span style="color:${d==='u'?'var(--p1)':d==='s'?'var(--amber)':'var(--muted)'};font-size:12px">📅 ${fd(t.due)}</span>`:''}
        ${conns.map(c=>`<span class="conn-tag" style="font-size:10px" title="${escAttr(c)}">${escHtml(c)}</span>`).join('')}
        ${t.note?`<span style="font-size:12px;color:var(--muted);font-style:italic">${dT(t.note)}</span>`:''}
        ${t.kanbanCol==='today'?`<span style="font-size:11px;color:var(--teal);font-weight:600;margin-left:2px" title="In Kanban Today column">📊</span>`:''}
        ${t.url?`<a class="turl-link" href="${escAttr(t.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${escAttr(t.url)}">&#128279; Link</a>`:''}
      </div>
    </div>
    <button class="abt em" style="opacity:.7;flex-shrink:0" onclick="event.stopPropagation();emailTask('${t.id}','${t.secId}')" title="Email">✉️</button>
  </div>`;
}

// ═══ MATRIX ═══
// Matrix View
const QC=[{u:1,imp:1},{u:0,imp:1},{u:1,imp:0},{u:0,imp:0}];
let mDragId=null, mDragSec=null;

function renderMatrix(){
  const q=(document.getElementById('srch').value||'').toLowerCase().trim();
  const qs=[[],[],[],[]];
  S.sections.forEach(s=>{
    if(!matrixSectionFilter.has('all')&&!matrixSectionFilter.has(s.id)) return;
    s.tasks.forEach(t=>{
      if(t.status==='Backlog') return;
      if(t.status==='Done'&&!showDone) return;
      if(hideConf&&t.confidential) return;
      if(!matchesAll(t)) return;
      if(q){
        const hay=(t.task+' '+(t.note||'')+' '+(t.connections||[]).join(' ')).toLowerCase();
        if(!hay.includes(q)) return;
      }
      const qi={'P1':0,'P2':1,'P3':2,'P4':3}[t.priority]??3;
      qs[qi].push({...t,secId:s.id});
    });
  });
  ['q1','q2','q3','q4'].forEach((qid,qi)=>{
    const el=document.getElementById(qid);
    const items=qs[qi].map(t=>`
      <div class="qi ${t.confidential?'conf-qi':''}" id="qi-${t.id}"
        draggable="true"
        ondragstart="mDragStart(event,'${t.id}','${t.secId}')"
        ondragend="mDragEnd(event)"
        ondragover="mCardOver(event)"
        ondragleave="this.classList.remove('kc-drop-target')"
        ondrop="mCardDrop(event,'${t.id}','${t.secId}')"
        oncontextmenu="rowCtxMenu(event,'${t.id}','${t.secId}')"
        onclick="openEdit('${t.id}','${t.secId}')">
        <div class="qin">${dT(t.task)}${t.confidential?' <span style="font-size:10px;color:var(--conf)">🔒</span>':''}</div>
        <div class="qim">
          <span class="badge ${PC[t.priority]}" style="font-size:10px;padding:2px 7px;pointer-events:none"><span class="bd"></span>${t.priority}</span>
          ${t.due?'· 📅 '+fd(t.due):''}
          ${(t.connections||[]).slice(0,2).map(c=>`<span class="conn-tag" style="font-size:10px" title="${escAttr(c)}">${escHtml(c)}</span>`).join('')}
        </div>
      </div>`).join('');
    el.innerHTML=items||`<div class="qdrop-hint">Drop tasks here</div>`;
    const quad=el.closest('.quad');
    if(quad){
      quad.ondragover=e=>{e.preventDefault();quad.classList.add('qdrop-active');};
      quad.ondragleave=e=>{if(!quad.contains(e.relatedTarget))quad.classList.remove('qdrop-active');};
      quad.ondrop=e=>{e.preventDefault();quad.classList.remove('qdrop-active');mDrop(qi);};
    }
  });
  if(matrixMode==='prioritize') renderMiniMatrix();
}

function mDragStart(e,id,secId){
  mDragId=id;mDragSec=secId;
  e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{const el=document.getElementById('qi-'+id);if(el)el.classList.add('qi-dragging');},0);
}
function mDragEnd(e){
  document.querySelectorAll('.qi-dragging').forEach(el=>el.classList.remove('qi-dragging'));
  document.querySelectorAll('.qdrop-active').forEach(el=>el.classList.remove('qdrop-active'));
  document.querySelectorAll('.kc-drop-target').forEach(el=>el.classList.remove('kc-drop-target'));
}
function mCardOver(e){e.preventDefault();e.stopPropagation();e.currentTarget.classList.add('kc-drop-target');}
function mCardDrop(e,tid,tsec){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.classList.remove('kc-drop-target');
  if(!mDragId||mDragId===tid){mDragId=null;mDragSec=null;return;}
  const cId=mDragId,cSec=mDragSec;
  mDragId=null;mDragSec=null;
  kShowSubDlg(cId,cSec,null,tid,tsec,null,e.clientX,e.clientY,'No, keep priorities',null);
}
function mDrop(targetQ){
  if(!mDragId) return;
  const t=ft(mDragId,mDragSec);
  if(!t){mDragId=null;return;}
  const qPriority=['P1','P2','P3','P4'];
  const oldP=t.priority;
  t.urgent=QC[targetQ].u;
  t.priority=qPriority[targetQ];
  if(oldP!==t.priority) logEvent('priority',mDragId,{from:oldP,to:t.priority});
  mDragId=null;mDragSec=null;
  saveS();
  renderMatrix();
  const qnames=['Q1: Urgent + Important (P1)','Q2: Not Urgent + Important (P2)','Q3: Urgent + Not Important (P3)','Q4: Not Urgent + Not Important (P4)'];
  showToast(`Moved to ${qnames[targetQ]}`);
}

// ═══ PRIORITIZE MODE ═══
// Suggestion engine helpers
function inferImpact(t){
  const outs=t.outcomes||[];
  if(outs.includes('board')||outs.includes('ebitda')) return 'high';
  if(outs.length>0) return 'some';
  return 'none';
}
function inferTimePressure(t){
  const d=ds(t.due);
  if(d==='u') return 'now';
  if(t.urgent===1&&!t.due) return 'now';
  if(d==='s') return 'week';
  if(t.urgent===1) return 'week';
  return 'later';
}
function defaultControls(t){
  return {
    impact: t.pData?.impact||inferImpact(t),
    timePressure: t.pData?.timePressure||inferTimePressure(t),
    ownership: t.pData?.ownership||'me'
  };
}
function suggestPriority(t){
  const ctrl=defaultControls(t);
  const {impact,timePressure,ownership}=ctrl;
  let score=0;
  const r=[];
  if(impact==='high'){ score+=3; const on=outcomeNames(t.outcomes); r.push('high impact'+(on?' on '+on:'')); }
  else if(impact==='some'){ score+=1; const on=outcomeNames(t.outcomes); r.push('some impact'+(on?' on '+on:'')); }
  else r.push('no linked outcomes');
  if(timePressure==='now'){ score+=3; r.push(ds(t.due)==='u'?'overdue':'action needed now'); }
  else if(timePressure==='week'){ score+=1; r.push('due this week'); }
  else r.push('no near-term deadline');
  if(ownership==='delegate'){ score-=2; r.push('can be delegated'); }
  else if(ownership==='me') r.push('needs your direct ownership');
  const p=score>=5?'P1':score>=3?'P2':score>=1?'P3':'P4';
  return {p, rationale:r.join(', ')};
}

// Guardrail strip
function renderGuardrail(){
  const el=document.getElementById('pm-guard'); if(!el) return;
  const tasks=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status!=='Done'&&t.status!=='Backlog'){if(hideConf&&t.confidential) return; tasks.push(t);} }));
  const p1Count=tasks.filter(t=>t.priority==='P1').length;
  const ipCount=tasks.filter(t=>t.status==='In Progress').length;
  const stale=tasks.filter(t=>!t.lastPrioritizedAt||(Date.now()-new Date(t.lastPrioritizedAt).getTime())>7*24*60*60*1000).length;
  const noOut=tasks.filter(t=>(t.priority==='P1'||t.priority==='P2')&&(!t.outcomes||t.outcomes.length===0)).length;
  const ov=tasks.filter(t=>ds(t.due)==='u').length;
  const items=[
    {v:p1Count,l:'P1 Active',cls:p1Count>3?'warn':'',tip:p1Count>3?'⚠ Recommended max: 3':''},
    {v:ipCount,l:'In Progress',cls:ipCount>7?'amber':'',tip:ipCount>7?'⚠ Recommended max: 7':''},
    {v:stale,l:'Needs Review',cls:'',tip:''},
    {v:noOut,l:'P1/P2 No Outcomes',cls:noOut>0?'warn':'',tip:noOut>0?'⚠ Link outcomes for better prioritization':''},
    {v:ov,l:'Overdue',cls:ov>0?'amber':'',tip:''},
  ];
  el.innerHTML=`<div class="pm-guard-inner">${items.map(i=>`<div class="pm-guard-item ${i.cls}"><span class="pm-guard-val">${i.v}</span><span class="pm-guard-lbl">${i.l}</span>${i.tip?`<span class="pm-guard-tip" title="${i.tip}">⚠</span>`:''}</div>`).join('')}</div>`;
}

// Triage queue
function getTriageQueue(forceAll=false){
  const now=new Date(); now.setHours(0,0,0,0);
  const tasks=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done'||t.status==='Backlog') return;
    if(hideConf&&t.confidential) return;
    const isHighP=t.priority==='P1'||t.priority==='P2';
    const isOverdue=ds(t.due)==='u';
    const isDueWeek=ds(t.due)==='s';
    const noOut=!t.outcomes||t.outcomes.length===0;
    const notRecent=!t.lastPrioritizedAt||(Date.now()-new Date(t.lastPrioritizedAt).getTime())>7*24*60*60*1000;
    const sugg=suggestPriority(t);
    const hasDiff=sugg.p!==t.priority;
    const worth=notRecent&&(isOverdue||isDueWeek||isHighP||noOut||hasDiff);
    if(!worth) return;
    // apply filter
    if(pmFilter==='needs-review'&&!notRecent) return;
    if(pmFilter==='no-outcomes'&&!noOut) return;
    if(pmFilter==='due-week'&&!isDueWeek) return;
    if(pmFilter==='overdue'&&!isOverdue) return;
    tasks.push({...t,secId:s.id,secTitle:s.title,secIcon:s.icon||''});
  }));
  tasks.sort((a,b)=>{
    const ao=ds(a.due)==='u'?0:1, bo=ds(b.due)==='u'?0:1;
    if(ao!==bo) return ao-bo;
    const po={P1:0,P2:1,P3:2,P4:3};
    if(po[a.priority]!==po[b.priority]) return po[a.priority]-po[b.priority];
    if(a.due&&b.due) return a.due<b.due?-1:1;
    return 0;
  });
  return (pmFocus&&!forceAll)?tasks.slice(0,10):tasks;
}
function renderTriageQueue(){
  const el=document.getElementById('pm-queue'); if(!el) return;
  const tasks=getTriageQueue();
  const total=tasks.length;
  let h=`<div class="pq-queue-hdr"><span class="pq-queue-title">${total} task${total!==1?'s':''} to review</span><button class="pq-focus-btn ${pmFocus?'on':''}" onclick="togglePmFocus()">⚡ Focus 10</button></div>`;
  if(!total){ h+=`<div class="pq-empty">🎉 All caught up — no tasks need review right now.</div>`; el.innerHTML=h; return; }
  h+=tasks.map(t=>triageCard(t)).join('');
  el.innerHTML=h;
}
function triageCard(t){
  const ctrl=defaultControls(t);
  const sugg=suggestPriority(t);
  const hasDiff=sugg.p!==t.priority;
  const d=ds(t.due);
  const dColor=d==='u'?'var(--p1)':d==='s'?'var(--amber)':'var(--muted)';
  const activeOuts=(S.outcomes||[]).filter(o=>o.active);
  const taskOuts=t.outcomes||[];
  // outcome chips (show all active, mark selected)
  const ocHtml=activeOuts.map(o=>{
    const sel=taskOuts.includes(o.id);
    return `<span class="pq-oc ${sel?'sel':''}" style="${sel?`background:${escAttr(o.color)};border-color:${escAttr(o.color)}`:''}" onclick="toggleTaskOutcomeInline('${escJs(t.id)}','${escJs(t.secId)}','${escJs(o.id)}')" title="${sel?'Remove: ':'Add: '}${escAttr(o.name)}">${escHtml(o.name)}</span>`;
  }).join('');
  // segmented controls
  function seg(field,opts,cur){ return `<div class="pq-seg">${opts.map(([v,l])=>`<button class="pq-seg-btn ${cur===v?'on':''}" onclick="setPData('${t.id}','${t.secId}','${field}','${v}')">${l}</button>`).join('')}</div>`; }
  const impSeg=seg('impact',[['none','None'],['some','Some'],['high','High']],ctrl.impact);
  const tpSeg=seg('timePressure',[['later','Later'],['week','This week'],['now','Now']],ctrl.timePressure);
  const ownSeg=seg('ownership',[['delegate','Delegate'],['shared','Shared'],['me','Me']],ctrl.ownership);
  const suggBadge=`<span class="badge ${PC[sugg.p]}" style="font-size:10px;padding:2px 7px"><span class="bd"></span>${sugg.p}${hasDiff?'':'✓'}</span>`;
  return `<div class="pq-card" id="pq-${t.id}">
  <div class="pq-card-top"><span class="badge ${PC[t.priority]}" style="font-size:10px;padding:2px 7px;flex-shrink:0"><span class="bd"></span>${t.priority}</span><span class="pq-task-name">${dT(t.task)}</span><div class="pq-suggestion">${hasDiff?suggBadge+`<button class="pq-why" onclick="showWhy('${t.id}')">Why?</button>`:suggBadge}</div></div>
  ${hasDiff?`<div class="pm-why-txt" id="pm-why-${t.id}">${escHtml(sugg.rationale)}</div>`:''}
  <div class="pq-meta"><span class="pq-sec">${t.secIcon} ${escHtml((t.secTitle||'').replace(/ — .*/,''))}</span>${t.due?`<span class="pq-due" style="color:${dColor}">📅 ${fd(t.due)}</span>`:''}${ocHtml}</div>
  <div class="pq-controls"><div class="pq-seg-wrap"><span class="pq-seg-label">Impact</span>${impSeg}</div><div class="pq-seg-wrap"><span class="pq-seg-label">Pressure</span>${tpSeg}</div><div class="pq-seg-wrap"><span class="pq-seg-label">Owner</span>${ownSeg}</div></div>
  <div class="pq-actions"><button class="pq-btn pq-accept" onclick="acceptPriority('${t.id}','${t.secId}')">✓ Accept ${sugg.p}</button><button class="pq-btn pq-keep" onclick="keepPriority('${t.id}','${t.secId}')">— Keep ${t.priority}</button><button class="pq-btn pq-open" onclick="openEdit('${t.id}','${t.secId}')">✏ Open</button></div>
  </div>`;
}
function setPData(id,secId,field,value){
  const t=ft(id,secId); if(!t) return;
  if(!t.pData) t.pData={impact:null,timePressure:null,ownership:null};
  t.pData[field]=value; saveS(); rerenderTriageCard(id,secId);
}
function rerenderTriageCard(id,secId){
  const card=document.getElementById('pq-'+id); if(!card) return;
  const sec=S.sections.find(s=>s.id===secId); if(!sec) return;
  const fresh=sec.tasks.find(x=>x.id===id); if(!fresh) return;
  card.outerHTML=triageCard({...fresh,secId,secTitle:sec.title,secIcon:sec.icon||''});
}
function toggleTaskOutcomeInline(id,secId,outcomeId){
  const t=ft(id,secId); if(!t) return;
  if(!t.outcomes) t.outcomes=[];
  if(t.outcomes.includes(outcomeId)){ t.outcomes=t.outcomes.filter(x=>x!==outcomeId); }
  else { if(t.outcomes.length>=2){ showToast('Max 2 outcomes per task'); return; } t.outcomes.push(outcomeId); }
  saveS(); rerenderTriageCard(id,secId); renderMiniMatrix();
}
function showWhy(id){ const el=document.getElementById('pm-why-'+id); if(el) el.classList.toggle('on'); }
function acceptPriority(id,secId){
  const t=ft(id,secId); if(!t) return;
  const sugg=suggestPriority(t); const oldP=t.priority;
  t.priority=sugg.p; t.lastPrioritizedAt=new Date().toISOString().split('T')[0];
  if(oldP!==t.priority) logEvent('priority',id,{from:oldP,to:t.priority});
  saveS();
  if(curView==='review'&&wrStage===5) renderReview();
  else { renderGuardrail(); renderTriageQueue(); renderMiniMatrix(); }
  showToast(`Priority updated: ${oldP} → ${sugg.p}`);
}
function keepPriority(id,secId){
  const t=ft(id,secId); if(!t) return;
  t.lastPrioritizedAt=new Date().toISOString().split('T')[0];
  saveS();
  if(curView==='review'&&wrStage===5) renderReview();
  else { renderGuardrail(); renderTriageQueue(); }
  showToast('Priority confirmed — review date reset');
}

// Mini matrix (read-only right panel)
function renderMiniMatrix(){
  const el=document.getElementById('pm-mini'); if(!el) return;
  const qs={P1:[],P2:[],P3:[],P4:[]};
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status==='Done'||t.status==='Backlog') return; if(hideConf&&t.confidential) return; qs[t.priority].push(t); }));
  const labels={P1:'🔴 P1 — Critical',P2:'🟢 P2 — Important',P3:'🟡 P3 — Urgent',P4:'⚪ P4 — Later'};
  el.innerHTML=Object.entries(labels).map(([p,label])=>{
    const items=qs[p];
    const rows=items.slice(0,6).map(t=>`<div class="pm-mini-task ${t.lastPrioritizedAt?'reviewed':''}" title="${demoMode?'●●●●●●●':escAttr(t.task)}">${dT(t.task)}</div>`).join('');
    const more=items.length>6?`<div class="pm-mini-more">+${items.length-6} more</div>`:'';
    return `<div class="pm-mini-q"><div class="pm-mini-qh"><span>${label}</span><span class="pm-mini-cnt">${items.length}</span></div>${rows||'<div class="pm-mini-more" style="font-style:normal">Empty</div>'}${more}</div>`;
  }).join('');
}

// ═══ TOAST ═══
// Toast
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),2400); }

// ═══ INBOX ═══
// ════════════════════════════════════════
//  INBOX
// ════════════════════════════════════════
let paMode=false, paIdx=0;

function ixAgeDays(added){ const d=safeDate(added); if(!d) return 0; const today=new Date();today.setHours(0,0,0,0); return Math.floor((today-d)/86400000); }
function ixAgeLabel(days){ if(days===0) return 'Added today'; if(days===1) return 'Added yesterday'; if(days<7) return `Added ${days} days ago`; if(days<14) return 'Added 1 week ago'; return `Added ${Math.floor(days/7)} weeks ago`; }

function updateInboxBadge(){ const n=(S.inbox||[]).length+_etTasks.length; const b=document.getElementById('tbadge-inbox'); if(b){b.textContent=n;b.style.display=n>0?'':'none';} }

function addInboxItem(text,note){ if(!S.inbox)S.inbox=[]; const id='ix_'+Date.now().toString(36); S.inbox.unshift({id,text:text.trim(),note:(note||'').trim(),added:new Date().toISOString().split('T')[0],confidential:false}); logEvent('inbox_add',id,{}); saveS();renderInbox();renderStats(); }

function ixCapKey(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ixCapture();} }
function ixCapResize(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,160)+'px'; }
function ixCapture(){
  const t=document.getElementById('ixCapText'); const n=document.getElementById('ixCapNote');
  if(!t||!t.value.trim()) return;
  const lines=t.value.split('\n').map(l=>l.trim()).filter(Boolean);
  if(lines.length>1){
    lines.forEach(l=>addInboxItem(l,''));
    showToast(`${lines.length} items added to inbox`);
  } else {
    addInboxItem(lines[0],n?n.value:'');
  }
  t.value=''; t.style.height='auto'; if(n)n.value=''; t.focus();
}

function renderInbox(){
  renderEmailTasks();
  syncAiVisibility();
  updateInboxBadge();
  const list=document.getElementById('ixList'); if(!list) return;
  const items=S.inbox||[];
  const paBar=document.getElementById('ix-pa-bar');
  if(paBar){ if(paMode&&items.length>0){ paBar.innerHTML=`<div class="pa-bar"><span class="pa-progress">Processing item ${paIdx+1} of ${items.length}</span><button onclick="paNext()">Skip →</button><button onclick="exitProcessAll()">✓ Done</button></div>`; }else{paBar.innerHTML='';} }
  if(!items.length){list.innerHTML='<div class="ix-empty">📥 Inbox is empty — use the capture bar above to quickly add items for later triage.</div>';return;}
  const toRender=paMode?[items[paIdx]]:items;
  list.innerHTML=toRender.map(item=>{
    const days=ixAgeDays(item.added); const stale=days>=7; const isConf=!!item.confidential;
    const pri=item.priority||'P2'; const secId=item.secId||S.sections[0]?.id||''; const due=item.due||'';
    const stat=item.status||'To Do'; const urg=item.urgent?'1':'0';
    const secOpts=S.sections.map(s=>`<option value="${escAttr(s.id)}"${s.id===secId?' selected':''}>${escHtml((s.icon||'')+' '+s.title)}</option>`).join('');
    const conns=(item.connections||[]);
    const connTags=conns.map(c=>`<span class="ix-itag">${escHtml(c)}<button onclick="event.stopPropagation();ixRemoveConn('${item.id}','${escAttr(c)}')">×</button></span>`).join('');
    return `<div class="ixcard${stale?' ix-stale':''}" id="ixc-${item.id}">
      <div class="ix-top">
        <div class="ix-body">
          <div class="ix-text">${escHtml(item.text)}</div>
          ${item.note?`<div class="ix-note">${escHtml(item.note)}</div>`:''}
          <div class="ix-meta"><span class="ix-age${stale?' stale':''}">${ixAgeLabel(days)}</span></div>
          <div class="ix-inline">
            <select class="ix-isel" title="Section" onchange="ixSetField('${item.id}','secId',this.value)">${secOpts}</select>
            <select class="ix-isel" title="Priority" onchange="ixSetField('${item.id}','priority',this.value)">${PO.map(p=>`<option value="${p}"${p===pri?' selected':''}>${p}</option>`).join('')}</select>
            <select class="ix-isel" title="Status" onchange="ixSetField('${item.id}','status',this.value)"><option value="To Do"${stat==='To Do'?' selected':''}>To Do</option><option value="In Progress"${stat==='In Progress'?' selected':''}>In Progress</option></select>
            <input class="ix-iinp" type="date" title="Due date" value="${due}" onchange="ixSetField('${item.id}','due',this.value)" style="width:130px">
            <select class="ix-isel" title="Urgency" onchange="ixSetField('${item.id}','urgent',this.value)"><option value="0"${urg==='0'?' selected':''}>Not Urgent</option><option value="1"${urg==='1'?' selected':''}>Urgent</option></select>
            ${connTags}
            <input class="ix-iinp" placeholder="+ connection" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();ixAddConn('${item.id}',this.value);this.value='';}">
          </div>
        </div>
        <div class="ix-actions">
          <button class="lockbtn ${isConf?'lock-on':'lock-off'}" onclick="toggleInboxConf('${item.id}')" title="${isConf?'Confidential':'Mark confidential'}">${isConf?'🔒':'🔓'}</button>
          <button class="tp-act" onclick="triageItem('${item.id}','active')" title="Move to active tasks">→ Active</button>
          <button class="tp-bl" onclick="triageItem('${item.id}','backlog')" title="Send to backlog">📋 Backlog</button>
          <button class="ixbtn del" onclick="deleteInboxItem('${item.id}')" title="Delete permanently">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('')+((!paMode&&items.length>0)?`<div style="margin-top:10px"><button class="ixbtn" onclick="startProcessAll()">⚡ Process All (${items.length})</button></div>`:'');
}
function ixSetField(id,field,value){
  const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return;
  if(field==='urgent') item[field]=parseInt(value);
  else item[field]=value;
  saveS();
}
function ixAddConn(id,val){
  const v=val.trim().replace(/,$/,'').trim(); if(!v) return;
  const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return;
  if(!item.connections) item.connections=[];
  if(!item.connections.includes(v)) item.connections.push(v);
  addKnownConn(v); saveS(); renderInbox();
}
function ixRemoveConn(id,conn){
  const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return;
  item.connections=(item.connections||[]).filter(c=>c!==conn);
  saveS(); renderInbox();
}

function triageItem(id,mode){
  const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return;
  const secId=item.secId||S.sections[0]?.id;
  const priority=item.priority||'P2';
  const due=item.due||'';
  const today=new Date().toISOString().split('T')[0];
  const status=mode==='backlog'?'Backlog':(item.status==='In Progress'?'In Progress':'To Do');
  const sec=S.sections.find(s=>s.id===secId); if(!sec) return;
  const newTask={id:genId(secId[0]),task:item.text,note:item.note||'',url:'',priority,status,due,type:'once',urgent:item.urgent||0,confidential:!!item.confidential,connections:[...(item.connections||[])],outcomes:[],kanbanCol:null,lastStatusChange:today,parent:null};
  sec.tasks.push(newTask);
  S.inbox=(S.inbox||[]).filter(x=>x.id!==id);
  logEvent('inbox_done',id,{a:mode}); logEvent('create',newTask.id,{s:secId,p:priority});
  if(paMode){if(paIdx>=(S.inbox.length))paIdx=Math.max(0,S.inbox.length-1);if(!S.inbox.length)paMode=false;}
  saveS();renderAll();renderInbox();showToast(mode==='backlog'?'Sent to Backlog':'Moved to Active tasks');
}

function deleteInboxItem(id){ logEvent('inbox_done',id,{a:'delete'}); S.inbox=(S.inbox||[]).filter(x=>x.id!==id); if(paMode){if(paIdx>=S.inbox.length)paIdx=Math.max(0,S.inbox.length-1);if(!S.inbox.length)paMode=false;} saveS();renderInbox(); }
function toggleInboxConf(id){ const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return; item.confidential=!item.confidential; saveS();renderInbox(); }
function startProcessAll(){ if(!(S.inbox||[]).length) return; paMode=true;paIdx=0;renderInbox(); }
function paNext(){ paIdx++; if(paIdx>=(S.inbox||[]).length){paMode=false;paIdx=0;} renderInbox(); }
function exitProcessAll(){ paMode=false;paIdx=0;renderInbox(); }

// ═══ WEEKLY REVIEW ═══
// Weekly Review
function renderReview(){
  const c=document.getElementById('wr-content');
  if(!c) return;
  if(wrStage===0){ c.innerHTML=wrHomeScreen(); return; }
  if(wrStage===1){ c.innerHTML=wrStage1HTML(); return; }
  if(wrStage===2){ c.innerHTML=wrStage2HTML(); return; }
  if(wrStage===3){ c.innerHTML=wrStage3HTML(); return; }
  if(wrStage===4){ c.innerHTML=wrStage4HTML(); return; }
  if(wrStage===5){ c.innerHTML=wrStage5HTML(); return; }
  c.innerHTML=wrDoneHTML();
}
function wrProgHTML(stage){
  const steps=['Inbox','Aging','Backlog','Hygiene','Prioritize'];
  return `<div class="wr-prog">${steps.map((s,i)=>`<div class="wr-step ${stage>i+1?'done':stage===i+1?'on':''}">${stage>i+1?'✓ ':''}${s}</div>`+(i<4?'<div class="wr-sep">→</div>':'')).join('')}</div>`;
}
function wrHomeScreen(){
  const inbox=(S.inbox||[]).length;
  const aging=S.sections.reduce((a,s)=>a+s.tasks.filter(t=>ageLevel(t)!=='none').length,0);
  const backlog=S.sections.reduce((a,s)=>a+s.tasks.filter(t=>t.status==='Backlog').length,0);
  const hygiene=wrHygieneTasks().length;
  const prioritize=getTriageQueue(true).length;
  return `<div class="wr-home"><div class="wr-title">🔄 Weekly Review</div><div class="wr-sub">10-minute system check — inbox, aging, backlog, hygiene, prioritize</div><div class="wr-counts"><div class="wr-cnt"><span class="wr-n">${inbox}</span><span class="wr-l">Inbox</span></div><div class="wr-cnt"><span class="wr-n">${aging}</span><span class="wr-l">Aging</span></div><div class="wr-cnt"><span class="wr-n">${backlog}</span><span class="wr-l">Backlog</span></div><div class="wr-cnt"><span class="wr-n" style="color:${hygiene?'var(--amber)':'var(--teal)'}">${hygiene}</span><span class="wr-l">Hygiene</span></div><div class="wr-cnt"><span class="wr-n" style="color:${prioritize?'var(--teal)':'var(--muted)'}">${prioritize}</span><span class="wr-l">Prioritize</span></div></div><button class="wrbtn wr-start" onclick="startWeeklyReview()">Start Review →</button></div>`;
}
function startWeeklyReview(){ wrStage=1; wrKeptIds=new Set(); renderReview(); }
function wrHygieneTasks(){
  const active=[]; S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status!=='Done'&&t.status!=='Backlog'&&!wrKeptIds.has(t.id)) active.push({...t,secId:s.id}); }));
  return active.filter(t=>!(t.outcomes&&t.outcomes.length)||!t.due||!(t.connections&&t.connections.length));
}
function wrStage4HTML(){
  const tasks=wrHygieneTasks();
  if(!tasks.length){ wrStage=5; return wrStage5HTML(); }
  const today=new Date(); today.setHours(0,0,0,0);
  const addDays=(n)=>{ const d=new Date(today); d.setDate(d.getDate()+n); return ldStr(d); };
  const sugDue=(pri)=>pri==='P1'?addDays(3):pri==='P2'?addDays(7):pri==='P3'?addDays(14):addDays(30);
  const cards=tasks.map(t=>{
    const noOut=!(t.outcomes&&t.outcomes.length);
    const noDue=!t.due;
    const noConn=!(t.connections&&t.connections.length);
    const flags=(noOut?`<span class="wr-flag f-outcomes">No outcome</span>`:'')+
                (noDue?`<span class="wr-flag f-due">No due date</span>`:'')+
                (noConn?`<span class="wr-flag f-conns">No connections</span>`:'');
    const dueSug=noDue?`<div class="wr-quick-dates"><span style="font-size:11px;color:var(--muted)">Quick due:</span>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',3)">+3d</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',7)">+1w</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',14)">+2w</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',30)">+1m</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',-1)">${escHtml(sugDue(t.priority))} (suggested)</button>
    </div>`:''
    ;
    const outSug=noOut&&(S.outcomes||[]).filter(o=>o.active).length?`<div class="wr-quick-dates"><span style="font-size:11px;color:var(--muted)">Outcome:</span>${(S.outcomes||[]).filter(o=>o.active).map(o=>`<button class="wr-qd-btn" onclick="wrSetOutcome('${t.id}','${t.secId}','${o.id}')">${escHtml(o.name)}</button>`).join('')}</div>`:'';
    return `<div class="wr-card"><div class="wr-task">${dT(t.task)}</div><div class="wr-flags">${flags}</div>${dueSug}${outSug}<div class="wr-acts" style="margin-top:8px"><button class="wrbtn" onclick="openEdit('${t.id}','${t.secId}')">✏️ Edit</button><button class="wrbtn" onclick="wrHygieneSkip('${t.id}')">✓ Skip</button></div></div>`;
  }).join('');
  return `${wrProgHTML(4)}<div class="wr-stage-h">Stage 4 — Hygiene Check (${tasks.length} task${tasks.length!==1?'s':''} need attention)</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=5;renderReview()">Next: Prioritize →</button></div>`;
}
function wrStage5HTML(){
  const tasks=getTriageQueue(true);
  if(!tasks.length){ wrStage=6; return wrDoneHTML(); }
  const cards=tasks.map(t=>triageCard(t)).join('');
  return `${wrProgHTML(5)}<div class="wr-stage-h">Stage 5 — Priority Review (${tasks.length} task${tasks.length!==1?'s':''} to review)</div><p style="font-size:13px;color:var(--muted);margin-bottom:12px">Accept the suggested priority, keep current, or open to edit. Tasks disappear when reviewed.</p><div id="wr-pm-queue">${cards}</div><div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=6;renderReview()">Complete Review →</button></div>`;
}
function wrSetDue(id,secId,days){
  const t=ft(id,secId); if(!t) return;
  if(days===-1){ const pri=t.priority; const d=new Date(); d.setHours(0,0,0,0); const n=pri==='P1'?3:pri==='P2'?7:pri==='P3'?14:30; d.setDate(d.getDate()+n); t.due=ldStr(d); }
  else{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+days); t.due=ldStr(d); }
  saveS(); renderReview(); showToast('Due date set → '+fd(t.due));
}
function wrSetOutcome(id,secId,outcomeId){
  const t=ft(id,secId); if(!t) return;
  if(!t.outcomes) t.outcomes=[];
  if(!t.outcomes.includes(outcomeId)&&t.outcomes.length<2) t.outcomes.push(outcomeId);
  saveS(); renderReview(); showToast('Outcome assigned');
}
function wrHygieneSkip(id){ wrKeptIds.add(id); renderReview(); }
function wrStage1HTML(){
  const items=S.inbox||[];
  if(!items.length){ wrStage=2; return wrStage2HTML(); }
  const cards=items.map(item=>`<div class="wr-card"><div class="wr-task">${escHtml(item.text)}</div>${item.note?`<div class="wr-note">${escHtml(item.note)}</div>`:''}<div class="wr-acts"><button class="wrbtn" onclick="wrTriageIx('${item.id}','active')">→ Active</button><button class="wrbtn" onclick="wrTriageIx('${item.id}','backlog')">📋 Backlog</button><button class="wrbtn wr-del" onclick="wrDeleteIx('${item.id}')">🗑 Delete</button></div></div>`).join('');
  return `${wrProgHTML(1)}<div class="wr-stage-h">Stage 1 — Process Inbox (${items.length} item${items.length!==1?'s':''})</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=2;renderReview()">Skip to Aging →</button></div>`;
}
function wrStage2HTML(){
  const aging=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(ageLevel(t)!=='none') aging.push({...t,secId:s.id}); }));
  if(!aging.length){ wrStage=3; return wrStage3HTML(); }
  const cards=aging.map(t=>{ const lv=ageLevel(t); const d=ageDays(t); return `<div class="wr-card ${lv==='red'?'wr-red':'wr-yellow'}"><div class="wr-task">${escHtml(t.task)}</div><div class="wr-age">${escHtml(t.status)} · ${d} day${d!==1?'s':''} · ${lv==='red'?'⛔ Zombie':'⚠️ Stale'}</div><div class="wr-acts"><button class="wrbtn" onclick="wrKeep('${t.id}','${t.secId}')">✓ Keep</button><button class="wrbtn" onclick="openEdit('${t.id}','${t.secId}')">✏️ Edit</button><button class="wrbtn" onclick="wrSendBacklog('${t.id}','${t.secId}')">📋 Backlog</button><button class="wrbtn wr-del" onclick="wrDeleteTask('${t.id}','${t.secId}')">🗑 Delete</button></div></div>`; }).join('');
  return `${wrProgHTML(2)}<div class="wr-stage-h">Stage 2 — Aging Tasks (${aging.length} task${aging.length!==1?'s':''})</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=3;renderReview()">Next: Backlog →</button></div>`;
}
function wrStage3HTML(){
  const backlog=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status==='Backlog'&&!wrKeptIds.has(t.id)) backlog.push({...t,secId:s.id}); }));
  if(!backlog.length){ wrStage=4; return wrStage4HTML(); }
  const cards=backlog.map(t=>`<div class="wr-card"><div class="wr-task">${dT(t.task)}</div>${t.note?`<div class="wr-note">${dT(t.note)}</div>`:''}<div class="wr-acts"><button class="wrbtn wr-act" onclick="wrActivate('${t.id}','${t.secId}')">▶ Activate</button><button class="wrbtn" onclick="wrKeepBacklog('${t.id}','${t.secId}')">✓ Keep</button><button class="wrbtn wr-del" onclick="wrDeleteTask('${t.id}','${t.secId}')">🗑 Delete</button></div></div>`).join('');
  return `${wrProgHTML(3)}<div class="wr-stage-h">Stage 3 — Backlog Review (${backlog.length} task${backlog.length!==1?'s':''})</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=4;renderReview()">Hygiene →</button></div>`;
}
function wrDoneHTML(){
  logEvent('review','weekly',{});
  const p=getWeekPulse();
  const pulse=p?`<div class="an-wr-pulse"><div style="font-weight:600;margin-bottom:6px">This Week's Pulse</div><div class="an-cards" style="justify-content:center">${[['Completed',p.done],['Net Flow',(p.net>0?'+':'')+p.net],['Cycle',p.avgCycle+'d'],['P1/P2',p.p1Done],['Stale',p.stale]].map(([l,v])=>`<div class="an-card"><div class="sn">${v}</div><div class="sl">${l}</div></div>`).join('')}</div></div>`:'';
  const aiSlot=`<div class="wr-ai-debrief" id="wrAiDebrief"><button class="wrbtn wr-ai-btn" onclick="triggerWeeklyDebrief()">✨ Generate AI Debrief</button></div>`;
  const hasKey=!!(S.settings&&S.settings.claudeKey);
  return `<div class="wr-done"><div class="wr-check">✓</div><div class="wr-title">Review Complete</div><div class="wr-sub">System is clean and current</div>${pulse}${hasKey?aiSlot:''}<button class="wrbtn wr-start" onclick="wrStage=0;sw('today')">Go to Today</button></div>`;
}
function wrTriageIx(id,mode){
  const item=(S.inbox||[]).find(x=>x.id===id); if(!item) return;
  const sec=S.sections[0];
  if(sec){
    if(mode==='backlog'){ const nid=genId('bk'); sec.tasks.push({id:nid,task:item.text,note:item.note||'',url:'',priority:'P3',status:'Backlog',due:'',type:'once',urgent:0,confidential:item.confidential||false,connections:[],kanbanCol:null,lastStatusChange:new Date().toISOString().split('T')[0],parent:null}); logEvent('create',nid,{s:sec.id,p:'P3'}); }
    else{ const nid=genId('wr'); sec.tasks.push({id:nid,task:item.text,note:item.note||'',url:'',priority:item.priority||'P3',status:'To Do',due:item.due||'',type:'once',urgent:0,confidential:item.confidential||false,connections:[],kanbanCol:null,lastStatusChange:new Date().toISOString().split('T')[0],parent:null}); logEvent('create',nid,{s:sec.id,p:item.priority||'P3'}); }
  }
  logEvent('inbox_done',id,{a:mode});
  S.inbox=(S.inbox||[]).filter(x=>x.id!==id);
  saveS();renderReview();renderAll();
}
function wrDeleteIx(id){ logEvent('inbox_done',id,{a:'delete'}); S.inbox=(S.inbox||[]).filter(x=>x.id!==id); saveS();renderReview(); }
function wrKeep(id,secId){ const t=ft(id,secId); if(t){ t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();showToast('Snoozed — aging reset'); } }
function wrKeepBacklog(id,secId){ wrKeptIds.add(id); const t=ft(id,secId); if(t){ t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS(); } renderReview(); }
function wrSendBacklog(id,secId){ const t=ft(id,secId); if(t){ t.status='Backlog';t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();renderAll();showToast('Moved to Backlog'); } }
function wrActivate(id,secId){ const t=ft(id,secId); if(t){ t.status='To Do';t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();renderAll();showToast('Activated → To Do'); } }
function wrDeleteTask(id,secId){ const sec=S.sections.find(s=>s.id===secId); if(sec){ sec.tasks=sec.tasks.filter(t=>t.id!==id); saveS();renderReview();renderAll(); } }

// ═══ KANBAN ═══
// ── KANBAN ─────────────────────────────────────────────────────
function renderKanban(){
  renderKbFbar();
  const all=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>all.push({...t,secId:s.id})));
  const kbSec=t=>kanbanSectionFilter.has('all')||kanbanSectionFilter.has(t.secId);
  const q=(document.getElementById('srch').value||'').toLowerCase().trim();
  const matchQ=t=>!q||(t.task+' '+(t.note||'')+' '+(t.connections||[]).join(' ')).toLowerCase().includes(q);
  const pool=all.filter(t=>t.kanbanCol===null&&t.status!=='Done'&&t.status!=='Backlog'&&!(hideConf&&t.confidential)&&matchesAll(t)&&kbSec(t)&&matchQ(t));
  const week=all.filter(t=>t.kanbanCol==='week'&&!(hideConf&&t.confidential)&&matchesAll(t)&&kbSec(t)&&matchQ(t));
  const tod=all.filter(t=>t.kanbanCol==='today'&&!(hideConf&&t.confidential)&&matchesAll(t)&&kbSec(t)&&matchQ(t));
  const todayStr=new Date().toISOString().split('T')[0];
  const done=all.filter(t=>t.kanbanCol==='done'&&!(hideConf&&t.confidential)&&(showDone||t.lastStatusChange===todayStr)&&matchesAll(t)&&kbSec(t)&&matchQ(t));
  const priO={P1:0,P2:1,P3:2,P4:3};
  const sortAct=(a,b)=>(priO[a.priority]??3)-(priO[b.priority]??3)||(a.due&&b.due?(a.due<b.due?-1:a.due>b.due?1:0):(a.due?-1:b.due?1:0));
  pool.sort(sortAct); week.sort(sortAct); tod.sort(sortAct);
  done.sort((a,b)=>(b.lastStatusChange||'')>(a.lastStatusChange||'')?1:-1);
  const renderCol=(colId,tasks)=>{
    const body=document.getElementById('kb-body-'+colId);
    const cnt=document.getElementById('kb-cnt-'+colId);
    if(!body) return;
    cnt.textContent=tasks.length;
    if(colId==='today') cnt.className='kb-count'+(tasks.length>5?' warn':'');
    const hints={pool:'All tasks are in progress 🎉',week:'← drag tasks from Active Pool',today:'← plan your day',done:'No completed tasks yet'};
    if(colId==='pool'){
      const btn=document.getElementById('kb-grp-btn');
      if(btn) btn.classList.toggle('on',kanbanGroupPool);
      const ordPool=orderedWithChildren(tasks);
      if(!kanbanGroupPool){
        const overdue=ordPool.filter(t=>ds(t.due)==='u');
        const dueSoon=ordPool.filter(t=>ds(t.due)==='s');
        const dueNext=ordPool.filter(t=>dsNW(t.due));
        const rest=ordPool.filter(t=>{const d=ds(t.due);return d!=='u'&&d!=='s'&&!dsNW(t.due);});
        let ph='';
        if(overdue.length){ph+=`<div class="kb-due-hdr kb-due-hdr-od">⚠️ Overdue (${overdue.length})</div>`;ph+=overdue.map(t=>kanbanCard(t,'pool')).join('');ph+=`<div class="kb-due-sep"></div>`;}
        if(dueSoon.length){ph+=`<div class="kb-due-hdr">📅 Due This Week</div>`;ph+=dueSoon.map(t=>kanbanCard(t,'pool')).join('');}
        if(dueNext.length){if(dueSoon.length)ph+=`<div class="kb-due-sep"></div>`;ph+=`<div class="kb-due-hdr kb-due-hdr-nw">📆 Due Next Week</div>`;ph+=dueNext.map(t=>kanbanCard(t,'pool')).join('');}
        if((overdue.length||dueSoon.length||dueNext.length)&&rest.length)ph+=`<div class="kb-due-sep"></div>`;
        ph+=rest.map(t=>kanbanCard(t,'pool')).join('');
        body.innerHTML=ph||`<div class="kb-empty">${hints.pool}</div>`;
      } else {
        let h='';
        S.sections.forEach(sec=>{
          const st=ordPool.filter(t=>t.secId===sec.id);
          if(!st.length) return;
          const collapsed=kbCollapsed.has(sec.id);
          h+=`<div class="kb-grp-hdr" onclick="toggleKbGrp('${sec.id}')">`;
          h+=`<span>${sec.icon} ${escHtml(sec.title)}</span>`;
          h+=`<span style="background:var(--teal-dim);color:var(--teal);border-radius:10px;padding:1px 6px;font-size:11px">${st.length}</span>`;
          h+=`<span style="font-size:10px">${collapsed?'\u25b6':'\u25bc'}</span></div>`;
          if(!collapsed) h+=st.map(t=>kanbanCard(t,'pool')).join('');
        });
        body.innerHTML=h||`<div class="kb-empty">${hints.pool}</div>`;
      }
    } else {
      const ordTasks=orderedWithChildren(tasks);
      body.innerHTML=ordTasks.length?ordTasks.map(t=>kanbanCard(t,colId)).join(''):`<div class="kb-empty">${hints[colId]||''}</div>`;
      if(colId==='week'){ const hint=document.getElementById('kb-hint-week'); if(hint) hint.textContent=ordTasks.length?'':' ← drag from Active'; }
    }
    body.ondragover=e=>{e.preventDefault();body.classList.add('drop-over');};
    body.ondragleave=e=>{if(!body.contains(e.relatedTarget))body.classList.remove('drop-over');};
    body.ondrop=e=>{e.preventDefault();body.classList.remove('drop-over');kDrop(colId);};
    body.removeEventListener('touchmove',kTouchMove);
    body.addEventListener('touchmove',kTouchMove,{passive:false});
    body.removeEventListener('touchend',kTouchEnd);
    body.addEventListener('touchend',kTouchEnd);
  };
  renderCol('pool',pool); renderCol('week',week); renderCol('today',tod); renderCol('done',done);
  setupKbDots();
}

function kanbanCard(t,col){
  const aLevel=ageLevel(t);
  const aDot=aLevel!=='none'?`<span class="age-dot" style="background:${aLevel==='red'?'var(--p1)':'var(--amber)'}" title="${ageTip(t)}"></span>`:'';
  const d=ds(t.due);
  const dColor=d==='u'?'var(--p1)':d==='s'?'var(--amber)':'var(--muted)';
  const conns=(t.connections||[]);
  const connHtml=conns.slice(0,2).map(c=>`<span class="conn-tag" style="font-size:10px">${escHtml(c)}</span>`).join('');
  const connMore=conns.length>2?`<span style="font-size:10px;color:var(--dim)">+${conns.length-2}</span>`:'';
  const pc=t.priority.toLowerCase();
  const isSub=!!t.parent;
  const colOrder=['pool','week','today','done'];
  const ci=colOrder.indexOf(col);
  const leftArrow=ci>0?`<button class="kc-arr" onclick="event.stopPropagation();kMoveCard('${t.id}','${t.secId}','${col}',-1)" title="Move left">‹</button>`:'';
  const rightArrow=ci<colOrder.length-1?`<button class="kc-arr" onclick="event.stopPropagation();kMoveCard('${t.id}','${t.secId}','${col}',1)" title="Move right">›</button>`:'';
  const isInProg=t.status==='In Progress';
  const playBtn=col!=='done'?`<button class="kc-play${isInProg?' prog':''}" onclick="event.stopPropagation();kToggleStatus('${t.id}','${t.secId}')" title="${isInProg?'Pause (set To Do)':'Play (set In Progress)'}">${isInProg?'⏸':'▶'}</button>`:'';
  const poolDueCls=col==='pool'?(d==='u'?'kc-overdue':d==='s'?'kc-due-week':''):'';
  return `<div class="kc kc-${pc} ${col==='done'?'kc-done':''} ${t.confidential?'kc-conf':''} ${isSub?'kc-subtask':''} ${poolDueCls}" id="kc-${t.id}" data-sec="${t.secId}" data-col="${col}"
    draggable="true" style="touch-action:none"
    ondragstart="kDragStart(event,'${t.id}','${t.secId}','${col}')"
    ondragend="kDragEnd(event)"
    ondragover="kCardOver(event)"
    ondragleave="this.classList.remove('kc-drop-target')"
    ondrop="kCardDrop(event,'${t.id}','${t.secId}','${col}')"
    ontouchstart="kTouchStart(event,'${t.id}','${t.secId}','${col}')"
    oncontextmenu="kCtxMenu(event,'${t.id}','${t.secId}','${col}')"
    onclick="openEdit('${t.id}','${t.secId}')">
    <div class="kc-arrows">${leftArrow}${rightArrow}</div>
    <div class="kc-name">${playBtn}${aDot}${dT(t.task)}${t.confidential?' <span style="font-size:10px;color:var(--conf)">🔒</span>':''}</div>
    ${t.note?`<div class="kc-note">${dT(t.note)}</div>`:''}
    ${t.url?`<a class="turl-link" href="${escAttr(t.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${escAttr(t.url)}">&#128279;</a>`:''}
    <div class="kc-meta">
      <span class="badge ${PC[t.priority]}" style="font-size:10px;padding:2px 7px;pointer-events:none"><span class="bd"></span>${t.priority}</span>
      ${t.due?`<span style="color:${dColor};font-size:11px">📅 ${fd(t.due)}</span>`:''}
      ${connHtml}${connMore}
    </div>
  </div>`;
}

let kDragId=null,kDragSec=null,kDragFromCol=null;
let kanbanGroupPool=false,kbCollapsed=new Set(),editingParent=null,pendingSubDlg=null;
let kColMenuCol=null,newTaskKanbanCol=null;

function kDragStart(e,id,secId,fromCol){
  kDragId=id;kDragSec=secId;kDragFromCol=fromCol;
  e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{const el=document.getElementById('kc-'+id);if(el)el.classList.add('kc-dragging');},0);
}
function kDragEnd(e){
  document.querySelectorAll('.kc-dragging').forEach(el=>el.classList.remove('kc-dragging'));
  document.querySelectorAll('.kb-body.drop-over').forEach(el=>el.classList.remove('drop-over'));
}
function kTouchStart(e,id,secId,fromCol){
  kDragId=id;kDragSec=secId;kDragFromCol=fromCol;
  const el=document.getElementById('kc-'+id);if(el)el.classList.add('kc-dragging');
}
function kTouchMove(e){
  if(!kDragId) return;
  e.preventDefault();
  const touch=e.touches[0];
  document.querySelectorAll('.kb-body.drop-over').forEach(b=>b.classList.remove('drop-over'));
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  const body=el?.closest?.('.kb-body');
  if(body) body.classList.add('drop-over');
}
function kTouchEnd(e){
  if(!kDragId) return;
  const touch=e.changedTouches[0];
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  const kc=el?.closest?.('.kc');
  const body=el?.closest?.('.kb-body');
  document.querySelectorAll('.kc-dragging').forEach(c=>c.classList.remove('kc-dragging'));
  document.querySelectorAll('.kb-body.drop-over').forEach(b=>b.classList.remove('drop-over'));
  if(kc&&kc.id!==`kc-${kDragId}`){
    const targetId=kc.id.replace('kc-','');
    const targetSec=kc.dataset.sec;
    const targetCol=kc.dataset.col;
    const cId=kDragId,cSec=kDragSec,cFrom=kDragFromCol;
    kDragId=null;kDragSec=null;kDragFromCol=null;
    kShowSubDlg(cId,cSec,cFrom,targetId,targetSec,targetCol,touch.clientX,touch.clientY);
  } else if(body){const colId=body.id.replace('kb-body-','');kDrop(colId);}
  else{kDragId=null;kDragSec=null;kDragFromCol=null;}
}
function kDrop(toCol){
  if(!kDragId) return;
  const t=ft(kDragId,kDragSec);
  if(!t){kDragId=null;return;}
  const today=new Date().toISOString().split('T')[0];
  const from=kDragFromCol;
  if(toCol===from){kDragId=null;return;}
  if(toCol==='done'){
    if(t.type==='recurring'){
      const interval=t.rInterval||'monthly';let newDue='';
      if(isValidISODate(t.due)){let d=new Date(t.due+'T12:00:00');if(interval==='monthly')d=addMonthsClamped(d,1);else if(interval==='weekly')d.setDate(d.getDate()+7);else if(interval==='quarterly')d=addMonthsClamped(d,3);newDue=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
      const arc=clone(t);arc.id=genId('a');arc.status='Done';arc.kanbanCol='done';
      arc.note=(t.note?t.note+' ':'')+'[completed '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})+']';
      S.sections.find(s=>s.id===kDragSec).tasks.push(arc);
      t.due=newDue;t.status='To Do';t.lastStatusChange=today;t.kanbanCol=null;
      showToast(`🔁 Recurring task completed — next cycle set${newDue?' to '+fd(newDue):''}`);
    } else {
      t.kanbanCol='done';t.status='Done';t.lastStatusChange=today;
      cascadeSubtasksDone(t.id);
      showToast('✓ Done');
    }
  } else if(toCol==='pool'){
    t.kanbanCol=null;
    cascadeKanbanCol(t.id,'pool');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast('Task reopened → Active Pool');}
    else showToast('Returned to Active Pool');
  } else if(toCol==='week'){
    t.kanbanCol='week';
    cascadeKanbanCol(t.id,'week');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast('Task reopened → This Week');}
    else showToast('Moved to This Week');
  } else if(toCol==='today'){
    t.kanbanCol='today';
    cascadeKanbanCol(t.id,'today');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast('Task reopened → Today');}
    else showToast('Moved to Today');
  }
  const evFrom=from||'pool';
  if(toCol==='done') logEvent('done',kDragId,{s:kDragSec,p:t.priority,age:ageDays(t),oc:t.outcomes||[]});
  else if(from==='done') logEvent('reopen',kDragId,{s:kDragSec});
  logEvent('kanban',kDragId,{from:evFrom,to:toCol});
  kDragId=null;kDragSec=null;kDragFromCol=null;
  saveS();renderKanban();renderStats();
}

function kbNewWeek(){
  if(!confirm('Start a new week?\n\nThis will return all This Week and Today tasks to the Active Pool.\nDone tasks are not affected.')) return;
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if((t.kanbanCol==='week'||t.kanbanCol==='today')&&t.status!=='Done'){t.kanbanCol=null;count++;}
  }));
  logEvent('kanban','bulk',{a:'newweek',n:count});
  saveS();renderKanban();renderStats();
  showToast(`New week started — ${count} task${count===1?'':'s'} returned to Active Pool`);
}
function kbClearDone(){
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.kanbanCol==='done'){t.kanbanCol=null;t.status='To Do';t.lastStatusChange=new Date().toISOString().split('T')[0];count++;}
  }));
  logEvent('kanban','bulk',{a:'clear',n:count});
  saveS();renderKanban();renderStats();
  showToast(`↩ ${count} task${count===1?'':'s'} returned to Active Pool`);
}

function setupKbDots(){
  const wrap=document.getElementById('kb-wrap');
  const dotsEl=document.getElementById('kb-dots');
  if(!wrap||!dotsEl) return;
  const cols=wrap.querySelectorAll('.kb-col');
  dotsEl.innerHTML=[...cols].map((_,i)=>`<div class="kb-dot${i===0?' on':''}" onclick="kbScrollTo(${i})"></div>`).join('');
  wrap.onscroll=()=>{
    const idx=Math.round(wrap.scrollLeft/wrap.offsetWidth);
    dotsEl.querySelectorAll('.kb-dot').forEach((d,i)=>d.classList.toggle('on',i===idx));
  };
}
function kbScrollTo(i){
  const wrap=document.getElementById('kb-wrap');
  if(wrap) wrap.scrollTo({left:i*wrap.offsetWidth,behavior:'smooth'});
}

// v7.0 Kanban/subtask new functions
function kCardOver(e){e.preventDefault();e.stopPropagation();e.currentTarget.classList.add('kc-drop-target');}
function kCardDrop(e,tid,tsec,tcol){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.classList.remove('kc-drop-target');
  if(!kDragId||kDragId===tid){kDragId=null;kDragSec=null;kDragFromCol=null;return;}
  const cId=kDragId,cSec=kDragSec,cFrom=kDragFromCol;
  kDragId=null;kDragSec=null;kDragFromCol=null;
  // Dropping onto a done card = complete it directly, no subtask prompt
  if(tcol==='done'){kDragId=cId;kDragSec=cSec;kDragFromCol=cFrom;kDrop('done');return;}
  kShowSubDlg(cId,cSec,cFrom,tid,tsec,tcol,e.clientX,e.clientY);
}
function kShowSubDlg(cId,cSec,cFrom,pId,pSec,tCol,x,y,noLabel,onNo){
  const pt=ft(pId,pSec),ct=ft(cId,cSec);
  if(!pt||!ct) return;
  pendingSubDlg={childId:cId,childSec:cSec,childFromCol:cFrom,parentId:pId,parentSec:pSec,targetCol:tCol,onNo};
  document.getElementById('kbSubDlgTxt').innerHTML=`Make <strong>${escHtml(ct.task)}</strong> a subtask of <strong>${escHtml(pt.task)}</strong>?`;
  document.getElementById('kbSubDlgNoBtn').textContent=noLabel||'No, just move';
  const dlg=document.getElementById('kbSubDlg');
  dlg.style.display='block';
  dlg.style.left=Math.min(x,window.innerWidth-340)+'px';
  dlg.style.top=Math.min(y,window.innerHeight-120)+'px';
}
function kSetSubtask(yes){
  document.getElementById('kbSubDlg').style.display='none';
  if(!pendingSubDlg) return;
  const{childId,childSec,childFromCol,parentId,parentSec,targetCol,onNo}=pendingSubDlg;
  pendingSubDlg=null;
  if(yes){
    const t=ft(childId,childSec);
    if(t){
      t.parent=parentId;
      // auto-move child to parent's column if parent is in week/today
      const p=ft(parentId,parentSec);
      if(p&&(p.kanbanCol==='week'||p.kanbanCol==='today')){
        t.kanbanCol=p.kanbanCol;
        const today=new Date().toISOString().split('T')[0];
        if(t.status==='Done'){t.status='To Do';t.lastStatusChange=today;}
      }
      saveS();renderAll();renderKanban();showToast('Subtask linked');
    }
  } else {
    if(onNo){onNo();}else{kDragId=childId;kDragSec=childSec;kDragFromCol=childFromCol;kDrop(targetCol);}
  }
}
function kMoveCard(id,secId,fromCol,dir){
  const cols=['pool','week','today','done'];
  const ci=cols.indexOf(fromCol);
  const toCol=cols[ci+dir];
  if(!toCol) return;
  kDragId=id;kDragSec=secId;kDragFromCol=fromCol;
  kDrop(toCol);
}
function kToggleStatus(id,secId){
  const t=ft(id,secId); if(!t||t.status==='Done') return;
  const today=new Date().toISOString().split('T')[0];
  const old=t.status;
  t.status=t.status==='In Progress'?'To Do':'In Progress';
  t.lastStatusChange=today;
  logEvent('status',id,{from:old,to:t.status});
  saveS();renderKanban();showToast('Status → '+t.status);
}
// Context menu
function kCtxMenu(e,id,secId,col){
  e.preventDefault();e.stopPropagation();
  ctxTaskId=id;ctxTaskSec=secId;ctxTaskCol=col;ctxView='kanban';
  const t=ft(id,secId);
  const menu=document.getElementById('ctxMenu');
  const cols=['pool','week','today','done'];
  const ci=cols.indexOf(col);
  document.getElementById('ctxMoveLeft').style.display=ci>0?'':'none';
  document.getElementById('ctxMoveRight').style.display=ci<cols.length-1?'':'none';
  document.getElementById('ctxSepNav').style.display='';
  document.getElementById('ctxDone').style.display=t&&t.status!=='Done'?'':'none';
  document.getElementById('ctxBacklog').style.display=t&&t.status!=='Backlog'?'':'none';
  document.getElementById('ctxSepDel').style.display='';
  document.getElementById('ctxDelete').style.display='';
  menu.style.display='block';
  menu.style.left=Math.min(e.clientX,window.innerWidth-170)+'px';
  menu.style.top=Math.min(e.clientY,window.innerHeight-200)+'px';
}
function closeCtxMenu(){ const m=document.getElementById('ctxMenu'); if(m) m.style.display='none'; ctxTaskId=null;ctxTaskSec=null;ctxTaskCol=null; }
function ctxDoAddSub(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; openAddSub(id,sec); }
function ctxDoEdit(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; openEdit(id,sec); }
function ctxDoMove(dir){ const id=ctxTaskId,sec=ctxTaskSec,col=ctxTaskCol; closeCtxMenu(); if(!id) return; kMoveCard(id,sec,col,dir); }
function ctxDoDone(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; togComplete(id,sec); }
function ctxDoBacklog(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; const t=ft(id,sec); if(!t) return; const old=t.status; t.status='Backlog';t.lastStatusChange=new Date().toISOString().split('T')[0];t.kanbanCol=null; logEvent('status',id,{from:old,to:'Backlog'}); saveS();renderAll();showToast('Moved to Backlog'); }
function ctxDoDelete(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; delTask(id,sec); }
function rowCtxMenu(e,id,secId){
  e.preventDefault();e.stopPropagation();
  ctxTaskId=id;ctxTaskSec=secId;ctxTaskCol=null;ctxView='tasks';
  const t=ft(id,secId);
  const menu=document.getElementById('ctxMenu');
  document.getElementById('ctxMoveLeft').style.display='none';
  document.getElementById('ctxMoveRight').style.display='none';
  document.getElementById('ctxSepNav').style.display='none';
  document.getElementById('ctxDone').style.display=t&&t.status!=='Done'?'':'none';
  document.getElementById('ctxBacklog').style.display=t&&t.status!=='Backlog'?'':'none';
  document.getElementById('ctxSepDel').style.display='';
  document.getElementById('ctxDelete').style.display='';
  menu.style.display='block';
  menu.style.left=Math.min(e.clientX,window.innerWidth-180)+'px';
  menu.style.top=Math.min(e.clientY,window.innerHeight-220)+'px';
}
function openAddSub(parentId,parentSec){
  openAdd(parentSec);
  editingParent=parentId;
  let pt=null; S.sections.forEach(s=>s.tasks.forEach(x=>{if(x.id===parentId)pt=x;}));
  if(pt){ document.getElementById('fParentName').textContent=pt.task; document.getElementById('fParentRow').style.display=''; }
}
// Kanban section filter bar
function renderKbFbar(){
  const bar=document.getElementById('kb-fbar'); if(!bar) return;
  let h=`<span class="kb-fpill ${kanbanSectionFilter.has('all')?'on':''}" onclick="setKbFilter('all',event)">All</span>`;
  S.sections.forEach(s=>{ h+=`<span class="kb-fpill ${kanbanSectionFilter.has(s.id)?'on':''}" onclick="setKbFilter('${escJs(s.id)}',event)">${escHtml(s.icon||'')} ${escHtml(s.title.replace(/ — .*/,''))}</span>`; });
  bar.innerHTML=h;
}
function setKbFilter(id,evt){
  const multi=evt&&(evt.ctrlKey||evt.metaKey);
  if(!multi||id==='all'){ kanbanSectionFilter=new Set([id]); }
  else { kanbanSectionFilter.delete('all'); if(kanbanSectionFilter.has(id)) kanbanSectionFilter.delete(id); else kanbanSectionFilter.add(id); if(kanbanSectionFilter.size===0) kanbanSectionFilter=new Set(['all']); }
  renderKbFbar(); renderKanban();
}
function toggleKbGrpPool(){ kanbanGroupPool=!kanbanGroupPool; renderKanban(); }
function toggleKbGrp(secId){ kbCollapsed.has(secId)?kbCollapsed.delete(secId):kbCollapsed.add(secId); renderKanban(); }
function clearEditParent(){ editingParent=null; document.getElementById('fParentRow').style.display='none'; }
function kCancelSubDlg(){ document.getElementById('kbSubDlg').style.display='none'; pendingSubDlg=null; kDragId=null;kDragSec=null;kDragFromCol=null; }

// ═══ ANALYTICS ═══
function setAnalyticsPeriod(p){ analyticsP=p; renderAnalytics(); }

function getAnalyticsPeriodStart(p){
  const now=new Date();
  if(p==='week'){ const d=new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toISOString().split('T')[0]; }
  if(p==='month') return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  if(p==='quarter'){ const q=Math.floor(now.getMonth()/3); return `${now.getFullYear()}-${String(q*3+1).padStart(2,'0')}-01`; }
  if(p==='year') return `${now.getFullYear()}-01-01`;
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
}

function renderBidirChart(rows, maxVal){
  if(!rows.length) return '<div style="color:var(--muted);font-size:12px;padding:8px 0">No data</div>';
  const scale=maxVal||Math.max(1,...rows.map(r=>Math.max(r.open,r.done)));
  const totalOpen=rows.reduce((a,r)=>a+r.open,0);
  const totalDone=rows.reduce((a,r)=>a+r.done,0);
  const header=`<div class="an-bidir-totals">
    <span class="an-bidir-tot-open">◀ Open: <strong>${totalOpen}</strong></span>
    <span class="an-bidir-tot-done">Done: <strong>${totalDone}</strong> ▶</span>
  </div>`;
  const rowsHtml=rows.map(r=>{
    const wO=r.open?Math.max(6,Math.round(r.open/scale*100)):0;
    const wD=r.done?Math.max(6,Math.round(r.done/scale*100)):0;
    const clickAttr=r.onclick?` onclick="${r.onclick}" title="Click to filter"`:'' ;
    return `<div class="an-bidir-row${r.onclick?' btn':''}"${clickAttr}>
      <div class="an-bidir-open-cell">
        <div class="an-bidir-val-l">${r.open}</div>
        <div class="an-bidir-bar-l${r.open===0?' zero':''}" style="width:${r.open?wO:4}%"></div>
      </div>
      <div class="an-bidir-center">${r.icon?r.icon+' ':''}${escHtml(r.name)}</div>
      <div class="an-bidir-done-cell">
        <div class="an-bidir-bar-r${r.done===0?' zero':''}" style="width:${r.done?wD:4}%"></div>
        <div class="an-bidir-val-r">${r.done}</div>
      </div>
    </div>`;
  }).join('');
  return header+rowsHtml;
}

function anGoSec(secId){
  sw('tasks');
  setTimeout(()=>{ const el=document.getElementById('sec-'+secId); if(el) el.scrollIntoView({behavior:'smooth'}); }, 150);
}
function anFilterPerson(name){
  personFilter=[name];
  updatePersonDdLabel();
  sw('tasks');
  setTimeout(()=>applyF(), 100);
}
function getLog(){
  try{
    const raw=localStorage.getItem('focal_log');
    if(!raw) return {events:[],weeks:[]};
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object') return {events:[],weeks:[]};
    if(!Array.isArray(parsed.events)) parsed.events=[];
    if(!Array.isArray(parsed.weeks)) parsed.weeks=[];
    return parsed;
  }catch(err){
    console.warn('Focal: focal_log unreadable — starting fresh', err);
    return {events:[],weeks:[]};
  }
}
// Hard cap: events older than 1y get pruned by computeWeekSummary, but also cap raw count to avoid quota DoS.
const LOG_EVENT_CAP=5000;
function saveLog(log){
  if(log&&Array.isArray(log.events)&&log.events.length>LOG_EVENT_CAP) log.events=log.events.slice(-LOG_EVENT_CAP);
  try{ localStorage.setItem('focal_log',JSON.stringify(log)); }
  catch(err){
    // Quota — trim aggressively and retry once. Log if still failing.
    try{
      log.events=(log.events||[]).slice(-500);
      log.weeks=(log.weeks||[]).slice(-26);
      localStorage.setItem('focal_log',JSON.stringify(log));
    }catch(err2){ console.warn('Focal: analytics log save failed even after trim', err2); }
  }
}
function logEvent(type,id,data){
  const log=getLog();
  log.events.push({t:Math.floor(Date.now()/1000),e:type,id:id||'',d:data||{}});
  saveLog(log);
}

function getISOWeek(d){
  const dt=new Date(d);dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate()+3-(dt.getDay()+6)%7);
  const w1=new Date(dt.getFullYear(),0,4);
  return dt.getFullYear()+'-W'+String(1+Math.round(((dt-w1)/864e5-3+(w1.getDay()+6)%7)/7)).padStart(2,'0');
}

function computeWeekSummary(){
  const log=getLog();
  const now=Math.floor(Date.now()/1000);
  const oneYearAgo=now-365*86400;
  // Purge events older than 1 year
  log.events=log.events.filter(ev=>ev.t>oneYearAgo);
  // Compute current week if not already done
  const curWk=getISOWeek(new Date());
  if(!log.weeks.find(w=>w.wk===curWk)){
    const wkStart=now-((new Date().getDay()+6)%7)*86400;
    const wkEvents=log.events.filter(ev=>ev.t>=wkStart-86400);
    const done=wkEvents.filter(ev=>ev.e==='done').length;
    const created=wkEvents.filter(ev=>ev.e==='create').length;
    const ages=wkEvents.filter(ev=>ev.e==='done'&&ev.d&&ev.d.age).map(ev=>ev.d.age);
    const avgCycle=ages.length?Math.round(ages.reduce((a,b)=>a+b,0)/ages.length*10)/10:0;
    const p1Done=wkEvents.filter(ev=>ev.e==='done'&&ev.d&&ev.d.p==='P1').length;
    const p2Done=wkEvents.filter(ev=>ev.e==='done'&&ev.d&&ev.d.p==='P2').length;
    let stale=0;
    S.sections.forEach(s=>s.tasks.forEach(t=>{
      if(t.status==='Done'||t.status==='Backlog') return;
      if(ageLevel(t)!=='none') stale++;
    }));
    log.weeks.push({wk:curWk,done,created,net:created-done,avgCycle,p1Done,p2Done,stale});
    // Keep only 52 weeks
    if(log.weeks.length>52) log.weeks=log.weeks.slice(-52);
  }
  saveLog(log);
}

function getWeekPulse(){
  const log=getLog();
  const curWk=getISOWeek(new Date());
  const wkStart=Math.floor(Date.now()/1000)-((new Date().getDay()+6)%7)*86400-86400;
  const wkEvents=log.events.filter(ev=>ev.t>=wkStart);
  const done=wkEvents.filter(ev=>ev.e==='done').length;
  const created=wkEvents.filter(ev=>ev.e==='create').length;
  const ages=wkEvents.filter(ev=>ev.e==='done'&&ev.d&&ev.d.age).map(ev=>ev.d.age);
  const avgCycle=ages.length?Math.round(ages.reduce((a,b)=>a+b,0)/ages.length*10)/10:0;
  const p1Done=wkEvents.filter(ev=>ev.e==='done'&&ev.d&&(ev.d.p==='P1'||ev.d.p==='P2')).length;
  let stale=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done'||t.status==='Backlog') return;
    if(ageLevel(t)!=='none') stale++;
  }));
  // 4-week rolling average from stored summaries
  const recent=log.weeks.slice(-5,-1);
  const avg=(key)=>recent.length?Math.round(recent.reduce((a,w)=>a+w[key],0)/recent.length*10)/10:null;
  return {done,created,net:created-done,avgCycle,p1Done,stale,
    avgDone:avg('done'),avgNet:avg('net'),avgCycle4:avg('avgCycle'),avgP1:avg('p1Done'),avgStale:avg('stale')};
}

function deltaHTML(cur,avg,invert){
  if(avg===null||avg===undefined) return '';
  const diff=cur-avg;
  if(Math.abs(diff)<0.5) return '<div class="an-delta flat">— avg</div>';
  const up=diff>0;
  const good=invert?!up:up;
  return `<div class="an-delta ${good?'down':'up'}">${up?'▲':'▼'} ${Math.abs(Math.round(diff*10)/10)} vs avg</div>`;
}

function renderAnalytics(){
  const el=document.getElementById('view-analytics');
  const log=getLog();
  if(log.events.length===0&&log.weeks.length===0){
    el.innerHTML='<div class="an-empty">📈 No analytics data yet.<br><small>Start using Focal — events are logged automatically.</small></div>';
    return;
  }
  const now=Math.floor(Date.now()/1000);
  const thirtyAgo=now-30*86400;
  // Health Snapshot — live state
  let openP1=0,p1Over7=0,stale=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done'||t.status==='Backlog') return;
    if(t.priority==='P1'){openP1++;if(ageDays(t)>7)p1Over7++;}
    if(ageLevel(t)!=='none') stale++;
  }));
  const inboxSize=(S.inbox||[]).length;
  // Weekly review streak — last 4 weeks
  const last4wks=[0,1,2,3].map(i=>getISOWeek(new Date(Date.now()-i*7*86400000)));
  const reviewedWks=new Set(log.events.filter(ev=>ev.e==='review').map(ev=>getISOWeek(new Date(ev.t*1000))));
  const streakDots=last4wks.map(wk=>`<span class="an-dot${reviewedWks.has(wk)?' on':''}" title="${wk}">${reviewedWks.has(wk)?'●':'○'}</span>`).join('');
  const reviewedCount=last4wks.filter(wk=>reviewedWks.has(wk)).length;
  // Focus quality — last 30 days
  const recentDone=log.events.filter(ev=>ev.e==='done'&&ev.t>thirtyAgo);
  const highPriDone=recentDone.filter(ev=>ev.d&&(ev.d.p==='P1'||ev.d.p==='P2')).length;
  const focusPct=recentDone.length?Math.round(highPriDone/recentDone.length*100):null;
  // Open Tasks Breakdown data
  const openByP={P1:0,P2:0,P3:0,P4:0};
  let openOverdue=0;
  const openByPerson={};
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done'||t.status==='Backlog') return;
    openByP[t.priority]=(openByP[t.priority]||0)+1;
    if(ds(t.due)==='u') openOverdue++;
    (t.connections||[]).forEach(c=>{ openByPerson[c]=(openByPerson[c]||0)+1; });
  }));
  const topPeople=Object.entries(openByPerson).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let html=`<div class="an-wrap">
    <div><div class="an-title">📈 Analytics</div><div class="an-sub">Health snapshot · work by area · trends</div></div>
    <div class="an-section">
      <div class="an-section-title">Health Snapshot</div>
      <div class="an-cards">
        <div class="an-card clickable" onclick="statClick('p1')" title="Click to filter P1 tasks"><div class="sn ${openP1>0&&p1Over7>0?'r':openP1>0?'a':'t'}">${openP1}</div><div class="sl">Open P1s</div><div class="an-delta ${p1Over7>0?'up':'flat'}">${p1Over7>0?p1Over7+' over 7d':'all fresh'}</div></div>
        <div class="an-card clickable" onclick="statClick('aging')" title="Click to view stale tasks"><div class="sn ${stale>5?'r':'a'}">${stale}</div><div class="sl">Stale Tasks</div><div class="an-delta flat">${stale>0?'⏱ click to review':'all active'}</div></div>
        <div class="an-card clickable" onclick="sw('inbox')" title="Click to open Inbox"><div class="sn ${inboxSize>10?'r':inboxSize>5?'a':'t'}">${inboxSize}</div><div class="sl">Inbox Items</div><div class="an-delta flat">${inboxSize===0?'inbox zero 🎉':inboxSize>5?'needs triage':''}</div></div>
        <div class="an-card clickable" onclick="sw('review')" title="Click to start Weekly Review"><div class="an-streak">${streakDots}</div><div class="sl">Weekly Review</div><div class="an-delta flat">${reviewedCount}/4 weeks</div></div>
        ${focusPct!==null?`<div class="an-card"><div class="sn ${focusPct>=50?'t':'a'}">${focusPct}%</div><div class="sl">Focus (P1/P2)</div><div class="an-delta flat">of 30d completions</div></div>`:''}
      </div>
    </div>`;
  // Work by Area
  // Work by Area — bi-directional charts with period filter
  const pStart=getAnalyticsPeriodStart(analyticsP);
  const pStartTs=new Date(pStart+'T00:00:00').getTime()/1000;
  const pLabels={week:'This Week',month:'This Month',quarter:'This Quarter',year:'This Year'};
  const periodBtns=['week','month','quarter','year'].map(p=>
    `<button class="an-period-btn${analyticsP===p?' active':''}" onclick="setAnalyticsPeriod('${p}')">${pLabels[p]}</button>`
  ).join('');
  // Done events in selected period — use event log for accurate per-period counts
  const periodDone=log.events.filter(ev=>ev.e==='done'&&ev.t>=pStartTs);
  // Category rows
  const catRows=S.sections.map(s=>({
    name:s.title.replace(/ — .*/,''), icon:s.icon,
    open:s.tasks.filter(t=>t.status!=='Done'&&t.status!=='Backlog').length,
    done:periodDone.filter(ev=>ev.d&&ev.d.s===s.id).length,
    onclick:`anGoSec('${s.id}')`
  })).filter(r=>r.open>0||r.done>0);
  // Priority rows
  const priMap={P1:'p1',P2:'p2',P3:'p3',P4:'p4'};
  const priIcon={P1:'🔴',P2:'🟠',P3:'🔵',P4:'🟢'};
  const priRows=['P1','P2','P3','P4'].map(p=>({
    name:p, icon:priIcon[p],
    open:S.sections.reduce((a,s)=>a+s.tasks.filter(t=>t.priority===p&&t.status!=='Done'&&t.status!=='Backlog').length,0),
    done:periodDone.filter(ev=>ev.d&&ev.d.p===p).length,
    onclick:`statClick('${priMap[p]}')`
  })).filter(r=>r.open>0||r.done>0);
  // People rows — connections not in done events, use task state + lastStatusChange
  const pplMap={};
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    (t.connections||[]).forEach(c=>{
      if(!pplMap[c]) pplMap[c]={open:0,done:0};
      if(t.status!=='Done'&&t.status!=='Backlog') pplMap[c].open++;
      if(t.status==='Done'&&(t.lastStatusChange||'')>=pStart) pplMap[c].done++;
    });
  }));
  const pplRows=Object.entries(pplMap).sort((a,b)=>(b[1].open+b[1].done)-(a[1].open+a[1].done)).slice(0,8).map(([name,v])=>({
    name,icon:'',open:v.open,done:v.done,onclick:`anFilterPerson('${escJs(name)}')`
  }));
  // Shared scale across all three charts
  const globalMax=Math.max(1,...catRows.map(r=>Math.max(r.open,r.done)),...priRows.map(r=>Math.max(r.open,r.done)),...pplRows.map(r=>Math.max(r.open,r.done)));
  html+=`<div class="an-section">
    <div class="an-bidir-header-row">
      <div class="an-section-title" style="margin-bottom:0">Work by Area</div>
      <div class="an-period-filter">${periodBtns}</div>
    </div>
    <div class="an-bidir-legend">
      <span class="an-bidir-leg-open">◀ Open tasks (current)</span>
      <span class="an-bidir-leg-done">Completed this period ▶</span>
    </div>
    ${catRows.length?`<div class="an-bidir-block-title">By Category <span class="an-bidir-click-hint">click row → go to section</span></div><div class="an-bidir-chart">${renderBidirChart(catRows,globalMax)}</div>`:''}
    ${priRows.length?`<div class="an-bidir-block-title" style="margin-top:16px">By Priority <span class="an-bidir-click-hint">click row → filter tasks</span></div><div class="an-bidir-chart">${renderBidirChart(priRows,globalMax)}</div>`:''}
    ${pplRows.length?`<div class="an-bidir-block-title" style="margin-top:16px">By People <span class="an-bidir-click-hint">click row → filter tasks</span></div><div class="an-bidir-chart">${renderBidirChart(pplRows,globalMax)}</div>`:''}
  </div>`;
  // 6-week completed trend
  const weeks=log.weeks.slice(-6);
  if(weeks.length>=1){
    const curWkLabel=getISOWeek(new Date());
    html+=`<div class="an-section"><div class="an-section-title">6-Week Trend — Completed</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">${renderBarChart('Completed',weeks,'done','t',curWkLabel)}</div></div>`;
  }
  // Outcome analytics
  const activeOutcomes=(S.outcomes||[]).filter(o=>o.active);
  if(activeOutcomes.length){
    const last12Weeks=log.weeks.slice(-12);
    // Build per-outcome completion counts from raw events (last 90 days)
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-90);
    const cutoffStr=cutoff.toISOString().split('T')[0];
    const ocCounts={};
    activeOutcomes.forEach(o=>{ ocCounts[o.id]={total:0,byWeek:{}}; });
    log.events.filter(e=>e.e==='done'&&e.t>=(cutoff.getTime()/1000)&&e.d&&e.d.oc&&e.d.oc.length).forEach(e=>{
      const wk=getISOWeek(new Date(e.t*1000));
      (e.d.oc||[]).forEach(oid=>{
        if(!ocCounts[oid]) return;
        ocCounts[oid].total++;
        if(!ocCounts[oid].byWeek[wk]) ocCounts[oid].byWeek[wk]=0;
        ocCounts[oid].byWeek[wk]++;
      });
    });
    const recentWeeks=[];
    for(let i=11;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i*7); recentWeeks.push(getISOWeek(d)); }
    html+=`<div class="an-section"><div class="an-section-title">Completions by Strategic Outcome — last 90 days</div><div class="an-outcome-grid">`;
    activeOutcomes.forEach(o=>{
      const data=ocCounts[o.id]||{total:0,byWeek:{}};
      const maxV=Math.max(1,...recentWeeks.map(w=>data.byWeek[w]||0));
      const bars=recentWeeks.map(w=>{
        const v=data.byWeek[w]||0;
        const h=Math.round((v/maxV)*40)||2;
        return `<div class="an-outcome-bar-w"><div class="an-outcome-bar" style="height:${h}px;background:${o.color};opacity:${v?1:.2}"></div></div>`;
      }).join('');
      html+=`<div class="an-outcome-card"><div class="an-outcome-header"><div class="an-outcome-dot" style="background:${o.color}"></div><div class="an-outcome-name">${escHtml(o.name)}</div><div class="an-outcome-total" style="color:${o.color}">${data.total}</div></div><div class="an-outcome-bars">${bars}</div></div>`;
    });
    html+=`</div></div>`;
  }
  html+=`<div class="an-section" style="display:flex;gap:12px;align-items:center">
    <button class="an-export" onclick="exportAnalytics()">📥 Export Analytics JSON</button>
    <span style="font-size:11px;color:var(--muted)">${log.events.length} events · ${log.weeks.length} week summaries</span>
  </div></div>`;
  el.innerHTML=html;
}

function renderBarChart(title,weeks,key,colorMode,curWk){
  const vals=weeks.map(w=>w[key]||0);
  const maxVal=Math.max(...vals.map(Math.abs),1);
  let bars='';
  weeks.forEach(w=>{
    const v=w[key]||0;
    const h=Math.max(2,Math.round(Math.abs(v)/maxVal*80));
    const isCur=curWk&&w.wk===curWk;
    let cls='an-bar'+(isCur?' cur':'');
    if(colorMode==='net') cls+=v>0?' neg':' green';
    const lbl=`<div class="an-bar-lbl${isCur?' cur':''}">${w.wk.slice(-3)}${isCur?' ←':''}</div>`;
    bars+=`<div class="an-bar-wrap${isCur?' cur':''}"><div class="an-bar-val">${v}</div><div class="${cls}" style="height:${h}px"></div>${lbl}</div>`;
  });
  return `<div class="an-chart" style="flex:1;min-width:240px"><div class="an-chart-title">${title}</div><div class="an-bars">${bars}</div></div>`;
}

function exportAnalytics(){
  const log=getLog();
  const blob=new Blob([JSON.stringify(log,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='focal_analytics_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 Analytics exported');
}

// ── KANBAN COLUMN QUICK-ADD ─────────────────────────────────────────────────
const KB_COL_LABELS={pool:'Active Pool',week:'This Week',today:'Today'};
function kColCtxMenu(e,colId){
  e.preventDefault();e.stopPropagation();
  closeCtxMenu();
  kColMenuCol=colId;
  document.getElementById('kColAddItem').textContent='＋ Add task to '+KB_COL_LABELS[colId];
  const menu=document.getElementById('kColMenu');
  menu.style.display='block';
  menu.style.left=Math.min(e.clientX,window.innerWidth-200)+'px';
  menu.style.top=Math.min(e.clientY,window.innerHeight-60)+'px';
}
function closeKColMenu(){ const m=document.getElementById('kColMenu'); if(m) m.style.display='none'; kColMenuCol=null; }
function kColAddTask(){
  const col=kColMenuCol; closeKColMenu(); if(!col) return;
  newTaskKanbanCol=col==='pool'?null:col;
  openAdd(S.sections[0]?.id);
  document.getElementById('mtitle').textContent='Add Task → '+KB_COL_LABELS[col];
  if(col==='today') document.getElementById('fStat').value='In Progress';
}

// ═══ PEOPLE FILTER ═══
function populatePersonFilter(){
  const menu=document.getElementById('personDdMenu'); if(!menu) return;
  const prevQ=(document.getElementById('personDdSearch')||{}).value||'';
  const groups=(S.personGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const grpNameSet=new Set(groups.map(g=>g.name.toLowerCase()));
  const people=(S.knownConnections||[]).slice().sort().filter(n=>!grpNameSet.has(n.toLowerCase()));
  let h=`<div class="person-dd-search-wrap"><input class="person-dd-search" id="personDdSearch" type="text" placeholder="Search…" autocomplete="off" oninput="filterPersonDd(this.value)" onclick="event.stopPropagation()"></div>`;
  if(groups.length){
    h+=`<div class="person-dd-grp-hdr" data-sec="grp-hdr">Groups</div>`;
    groups.forEach(g=>{
      const sel=personFilter.includes(g.name);
      h+=`<label class="person-dd-item" data-name="${escAttr(g.name.toLowerCase())}" data-type="group"><input type="checkbox" ${sel?'checked':''} onchange="setPersonFilter('${escAttr(g.name)}')"><span>⬡ ${escHtml(g.name)}</span><span style="font-size:11px;color:var(--muted);margin-left:auto;padding-left:6px">${(g.members||[]).length} people</span></label>`;
    });
    if(people.length) h+=`<div class="person-dd-sep" data-sec="sep"></div><div class="person-dd-grp-hdr" data-sec="ind-hdr">Individuals</div>`;
  }
  people.forEach(n=>{
    const sel=personFilter.includes(n);
    h+=`<label class="person-dd-item" data-name="${escAttr(n.toLowerCase())}" data-type="person"><input type="checkbox" ${sel?'checked':''} onchange="setPersonFilter('${escAttr(n)}')"><span>${escHtml(n)}</span></label>`;
  });
  if(personFilter.length) h+=`<div class="person-dd-clear"><button onclick="clearPersonFilter()">✕ Clear filter</button></div>`;
  menu.innerHTML=h;
  const srch=document.getElementById('personDdSearch');
  if(srch){ srch.value=prevQ; if(prevQ) filterPersonDd(prevQ); }
  updatePersonDdLabel();
}
function togglePersonDd(){
  const menu=document.getElementById('personDdMenu'); if(!menu) return;
  const open=menu.style.display!=='none'&&menu.style.display!=='';
  if(open){ menu.style.display='none'; return; }
  const btn=document.getElementById('personDdBtn');
  if(btn){ const r=btn.getBoundingClientRect(); menu.style.top=(r.bottom+4)+'px'; menu.style.left=r.left+'px'; }
  populatePersonFilter();
  menu.style.display='block';
  setTimeout(()=>{ const s=document.getElementById('personDdSearch'); if(s) s.focus(); },30);
}
function setPersonFilter(name){
  const idx=personFilter.indexOf(name);
  if(idx>-1) personFilter.splice(idx,1); else personFilter.push(name);
  populatePersonFilter();
  applyF();
}
function clearPersonFilter(){
  personFilter=[];
  const menu=document.getElementById('personDdMenu'); if(menu) menu.style.display='none';
  updatePersonDdLabel();
  applyF();
}
function updatePersonDdLabel(){
  const btn=document.getElementById('personDdBtn'); if(!btn) return;
  if(!personFilter.length){ btn.textContent='👤 All People'; btn.classList.remove('active'); return; }
  if(personFilter.length===1){ btn.textContent='👤 '+personFilter[0]; btn.classList.add('active'); return; }
  btn.textContent=`👤 ${personFilter.length} people`; btn.classList.add('active');
}
function filterPersonDd(q){
  const menu=document.getElementById('personDdMenu'); if(!menu) return;
  const lq=q.toLowerCase().trim();
  let grpVis=0, indVis=0;
  menu.querySelectorAll('.person-dd-item[data-name]').forEach(el=>{
    const match=!lq||el.dataset.name.includes(lq);
    el.style.display=match?'':'none';
    if(match){ if(el.dataset.type==='group') grpVis++; else indVis++; }
  });
  const get=s=>menu.querySelector(`[data-sec="${s}"]`);
  const grpHdr=get('grp-hdr'), indHdr=get('ind-hdr'), sep=get('sep');
  if(grpHdr) grpHdr.style.display=grpVis?'':'none';
  if(indHdr) indHdr.style.display=indVis?'':'none';
  if(sep) sep.style.display=(grpVis&&indVis)?'':'none';
  let nm=menu.querySelector('.person-dd-no-match');
  if(!grpVis&&!indVis&&lq){
    if(!nm){ nm=document.createElement('div'); nm.className='person-dd-no-match'; nm.textContent='No match'; menu.insertBefore(nm,menu.querySelector('.person-dd-clear')||null); }
  } else { if(nm) nm.remove(); }
}

// ═══ DECISION TYPE ═══
function onTypeChange(){
  const v=document.getElementById('fType').value;
  document.getElementById('fDecidedRow').style.display=v==='decision'?'':'none';
  const riEl=document.getElementById('fRInterval'); if(riEl) riEl.closest('.fg').style.display=v==='recurring'?'':'none';
}
function togDecided(id,secId){
  const t=ft(id,secId); if(!t) return;
  t.decided=!t.decided;
  logEvent('decision',id,{decided:t.decided});
  saveS(); renderAll(); showToast(t.decided?'⚖️ Decision marked as decided':'⚖️ Decision pending');
}

// ═══ ICONS ═══
// Vendored Lucide-style line icons. 24x24 viewBox, currentColor stroke.
// Add new icons here by name; pass into icon(name,size,stroke) helper.
const _ICONS={
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkles:'<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  palette:'<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  close:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  unlink:'<path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/>',
};
function icon(name,size,stroke){
  size=size||16; stroke=stroke||1.75;
  const path=_ICONS[name];
  if(!path) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

// ═══ SETTINGS ═══
// Sidebar nav structure (v10.5 redesign).
const _SETTINGS_GROUPS=[
  { id:'workspace', title:'Workspace', items:[
    { id:'categories', label:'Categories', icon:'tag',     desc:'Sections and quick-add'},
    { id:'people',     label:'People',     icon:'users',   desc:'Connections and groups'},
    { id:'outcomes',   label:'Outcomes',   icon:'target',  desc:'Strategic outcomes your tasks contribute to'},
  ]},
  { id:'intelligence', title:'Intelligence', items:[
    { id:'ai',    label:'AI',          icon:'sparkles', desc:'Anthropic API key and model'},
    { id:'email', label:'Task Feed',   icon:'inbox',    desc:'External JSON file feeding the Inbox'},
  ]},
  { id:'system', title:'System', items:[
    { id:'data',       label:'Backup', icon:'database', desc:'Backup, restore, and auto-save'},
    { id:'appearance', label:'Theme',  icon:'palette',  desc:'Appearance, density, motion'},
  ]},
];
const _SETTINGS_FLAT=_SETTINGS_GROUPS.flatMap(g=>g.items);
const _findSetting=id=>_SETTINGS_FLAT.find(s=>s.id===id);

let _settingsTab='categories';

function _renderSettingsNav(){
  const el=document.getElementById('fcl-nav-groups'); if(!el) return;
  el.innerHTML=_SETTINGS_GROUPS.map(g=>`
    <div class="fcl-group">
      <div class="fcl-group-label">${escHtml(g.title)}</div>
      ${g.items.map(it=>`<button class="fcl-nav-item ${it.id===_settingsTab?'on':''}" data-tab="${escAttr(it.id)}" onclick="switchSettingsTab('${escJs(it.id)}')" aria-current="${it.id===_settingsTab?'page':'false'}"><span class="fcl-nav-icon">${icon(it.icon,16)}</span><span>${escHtml(it.label)}</span></button>`).join('')}
    </div>
  `).join('');
  // brand + close icons
  document.getElementById('fcl-brand-icon').innerHTML=icon('settings',16);
  document.getElementById('fcl-close-btn').innerHTML=icon('close',16,2);
  document.getElementById('fcl-footer-ver').textContent='Focal v'+(typeof VER!=='undefined'?VER:'');
}
function _updateSettingsHeader(){
  const it=_findSetting(_settingsTab); if(!it) return;
  document.getElementById('fcl-section-icon').innerHTML=icon(it.icon,18,2);
  document.getElementById('fcl-section-name').textContent=it.label;
  document.getElementById('fcl-section-desc').textContent=it.desc||'';
}

function openSettingsPanel(tab){
  tab=tab||(S.settings&&S.settings.lastSettingsTab)||'categories';
  if(!_findSetting(tab)) tab='categories';
  renderSecMgr();
  renderPeopleTab();
  renderOutcomesTab();
  switchSettingsTab(tab);
  _renderSettingsNav();
  document.getElementById('settingsOvl').classList.add('on');
}
function switchSettingsTab(tab){
  _settingsTab=tab;
  ['categories','people','ai','outcomes','email','appearance','data'].forEach(t=>{
    const body=document.getElementById('stab-body-'+t); if(body) body.style.display=t===tab?'':'none';
  });
  // update sidebar active state in place (avoids full nav re-render)
  document.querySelectorAll('.fcl-nav-item').forEach(b=>{
    const on=b.dataset.tab===tab;
    b.classList.toggle('on',on);
    b.setAttribute('aria-current',on?'page':'false');
  });
  _updateSettingsHeader();
  if(tab==='ai') renderAiTab();
  if(tab==='email') renderEmailSettingsTab();
  if(tab==='appearance') renderAppearanceTab();
  if(tab==='data') renderDataTab();
  // persist last-opened tab
  if(!S.settings) S.settings={};
  if(S.settings.lastSettingsTab!==tab){ S.settings.lastSettingsTab=tab; saveS(); }
}
function openSettings(){ openSettingsPanel(); }
function closeSettings(){
  document.getElementById('settingsOvl').classList.remove('on');
  rebuildSecDropdown(); renderAll(); applyF(); renderMatrixFilter();
}
function settingsOvlClose(e){ if(e.target===document.getElementById('settingsOvl')) closeSettings(); }

// AI tab — renders the FieldRow form. Show/hide password, Test, Save inline.
function renderAiTab(){
  const el=document.getElementById('aiSettingsBody'); if(!el) return;
  const s=S.settings||{};
  const key=s.claudeKey||'';
  const model=s.aiModel||'claude-haiku-4-5-20251001';
  el.innerHTML=`
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">Provider</div>
        <div class="fcl-fieldrow-hint">Where Focal sends AI prompts. Anthropic only for now.</div>
      </div>
      <div><select class="fcl-input" style="max-width:320px" disabled><option>Anthropic — Claude</option></select></div>
    </div>
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">API key<span class="req">*</span></div>
        <div class="fcl-fieldrow-hint">Stored locally in your browser. Never sent to Focal servers. Get a key at console.anthropic.com.</div>
      </div>
      <div>
        <div style="display:flex;gap:6px;align-items:center;max-width:420px">
          <input class="fcl-input" id="fApiKey" type="password" placeholder="sk-ant-…" autocomplete="off" value="${escAttr(key)}" oninput="_aiDirty()">
          <button class="fcl-btn fcl-btn--ghost" type="button" id="fApiKeyEye" onclick="_aiToggleKeyVis()" aria-label="Show/hide API key" style="padding:8px 10px">${icon('eye',16)}</button>
        </div>
        <div id="aiKeyStatus" style="font-size:12px;padding:8px 12px;border-radius:6px;margin-top:8px;display:none"></div>
      </div>
    </div>
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">Model</div>
        <div class="fcl-fieldrow-hint">Haiku is faster and cheaper. Sonnet handles harder structuring.</div>
      </div>
      <div>
        <select class="fcl-input" id="fAiModel" style="max-width:420px" onchange="_aiDirty()">
          <option value="claude-haiku-4-5-20251001"${model==='claude-haiku-4-5-20251001'?' selected':''}>Claude Haiku 4.5 — Fast &amp; economical (recommended)</option>
          <option value="claude-sonnet-4-6"${model==='claude-sonnet-4-6'?' selected':''}>Claude Sonnet 4.6 — Higher quality</option>
        </select>
      </div>
    </div>
    <div class="fcl-fieldrow" style="border-bottom:0">
      <div>
        <div class="fcl-fieldrow-label">Actions</div>
        <div class="fcl-fieldrow-hint">Test verifies the key connects to Anthropic. Save persists locally.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="fcl-btn" type="button" onclick="testApiKey()">${icon('check',14)} Test connection</button>
        <button class="fcl-btn fcl-btn--primary" type="button" onclick="saveSettings()">${icon('save',14)} Save</button>
      </div>
    </div>
  `;
}
function _aiToggleKeyVis(){
  const inp=document.getElementById('fApiKey'); if(!inp) return;
  const btn=document.getElementById('fApiKeyEye');
  if(inp.type==='password'){ inp.type='text'; btn.innerHTML=icon('eyeoff',16); }
  else { inp.type='password'; btn.innerHTML=icon('eye',16); }
}
function _aiDirty(){ /* placeholder for future "unsaved changes" affordance */ }
function saveSettings(){
  if(!S.settings) S.settings={};
  S.settings.claudeKey=document.getElementById('fApiKey').value.trim();
  S.settings.aiModel=document.getElementById('fAiModel').value;
  saveS();
  const hasKey=!!S.settings.claudeKey;
  syncAiVisibility();
  showToast(hasKey?'✓ AI settings saved':'⚠ No API key — AI features disabled');
}

// People manager
function renderPeopleTab(){
  const body=document.getElementById('peopleMgrBody'); if(!body) return;
  // Auto-remove any individual whose name matches a group name
  const groupNames=new Set((S.personGroups||[]).map(g=>g.name.toLowerCase()));
  const before=S.knownConnections.length;
  S.knownConnections=(S.knownConnections||[]).filter(n=>!groupNames.has(n.toLowerCase()));
  if(S.knownConnections.length!==before) saveS();
  const all=S.knownConnections.slice().sort();
  const groups=(S.personGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const letters=[...new Set(all.map(n=>n[0]?.toUpperCase()).filter(Boolean))].sort();
  const showAlpha=letters.length>5;
  const alphaBar=showAlpha?`<div class="ppl-alpha-bar"><button class="ppl-alpha-btn${!_pplLetter?' on':''}" onclick="setPplLetter('')">All</button>${letters.map(l=>`<button class="ppl-alpha-btn${_pplLetter===l?' on':''}" onclick="setPplLetter('${l}')">${l}</button>`).join('')}</div>`:'';
  const filtered=(_pplLetter&&showAlpha)?all.filter(n=>n[0]?.toUpperCase()===_pplLetter):all;
  const rows=filtered.length?filtered.map(n=>`<div class="ppl-row"><span class="ppl-name">${escHtml(n)}</span><button class="ppl-del" onclick="deletePerson('${escAttr(n)}')" title="Remove">×</button></div>`).join('')
    :(all.length?`<div style="padding:12px 20px;color:var(--muted);font-size:13px">No people starting with "${_pplLetter}".</div>`:`<div style="padding:12px 20px;color:var(--muted);font-size:13px">No people yet — add someone below.</div>`);
  let gh=`<div class="ppl-grp-hdr">Groups <button class="bsec" style="font-size:11px;padding:2px 8px;margin-left:6px" onclick="openAddGroup()">+ Add Group</button></div>`;
  groups.forEach(g=>{
    const isEdit=_editGrpId===g.id;
    gh+=`<div class="ppl-grp-row"><div class="ppl-grp-top">
      <span class="ppl-grp-name">⬡ ${escHtml(g.name)}</span>
      <span style="flex:1;font-size:11px;color:var(--muted);padding:0 8px">${(g.members||[]).join(', ')||'<em>no members</em>'}</span>
      <div class="ppl-grp-actions">
        <button onclick="toggleGrpEdit('${escAttr(g.id)}')" title="${isEdit?'Close':'Edit members'}">${isEdit?'✕ Close':'✎ Edit'}</button>
        <button onclick="deleteGroup('${escAttr(g.id)}')" title="Delete group">🗑</button>
      </div>
    </div>`;
    if(isEdit){
      const chips=all.map(n=>{const sel=(_newGrpMembers||[]).includes(n);return `<span class="ppl-grp-member-chip${sel?' sel':''}" onclick="toggleGrpMember('${escAttr(g.id)}','${escAttr(n)}')">${escHtml(n)}</span>`;}).join('');
      gh+=`<div class="ppl-grp-edit"><div style="font-size:11px;color:var(--muted);margin-bottom:6px">Click to toggle members — changes save immediately:</div><div class="ppl-grp-members-checkboxes">${chips}</div></div>`;
    }
    gh+=`</div>`;
  });
  if(!groups.length&&_editGrpId!=='__new__') gh+=`<div style="padding:8px 20px;color:var(--muted);font-size:12px">No groups yet. Groups let you filter by team — e.g. "Leadership Team" = Alice, Bob, Carol…</div>`;
  if(_editGrpId==='__new__'){
    const chips=all.map(n=>{const sel=(_newGrpMembers||[]).includes(n);return `<span class="ppl-grp-member-chip${sel?' sel':''}" onclick="toggleNewGrpMember('${escAttr(n)}')">${escHtml(n)}</span>`;}).join('');
    gh+=`<div class="ppl-grp-row"><div class="ppl-grp-edit">
      <input class="fi" id="pplGrpNameInp" placeholder="Group name (e.g. MT)" value="${escAttr(_newGrpName)}" oninput="_newGrpName=this.value" onkeydown="if(event.key==='Enter')saveNewGroup()" style="margin-bottom:8px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Select members:</div>
      <div class="ppl-grp-members-checkboxes">${chips}</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="bpri" onclick="saveNewGroup()">Save Group</button><button class="bsec" onclick="cancelAddGroup()">Cancel</button></div>
    </div></div>`;
  }
  body.innerHTML=alphaBar+rows+`<div class="ppl-add-row"><input class="fi" id="pplAddInp" placeholder="Add person or organization…" onkeydown="if(event.key==='Enter')addPerson()"><button class="bpri" style="flex-shrink:0" onclick="addPerson()">+ Add</button></div>`+gh;
}
function setPplLetter(l){ _pplLetter=l; renderPeopleTab(); }
function addPerson(){
  const inp=document.getElementById('pplAddInp'); if(!inp) return;
  const name=(inp.value||'').trim(); if(!name) return;
  if((S.personGroups||[]).some(g=>g.name.toLowerCase()===name.toLowerCase())){
    showToast(`"${name}" is already a group — add individual members instead`); return;
  }
  if(!S.knownConnections) S.knownConnections=[];
  if(!S.knownConnections.includes(name)){ S.knownConnections.push(name); saveS(); populatePersonFilter(); }
  inp.value=''; renderPeopleTab(); document.getElementById('pplAddInp')?.focus();
}
function deletePerson(name){
  S.knownConnections=(S.knownConnections||[]).filter(n=>n!==name);
  personFilter=personFilter.filter(f=>f!==name);
  saveS(); populatePersonFilter(); renderPeopleTab(); applyF();
}
function openAddGroup(){ _editGrpId='__new__'; _newGrpMembers=[]; _newGrpName=''; renderPeopleTab(); setTimeout(()=>document.getElementById('pplGrpNameInp')?.focus(),50); }
function cancelAddGroup(){ _editGrpId=null; _newGrpMembers=[]; _newGrpName=''; renderPeopleTab(); }
function toggleNewGrpMember(name){ const inp=document.getElementById('pplGrpNameInp'); if(inp) _newGrpName=inp.value; const i=_newGrpMembers.indexOf(name); if(i>-1) _newGrpMembers.splice(i,1); else _newGrpMembers.push(name); renderPeopleTab(); }
function saveNewGroup(){
  const inp=document.getElementById('pplGrpNameInp');
  const name=((inp&&inp.value)||_newGrpName).trim(); if(!name){ inp?.focus(); return; }
  if(!S.personGroups) S.personGroups=[];
  if(S.personGroups.find(g=>g.name.toLowerCase()===name.toLowerCase())){ showToast('A group with that name already exists'); return; }
  S.personGroups.push({id:genId('grp'),name,members:[..._newGrpMembers]});
  S.knownConnections=(S.knownConnections||[]).filter(n=>n.toLowerCase()!==name.toLowerCase());
  _editGrpId=null; _newGrpMembers=[]; _newGrpName='';
  saveS(); populatePersonFilter(); renderPeopleTab(); showToast('Group "'+name+'" created');
}
function toggleGrpEdit(id){
  if(_editGrpId===id){ _editGrpId=null; _newGrpMembers=[]; }
  else { _editGrpId=id; const g=(S.personGroups||[]).find(x=>x.id===id); _newGrpMembers=g?[...(g.members||[])]:[];  }
  renderPeopleTab();
}
function toggleGrpMember(grpId,name){
  const g=(S.personGroups||[]).find(x=>x.id===grpId); if(!g) return;
  if(!g.members) g.members=[];
  const i=g.members.indexOf(name);
  if(i>-1) g.members.splice(i,1); else g.members.push(name);
  _newGrpMembers=[...g.members];
  saveS(); populatePersonFilter(); renderPeopleTab();
}
function deleteGroup(id){
  const grp=(S.personGroups||[]).find(g=>g.id===id);
  if(grp) personFilter=personFilter.filter(f=>f!==grp.name);
  S.personGroups=(S.personGroups||[]).filter(g=>g.id!==id);
  if(_editGrpId===id){ _editGrpId=null; _newGrpMembers=[]; }
  saveS(); populatePersonFilter(); renderPeopleTab(); applyF();
}
async function testApiKey(){
  const key=document.getElementById('fApiKey').value.trim();
  const model=document.getElementById('fAiModel').value;
  const st=document.getElementById('aiKeyStatus');
  if(!key){ st.textContent='Enter an API key first.'; st.style.display='block'; st.style.background='var(--p1bg)'; st.style.color='var(--p1)'; return; }
  st.textContent='Testing…'; st.style.display='block'; st.style.background='var(--bg)'; st.style.color='var(--muted)';
  const result=await _claudeRaw(key,model,[{role:'user',content:'Reply with just the word OK.'}],10);
  if(result&&result.toLowerCase().includes('ok')){ st.textContent='✓ Connection successful!'; st.style.background='var(--p4bg)'; st.style.color='var(--p4)'; }
  else { st.textContent='✗ Connection failed — check your key.'; st.style.background='var(--p1bg)'; st.style.color='var(--p1)'; }
}

// ═══ AI CORE ═══
async function _claudeRaw(key,model,messages,maxTokens=500,system=''){
  try{
    const body={model,max_tokens:maxTokens,messages};
    if(system) body.system=system;
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify(body)
    });
    if(!resp.ok) return null;
    const d=await resp.json(); return d.content&&d.content[0]&&d.content[0].text||null;
  } catch{ return null; }
}
async function callClaude(messages,maxTokens=500,system=''){
  const s=S.settings||{}; const key=s.claudeKey; const model=s.aiModel||'claude-haiku-4-5-20251001';
  if(!key){ showToast('⚠ Add your API key in AI Settings (🤖)'); openSettings(); return null; }
  return _claudeRaw(key,model,messages,maxTokens,system);
}

// ═══ NL CAPTURE (B.1) ═══
function _nlContext(){
  const today=new Date().toISOString().split('T')[0];
  const sections=(S.sections||[]).map(s=>`${s.id}:${s.title}`).join(',');
  const conns=(S.knownConnections||[]).slice(0,20).join(',');
  const outcomes=(S.outcomes||[]).filter(o=>o.active).map(o=>`${o.id}:${o.name}`).join(',');
  return {today,sections,conns,outcomes};
}
function _nlCtxStr({today,sections,conns,outcomes}){
  let s=`Today:${today} Sections:${sections}`;
  if(conns) s+=`\nConnections:${conns}`;
  if(outcomes) s+=`\nOutcomes:${outcomes}`;
  return s;
}

function _nlApplyToModal(p,fallbackText){
  if(p.section) document.getElementById('fSec').value=p.section;
  document.getElementById('fPri').value=p.priority||'P2';
  document.getElementById('fStat').value='To Do';
  document.getElementById('fType').value=p.type||'once';
  document.getElementById('fUrg').value=String(p.urgent||0);
  if(p.due) document.getElementById('fDue').value=p.due;
  modalConns=(p.connections||[]).filter(c=>(S.knownConnections||[]).includes(c)); renderConnChips();
  modalOutcomes=(p.outcomes||[]).filter(o=>(S.outcomes||[]).some(x=>x.id===o&&x.active)); renderModalOutcomes();
}

async function nlCapture(){
  const inp=document.getElementById('ixCapText'); const btn=document.getElementById('aiCapBtn');
  const raw_val=(inp&&inp.value||'').trim(); if(!raw_val) return;
  const lines=raw_val.split('\n').map(l=>l.trim()).filter(Boolean);
  if(lines.length>1){ await nlBatchCapture(lines,btn); return; }
  // single-line — but description may imply multiple tasks, so allow either format back
  const text=lines[0];
  btn.disabled=true; btn.classList.add('loading'); btn.textContent='Parsing…';
  const ctx=_nlContext();
  const sys=`Return JSON only. Schema:{task,note,section,priority(P1/P2/P3/P4),due(YYYY-MM-DD|null),connections[],outcomes[],type(once|recurring|decision),urgent(0|1)}. One task→object. Multiple tasks→array with parentTask(title|null) added.`;
  const prompt=`${_nlCtxStr(ctx)}\n\nInput:"${text}"`;
  const rawRes=await callClaude([{role:'user',content:prompt}],600,sys);
  btn.disabled=false; btn.classList.remove('loading'); btn.textContent='✨ AI → Task';
  if(!rawRes){ showToast('AI parse failed — check API key'); return; }
  try{
    // Try array first (multi-task response), then single object
    const arrJson=rawRes.match(/\[[\s\S]*\]/)?.[0];
    if(arrJson){
      const tasks=JSON.parse(arrJson);
      if(Array.isArray(tasks)&&tasks.length>0){
        nlBatchShowPreview(tasks,1);
        inp.value=''; inp.style.height='auto';
        return;
      }
    }
    const objJson=rawRes.match(/\{[\s\S]*\}/)?.[0]; if(!objJson) throw new Error('no json');
    const p=JSON.parse(objJson);
    openAdd(p.section||S.sections[0]?.id);
    document.getElementById('fTask').value=p.task||text;
    document.getElementById('fNote').value=p.note||'';
    _nlApplyToModal(p,text);
    inp.value=''; inp.style.height='auto';
    showToast('✨ AI parsed — review and save');
  } catch{ showToast('⚠ Could not parse AI response'); }
}

async function nlBatchCapture(lines,btn){
  btn.disabled=true; btn.classList.add('loading'); btn.textContent=`Parsing ${lines.length} tasks…`;
  const ctx=_nlContext();
  const sys=`Return a JSON array only. Each item:{task,parentTask(title|null),note,section,priority(P1/P2/P3/P4),due(YYYY-MM-DD|null),connections[],outcomes[],type(once|recurring|decision),urgent(0|1)}. parentTask=parent title if subtask else null.`;
  const prompt=`${_nlCtxStr(ctx)}\n\nTasks:\n${lines.map((l,i)=>`${i+1}. ${l}`).join('\n')}`;
  const maxTok=Math.min(Math.max(600,lines.length*120),4000);
  const rawRes=await callClaude([{role:'user',content:prompt}],maxTok,sys);
  btn.disabled=false; btn.classList.remove('loading'); btn.textContent='✨ AI → Task';
  if(!rawRes){ showToast('AI parse failed — check API key'); return; }
  try{
    const json=rawRes.match(/\[[\s\S]*\]/)?.[0]; if(!json) throw new Error('no array');
    const tasks=JSON.parse(json); if(!Array.isArray(tasks)||!tasks.length) throw new Error('empty');
    nlBatchShowPreview(tasks,lines.length);
  } catch(err){
    if(err instanceof SyntaxError) showToast(`⚠ Response truncated — try splitting into batches of 25 or fewer tasks`);
    else showToast('⚠ Could not parse AI response');
  }
}

let _nlBatchPending=[];
function nlBatchShowPreview(tasks,inputCount){
  _nlBatchPending=tasks;
  const panel=document.getElementById('nlBatchPreview'); if(!panel) return;
  const priColor={'P1':'var(--p1)','P2':'var(--galaxy)','P3':'var(--amber)','P4':'var(--dim)'};
  const secName=id=>(S.sections||[]).find(s=>s.id===id)?.title||id||'—';
  const items=tasks.map(t=>{
    const sec=escHtml(secName(t.section));
    const due=t.due?`<span class="nb-due">${t.due}</span>`:'';
    const isSub=!!t.parentTask;
    return `<li class="${isSub?'nb-sub':''}">${isSub?'<span class="nb-indent">↳</span>':''}<span class="nb-pri" style="color:${priColor[t.priority]||'var(--dim)'}">${t.priority||'P2'}</span><span class="nb-task">${dT(t.task)}</span><span class="nb-sec">${sec}</span>${due}</li>`;
  }).join('');
  const large=tasks.length>15;
  const hint=large?`<div class="nb-scroll-hint">↕ Scroll to review all ${tasks.length} tasks</div>`:'';
  const warn=inputCount&&tasks.length<inputCount?`<div class="nb-warn">⚠ Input had ${inputCount} lines, AI returned ${tasks.length} tasks — check for merged or dropped items.</div>`:'';
  const hasSubs=tasks.some(t=>t.parentTask);
  const subNote=hasSubs?`<div class="nb-scroll-hint" style="margin-bottom:6px">↳ Indented tasks will be linked as subtasks</div>`:'';
  panel.innerHTML=`<div class="nl-batch-preview"><div class="nl-batch-title">✨ AI found ${tasks.length} task${tasks.length===1?'':'s'} — review and confirm</div>${warn}${subNote}${hint}<ul class="nl-batch-list${large?' nl-batch-scroll':''}">${items}</ul><div class="nl-batch-actions"><button class="ix-add" onclick="nlBatchCreate()">Create ${tasks.length} task${tasks.length===1?'':'s'}</button><button class="bsec" style="font-size:13px" onclick="nlBatchCancel()">Cancel</button></div></div>`;
  panel.style.display='';
}
function nlBatchCancel(){ _nlBatchPending=[]; const p=document.getElementById('nlBatchPreview'); if(p){p.style.display='none';p.innerHTML='';} }
function nlBatchCreate(){
  const tasks=_nlBatchPending; if(!tasks.length) return;
  const today=new Date().toISOString().split('T')[0];
  const titleToId={};
  // First pass: create all tasks
  tasks.forEach(p=>{
    const secId=p.section||S.sections[0]?.id;
    const sec=S.sections.find(s=>s.id===secId)||S.sections[0]; if(!sec) return;
    const newTask={id:genId(sec.id[0]),task:p.task,note:p.note||'',url:'',priority:p.priority||'P2',status:'To Do',due:p.due||'',type:p.type||'once',urgent:p.urgent||0,confidential:false,connections:(p.connections||[]).filter(c=>(S.knownConnections||[]).includes(c)),outcomes:(p.outcomes||[]).filter(o=>(S.outcomes||[]).some(x=>x.id===o&&x.active)),kanbanCol:null,lastStatusChange:today,parent:null};
    sec.tasks.push(newTask);
    titleToId[p.task]=newTask.id;
    logEvent('create',newTask.id,{s:sec.id,p:newTask.priority,oc:newTask.outcomes});
  });
  // Second pass: wire parent links
  tasks.forEach(p=>{
    if(!p.parentTask) return;
    const parentId=titleToId[p.parentTask]; if(!parentId) return;
    const childId=titleToId[p.task]; if(!childId) return;
    S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.id===childId) t.parent=parentId; }));
  });
  const inp=document.getElementById('ixCapText'); if(inp){inp.value='';inp.style.height='auto';}
  nlBatchCancel(); saveS(); renderAll();
  const parentCount=tasks.filter(t=>!t.parentTask).length;
  const subCount=tasks.filter(t=>!!t.parentTask).length;
  showToast(subCount?`✨ ${parentCount} task${parentCount===1?'':'s'} + ${subCount} subtask${subCount===1?'':'s'} created`:`✨ ${tasks.length} task${tasks.length===1?'':'s'} created`);
}

// ═══ NL FILL MODAL (B.3) ═══
async function nlFillModal(){
  const desc=document.getElementById('fTask')?.value.trim();
  if(!desc){ showToast('Enter a task description first'); return; }
  const btn=document.getElementById('modalAiBtn');
  btn.disabled=true; btn.textContent='Filling…';
  const ctx=_nlContext();
  const sys=`Return a JSON object only:{task,note,section,priority(P1/P2/P3/P4),due(YYYY-MM-DD|null),connections[],outcomes[],type(once|recurring|decision),urgent(0|1)}`;
  const prompt=`${_nlCtxStr(ctx)}\n\nTask:"${desc}"`;
  const rawRes=await callClaude([{role:'user',content:prompt}],250,sys);
  btn.disabled=false; btn.textContent='✨ AI-fill';
  if(!rawRes){ showToast('AI fill failed — check API key'); return; }
  try{
    const json=rawRes.match(/\{[\s\S]*\}/)?.[0]; if(!json) throw new Error('no json');
    const p=JSON.parse(json);
    if(p.task) document.getElementById('fTask').value=p.task;
    if(p.note) document.getElementById('fNote').value=p.note;
    _nlApplyToModal(p,desc);
    showToast('✨ Fields filled — review and save');
  } catch{ showToast('⚠ Could not parse AI response'); }
}

// ═══ AI WEEKLY DEBRIEF (B.2) ═══
function triggerWeeklyDebrief(){
  const el=document.getElementById('wrAiDebrief'); if(!el) return;
  el.innerHTML=`<div class="wr-ai-loading">✨ Generating AI debrief…</div>`;
  generateWeeklyDebrief();
}
async function generateWeeklyDebrief(){
  const el=document.getElementById('wrAiDebrief'); if(!el) return;
  const p=getWeekPulse();
  let openP1=0,stale=0,inProg=0,totalOpen=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.status==='Done'||t.status==='Backlog') return;
    totalOpen++; if(t.priority==='P1') openP1++; if(t.status==='In Progress') inProg++;
    if(ageLevel(t)!=='none') stale++;
  }));
  const secSummary=S.sections.map(s=>{
    const open=s.tasks.filter(t=>t.status!=='Done'&&t.status!=='Backlog').length;
    return `${s.title}: ${open} open`;
  }).join('; ');
  const pulse=p?`Completed: ${p.done}, Net flow: ${p.net}, P1/P2 done: ${p.p1Done}, Stale: ${p.stale}`:'No pulse data yet';
  const sys=`You are a concise executive assistant. Write 3-4 flowing sentences (no bullets/headers): what went well, what needs attention, one specific recommendation. Executive tone.`;
  const prompt=`Open:${totalOpen}(${openP1}P1,${inProg}InProg,${stale}aging)\nSections:${secSummary}\nPulse:${pulse}`;
  const key=(S.settings||{}).claudeKey; if(!key) return;
  const result=await _claudeRaw(key,'claude-haiku-4-5-20251001',[{role:'user',content:prompt}],200,sys);
  if(!el) return;
  if(result){ el.innerHTML=`<div class="wr-ai-debrief-hdr">✨ AI Weekly Debrief</div><div class="wr-ai-debrief-body">${escHtml(result)}</div>`; }
  else { el.innerHTML=`<div class="wr-ai-debrief-hdr">✨ AI Weekly Debrief</div><div class="wr-ai-debrief-body" style="color:var(--muted);font-style:italic">Could not generate debrief — check API connection in 🤖 Settings.</div>`; }
}

// ═══ BACKUP ═══
// ════════════════════════════════════════
//  BACKUP / RESTORE — two layers:
//   A) Manual export/import (downloads/uploads .json via browser, works everywhere)
//   B) Auto-save (File System Access API: pick a file once → app writes to it on every change)
//  Auto-save handle is persisted in IndexedDB ('focal_et' DB, key 'focal_backup').
//  bkSync is called after every saveS — debounced to coalesce rapid edits.
// ════════════════════════════════════════
let _bkHandle=null;            // chosen file (if auto-save connected)
let _bkSyncTimer=null;         // debounce timer for bkSync
let _bkLastSyncAt=0;           // epoch ms of last successful auto-save
let _bkLastError='';           // last write error message (surfaced in UI)
const BK_DEBOUNCE_MS=500;

// Sanity-check an imported object before overwriting current state.
// Returns {ok:bool, reason:string} — caller decides whether to proceed.
function bkValidate(obj){
  if(!obj||typeof obj!=='object') return {ok:false,reason:'Not a JSON object'};
  if(!Array.isArray(obj.sections)) return {ok:false,reason:'Missing "sections" array'};
  for(const s of obj.sections){
    if(!s||typeof s!=='object') return {ok:false,reason:'Section is not an object'};
    if(typeof s.id!=='string'||!s.id) return {ok:false,reason:'Section missing id'};
    if(!Array.isArray(s.tasks)) return {ok:false,reason:`Section "${s.id}" missing tasks array`};
  }
  return {ok:true,reason:''};
}

// Build the JSON blob that represents the current snapshot — same shape as the
// stored S object so importing it round-trips cleanly.
function bkSerialize(){ return JSON.stringify(S,null,2); }

// Apply a parsed object as the new state — overwrites localStorage and reloads UI.
function bkApply(obj){
  S=obj;
  // ensure required collections exist after restore from older shape
  if(!S.inbox) S.inbox=[];
  if(!S.settings) S.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'};
  if(!S.knownConnections) S.knownConnections=[];
  if(!S.personGroups) S.personGroups=[];
  if(!S.outcomes) S.outcomes=[];
  saveS();
  applyTheme(); renderAll(); renderMatrixFilter(); populatePersonFilter();
}

// ── A. Manual export ──
function bkExport(){
  try{
    const blob=new Blob([bkSerialize()],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='focal-backup-'+new Date().toISOString().split('T')[0]+'.json';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(a.href); },0);
    logEvent('backup_export','',{bytes:blob.size});
    showToast('💾 Backup exported to Downloads');
  }catch(err){
    console.error('bkExport:',err);
    showToast('⚠️ Export failed — check console');
  }
}

// ── A. Manual import (file input → JSON.parse → validate → apply) ──
function bkImportFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const obj=JSON.parse(reader.result);
      const v=bkValidate(obj);
      if(!v.ok){ showToast('⚠️ Invalid backup file: '+v.reason, 6000); return; }
      const taskCount=obj.sections.reduce((n,s)=>n+s.tasks.length,0);
      const cur=S.sections.reduce((n,s)=>n+s.tasks.length,0);
      if(!confirm(`Restore from this backup?\n\nIncoming: ${obj.sections.length} sections, ${taskCount} tasks\nCurrent:  ${S.sections.length} sections, ${cur} tasks\n\nThis OVERWRITES your current Focal data. A safety copy of your current state will be saved to localStorage as focal_v1_prerestore_<timestamp>.\n\nProceed?`)) return;
      // safety: snapshot current state before clobbering
      try{ localStorage.setItem('focal_v1_prerestore_'+Date.now(), localStorage.getItem('focal_v1')||''); }catch{}
      bkApply(obj);
      logEvent('backup_import','',{tasks:taskCount,sections:obj.sections.length});
      showToast('✓ Backup restored — '+taskCount+' tasks loaded');
      renderDataTab();
    }catch(err){
      console.error('bkImportFile:',err);
      showToast('⚠️ Could not parse JSON — file may be corrupted', 6000);
    }
  };
  reader.onerror=()=>showToast('⚠️ Could not read file');
  reader.readAsText(file);
}

// ── B. Auto-backup: connect, sync, restore via File System Access API ──
const _FSA_SUPPORTED=()=>typeof window.showSaveFilePicker==='function';

async function bkConnect(){
  if(!_FSA_SUPPORTED()){ showToast('Auto-save requires Chrome or Edge — use Export instead', 6000); return; }
  try{
    const handle=await window.showSaveFilePicker({
      suggestedName:'focal-backup.json',
      types:[{description:'Focal Backup',accept:{'application/json':['.json']}}],
      id:'focal-backup', startIn:'documents'
    });
    const db=await etOpenDB();
    await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,'focal_backup');tx.oncomplete=res;tx.onerror=rej;});
    _bkHandle=handle;
    await bkSync(true);
    showToast('✓ Auto-backup connected — saves on every change');
    renderDataTab();
    logEvent('backup_connect','',{});
  }catch(err){
    if(err.name!=='AbortError'){ console.warn('bkConnect:',err); showToast('⚠️ Could not connect backup file'); }
  }
}

async function bkLoadHandle(){
  if(!_FSA_SUPPORTED()) return;
  try{
    const db=await etOpenDB();
    const handle=await new Promise((res,rej)=>{const tx=db.transaction('handles','readonly');const r=tx.objectStore('handles').get('focal_backup');r.onsuccess=e=>res(e.target.result||null);r.onerror=rej;});
    if(!handle){ _bkHandle=null; return; }
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm==='granted'){ _bkHandle=handle; }
    else { _bkHandle=handle; /* will prompt on first write */ }
  }catch(err){ console.warn('bkLoadHandle:',err); _bkHandle=null; }
}

async function bkSync(force){
  if(!_bkHandle) return;
  // debounce
  if(!force){
    clearTimeout(_bkSyncTimer);
    _bkSyncTimer=setTimeout(()=>bkSync(true), BK_DEBOUNCE_MS);
    return;
  }
  try{
    // verify permission still granted (silently re-prompts only if user revoked)
    const perm=await _bkHandle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){ const g=await _bkHandle.requestPermission({mode:'readwrite'}); if(g!=='granted'){ _bkLastError='Permission denied'; renderDataTab(); return; } }
    const w=await _bkHandle.createWritable();
    await w.write(bkSerialize());
    await w.close();
    _bkLastSyncAt=Date.now();
    _bkLastError='';
    renderDataTab();
  }catch(err){
    console.warn('bkSync:',err);
    _bkLastError=err&&err.message?err.message:String(err);
    renderDataTab();
  }
}

async function bkRestoreFromFile(){
  if(!_bkHandle){ showToast('No backup file connected'); return; }
  try{
    const perm=await _bkHandle.queryPermission({mode:'read'});
    if(perm!=='granted'){ const g=await _bkHandle.requestPermission({mode:'read'}); if(g!=='granted'){ showToast('Read permission denied'); return; } }
    const file=await _bkHandle.getFile();
    const txt=await file.text();
    if(!txt.trim()){ showToast('Backup file is empty'); return; }
    const obj=JSON.parse(txt);
    const v=bkValidate(obj);
    if(!v.ok){ showToast('⚠️ Backup file is invalid: '+v.reason, 6000); return; }
    const taskCount=obj.sections.reduce((n,s)=>n+s.tasks.length,0);
    if(!confirm(`Restore from connected backup file?\n\n${obj.sections.length} sections, ${taskCount} tasks will overwrite your current Focal data.\n\nA safety copy will be saved first. Proceed?`)) return;
    try{ localStorage.setItem('focal_v1_prerestore_'+Date.now(), localStorage.getItem('focal_v1')||''); }catch{}
    bkApply(obj);
    showToast('✓ Restored from auto-backup');
    renderDataTab();
  }catch(err){
    console.error('bkRestoreFromFile:',err);
    showToast('⚠️ Restore failed — '+(err.message||err));
  }
}

async function bkDisconnect(){
  try{
    const db=await etOpenDB();
    await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').delete('focal_backup');tx.oncomplete=res;tx.onerror=rej;});
  }catch{}
  _bkHandle=null; _bkLastSyncAt=0; _bkLastError='';
  showToast('Auto-backup disconnected');
  renderDataTab();
}

// Render the Settings → 💾 Data tab body.
function renderDataTab(){
  const el=document.getElementById('dataMgrBody'); if(!el) return;
  const connected=!!_bkHandle;
  const fsaOk=_FSA_SUPPORTED();
  const lastSync=_bkLastSyncAt?new Date(_bkLastSyncAt).toLocaleTimeString():'—';
  const fileName=connected&&_bkHandle.name?escHtml(_bkHandle.name):'(file)';
  let snapshots=[];
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&(k.startsWith('focal_v1_prerestore_')||k.startsWith('focal_v1_corrupted_'))) snapshots.push(k); } }catch{}
  el.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:28px">
      <section>
        <div class="fcl-section-head">
          <div>
            <h3>Manual backup</h3>
            <p>Download a snapshot of your Focal data as JSON, or restore from one. Works in every browser.</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="fcl-btn" type="button" onclick="bkExport()">${icon('download',14)} Export JSON</button>
          <label class="fcl-btn" style="cursor:pointer">${icon('upload',14)} Import JSON<input type="file" accept="application/json,.json" style="display:none" onchange="bkImportFile(this.files[0]);this.value=''"></label>
        </div>
      </section>

      <section class="fcl-card">
        <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <h3 style="margin:0;font-size:15.5px;font-weight:600;color:var(--fcl-text)">Auto-backup</h3>
            ${connected?'<span class="fcl-badge fcl-badge--success fcl-badge--dot">Connected</span>':''}
          </div>
        </header>
        <p style="margin:0 0 14px;color:var(--fcl-text-dim);font-size:13px;max-width:560px;line-height:1.5">Pick a backup file once — Focal saves to it silently on every change. Great paired with a OneDrive, iCloud, or Dropbox folder for cross-device sync.</p>
        ${!fsaOk?`<div class="fcl-badge fcl-badge--warning fcl-badge--dot" style="margin-bottom:14px">Chrome or Edge required for auto-save</div>`:''}
        ${connected?`
          <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;margin-bottom:16px;font-size:12.5px;align-items:center">
            <span style="color:var(--fcl-text-faint)">File</span>
            <span class="fcl-codechip" style="justify-self:start">${fileName}</span>
            <span style="color:var(--fcl-text-faint)">Last save</span>
            <span style="color:var(--fcl-text-dim)">${lastSync}</span>
            ${_bkLastError?`<span style="color:var(--fcl-text-faint)">Last error</span><span style="color:var(--fcl-danger)">${escHtml(_bkLastError)}</span>`:''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="fcl-btn fcl-btn--sm" type="button" onclick="bkSync(true)">${icon('save',14)} Save now</button>
            <button class="fcl-btn fcl-btn--sm" type="button" onclick="bkRestoreFromFile()">${icon('refresh',14)} Restore from file</button>
            <button class="fcl-btn fcl-btn--sm fcl-btn--danger" type="button" onclick="bkDisconnect()" style="margin-left:auto">${icon('unlink',14)} Disconnect</button>
          </div>
        `:`
          <button class="fcl-btn fcl-btn--primary" type="button" ${fsaOk?'':'disabled style="opacity:.5;cursor:not-allowed"'} onclick="bkConnect()">${icon('link',14)} Connect backup file…</button>
        `}
      </section>

      ${snapshots.length?`
        <section>
          <div class="fcl-section-head">
            <div>
              <h3>Safety snapshots</h3>
              <p>Older copies preserved when something went wrong or you ran a restore. Recover via DevTools → Application → Local Storage.</p>
            </div>
          </div>
          <div class="fcl-list" style="padding:0">
            ${snapshots.slice(-5).map(k=>`<div class="fcl-list-row" style="grid-template-columns:1fr"><span class="fcl-codechip" style="font-size:11.5px">${escHtml(k)}</span></div>`).join('')}
          </div>
          ${snapshots.length>5?`<div style="font-size:11px;color:var(--fcl-text-faint);margin-top:6px">+${snapshots.length-5} more</div>`:''}
        </section>
      `:''}
    </div>`;
}

// ═══ EMAIL TASKS ═══
// ════════════════════════════════════════
//  EMAIL TASKS — reads tasks.json via File System Access API
//  File handle persisted in IndexedDB; first use prompts a file picker.
//  Contract: processed_at===null = show to user; set it after triage.
// ════════════════════════════════════════
let _etHandle=null, _etTasks=[], _etPendingId=null;

const ET_CAT_SEC={board:'board',personal:'personal',hr:'team',people:'team'};
const ET_CAT_LABEL={board:'Board',execsearch:'Exec Search',finance:'Finance',sales:'Sales',csm:'CSM',hr:'HR',product:'Product',personal:'Personal',other:'Other'};
const ET_SRC_ICON={email:'📧',teams_chat:'💬',meeting:'📅'};

function etOpenDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('focal_et',1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore('handles');
    req.onsuccess=e=>res(e.target.result);
    req.onerror=e=>rej(e.target.error);
  });
}

async function etLoad(){
  try{
    const db=await etOpenDB();
    const handle=await new Promise((res,rej)=>{const tx=db.transaction('handles','readonly');const r=tx.objectStore('handles').get('email_tasks');r.onsuccess=e=>res(e.target.result||null);r.onerror=rej;});
    if(!handle){_etHandle=null;_etTasks=[];renderEmailTasks();return;}
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm==='denied'){_etHandle=null;_etTasks=[];renderEmailTasks();return;}
    if(perm==='prompt'){const g=await handle.requestPermission({mode:'readwrite'});if(g!=='granted'){_etHandle=null;_etTasks=[];renderEmailTasks();return;}}
    _etHandle=handle;
    const file=await handle.getFile();
    const all=JSON.parse(await file.text());
    _etTasks=all.filter(t=>t.processed_at===null);
    updateInboxBadge();
    renderEmailTasks();
  }catch(err){console.warn('etLoad:',err);_etTasks=[];renderEmailTasks();}
}

async function etConnect(){
  try{
    const [handle]=await window.showOpenFilePicker({types:[{description:'JSON Tasks File',accept:{'application/json':['.json']}}],id:'focal-email-tasks',startIn:'documents'});
    const db=await etOpenDB();
    await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,'email_tasks');tx.oncomplete=res;tx.onerror=rej;});
    _etHandle=handle;
    await etLoad();
  }catch(err){if(err.name!=='AbortError') console.warn('etConnect:',err);}
}

async function etWriteBack(all){
  if(!_etHandle) return;
  try{const w=await _etHandle.createWritable();await w.write(JSON.stringify(all,null,2));await w.close();}
  catch(err){console.warn('etWriteBack:',err);}
}

async function etMarkProcessed(taskId){
  if(!_etHandle) return;
  try{
    const file=await _etHandle.getFile();
    const all=JSON.parse(await file.text());
    const now=new Date().toLocaleString('sv-SE',{timeZone:'Europe/Amsterdam',hour12:false}).replace(' ','T')+'+02:00';
    const t=all.find(x=>x.task_id===taskId);
    if(t) t.processed_at=now;
    await etWriteBack(all);
    _etTasks=_etTasks.filter(x=>x.task_id!==taskId);
    updateInboxBadge();
    renderEmailTasks();
  }catch(err){console.warn('etMarkProcessed:',err);}
}

async function etSkip(taskId){
  if(!_etHandle) return;
  try{
    const file=await _etHandle.getFile();
    const all=JSON.parse(await file.text());
    const now=new Date().toLocaleString('sv-SE',{timeZone:'Europe/Amsterdam',hour12:false}).replace(' ','T')+'+02:00';
    const t=all.find(x=>x.task_id===taskId);
    if(t){t.processed_at=now;t.status='dismissed';}
    await etWriteBack(all);
    _etTasks=_etTasks.filter(x=>x.task_id!==taskId);
    updateInboxBadge();
    renderEmailTasks();
    showToast('Email task skipped');
  }catch(err){showToast('Could not update tasks file');console.warn('etSkip:',err);}
}

function etAddTask(taskId){
  const t=_etTasks.find(x=>x.task_id===taskId); if(!t) return;
  const secId=ET_CAT_SEC[t.category]||S.sections[0]?.id||'monthly';
  const pri=t.priority==='high'?'P1':t.priority==='medium'?'P2':'P3';
  const src=t.source_type||'email';
  const note=src==='meeting'?`Meeting prep: "${t.source_subject}"`:src==='teams_chat'?`Teams msg from: ${t.asker} · "${t.source_subject}"`:`From: ${t.asker} · "${t.source_subject}"`;
  _etPendingId=taskId;
  openAdd(secId);
  document.getElementById('fTask').value=t.task;
  document.getElementById('fPri').value=pri;
  if(t.deadline) document.getElementById('fDue').value=t.deadline;
  document.getElementById('fNote').value=note;
  if(t.priority==='high') document.getElementById('fUrg').value='1';
}

function renderEmailSettingsTab(){
  const el=document.getElementById('emailSettingsBody'); if(!el) return;
  const helpLink=`<a href="Focal_USER_MANUAL.html#task-import" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none;margin-left:auto">? How does this work</a>`;
  if(_etHandle){
    el.innerHTML=`<div class="fg"><div style="display:flex;align-items:center;margin-bottom:4px"><label class="fl" style="margin:0">Connected file</label>${helpLink}</div><div style="display:flex;align-items:center;gap:10px;margin-top:4px"><span style="font-size:13px;color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(_etHandle.name)}</span><button class="bsec" onclick="etConnect()">Change File</button><button class="bsec" style="color:var(--p1);border-color:var(--p1)" onclick="etDisconnect()">Disconnect</button></div><small style="font-size:11px;color:var(--muted);margin-top:6px;display:block">Focal reads this file on every Inbox visit and writes processed_at timestamps back after each triage action. Covers 📧 email, 💬 Teams chat, and 📅 calendar meeting prep tasks.</small></div>`;
  } else {
    el.innerHTML=`<div class="fg"><div style="display:flex;align-items:center;margin-bottom:4px"><label class="fl" style="margin:0">Tasks File</label>${helpLink}</div><p style="font-size:13px;color:var(--muted);margin:6px 0 12px">No file connected. Select your tasks.json file to enable daily triage of email, Teams, and meeting prep tasks in the Inbox view.</p><button class="bpri" onclick="etConnect()">Connect File</button></div>`;
  }
}

async function etDisconnect(){
  try{
    const db=await etOpenDB();
    await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').delete('email_tasks');tx.oncomplete=res;tx.onerror=rej;});
  }catch(err){console.warn('etDisconnect:',err);}
  _etHandle=null; _etTasks=[];
  updateInboxBadge();
  renderEmailTasks();
  renderEmailSettingsTab();
  showToast('Email tasks file disconnected');
}

function renderEmailTasks(){
  const el=document.getElementById('et-section'); if(!el) return;
  if(!_etHandle){
    el.innerHTML='<div class="et-connect"><span>📋 Connect your tasks file for daily triage (email · Teams · meetings)</span><button class="et-conn-btn" onclick="etConnect()">Connect</button></div>';
    return;
  }
  if(!_etTasks.length){el.innerHTML=`<div class="et-clear"><span class="et-clear-dot"></span>Tasks file connected &nbsp;·&nbsp; No pending tasks — new ones will appear here automatically</div>`;return;}
  const cards=_etTasks.map(t=>{
    const src=t.source_type||'email';
    const srcIcon=ET_SRC_ICON[src]||'📧';
    const dotCls=t.priority==='high'?'et-dot-high':t.priority==='medium'?'et-dot-mid':'et-dot-low';
    const cardCls=t.priority==='high'?'et-high':t.priority==='medium'?'et-medium':'et-low';
    const dl=t.deadline?`<span class="et-due">Due ${fd(t.deadline)}</span>`:'';
    const fromLine=src==='meeting'
      ?`${srcIcon} Meeting: <span class="et-subj">${escHtml(t.source_subject)}</span>`
      :`${srcIcon} From: ${escHtml(t.asker)} &nbsp;·&nbsp; <span class="et-subj">${escHtml(t.source_subject)}</span>`;
    return `<div class="et-card ${cardCls}" id="etc-${t.task_id}">
      <div class="et-top"><span class="et-dot ${dotCls}"></span><span class="et-pill">${escHtml(ET_CAT_LABEL[t.category]||t.category)}</span>${dl}</div>
      <div class="et-task">${escHtml(t.task)}</div>
      <div class="et-from">${fromLine}</div>
      <div class="et-acts"><button class="et-btn et-add" onclick="etAddTask('${t.task_id}')">Add as Task</button><button class="et-btn et-skip" onclick="etSkip('${t.task_id}')">Skip</button></div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="et-section-hdr"><span>📋 Tasks</span><span class="et-count">${_etTasks.length} pending</span></div><div class="et-cards">${cards}</div>`;
}

// ═══ APPEARANCE ═══
function applyTheme(){
  document.documentElement.classList.toggle('dark',(S.settings&&S.settings.theme)==='dark');
}
function setTheme(t){
  if(!S.settings) S.settings={};
  S.settings.theme=t;
  saveS();
  applyTheme();
  renderAppearanceTab();
}
function setDensity(d){
  if(!S.settings) S.settings={};
  S.settings.density=d;
  saveS();
  applyDensity();
  renderAppearanceTab();
}
function applyDensity(){
  const d=(S.settings&&S.settings.density)||'cozy';
  document.documentElement.dataset.density=d;
}
function setReduceMotion(on){
  if(!S.settings) S.settings={};
  S.settings.reduceMotion=!!on;
  saveS();
  applyReduceMotion();
  renderAppearanceTab();
}
function applyReduceMotion(){
  const on=!!(S.settings&&S.settings.reduceMotion);
  document.documentElement.classList.toggle('reduce-motion',on);
}
function renderAppearanceTab(){
  const el=document.getElementById('appearanceMgrBody');
  if(!el) return;
  const theme=(S.settings&&S.settings.theme)||'light';
  const density=(S.settings&&S.settings.density)||'cozy';
  const reduceMotion=!!(S.settings&&S.settings.reduceMotion);
  const themeOpts=[
    {v:'light',label:'Light',icon:'sun'},
    {v:'dark', label:'Dark', icon:'moon'},
  ];
  const densityOpts=[
    {v:'compact',label:'Compact'},
    {v:'cozy',   label:'Cozy'},
    {v:'roomy',  label:'Roomy'},
  ];
  el.innerHTML=`
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">Appearance</div>
        <div class="fcl-fieldrow-hint">Match your system or pick one. Dark uses cool navy/slate; light uses warm off-white.</div>
      </div>
      <div>
        <div class="fcl-seg" role="radiogroup" aria-label="Appearance">
          ${themeOpts.map(o=>`<button class="fcl-seg-btn ${theme===o.v?'on':''}" role="radio" aria-checked="${theme===o.v}" onclick="setTheme('${escJs(o.v)}')">${icon(o.icon,14)} ${escHtml(o.label)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">Density</div>
        <div class="fcl-fieldrow-hint">Compact shows more per screen. Roomy gives lists more breathing room. Applies to task rows, Today/Kanban/Matrix/Inbox cards, and Settings lists.</div>
      </div>
      <div>
        <div class="fcl-seg" role="radiogroup" aria-label="Density">
          ${densityOpts.map(o=>`<button class="fcl-seg-btn ${density===o.v?'on':''}" role="radio" aria-checked="${density===o.v}" onclick="setDensity('${escJs(o.v)}')">${escHtml(o.label)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="fcl-fieldrow" style="border-bottom:0">
      <div>
        <div class="fcl-fieldrow-label">Reduce motion</div>
        <div class="fcl-fieldrow-hint">Skip incidental animations. Also honors your OS-level <code style="font-family:var(--fcl-font-mono);font-size:11px">prefers-reduced-motion</code> setting automatically.</div>
      </div>
      <div>
        <button class="fcl-toggle" type="button" aria-pressed="${reduceMotion}" onclick="setReduceMotion(${!reduceMotion})">
          <span class="fcl-toggle-track"><span class="fcl-toggle-thumb"></span></span>
          <span style="font-size:13.5px;color:var(--fcl-text-dim)">${reduceMotion?'On':'Off'}</span>
        </button>
      </div>
    </div>
  `;
}

// ═══ AI VISIBILITY ═══
function syncAiVisibility(){
  const hasKey=!!(S.settings&&S.settings.claudeKey);
  const cap=document.getElementById('aiCapBtn');
  const modal=document.getElementById('modalAiBtn');
  if(cap) cap.style.display=hasKey?'':'none';
  if(modal) modal.style.display=hasKey?'':'none';
}

// ═══ FEEDBACK ═══
const FB_EMAIL = 'theluciano@gmail.com';

function openFeedback() {
  document.getElementById('fbMsg').value = '';
  document.getElementById('fbCharCount').textContent = '0';
  document.getElementById('fbCat').value = 'bug';
  document.getElementById('fbCtxBody').style.display = 'none';
  document.getElementById('fbCtxToggle').textContent = '▶ What we\'ll include with this report';
  document.getElementById('fbCopyBtn').style.display = 'none';
  document.getElementById('feedbackOvl').style.display = 'flex';
  setTimeout(() => document.getElementById('fbMsg').focus(), 50);
}
function closeFeedback() {
  document.getElementById('feedbackOvl').style.display = 'none';
}
function fbOvlClose(e) {
  if (e.target === document.getElementById('feedbackOvl')) closeFeedback();
}
function fbCountChars() {
  document.getElementById('fbCharCount').textContent = document.getElementById('fbMsg').value.length;
}
function fbToggleCtx() {
  const body = document.getElementById('fbCtxBody');
  const btn  = document.getElementById('fbCtxToggle');
  const open = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  btn.textContent = (open ? '▼' : '▶') + ' What we\'ll include with this report';
  if (open) renderFbCtx();
}
function fbCollectCtx() {
  const allTasks = (S.sections || []).flatMap(s => s.tasks || []);
  const sc = { 'To Do': 0, 'In Progress': 0, 'Done': 0, 'Backlog': 0 };
  allTasks.forEach(t => { if (sc[t.status] !== undefined) sc[t.status]++; });
  const theme = (S.settings && S.settings.theme) || 'light';
  const hasKey = !!(S.settings && S.settings.claudeKey);
  const aiModel = (S.settings && S.settings.aiModel) || 'claude-haiku-4-5-20251001';
  let lsKB = 0;
  try { const d = localStorage.getItem('focal_v1'); if (d) lsKB = Math.round(d.length / 1024); } catch(e) {}
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'Unknown';
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  return {
    version: typeof VER !== 'undefined' ? VER : '?',
    vdate: typeof VDATE !== 'undefined' ? VDATE : '?',
    dateStr, browser, os,
    screen: screen.width + '×' + screen.height,
    theme, hasKey, aiModel,
    activeView: curView || '?',
    sections: (S.sections || []).length,
    connections: (S.knownConnections || []).length,
    outcomes: (S.outcomes || []).length,
    groups: (S.personGroups || []).length,
    inbox: (S.inbox || []).length,
    total: allTasks.length,
    sc,
    recurring: allTasks.filter(t => t.type === 'recurring').length,
    lsKB
  };
}
function renderFbCtx() {
  const el = document.getElementById('fbCtxBody');
  if (!el) return;
  const c = fbCollectCtx();
  const rows = [
    ['Version', `${c.version} (${c.vdate})`],
    ['Active view', c.activeView],
    ['Theme', c.theme],
    ['AI configured', c.hasKey ? 'Yes — ' + c.aiModel : 'No'],
    ['Browser / OS', `${c.browser} / ${c.os}`],
    ['Screen', c.screen],
    ['Tasks — To Do', c.sc['To Do']],
    ['Tasks — In Progress', c.sc['In Progress']],
    ['Tasks — Done', c.sc['Done']],
    ['Tasks — Backlog', c.sc['Backlog']],
    ['Tasks — Total', c.total],
    ['Recurring tasks', c.recurring],
    ['Sections', c.sections],
    ['Connections', c.connections],
    ['Outcomes', c.outcomes],
    ['Person groups', c.groups],
    ['Inbox items', c.inbox],
    ['Data size', '~' + c.lsKB + ' KB'],
    ['Timestamp', c.dateStr],
  ];
  el.innerHTML = `<table class="fb-ctx-tbl">${rows.map(([k,v])=>`<tr><td>${escHtml(String(k))}</td><td>${escHtml(String(v))}</td></tr>`).join('')}</table>`;
}
function fbBuildMarkdown() {
  const cat = document.getElementById('fbCat');
  const catText = cat.options[cat.selectedIndex].text;
  const msg = (document.getElementById('fbMsg').value || '').trim();
  const c = fbCollectCtx();
  return [
    `# Focal Feedback — ${catText}`,
    '',
    `**Submitted:** ${c.dateStr}`,
    `**Version:** ${c.version} (${c.vdate})`,
    `**Category:** ${catText}`,
    '',
    '## Message',
    '',
    msg || '*(no message provided)*',
    '',
    '---',
    '',
    '## App Context',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Version | ${c.version} (${c.vdate}) |`,
    `| Active View | ${c.activeView} |`,
    `| Theme | ${c.theme} |`,
    `| AI Configured | ${c.hasKey ? 'Yes — ' + c.aiModel : 'No'} |`,
    `| Browser | ${c.browser} |`,
    `| OS | ${c.os} |`,
    `| Screen | ${c.screen} |`,
    `| Data Size | ~${c.lsKB} KB |`,
    '',
    '## Task Stats',
    '',
    '| Status | Count |',
    '|--------|-------|',
    `| To Do | ${c.sc['To Do']} |`,
    `| In Progress | ${c.sc['In Progress']} |`,
    `| Done | ${c.sc['Done']} |`,
    `| Backlog | ${c.sc['Backlog']} |`,
    `| **Total** | **${c.total}** |`,
    '',
    '## Configuration',
    '',
    `- Sections: ${c.sections}`,
    `- Connections: ${c.connections}`,
    `- Outcomes: ${c.outcomes}`,
    `- Person Groups: ${c.groups}`,
    `- Inbox Items: ${c.inbox}`,
    `- Recurring Tasks: ${c.recurring}`,
  ].join('\n');
}
function fbSend() {
  const msg = (document.getElementById('fbMsg').value || '').trim();
  if (!msg) { showToast('Please enter a message before sending.'); return; }
  const cat = document.getElementById('fbCat');
  const catText = cat.options[cat.selectedIndex].text;
  const subject = `[Focal Feedback] ${catText} — v${typeof VER !== 'undefined' ? VER : '?'}`;
  const body = fbBuildMarkdown();
  const mailto = `mailto:${FB_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (mailto.length > 8000) {
    document.getElementById('fbCopyBtn').style.display = '';
    showToast('Feedback is long — use the Copy button, then paste into a new email.');
    return;
  }
  window.location.href = mailto;
  setTimeout(() => { closeFeedback(); showToast('✉ Opening your email client…'); }, 300);
}
function fbCopy() {
  const body = fbBuildMarkdown();
  navigator.clipboard.writeText(body).then(() => {
    showToast('📋 Feedback copied to clipboard!');
    closeFeedback();
  }).catch(() => showToast('Could not copy — please select the text manually.'));
}

// ═══ KEYBOARD ═══
// Keyboard
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){if(!modalHasContent())closeModal();closeDrops();kCancelSubDlg();closeCtxMenu();closeKColMenu();closeSettings();closeFeedback();} if(e.key==='n'&&!e.ctrlKey&&!e.metaKey&&document.activeElement.tagName==='BODY') openAdd(); });
document.addEventListener('click',e=>{ if(!e.target.closest('.ctx-menu')){closeCtxMenu();closeKColMenu();} if(!e.target.closest('#personDd')){ const m=document.getElementById('personDdMenu'); if(m) m.style.display='none'; } });

// Keyboard activation for role=button elements that aren't <button> (pills, vtabs, mobile nav, ctx items).
// Enter/Space → click. We don't want this on inputs/textareas — `[tabindex]` selector already excludes them.
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ') return;
  const el=e.target;
  if(!el||el.tagName==='BUTTON'||el.tagName==='A'||el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT') return;
  if(el.getAttribute&&el.getAttribute('role')==='button'&&el.tabIndex>=0){
    e.preventDefault();
    el.click();
  } else if(el.getAttribute&&(el.getAttribute('role')==='menuitem'||el.getAttribute('role')==='tab')&&el.tabIndex>=0){
    e.preventDefault();
    el.click();
  }
});

// Arrow-key navigation between view tabs (left/right + home/end).
(function(){
  const tabs=document.querySelector('.vtabs');
  if(!tabs) return;
  tabs.addEventListener('keydown',e=>{
    const items=[...tabs.querySelectorAll('[role="tab"]')];
    const i=items.indexOf(document.activeElement);
    if(i<0) return;
    let next=-1;
    if(e.key==='ArrowRight') next=(i+1)%items.length;
    else if(e.key==='ArrowLeft') next=(i-1+items.length)%items.length;
    else if(e.key==='Home') next=0;
    else if(e.key==='End') next=items.length-1;
    if(next>=0){ e.preventDefault(); items[next].focus(); items[next].click(); }
  });
})();

// Focus trap for modals — keeps Tab/Shift+Tab cycling inside an open dialog.
function _modalFocusTrap(e){
  if(e.key!=='Tab') return;
  const open=document.querySelector('.ovl.on[role="dialog"]');
  if(!open) return;
  const focusables=open.querySelectorAll('button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
  if(!focusables.length) return;
  const first=focusables[0], last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
}
document.addEventListener('keydown',_modalFocusTrap);

// Sync aria-hidden on dialogs when their .on class toggles.
const _ovlObserver=new MutationObserver(muts=>{
  muts.forEach(m=>{
    if(m.target.classList&&(m.target.id==='ovl'||m.target.id==='settingsOvl'||m.target.id==='feedbackOvl')){
      m.target.setAttribute('aria-hidden', m.target.classList.contains('on')?'false':'true');
    }
  });
});
['ovl','settingsOvl','feedbackOvl'].forEach(id=>{ const el=document.getElementById(id); if(el) _ovlObserver.observe(el,{attributes:true,attributeFilter:['class','style']}); });

// ═══ INIT ═══

// Init
applyTheme();
applyDensity();
applyReduceMotion();
renderAll();
renderMatrixFilter();
computeWeekSummary();
populatePersonFilter();
syncAiVisibility();
etLoad();
bkLoadHandle(); // load auto-backup file handle from IndexedDB (silent if none)
// Initialize pill disabled states for default view
(function(){ const v=curView; const noFilters=v==='inbox'||v==='review'||v==='analytics'; const noBacklog=v==='today'||v==='kanban'||v==='matrix'; document.querySelectorAll('.pill').forEach(p=>p.classList.toggle('pill-disabled',noFilters||(noBacklog&&p.dataset.f==='backlog'))); })();
