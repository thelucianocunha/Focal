/*  Focal — Task Management App
 *  Copyright (c) 2026 Luciano Cunha. All rights reserved.
 *  License: CC BY-NC 4.0
 */

// ═══ STATE ═══
// v10.7.1 — these constants MUST be declared before `let S = loadS()` below,
// because migrateV82 (called from loadS) reads PPL_GROUP_PALETTE. With
// `const` they're in the TDZ until execution reaches them; if declared
// after the loadS() call, every load throws and triggers the corruption-
// recovery path, which moves real data to focal_v1_corrupted_* and resets
// the user to demo. Keep them here.
const PPL_GROUP_PALETTE=['#00B5B0','#2563EB','#7C3AED','#D97706','#DC2626','#059669','#DB2777'];
function _pplHashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return Math.abs(h); }
function _pplPickColor(seed){ return PPL_GROUP_PALETTE[_pplHashStr(String(seed))%PPL_GROUP_PALETTE.length]; }
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
// PPL_GROUP_PALETTE, _pplHashStr, _pplPickColor were here — moved above `let S = loadS()` to fix TDZ. See v10.7.1 note.
function migrateV82(d){ if(!d.outcomes) d.outcomes=JSON.parse(JSON.stringify(DEFAULT_OUTCOMES)); if(!d.personGroups) d.personGroups=[]; (d.personGroups||[]).forEach(g=>{ if(!g.color) g.color=_pplPickColor(g.id||g.name||Math.random()); }); d.sections.forEach(s=>s.tasks.forEach(t=>{ if(!t.outcomes) t.outcomes=[]; if(t.lastPrioritizedAt===undefined) t.lastPrioritizedAt=null; if(t.pData===undefined) t.pData=null; if(t.type==='recurring'&&!t.rInterval) t.rInterval='monthly'; })); if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; if(!d.settings.theme) d.settings.theme='light'; if(!d.settings.lang) d.settings.lang='en'; if(d.settings.langAuto===undefined) d.settings.langAuto=false; if(!d.settings.density) d.settings.density='cozy'; if(d.settings.reduceMotion===undefined) d.settings.reduceMotion=false; }
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
    // CRITICAL (v10.7.1): set _bkSuppressAutoSync so the demo state we're about to load is
    // NOT auto-mirrored to the user's backup file. Without this guard, every saveS() after
    // recovery overwrites the good backup file with demo state — silently destroying the
    // user's last safety net. User must manually click "Save now" to opt-in after recovery.
    _bkSuppressAutoSync=true;
    try{
      const bad=localStorage.getItem('focal_v1');
      if(bad){ const k='focal_v1_corrupted_'+Date.now(); try{ localStorage.setItem(k,bad); }catch{} }
    }catch{}
    setTimeout(()=>{ try{ showToast(t('toast_err_corrupted'), 14000); }catch{} }, 800);
    console.error('Focal: loadS recovered from corrupted storage:', err);
    const d=clone(FILE_DATA); if(!d.inbox) d.inbox=[]; if(!d.settings) d.settings={claudeKey:'',aiModel:'claude-haiku-4-5-20251001'}; d.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.decided===undefined) t.decided=false; if(!t.kanbanColSince) t.kanbanColSince=null; })); migrateV82(d); return d;
  }
}
// _saveWarned debounces the quota toast so we don't spam the user on every action while full.
let _saveWarned=0;
// v10.7.1 guard: set by loadS() when corruption-recovery fires. Blocks bkSync until
// the user explicitly clicks "Save now" or reconnects the backup — protects the
// backup file from being silently overwritten with demo state.
let _bkSuppressAutoSync=false;
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
        if(now-_saveWarned>5000){ _saveWarned=now; try{ showToast(t('toast_err_storage_full'), 8000); }catch{} }
        return;
      }
    } else {
      const now=Date.now();
      if(now-_saveWarned>5000){ _saveWarned=now; try{ showToast(t('toast_err_save_failed'), 8000); }catch{} }
      return;
    }
  }
  // Mirror to auto-backup file (debounced) if connected. Never blocks the local save.
  // v10.7.1: skip if corruption-recovery suppressed auto-sync (protects backup file).
  if(_bkSuppressAutoSync) return;
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

// ═══ I18N ═══
// Apply translations to all DOM elements tagged with data-i18n / data-i18n-title /
// data-i18n-placeholder. Re-runnable: safe to call after language change to retranslate.
// Falls back gracefully if Focal_i18n.js is missing (t() returns the key, original text unchanged).
function applyI18n(){
  if(typeof t!=='function') return; // i18n not loaded
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.getAttribute('data-i18n');
    if(!key) return;
    const v=t(key);
    if(v && v!==key) el.textContent=v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    const key=el.getAttribute('data-i18n-title');
    if(!key) return;
    const v=t(key);
    if(v && v!==key) el.setAttribute('title',v);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key=el.getAttribute('data-i18n-placeholder');
    if(!key) return;
    const v=t(key);
    if(v && v!==key) el.setAttribute('placeholder',v);
  });
}
// Change active language. Saves preference, re-applies static translations,
// re-renders current view and settings panel so dynamic strings refresh.
// `silent` = called internally (e.g. by Match-system toggle) — suppress toast.
function setLang(code, silent){
  if(!S.settings) S.settings={};
  S.settings.lang=code;
  // Manual language picks switch off auto-follow OS. The Match-system toggle
  // bypasses this by calling setLang() from inside toggleLangAuto().
  if(!silent) S.settings.langAuto=false;
  saveS();
  applyI18n();
  try{ renderAll(); }catch{}
  try{ applyF(); }catch{}
  try{ if(curView==='today') renderToday(); }catch{}
  try{ if(curView==='kanban') renderKanban(); }catch{}
  try{ if(curView==='matrix') renderMatrix(); }catch{}
  try{ if(curView==='inbox') renderInbox(); }catch{}
  try{ if(curView==='review') renderWeeklyReview(); }catch{}
  try{ renderStats(); }catch{}
  try{ _renderSettingsNav(); _updateSettingsHeader(); }catch{}
  try{ if(_settingsTab==='language') renderLanguageTab(); }catch{}
  try{ if(typeof _kbHelpOpen==='function'&&_kbHelpOpen()) renderKbHelp(); }catch{}
  if(!silent){
    try{ showToast(t('toast_lang_changed',{name:FOCAL_LANGS.find(l=>l.code===code)?.name||code})); }catch{}
  }
}

// ═══ SEARCH ═══
// Search autocomplete
let srchFocusIdx=-1;
function srchClear(){
  document.getElementById('srch').value='';
  document.getElementById('srchClearBtn').style.display='none';
  document.getElementById('srchSug').classList.remove('on');
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='kanban') renderKanban();
  if(curView==='today') renderToday();
}
function srchInput(){
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='kanban') renderKanban();
  if(curView==='today') renderToday();
  const q=(document.getElementById('srch').value||'').toLowerCase().trim();
  document.getElementById('srchClearBtn').style.display=q?'block':'none';
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
  if(!name){showToast(t('toast_cat_name_required'));return;}
  const id='sec_'+Date.now().toString(36);
  S.sections.push({id,icon:_newSecIcon,title:name,tasks:[]});
  _newSecIcon="📌";
  saveS(); renderSecMgr(); showToast(t('toast_cat_added', {name}));
}

function delSection(id){
  const sec=S.sections.find(s=>s.id===id);
  if(!sec) return;
  const taskCount=sec.tasks.filter(t=>t.status!=='Done').length;
  if(taskCount>0&&!confirm(window.t('sec_confirm_delete',{name:sec.title,taskCount}))) return;
  S.sections=S.sections.filter(s=>s.id!==id);
  saveS(); renderSecMgr(); showToast(t('toast_cat_deleted'));
}

// ═══ MATRIX FILTER ═══
// Matrix Filter Bar
function renderMatrixFilter(){
  const bar=document.getElementById('mfbar');
  // Mode toggle (always shown)
  let html=`<div class="mfbar-modes"><span class="mpill ${matrixMode==='view'?'on':''}" onclick="setMatrixMode('view')">${t('matrix_mode_view')}</span><span class="mpill ${matrixMode==='prioritize'?'on':''}" onclick="setMatrixMode('prioritize')">${t('matrix_mode_prioritize')}</span></div><span class="mfbar-sep"></span>`;
  if(matrixMode==='view'){
    // Section filter pills
    html+=`<span class="mfbar-label">${t('matrix_filter_label')}</span>`;
    html+=`<span class="mpill ${matrixSectionFilter.has('all')?'on':''}" onclick="setMatrixFilter('all',event)">${t('matrix_filter_all')}</span>`;
    S.sections.forEach(s=>{ html+=`<span class="mpill ${matrixSectionFilter.has(s.id)?'on':''}" onclick="setMatrixFilter('${escJs(s.id)}',event)">${escHtml(s.icon||'')} ${escHtml(s.title.replace(/ — .*/,''))}</span>`; });
  } else {
    // Triage filter chips
    const filters=[['all',t('matrix_filter_all')],['needs-review',t('matrix_filter_needs_review')],['no-outcomes',t('matrix_filter_no_outcomes')],['due-week',t('matrix_filter_due_week')],['overdue',t('matrix_filter_overdue')]];
    filters.forEach(([k,l])=>{ html+=`<span class="mpill ${pmFilter===k?'on':''}" onclick="setPmFilter('${k}')">${l}</span>`; });
    html+=`<span class="mfbar-sep"></span>`;
    html+=`<button class="pq-focus-btn ${pmFocus?'on':''}" onclick="togglePmFocus()">${t('matrix_btn_focus')}</button>`;
    html+=`<button class="pq-focus-btn" style="margin-left:auto" onclick="openSettingsPanel('outcomes')">${t('matrix_btn_outcomes')}</button>`;
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
  const rows=outs.map(o=>`<div class="om-row"><span class="om-dot" style="background:${o.color}"></span><span class="om-name">${escHtml(o.name)}</span><button class="om-toggle ${o.active?'on':''}" onclick="toggleOutcomeActive('${o.id}')">${o.active?window.t('outcomes_btn_active'):window.t('outcomes_btn_inactive')}</button><button class="om-del" onclick="deleteOutcome('${o.id}')" title="${window.t('outcomes_title_remove')}">×</button></div>`).join('');
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
function toggleModalOutcome(id){ if(modalOutcomes.includes(id)){ modalOutcomes=modalOutcomes.filter(x=>x!==id); } else { if(modalOutcomes.length>=2){ showToast(t('toast_max_outcomes')); return; } modalOutcomes.push(id); } renderModalOutcomes(); }

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
  const ap=document.getElementById('pill-aging'); if(ap){ ap.innerHTML=`<span data-icon="clock"></span> ${window.t('filter_aging')}${aging?` (${aging})`:''}`; ap.style.display=aging>0?'':'none'; paintIcons(ap); }
  document.getElementById('sbar').innerHTML=`
    <div class="si" onclick="statClick('p1')" title="${window.t('stat_title_p1')}"><div class="sn r">${p1}</div><div class="sl">${window.t('filter_p1')}</div></div>
    <div class="si" onclick="statClick('prog')" title="${window.t('stat_title_prog')}"><div class="sn t">${prog}</div><div class="sl">${window.t('stat_in_progress')}</div></div>
    <div class="si" onclick="statClick('week')" title="${window.t('stat_title_due')}"><div class="sn a">${due}</div><div class="sl">${window.t('stat_due_soon')}</div></div>
    ${ov?`<div class="si" onclick="statClick('overdue')" title="${window.t('stat_title_overdue')}"><div class="sn r">${ov}</div><div class="sl">${window.t('stat_overdue')}</div></div>`:''}
    ${conf?`<div class="si" onclick="statClick('conf')" title="${window.t('stat_title_conf')}"><div class="sn v">${conf}</div><div class="sl">${window.t('stat_confidential')}</div></div>`:''}
    ${back?`<div class="si" onclick="statClick('backlog')" title="${window.t('stat_title_backlog')}"><div class="sn" style="color:var(--st-back)">${back}</div><div class="sl">${window.t('stat_backlog')}</div></div>`:''}
    ${kbTod>0?`<div class="si" onclick="sw('kanban')" title="${window.t('stat_title_kanban',{n:kbTod})}"><div class="sn t">${kbTod}</div><div class="sl">${window.t('stat_in_kanban')}</div></div>`:''}
    ${(()=>{const n=getTriageQueue(true).length;return n>0?`<div class="si" onclick="sw('matrix');matrixMode='prioritize';renderMatrix()" title="${window.t('stat_title_prioritize',{n})}"><div class="sn" style="color:var(--teal)">${n}</div><div class="sl">${window.t('stat_to_prioritize')}</div></div>`:'';})()}
    <div class="si" onclick="statClick('all')" title="${window.t('stat_title_all')}"><div class="sn">${open}</div><div class="sl">${window.t('stat_total_open')}</div></div>
  `;
  const tt=document.getElementById('tab-today');
  if(tt){ const {plan:_tp,overdue:_to,week:_tw}=getTodayTasks(); const n=_tp.length+_to.length+_tw.length; tt.innerHTML=`<span data-icon="zap"></span> ${window.t('nav_today')}${n>0?` <span class="tbadge">${n}</span>`:''}`; paintIcons(tt); }
  updateInboxBadge();
}

// ═══ RENDERING ═══
// Render All
function renderAll(){
  const body=S.sections.length
    ? `<div style="display:flex;flex-direction:column;gap:20px">${S.sections.map(renderSec).join('')}</div>`
    : `<div class="empty-pad"><strong>${t('sec_empty_title')}</strong>${t('sec_empty_body')}</div>`;
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
  const rows=sorted.map(t=>renderRow(t,sec.id)).join('')||`<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--dim);font-size:14px">${window.t('sec_no_tasks')}</td></tr>`;
  return `
  <div class="sc" id="sec-${sec.id}">
    <div class="sh" onclick="togSec('${escJs(sec.id)}')">
      <span class="si3">${escHtml(sec.icon)}</span>
      <span class="sname">${escHtml(sec.title)}</span>
      <span class="sbadge">${window.t('sec_open_badge',{n:open})}</span>
      <span class="chev">▾</span>
    </div>
    <div class="sbody">
      <table>
        <thead><tr>
          <th class="tc"></th>
          <th>${window.t('th_task')}</th>
          <th class="cw1">${window.t('th_priority')}</th>
          <th class="cw2">${window.t('th_status')}</th>
          <th class="cw3">${window.t('th_due')}</th>
          <th class="cw6">${window.t('th_connections')}</th>
          <th class="cw7" title="${window.t('th_conf_title')}">🔒</th>
          <th class="cw4" title="${window.t('th_type_title')}">${window.t('th_type_title')}</th>
          <th class="cw5"></th>
        </tr></thead>
        <tbody id="tb-${sec.id}">${rows}</tbody>
      </table>
      <div class="ar">
        <input class="ai" id="qa-${escAttr(sec.id)}" placeholder="${escAttr(window.t('sec_quick_add_ph',{name:sec.title.split('—')[0].trim()}))}" onkeydown="quickAdd(event,'${escJs(sec.id)}')">
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
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.parent===parentId){
      // Done subtasks stay done — only open subtasks follow the parent
      if(t.status!=='Done'){t.kanbanCol=kcol;}
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
    t.status='To Do'; t.lastStatusChange=today; if(t.kanbanCol==='done') t.kanbanCol=null; logEvent('reopen',id,{s:secId}); showToast(window.t('toast_task_reopened'));
  } else if(t.type==='recurring'){
    const interval=t.rInterval||'monthly'; let newDue='';
    if(isValidISODate(t.due)){ let d=new Date(t.due+'T12:00:00'); if(interval==='monthly') d=addMonthsClamped(d,1); else if(interval==='weekly') d.setDate(d.getDate()+7); else if(interval==='quarterly') d=addMonthsClamped(d,3); newDue=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
    const arc=clone(t); arc.id=genId('a'); arc.status='Done'; arc.kanbanCol='done'; arc.note=(t.note?t.note+' ':'')+'[completed '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})+']'; sec.tasks.push(arc);
    t.due=newDue; t.status='To Do'; t.lastStatusChange=today; t.kanbanCol=null; logEvent('done',arc.id,{s:secId,p:t.priority,age:ageDays(t),r:1,oc:(t.outcomes||[])}); showToast(window.t('toast_recurring_next', {newDue: newDue?' to '+fd(newDue):''}));
  } else { t.status='Done'; t.lastStatusChange=today; t.kanbanCol='done'; const sc=cascadeSubtasksDone(t.id); logEvent('done',id,{s:secId,p:t.priority,age:ageDays(t),oc:(t.outcomes||[])}); showToast(sc?window.t('toast_done_with_subtasks', {sc}):window.t('toast_done')); }
  saveS(); renderAll();
  if(curView==='today') renderToday();
  if(curView==='kanban') renderKanban();
}

function oPriDrop(e,id,secId){ e.stopPropagation(); closeDrops(); positionDrop(e.currentTarget, document.getElementById('pd-'+id)); }
function setPri(id,secId,pri){ const t=ft(id,secId); const old=t.priority; t.priority=pri; if(old!==pri) logEvent('priority',id,{from:old,to:pri}); closeDrops(); saveS(); renderAll(); showToast(window.t('toast_priority_changed', {priority: pri})); }
function oStatDrop(e,id,secId){ e.stopPropagation(); closeDrops(); positionDrop(e.currentTarget, document.getElementById('sd-'+id)); }
function setStat(id,secId,stat){ const t=ft(id,secId); const old=t.status; t.status=stat; t.lastStatusChange=new Date().toISOString().split('T')[0]; if(stat==='Done'){t.kanbanCol='done';cascadeSubtasksDone(id);logEvent('done',id,{s:secId,p:t.priority,age:ageDays(t),oc:(t.outcomes||[])});}else if(t.kanbanCol==='done') t.kanbanCol=null; if(old!==stat) logEvent('status',id,{from:old,to:stat}); closeDrops(); saveS(); renderAll(); showToast(window.t('toast_status_changed', {status: stat})); }

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
  showToast(t.confidential?window.t('toast_marked_confidential'):window.t('toast_conf_removed'));
}

function toggleConfView(){
  hideConf=!hideConf;
  document.getElementById('btnConf').classList.toggle('on-conf',!hideConf);
  applyF();
  if(curView==='matrix') renderMatrix();
  if(curView==='today') renderToday();
  if(curView==='kanban') renderKanban();
  showToast(hideConf?window.t('toast_conf_hidden'):window.t('toast_conf_visible'));
}

function togType(id,secId){ const t=ft(id,secId); t.type=t.type==='recurring'?'once':'recurring'; if(!t.rInterval) t.rInterval='monthly'; saveS(); renderAll(); showToast(t.type==='recurring'?window.t('toast_set_recurring'):window.t('toast_set_one_time')); }

function startEdit(el){ el.contentEditable='true'; el.focus(); const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r); }
function editKey(e,el){ if(e.key==='Enter'){e.preventDefault();el.blur();} if(e.key==='Escape'){el.contentEditable='false';renderAll();} }
function saveEdit(el,id,secId,field){ el.contentEditable='false'; const val=el.textContent.trim(); const t=ft(id,secId); if(!t) return; if(field==='task') t.task=val; if(field==='note') t.note=val; saveS(); showToast(window.t('toast_saved')); }

// ═══ DATE PICKER ═══
let dpT=null,dpMode='day',dpY,dpM;
function oDp(e,id,secId){ e.stopPropagation(); closeDrops(); dpT={id,secId}; const t=ft(id,secId); const today=new Date(); const d=safeDate(t.due); if(d){dpY=d.getFullYear();dpM=d.getMonth();}else{dpY=today.getFullYear();dpM=today.getMonth();} dpMode='day'; const dpEl=document.getElementById('dp-'+id); renderDp(dpEl); positionDrop(e.currentTarget, dpEl); }
function renderDp(el){
  const today=new Date();today.setHours(0,0,0,0);
  const sel=dpModalMode?safeDate(document.getElementById('fDue')?.value||''):safeDate(ft(dpT.id,dpT.secId)?.due||'');
  const mname=new Date(dpY,dpM,1).toLocaleString('en-US',{month:'long',year:'numeric'});
  const dpElId=dpModalMode?'fDueDp':(document.getElementById('dp-'+dpT.id)?'dp-'+dpT.id:'mdp-'+dpT.id);
  let h=`<div class="dptabs"><div class="dptab ${dpMode==='day'?'on':''}" onclick="event.stopPropagation();dpMode='day';renderDp(document.getElementById('${dpElId}'))">${t('dp_tab_day')}</div><div class="dptab ${dpMode==='week'?'on':''}" onclick="event.stopPropagation();dpMode='week';renderDp(document.getElementById('${dpElId}'))">${t('dp_tab_week')}</div></div>`;
  if(dpMode==='day'){
    const first=new Date(dpY,dpM,1); const startDow=first.getDay(); const dim=new Date(dpY,dpM+1,0).getDate();
    h+=`<div class="dpnav"><button class="dpa" onclick="event.stopPropagation();dpNav(-1)">◀</button><span class="dpm">${mname}</span><button class="dpa" onclick="event.stopPropagation();dpNav(1)">▶</button></div><div class="dpg">`;
    [t('dp_day_su'),t('dp_day_mo'),t('dp_day_tu'),t('dp_day_we'),t('dp_day_th'),t('dp_day_fr'),t('dp_day_sa')].forEach(d=>h+=`<div class="dpdn">${d}</div>`);
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
      const lbl=w===0?t('dp_this_week'):w===1?t('dp_next_week'):t('dp_week_of',{date:ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})});
      h+=`<div class="dpwrow" onclick="selWeek('${isoE}')"><span>${lbl}</span><span style="font-size:10px;opacity:.6">${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${we.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>`;
    }
    h+=`</div>`;
  }
  h+=`<button class="dpclear" onclick="clrDue()">${t('dp_clear_date')}</button>`;
  el.innerHTML=h;
}
let dpModalMode=false;
function openModalDp(e){
  e.stopPropagation(); closeDrops(); dpModalMode=true;
  const val=document.getElementById('fDue').value;
  const today=new Date();
  if(val){const d=safeDate(val);if(d){dpY=d.getFullYear();dpM=d.getMonth();}else{dpY=today.getFullYear();dpM=today.getMonth();}}
  else{dpY=today.getFullYear();dpM=today.getMonth();}
  dpMode='day';
  const dpEl=document.getElementById('fDueDp');
  renderDp(dpEl); positionDrop(e.currentTarget,dpEl);
}
function setDpMode(m){event&&event.stopPropagation&&event.stopPropagation();dpMode=m;const el=dpModalMode?document.getElementById('fDueDp'):(document.getElementById('dp-'+dpT.id)||document.getElementById('mdp-'+dpT.id));if(el)renderDp(el);}
function dpNav(d){event&&event.stopPropagation&&event.stopPropagation();dpM+=d;if(dpM>11){dpM=0;dpY++;}else if(dpM<0){dpM=11;dpY--;}const el=dpModalMode?document.getElementById('fDueDp'):(document.getElementById('dp-'+dpT.id)||document.getElementById('mdp-'+dpT.id));if(el&&el.classList.contains('on'))renderDp(el);}
function selDay(iso){if(dpModalMode){document.getElementById('fDue').value=iso;closeDrops();dpModalMode=false;return;}ft(dpT.id,dpT.secId).due=iso;closeDrops();saveS();renderAll();showToast(window.t('toast_due_date', {date: fd(iso)}));}
function selWeek(end){if(dpModalMode){document.getElementById('fDue').value=end;closeDrops();dpModalMode=false;return;}ft(dpT.id,dpT.secId).due=end;closeDrops();saveS();renderAll();showToast(window.t('toast_due_week', {date: fd(end)}));}
function clrDue(){if(dpModalMode){document.getElementById('fDue').value='';closeDrops();dpModalMode=false;return;}ft(dpT.id,dpT.secId).due='';closeDrops();saveS();renderAll();showToast(window.t('toast_date_cleared'));}

// ═══ EMAIL & DELETE ═══
function emailTask(id,secId){
  const t=ft(id,secId);
  const sub=encodeURIComponent(t.task);
  const conns=(t.connections||[]).join(', ');
  const body=encodeURIComponent((t.note?t.note+'\n\n':'')+(t.due?'Due: '+fd(t.due)+'\n':'')+(conns?'Related to: '+conns+'\n':''));
  window.location.href=`mailto:?subject=${sub}&body=${body}`;
}

function delTask(id,secId){ if(!confirm(window.t('confirm_delete_task'))) return; const sec=S.sections.find(s=>s.id===secId); sec.tasks=sec.tasks.filter(t=>t.id!==id); S.sections.forEach(s=>s.tasks.forEach(t=>{if(t.parent===id)t.parent=null;})); saveS();renderAll();showToast(window.t('toast_deleted')); }
function quickAdd(e,secId){ if(e.key!=='Enter') return; const inp=document.getElementById('qa-'+secId); const val=inp.value.trim(); if(!val) return; const nid=genId(secId[0]); S.sections.find(s=>s.id===secId).tasks.push({id:nid,priority:'P3',task:val,status:'To Do',due:'',note:'',url:'',type:'once',urgent:0,confidential:false,connections:[],kanbanCol:null,lastStatusChange:new Date().toISOString().split('T')[0],parent:null}); logEvent('create',nid,{s:secId,p:'P3'}); inp.value=''; saveS();renderAll();showToast(window.t('toast_task_added')); setTimeout(()=>{const el=document.getElementById('qa-'+secId);if(el)el.focus();},50); }

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
  showToast(window.t('toast_connection_removed'));
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
  showToast(window.t('toast_connection_added'));
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
// Restore the user's preferred Notes textarea height (persisted across sessions)
function restoreNoteH(){ try{ const h=localStorage.getItem('focal_noteH'); const el=document.getElementById('fNote'); if(el) el.style.height=h||''; }catch{} }
function openAdd(secId){
  eId=null;eSec=null;modalConns=[];modalOutcomes=[]; editingParent=null;
  document.getElementById('fParentRow').style.display='none';
  rebuildSecDropdown();
  document.getElementById('mtitle').textContent=window.t('modal_add_task');
  document.getElementById('fTask').value=''; document.getElementById('fNote').value=''; document.getElementById('fUrl').value=''; restoreNoteH();
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
  document.getElementById('mtitle').textContent=window.t('modal_edit_task');
  document.getElementById('fTask').value=t.task; document.getElementById('fNote').value=t.note||''; document.getElementById('fUrl').value=t.url||''; restoreNoteH();
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
  if(rawDue&&!safeDue) showToast(window.t('toast_invalid_date'));
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
    showToast(window.t('toast_task_updated'));
  } else {
    const colLabel=newTaskKanbanCol==='today'?'Today':newTaskKanbanCol==='week'?'This Week':newTaskKanbanCol?newTaskKanbanCol:null;
    obj.id=genId(ns[0]); S.sections.find(s=>s.id===ns).tasks.push(obj); logEvent('create',obj.id,{s:ns,p:obj.priority,oc:(obj.outcomes||[])}); showToast(colLabel?window.t('toast_task_added_col', {colLabel}):window.t('toast_task_added'));
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
      saveS();renderAll();showToast(window.t('toast_reordered'));
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
  S.sections.forEach(s=>{ const b=document.querySelector(`#sec-${s.id} .sbadge`); if(b) b.textContent=window.t('sec_open_badge',{n:s.tasks.filter(t=>t.status!=='Done'&&t.status!=='Backlog').length}); });
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
  showToast(demoMode?window.t('toast_demo_on'):window.t('toast_demo_off'));
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
  const _localeMap={en:'en-US',nl:'nl-NL',de:'de-DE',it:'it-IT',pt:'pt-BR',es:'es-ES',hi:'hi-IN'};
  const _curLang=(S.settings&&S.settings.lang)||'en';
  const _locale=_localeMap[_curLang]||'en-US';
  document.getElementById('tdH').textContent=d.toLocaleDateString(_locale,{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('tdS').textContent=t('today_h_subtitle');
  const {plan,overdue,week}=getTodayTasks();
  if(!plan.length&&!overdue.length&&!week.length){document.getElementById('tdC').innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted);font-size:15px">${t('today_empty')}</div>`;return;}
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
    const capTip=plan.length>=5?t('today_cap_over',{n:plan.length}):plan.length>=4?t('today_cap_warn',{n:plan.length}):t('today_cap_ok',{n:plan.length});
    h+=`<div class="tsec"><div class="tsect" style="color:var(--teal)">${t('today_section_plan')}<span class="today-cap ${capCls}" title="${capTip}">${capTip}</span></div>`;orderBucket(plan).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;
  }
  if(overdue.length){h+=`<div class="tsec"><div class="tsect" style="color:var(--p1)">${t('today_section_overdue')}</div>`;orderBucket(overdue).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;}
  if(week.length){h+=`<div class="tsec"><div class="tsect" style="color:var(--amber)">${t('today_section_week')}</div>`;orderBucket(week).forEach(t=>h+=todayCard(t,allTaskMap));h+=`</div>`;}
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
    el.innerHTML=items||`<div class="qdrop-hint">${window.t('matrix_drop_hint')}</div>`;
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
  const qnames=[window.t('matrix_q1_label'),window.t('matrix_q2_label'),window.t('matrix_q3_label'),window.t('matrix_q4_label')];
  showToast(window.t('toast_moved_to_quadrant', {quadrant: qnames[targetQ]}));
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
    {v:p1Count,l:t('guard_p1_active'),cls:p1Count>3?'warn':'',tip:p1Count>3?t('guard_warn_p1'):''},
    {v:ipCount,l:t('guard_in_progress'),cls:ipCount>7?'amber':'',tip:ipCount>7?t('guard_warn_p2'):''},
    {v:stale,l:t('guard_needs_review'),cls:'',tip:''},
    {v:noOut,l:t('guard_no_outcomes'),cls:noOut>0?'warn':'',tip:noOut>0?t('guard_warn_outcomes'):''},
    {v:ov,l:t('guard_overdue'),cls:ov>0?'amber':'',tip:''},
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
  let h=`<div class="pq-queue-hdr"><span class="pq-queue-title">${t('pm_tasks_to_review',{total})}</span><button class="pq-focus-btn ${pmFocus?'on':''}" onclick="togglePmFocus()">${t('matrix_btn_focus')}</button></div>`;
  if(!total){ h+=`<div class="pq-empty">${t('pm_all_caught')}</div>`; el.innerHTML=h; return; }
  h+=tasks.map(t=>triageCard(t)).join('');
  el.innerHTML=h;
}
function triageCard(task){
  const ctrl=defaultControls(task);
  const sugg=suggestPriority(task);
  const hasDiff=sugg.p!==task.priority;
  const d=ds(task.due);
  const dColor=d==='u'?'var(--p1)':d==='s'?'var(--amber)':'var(--muted)';
  const activeOuts=(S.outcomes||[]).filter(o=>o.active);
  const taskOuts=task.outcomes||[];
  // outcome chips (show all active, mark selected)
  const ocHtml=activeOuts.map(o=>{
    const sel=taskOuts.includes(o.id);
    return `<span class="pq-oc ${sel?'sel':''}" style="${sel?`background:${escAttr(o.color)};border-color:${escAttr(o.color)}`:''}" onclick="toggleTaskOutcomeInline('${escJs(task.id)}','${escJs(task.secId)}','${escJs(o.id)}')" title="${sel?'Remove: ':'Add: '}${escAttr(o.name)}">${escHtml(o.name)}</span>`;
  }).join('');
  // segmented controls
  function seg(field,opts,cur){ return `<div class="pq-seg">${opts.map(([v,l])=>`<button class="pq-seg-btn ${cur===v?'on':''}" onclick="setPData('${task.id}','${task.secId}','${field}','${v}')">${l}</button>`).join('')}</div>`; }
  const impSeg=seg('impact',[['none',t('pm_impact_none')],['some',t('pm_impact_some')],['high',t('pm_impact_high')]],ctrl.impact);
  const tpSeg=seg('timePressure',[['later',t('pm_pressure_later')],['week',t('pm_pressure_week')],['now',t('pm_pressure_now')]],ctrl.timePressure);
  const ownSeg=seg('ownership',[['delegate',t('pm_owner_delegate')],['shared',t('pm_owner_shared')],['me',t('pm_owner_me')]],ctrl.ownership);
  const suggBadge=`<span class="badge ${PC[sugg.p]}" style="font-size:10px;padding:2px 7px"><span class="bd"></span>${sugg.p}${hasDiff?'':'✓'}</span>`;
  return `<div class="pq-card" id="pq-${task.id}">
  <div class="pq-card-top"><span class="badge ${PC[task.priority]}" style="font-size:10px;padding:2px 7px;flex-shrink:0"><span class="bd"></span>${task.priority}</span><span class="pq-task-name">${dT(task.task)}</span><div class="pq-suggestion">${hasDiff?suggBadge+`<button class="pq-why" onclick="showWhy('${task.id}')">${t('pm_btn_why')}</button>`:suggBadge}</div></div>
  ${hasDiff?`<div class="pm-why-txt" id="pm-why-${task.id}">${escHtml(sugg.rationale)}</div>`:''}
  <div class="pq-meta"><span class="pq-sec">${task.secIcon} ${escHtml((task.secTitle||'').replace(/ — .*/,''))}</span>${task.due?`<span class="pq-due" style="color:${dColor}">📅 ${fd(task.due)}</span>`:''}${ocHtml}</div>
  <div class="pq-controls"><div class="pq-seg-wrap"><span class="pq-seg-label">${t('pm_seg_impact')}</span>${impSeg}</div><div class="pq-seg-wrap"><span class="pq-seg-label">${t('pm_seg_pressure')}</span>${tpSeg}</div><div class="pq-seg-wrap"><span class="pq-seg-label">${t('pm_seg_owner')}</span>${ownSeg}</div></div>
  <div class="pq-actions"><button class="pq-btn pq-accept" onclick="acceptPriority('${task.id}','${task.secId}')">${t('pm_btn_accept',{priority:sugg.p})}</button><button class="pq-btn pq-keep" onclick="keepPriority('${task.id}','${task.secId}')">${t('pm_btn_keep',{priority:task.priority})}</button><button class="pq-btn pq-open" onclick="openEdit('${task.id}','${task.secId}')">${t('pm_btn_open')}</button></div>
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
  else { if(t.outcomes.length>=2){ showToast(t('toast_max_outcomes')); return; } t.outcomes.push(outcomeId); }
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
  showToast(window.t('toast_priority_updated', {old: oldP, new: sugg.p}));
}
function keepPriority(id,secId){
  const t=ft(id,secId); if(!t) return;
  t.lastPrioritizedAt=new Date().toISOString().split('T')[0];
  saveS();
  if(curView==='review'&&wrStage===5) renderReview();
  else { renderGuardrail(); renderTriageQueue(); }
  showToast(window.t('toast_priority_confirmed'));
}

// Mini matrix (read-only right panel)
function renderMiniMatrix(){
  const el=document.getElementById('pm-mini'); if(!el) return;
  const qs={P1:[],P2:[],P3:[],P4:[]};
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status==='Done'||t.status==='Backlog') return; if(hideConf&&t.confidential) return; qs[t.priority].push(t); }));
  const labels={P1:window.t('mini_p1'),P2:window.t('mini_p2'),P3:window.t('mini_p3'),P4:window.t('mini_p4')};
  el.innerHTML=Object.entries(labels).map(([p,label])=>{
    const items=qs[p];
    const rows=items.slice(0,6).map(t=>`<div class="pm-mini-task ${t.lastPrioritizedAt?'reviewed':''}" title="${demoMode?'●●●●●●●':escAttr(t.task)}">${dT(t.task)}</div>`).join('');
    const more=items.length>6?`<div class="pm-mini-more">+${items.length-6} more</div>`:'';
    return `<div class="pm-mini-q"><div class="pm-mini-qh"><span>${label}</span><span class="pm-mini-cnt">${items.length}</span></div>${rows||'<div class="pm-mini-more" style="font-style:normal">'+window.t('mini_empty')+'</div>'}${more}</div>`;
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
function ixAgeLabel(days){ if(days===0) return window.t('ix_age_today'); if(days===1) return window.t('ix_age_yesterday'); if(days<7) return window.t('ix_age_days',{n:days}); if(days<14) return window.t('ix_age_week'); return window.t('ix_age_weeks',{n:Math.floor(days/7)}); }

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
    showToast(window.t('toast_inbox_items_added', {n: lines.length}));
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
  if(paBar){ if(paMode&&items.length>0){ paBar.innerHTML=`<div class="pa-bar"><span class="pa-progress">${window.t('ix_pa_progress',{cur:paIdx+1,total:items.length})}</span><button onclick="paNext()">${window.t('ix_pa_skip')}</button><button onclick="exitProcessAll()">${window.t('ix_pa_done')}</button></div>`; }else{paBar.innerHTML='';} }
  if(!items.length){list.innerHTML='<div class="ix-empty">'+window.t('ix_empty')+'</div>';return;}
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
            <select class="ix-isel" title="${window.t('ix_title_section')}" onchange="ixSetField('${item.id}','secId',this.value)">${secOpts}</select>
            <select class="ix-isel" title="${window.t('ix_title_priority')}" onchange="ixSetField('${item.id}','priority',this.value)">${PO.map(p=>`<option value="${p}"${p===pri?' selected':''}>${p}</option>`).join('')}</select>
            <select class="ix-isel" title="${window.t('ix_title_status')}" onchange="ixSetField('${item.id}','status',this.value)"><option value="To Do"${stat==='To Do'?' selected':''}>${window.t('opt_todo')}</option><option value="In Progress"${stat==='In Progress'?' selected':''}>${window.t('opt_in_progress')}</option></select>
            <input class="ix-iinp" type="date" title="${window.t('ix_title_due')}" value="${due}" onchange="ixSetField('${item.id}','due',this.value)" style="width:130px">
            <select class="ix-isel" title="${window.t('ix_title_urgency')}" onchange="ixSetField('${item.id}','urgent',this.value)"><option value="0"${urg==='0'?' selected':''}>${window.t('ix_opt_not_urgent')}</option><option value="1"${urg==='1'?' selected':''}>${window.t('ix_opt_urgent')}</option></select>
            ${connTags}
            <input class="ix-iinp" placeholder="${window.t('ix_ph_connection')}" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();ixAddConn('${item.id}',this.value);this.value='';}">
          </div>
        </div>
        <div class="ix-actions">
          <button class="lockbtn ${isConf?'lock-on':'lock-off'}" onclick="toggleInboxConf('${item.id}')" title="${isConf?window.t('ix_title_confidential'):window.t('ix_title_mark_conf')}">${isConf?'🔒':'🔓'}</button>
          <button class="tp-act" onclick="triageItem('${item.id}','active')" title="${window.t('ix_title_to_active')}">${window.t('ix_btn_active')}</button>
          <button class="tp-bl" onclick="triageItem('${item.id}','backlog')" title="${window.t('ix_title_to_backlog')}">${window.t('ix_btn_backlog')}</button>
          <button class="ixbtn del" onclick="deleteInboxItem('${item.id}')" title="${window.t('ix_title_delete')}">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('')+((!paMode&&items.length>0)?`<div style="margin-top:10px"><button class="ixbtn" onclick="startProcessAll()">${window.t('ix_btn_process_all',{n:items.length})}</button></div>`:'');
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
  saveS();renderAll();renderInbox();showToast(mode==='backlog'?window.t('toast_sent_to_backlog'):window.t('toast_moved_to_active'));
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
  const steps=[t('wr_stage_inbox'),t('wr_stage_aging'),t('wr_stage_backlog'),t('wr_stage_hygiene'),t('wr_stage_prioritize')];
  return `<div class="wr-prog">${steps.map((s,i)=>`<div class="wr-step ${stage>i+1?'done':stage===i+1?'on':''}">${stage>i+1?'✓ ':''}${s}</div>`+(i<4?'<div class="wr-sep">→</div>':'')).join('')}</div>`;
}
function wrHomeScreen(){
  const inbox=(S.inbox||[]).length;
  const aging=S.sections.reduce((a,s)=>a+s.tasks.filter(t=>ageLevel(t)!=='none').length,0);
  const backlog=S.sections.reduce((a,s)=>a+s.tasks.filter(t=>t.status==='Backlog').length,0);
  const hygiene=wrHygieneTasks().length;
  const prioritize=getTriageQueue(true).length;
  return `<div class="wr-home"><div class="wr-title">${t('wr_title')}</div><div class="wr-sub">${t('wr_subtitle')}</div><div class="wr-counts"><div class="wr-cnt"><span class="wr-n">${inbox}</span><span class="wr-l">${t('wr_card_inbox')}</span></div><div class="wr-cnt"><span class="wr-n">${aging}</span><span class="wr-l">${t('wr_card_aging')}</span></div><div class="wr-cnt"><span class="wr-n">${backlog}</span><span class="wr-l">${t('wr_card_backlog')}</span></div><div class="wr-cnt"><span class="wr-n" style="color:${hygiene?'var(--amber)':'var(--teal)'}">${hygiene}</span><span class="wr-l">${t('wr_card_hygiene')}</span></div><div class="wr-cnt"><span class="wr-n" style="color:${prioritize?'var(--teal)':'var(--muted)'}">${prioritize}</span><span class="wr-l">${t('wr_card_prioritize')}</span></div></div><button class="wrbtn wr-start" onclick="startWeeklyReview()">${t('wr_btn_start')}</button></div>`;
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
    const flags=(noOut?`<span class="wr-flag f-outcomes">${window.t('wr_s4_flag_no_outcome')}</span>`:'')+
                (noDue?`<span class="wr-flag f-due">${window.t('wr_s4_flag_no_due')}</span>`:'')+
                (noConn?`<span class="wr-flag f-conns">${window.t('wr_s4_flag_no_conn')}</span>`:'');
    const dueSug=noDue?`<div class="wr-quick-dates"><span style="font-size:11px;color:var(--muted)">${window.t('wr_s4_label_quick_due')}</span>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',3)">${window.t('wr_s4_due_3d')}</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',7)">${window.t('wr_s4_due_1w')}</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',14)">${window.t('wr_s4_due_2w')}</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',30)">${window.t('wr_s4_due_1m')}</button>
      <button class="wr-qd-btn" onclick="wrSetDue('${t.id}','${t.secId}',-1)">${window.t('wr_s4_due_suggested',{date:escHtml(sugDue(t.priority))})}</button>
    </div>`:''
    ;
    const outSug=noOut&&(S.outcomes||[]).filter(o=>o.active).length?`<div class="wr-quick-dates"><span style="font-size:11px;color:var(--muted)">${window.t('wr_s4_label_outcome')}</span>${(S.outcomes||[]).filter(o=>o.active).map(o=>`<button class="wr-qd-btn" onclick="wrSetOutcome('${t.id}','${t.secId}','${o.id}')">${escHtml(o.name)}</button>`).join('')}</div>`:'';
    return `<div class="wr-card"><div class="wr-task">${dT(t.task)}</div><div class="wr-flags">${flags}</div>${dueSug}${outSug}<div class="wr-acts" style="margin-top:8px"><button class="wrbtn" onclick="openEdit('${t.id}','${t.secId}')">${window.t('wr_s2_btn_edit')}</button><button class="wrbtn" onclick="wrHygieneSkip('${t.id}')">${window.t('wr_s4_btn_skip')}</button></div></div>`;
  }).join('');
  return `${wrProgHTML(4)}<div class="wr-stage-h">${t('wr_s4_title',{n:tasks.length})}</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=5;renderReview()">${t('wr_s4_btn_next')}</button></div>`;
}
function wrStage5HTML(){
  const tasks=getTriageQueue(true);
  if(!tasks.length){ wrStage=6; return wrDoneHTML(); }
  const cards=tasks.map(t=>triageCard(t)).join('');
  return `${wrProgHTML(5)}<div class="wr-stage-h">${t('wr_s5_title',{n:tasks.length})}</div><p style="font-size:13px;color:var(--muted);margin-bottom:12px">${t('wr_s5_instruction')}</p><div id="wr-pm-queue">${cards}</div><div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=6;renderReview()">${t('wr_s5_btn_complete')}</button></div>`;
}
function wrSetDue(id,secId,days){
  const t=ft(id,secId); if(!t) return;
  if(days===-1){ const pri=t.priority; const d=new Date(); d.setHours(0,0,0,0); const n=pri==='P1'?3:pri==='P2'?7:pri==='P3'?14:30; d.setDate(d.getDate()+n); t.due=ldStr(d); }
  else{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+days); t.due=ldStr(d); }
  saveS(); renderReview(); showToast(window.t('toast_due_date_set', {date: fd(t.due)}));
}
function wrSetOutcome(id,secId,outcomeId){
  const t=ft(id,secId); if(!t) return;
  if(!t.outcomes) t.outcomes=[];
  if(!t.outcomes.includes(outcomeId)&&t.outcomes.length<2) t.outcomes.push(outcomeId);
  saveS(); renderReview(); showToast(window.t('toast_outcome_assigned'));
}
function wrHygieneSkip(id){ wrKeptIds.add(id); renderReview(); }
function wrStage1HTML(){
  const items=S.inbox||[];
  if(!items.length){ wrStage=2; return wrStage2HTML(); }
  const cards=items.map(item=>`<div class="wr-card"><div class="wr-task">${escHtml(item.text)}</div>${item.note?`<div class="wr-note">${escHtml(item.note)}</div>`:''}<div class="wr-acts"><button class="wrbtn" onclick="wrTriageIx('${item.id}','active')">${t('wr_s1_btn_active')}</button><button class="wrbtn" onclick="wrTriageIx('${item.id}','backlog')">${t('wr_s1_btn_backlog')}</button><button class="wrbtn wr-del" onclick="wrDeleteIx('${item.id}')">${t('wr_s1_btn_delete')}</button></div></div>`).join('');
  return `${wrProgHTML(1)}<div class="wr-stage-h">${t('wr_s1_title',{n:items.length})}</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=2;renderReview()">${t('wr_s1_btn_skip')}</button></div>`;
}
function wrStage2HTML(){
  const aging=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(ageLevel(t)!=='none') aging.push({...t,secId:s.id}); }));
  if(!aging.length){ wrStage=3; return wrStage3HTML(); }
  const cards=aging.map(t=>{ const lv=ageLevel(t); const d=ageDays(t); return `<div class="wr-card ${lv==='red'?'wr-red':'wr-yellow'}"><div class="wr-task">${escHtml(t.task)}</div><div class="wr-age">${escHtml(t.status)} · ${d} day${d!==1?'s':''} · ${lv==='red'?window.t('wr_s2_badge_zombie'):window.t('wr_s2_badge_stale')}</div><div class="wr-acts"><button class="wrbtn" onclick="wrKeep('${t.id}','${t.secId}')">${window.t('wr_s2_btn_keep')}</button><button class="wrbtn" onclick="openEdit('${t.id}','${t.secId}')">${window.t('wr_s2_btn_edit')}</button><button class="wrbtn" onclick="wrSendBacklog('${t.id}','${t.secId}')">${window.t('wr_s1_btn_backlog')}</button><button class="wrbtn wr-del" onclick="wrDeleteTask('${t.id}','${t.secId}')">${window.t('wr_s1_btn_delete')}</button></div></div>`; }).join('');
  return `${wrProgHTML(2)}<div class="wr-stage-h">${t('wr_s2_title',{n:aging.length})}</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=3;renderReview()">${t('wr_s2_btn_next')}</button></div>`;
}
function wrStage3HTML(){
  const backlog=[];
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.status==='Backlog'&&!wrKeptIds.has(t.id)) backlog.push({...t,secId:s.id}); }));
  if(!backlog.length){ wrStage=4; return wrStage4HTML(); }
  const cards=backlog.map(t=>`<div class="wr-card"><div class="wr-task">${dT(t.task)}</div>${t.note?`<div class="wr-note">${dT(t.note)}</div>`:''}<div class="wr-acts"><button class="wrbtn wr-act" onclick="wrActivate('${t.id}','${t.secId}')">${window.t('wr_s3_btn_activate')}</button><button class="wrbtn" onclick="wrKeepBacklog('${t.id}','${t.secId}')">${window.t('wr_s2_btn_keep')}</button><button class="wrbtn wr-del" onclick="wrDeleteTask('${t.id}','${t.secId}')">${window.t('wr_s1_btn_delete')}</button></div></div>`).join('');
  return `${wrProgHTML(3)}<div class="wr-stage-h">${t('wr_s3_title',{n:backlog.length})}</div>${cards}<div class="wr-nav"><button class="wrbtn wr-next" onclick="wrStage=4;renderReview()">${t('wr_s3_btn_next')}</button></div>`;
}
function wrDoneHTML(){
  logEvent('review','weekly',{});
  const p=getWeekPulse();
  const pulse=p?`<div class="an-wr-pulse"><div style="font-weight:600;margin-bottom:6px">${t('wr_pulse_title')}</div><div class="an-cards" style="justify-content:center">${[[t('wr_pulse_completed'),p.done],[t('wr_pulse_net_flow'),(p.net>0?'+':'')+p.net],[t('wr_pulse_cycle'),p.avgCycle+'d'],[t('wr_pulse_p1p2'),p.p1Done],[t('wr_pulse_stale'),p.stale]].map(([l,v])=>`<div class="an-card"><div class="sn">${v}</div><div class="sl">${l}</div></div>`).join('')}</div></div>`:'';
  const aiSlot=`<div class="wr-ai-debrief" id="wrAiDebrief"><button class="wrbtn wr-ai-btn" onclick="triggerWeeklyDebrief()">${t('wr_btn_ai_debrief')}</button></div>`;
  const hasKey=!!(S.settings&&S.settings.claudeKey);
  return `<div class="wr-done"><div class="wr-check">✓</div><div class="wr-title">${t('wr_done_title')}</div><div class="wr-sub">${t('wr_done_subtitle')}</div>${pulse}${hasKey?aiSlot:''}<button class="wrbtn wr-start" onclick="wrStage=0;sw('today')">${t('wr_done_btn_today')}</button></div>`;
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
function wrKeep(id,secId){ const t=ft(id,secId); if(t){ t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();showToast(window.t('toast_snoozed')); } }
function wrKeepBacklog(id,secId){ wrKeptIds.add(id); const t=ft(id,secId); if(t){ t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS(); } renderReview(); }
function wrSendBacklog(id,secId){ const t=ft(id,secId); if(t){ t.status='Backlog';t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();renderAll();showToast(window.t('toast_moved_to_backlog')); } }
function wrActivate(id,secId){ const t=ft(id,secId); if(t){ t.status='To Do';t.lastStatusChange=new Date().toISOString().split('T')[0]; saveS();renderReview();renderAll();showToast(window.t('toast_activated')); } }
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
    const hints={pool:'All tasks are in progress 🎉',week:t('kb_empty_week_hint'),today:t('kb_empty_today_hint'),done:t('kb_empty_done')};
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
        if(overdue.length){ph+=`<div class="kb-due-hdr kb-due-hdr-od">${t('kb_overdue_badge',{n:overdue.length})}</div>`;ph+=overdue.map(t=>kanbanCard(t,'pool')).join('');ph+=`<div class="kb-due-sep"></div>`;}
        if(dueSoon.length){ph+=`<div class="kb-due-hdr"><span>${t('kb_due_this_week')}</span><button class="kb-due-move-btn" onclick="event.stopPropagation();kbMoveWeekDue()" title="${window.t('kb_move_due_week_title')}">${window.t('kb_move_due_week_btn')}</button></div>`;ph+=dueSoon.map(t=>kanbanCard(t,'pool')).join('');}
        if(dueNext.length){if(dueSoon.length)ph+=`<div class="kb-due-sep"></div>`;ph+=`<div class="kb-due-hdr kb-due-hdr-nw">${t('kb_due_next_week')}</div>`;ph+=dueNext.map(t=>kanbanCard(t,'pool')).join('');}
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
      if(colId==='week'){ const hint=document.getElementById('kb-hint-week'); if(hint) hint.textContent=ordTasks.length?'':' '+t('kb_empty_active_hint'); }
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
  const leftArrow=ci>0?`<button class="kc-arr" onclick="event.stopPropagation();kMoveCard('${t.id}','${t.secId}','${col}',-1)" title="${window.t('kb_btn_move_left')}">‹</button>`:'';
  const rightArrow=ci<colOrder.length-1?`<button class="kc-arr" onclick="event.stopPropagation();kMoveCard('${t.id}','${t.secId}','${col}',1)" title="${window.t('kb_btn_move_right')}">›</button>`:'';
  const isInProg=t.status==='In Progress';
  const playBtn=col!=='done'?`<button class="kc-play${isInProg?' prog':''}" onclick="event.stopPropagation();kToggleStatus('${t.id}','${t.secId}')" title="${isInProg?window.t('kb_btn_pause'):window.t('kb_btn_play')}">${isInProg?'⏸':'▶'}</button>`:'';
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
      showToast(window.t('toast_kb_recurring_done')+(newDue?' '+window.t('toast_kb_next_cycle',{date:fd(newDue)}):''));
    } else {
      t.kanbanCol='done';t.status='Done';t.lastStatusChange=today;
      cascadeSubtasksDone(t.id);
      showToast(window.t('toast_kb_done'));
    }
  } else if(toCol==='pool'){
    t.kanbanCol=null;
    cascadeKanbanCol(t.id,'pool');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast(window.t('toast_kb_reopened_pool'));}
    else showToast(window.t('toast_kb_returned_pool'));
  } else if(toCol==='week'){
    t.kanbanCol='week';
    cascadeKanbanCol(t.id,'week');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast(window.t('toast_kb_reopened_week'));}
    else showToast(window.t('toast_kb_moved_week'));
  } else if(toCol==='today'){
    t.kanbanCol='today';
    cascadeKanbanCol(t.id,'today');
    if(from==='done'){t.status='To Do';t.lastStatusChange=today;showToast(window.t('toast_kb_reopened_today'));}
    else showToast(window.t('toast_kb_moved_today'));
  }
  const evFrom=from||'pool';
  if(toCol==='done') logEvent('done',kDragId,{s:kDragSec,p:t.priority,age:ageDays(t),oc:t.outcomes||[]});
  else if(from==='done') logEvent('reopen',kDragId,{s:kDragSec});
  logEvent('kanban',kDragId,{from:evFrom,to:toCol});
  kDragId=null;kDragSec=null;kDragFromCol=null;
  saveS();renderKanban();renderStats();
}

function kbMoveWeekDue(){
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.kanbanCol===null&&t.status!=='Done'&&t.status!=='Backlog'&&ds(t.due)==='s'){
      t.kanbanCol='week';count++;
    }
  }));
  if(!count){showToast(window.t('kb_move_due_week_none'));return;}
  logEvent('kanban','bulk',{a:'move_due_week',n:count});
  saveS();renderKanban();renderStats();
  showToast(window.t('kb_move_due_week_toast',{n:count}));
}

function kbNewWeek(){
  if(!confirm('Start a new week?\n\nThis will return all This Week and Today tasks to the Active Pool.\nDone tasks are not affected.')) return;
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if((t.kanbanCol==='week'||t.kanbanCol==='today')&&t.status!=='Done'){t.kanbanCol=null;count++;}
  }));
  logEvent('kanban','bulk',{a:'newweek',n:count});
  saveS();renderKanban();renderStats();
  showToast(window.t('toast_new_week',{n:count}));
}
function kbClearDone(){
  let count=0;
  S.sections.forEach(s=>s.tasks.forEach(t=>{
    if(t.kanbanCol==='done'){t.kanbanCol=null;t.status='To Do';t.lastStatusChange=new Date().toISOString().split('T')[0];count++;}
  }));
  logEvent('kanban','bulk',{a:'clear',n:count});
  saveS();renderKanban();renderStats();
  showToast(window.t('toast_kb_clear_done',{n:count}));
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
  dlg.style.visibility='hidden';
  dlg.style.display='block';
  const dlgH=dlg.offsetHeight||180;
  dlg.style.left=Math.min(x,window.innerWidth-340)+'px';
  dlg.style.top=Math.min(y,window.innerHeight-dlgH-10)+'px';
  dlg.style.visibility='';
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
      saveS();renderAll();renderKanban();showToast(window.t('toast_subtask_linked'));
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
  saveS();renderKanban();showToast(window.t('toast_status_changed', {status: t.status}));
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
function ctxDoBacklog(){ const id=ctxTaskId,sec=ctxTaskSec; closeCtxMenu(); if(!id) return; const t=ft(id,sec); if(!t) return; const old=t.status; t.status='Backlog';t.lastStatusChange=new Date().toISOString().split('T')[0];t.kanbanCol=null; logEvent('status',id,{from:old,to:'Backlog'}); saveS();renderAll();showToast(window.t('toast_moved_to_backlog')); }
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
  let h=`<span class="kb-fpill ${kanbanSectionFilter.has('all')?'on':''}" onclick="setKbFilter('all',event)">${t('filter_all')}</span>`;
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
  if(!rows.length) return `<div style="color:var(--muted);font-size:12px;padding:8px 0">${t('an_no_data')}</div>`;
  const scale=maxVal||Math.max(1,...rows.map(r=>Math.max(r.open,r.done)));
  const totalOpen=rows.reduce((a,r)=>a+r.open,0);
  const totalDone=rows.reduce((a,r)=>a+r.done,0);
  const header=`<div class="an-bidir-totals">
    <span class="an-bidir-tot-open">◀ ${t('an_bidir_open')}: <strong>${totalOpen}</strong></span>
    <span class="an-bidir-tot-done">${t('an_bidir_done')}: <strong>${totalDone}</strong> ▶</span>
  </div>`;
  const rowsHtml=rows.map(r=>{
    const wO=r.open?Math.max(6,Math.round(r.open/scale*100)):0;
    const wD=r.done?Math.max(6,Math.round(r.done/scale*100)):0;
    const clickAttr=r.onclick?` onclick="${r.onclick}" title="${t('an_click_filter')}"`:'' ;
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
  if(Math.abs(diff)<0.5) return `<div class="an-delta flat">— ${t('an_delta_avg')}</div>`;
  const up=diff>0;
  const good=invert?!up:up;
  return `<div class="an-delta ${good?'down':'up'}">${up?'▲':'▼'} ${Math.abs(Math.round(diff*10)/10)} ${t('an_delta_vs_avg')}</div>`;
}

function renderAnalytics(){
  const el=document.getElementById('view-analytics');
  const log=getLog();
  if(log.events.length===0&&log.weeks.length===0){
    el.innerHTML=`<div class="an-empty">${t('an_empty')}<br><small>${t('an_empty_sub')}</small></div>`;
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
    <div><div class="an-title">${t('an_title')}</div><div class="an-sub">${t('an_subtitle')}</div></div>
    <div class="an-section">
      <div class="an-section-title">${t('an_section_health')}</div>
      <div class="an-cards">
        <div class="an-card clickable" onclick="statClick('p1')" title="${t('an_open_p1s_title')}"><div class="sn ${openP1>0&&p1Over7>0?'r':openP1>0?'a':'t'}">${openP1}</div><div class="sl">${t('an_card_open_p1s')}</div><div class="an-delta ${p1Over7>0?'up':'flat'}">${p1Over7>0?t('an_card_over_7d',{n:p1Over7}):t('an_card_all_fresh')}</div></div>
        <div class="an-card clickable" onclick="statClick('aging')" title="${t('an_stale_title')}"><div class="sn ${stale>5?'r':'a'}">${stale}</div><div class="sl">${t('an_card_stale')}</div><div class="an-delta flat">${stale>0?t('an_card_click_review'):t('an_card_all_active')}</div></div>
        <div class="an-card clickable" onclick="sw('inbox')" title="${t('an_inbox_title')}"><div class="sn ${inboxSize>10?'r':inboxSize>5?'a':'t'}">${inboxSize}</div><div class="sl">${t('an_card_inbox')}</div><div class="an-delta flat">${inboxSize===0?t('an_card_inbox_zero'):inboxSize>5?t('an_card_inbox_triage'):''}</div></div>
        <div class="an-card clickable" onclick="sw('review')" title="${t('an_review_title')}"><div class="an-streak">${streakDots}</div><div class="sl">${t('an_card_weekly_review')}</div><div class="an-delta flat">${t('an_card_reviewed',{n:reviewedCount})}</div></div>
        ${focusPct!==null?`<div class="an-card"><div class="sn ${focusPct>=50?'t':'a'}">${focusPct}%</div><div class="sl">${t('an_card_focus')}</div><div class="an-delta flat">${t('an_card_focus_sub')}</div></div>`:''}
      </div>
    </div>`;
  // Work by Area
  // Work by Area — bi-directional charts with period filter
  const pStart=getAnalyticsPeriodStart(analyticsP);
  const pStartTs=new Date(pStart+'T00:00:00').getTime()/1000;
  const pLabels={week:t('an_period_week'),month:t('an_period_month'),quarter:t('an_period_quarter'),year:t('an_period_year')};
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
      <div class="an-section-title" style="margin-bottom:0">${t('an_section_work')}</div>
      <div class="an-period-filter">${periodBtns}</div>
    </div>
    <div class="an-bidir-legend">
      <span class="an-bidir-leg-open">${t('an_legend_open')}</span>
      <span class="an-bidir-leg-done">${t('an_legend_done')}</span>
    </div>
    ${catRows.length?`<div class="an-bidir-block-title">${t('an_block_category')} <span class="an-bidir-click-hint">${t('an_hint_section')}</span></div><div class="an-bidir-chart">${renderBidirChart(catRows,globalMax)}</div>`:''}
    ${priRows.length?`<div class="an-bidir-block-title" style="margin-top:16px">${t('an_block_priority')} <span class="an-bidir-click-hint">${t('an_hint_filter')}</span></div><div class="an-bidir-chart">${renderBidirChart(priRows,globalMax)}</div>`:''}
    ${pplRows.length?`<div class="an-bidir-block-title" style="margin-top:16px">${t('an_block_people')} <span class="an-bidir-click-hint">${t('an_hint_filter')}</span></div><div class="an-bidir-chart">${renderBidirChart(pplRows,globalMax)}</div>`:''}
  </div>`;
  // 6-week completed trend
  const weeks=log.weeks.slice(-6);
  if(weeks.length>=1){
    const curWkLabel=getISOWeek(new Date());
    html+=`<div class="an-section"><div class="an-section-title">${t('an_section_trend')}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">${renderBarChart(t('an_chart_completed'),weeks,'done','t',curWkLabel)}</div></div>`;
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
    html+=`<div class="an-section"><div class="an-section-title">${t('an_section_outcomes')}</div><div class="an-outcome-grid">`;
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
    <button class="an-export" onclick="exportAnalytics()">${t('an_btn_export')}</button>
    <span style="font-size:11px;color:var(--muted)">${t('an_stats_summary',{events:log.events.length,weeks:log.weeks.length})}</span>
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
  showToast(t('toast_analytics_exported'));
}

// ── KANBAN COLUMN QUICK-ADD ─────────────────────────────────────────────────
function kbColLabel(id){return ({pool:t('kb_col_pool'),week:t('kb_col_week'),today:t('kb_col_today')})[id]||id;}
function kColCtxMenu(e,colId){
  e.preventDefault();e.stopPropagation();
  closeCtxMenu();
  kColMenuCol=colId;
  document.getElementById('kColAddItem').textContent=t('kb_col_add_to',{col:kbColLabel(colId)});
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
  document.getElementById('mtitle').textContent=t('kb_modal_title_add_to',{col:kbColLabel(col)});
  if(col==='today') document.getElementById('fStat').value='In Progress';
}

// ═══ PEOPLE FILTER ═══
function populatePersonFilter(){
  const menu=document.getElementById('personDdMenu'); if(!menu) return;
  const prevQ=(document.getElementById('personDdSearch')||{}).value||'';
  const groups=(S.personGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const grpNameSet=new Set(groups.map(g=>g.name.toLowerCase()));
  const people=(S.knownConnections||[]).slice().sort().filter(n=>!grpNameSet.has(n.toLowerCase()));
  let h=`<div class="person-dd-search-wrap"><input class="person-dd-search" id="personDdSearch" type="text" placeholder="${escAttr(t('person_dd_search'))}" autocomplete="off" oninput="filterPersonDd(this.value)" onclick="event.stopPropagation()"><button class="pd-search-clear" id="pdSearchClear" onclick="clearPersonDdSearch(event)" style="display:none" title="Clear search">×</button></div>`;
  if(groups.length){
    h+=`<div class="person-dd-grp-hdr" data-sec="grp-hdr">${t('person_dd_groups')}</div>`;
    groups.forEach(g=>{
      const sel=personFilter.includes(g.name);
      h+=`<label class="person-dd-item" data-name="${escAttr(g.name.toLowerCase())}" data-type="group"><input type="checkbox" ${sel?'checked':''} onchange="setPersonFilter('${escAttr(g.name)}')"><span>⬡ ${escHtml(g.name)}</span><span style="font-size:11px;color:var(--muted);margin-left:auto;padding-left:6px">${(g.members||[]).length} ${t('person_dd_people_suffix')}</span></label>`;
    });
    if(people.length) h+=`<div class="person-dd-sep" data-sec="sep"></div><div class="person-dd-grp-hdr" data-sec="ind-hdr">${t('person_dd_individuals')}</div>`;
  }
  people.forEach(n=>{
    const sel=personFilter.includes(n);
    h+=`<label class="person-dd-item" data-name="${escAttr(n.toLowerCase())}" data-type="person"><input type="checkbox" ${sel?'checked':''} onchange="setPersonFilter('${escAttr(n)}')"><span>${escHtml(n)}</span></label>`;
  });
  if(personFilter.length) h+=`<div class="person-dd-clear"><button onclick="clearPersonFilter()">${t('person_dd_clear')}</button></div>`;
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
  const ico=`<span data-icon="user"></span> `;
  if(!personFilter.length){ btn.innerHTML=ico+t('person_dd_all'); btn.classList.remove('active'); }
  else if(personFilter.length===1){ btn.innerHTML=ico+escHtml(personFilter[0]); btn.classList.add('active'); }
  else { btn.innerHTML=ico+escHtml(t('person_dd_count',{n:personFilter.length})); btn.classList.add('active'); }
  paintIcons(btn);
}
function clearPersonDdSearch(e){
  e.stopPropagation();
  const s=document.getElementById('personDdSearch'); if(s){ s.value=''; s.focus(); }
  const btn=document.getElementById('pdSearchClear'); if(btn) btn.style.display='none';
  filterPersonDd('');
}
function filterPersonDd(q){
  const menu=document.getElementById('personDdMenu'); if(!menu) return;
  const lq=q.toLowerCase().trim();
  const clr=document.getElementById('pdSearchClear'); if(clr) clr.style.display=q?'block':'none';
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
    if(!nm){ nm=document.createElement('div'); nm.className='person-dd-no-match'; nm.textContent=t('person_dd_no_match'); menu.insertBefore(nm,menu.querySelector('.person-dd-clear')||null); }
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
  saveS(); renderAll(); showToast(t.decided?window.t('toast_decision_decided'):window.t('toast_decision_pending'));
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
  globe:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  unlink:'<path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/>',
  // v10.6 additions
  zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  kanban:'<rect x="2" y="3" width="6" height="18" rx="1"/><rect x="9" y="3" width="6" height="13" rx="1"/><rect x="16" y="3" width="6" height="9" rx="1"/>',
  'list-checks':'<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/>',
  'grid-2x2':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  'bar-chart':'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="3" y1="20" x2="21" y2="20"/>',
  'refresh-cw':'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>',
  archive:'<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  repeat:'<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  scale:'<path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'eye-off':'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  rotate:'<polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>',
  'lightning':'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  filter:'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
};
function icon(name,size,stroke){
  size=size||16; stroke=stroke||1.75;
  const path=_ICONS[name];
  if(!path) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
// Paints every <span data-icon="name"> in the document with its Lucide SVG.
// Called once at init and after any DOM-injection that adds new data-icon spans.
function paintIcons(root){
  (root||document).querySelectorAll('[data-icon]:not([data-painted])').forEach(el=>{
    const name=el.getAttribute('data-icon');
    const size=parseInt(el.getAttribute('data-icon-size'),10)||14;
    if(_ICONS[name]){ el.innerHTML=icon(name,size); el.setAttribute('data-painted',''); el.style.display='inline-flex'; el.style.verticalAlign='middle'; }
  });
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
    { id:'data',       label:'Backup',   icon:'database', desc:'Backup, restore, and auto-save'},
    { id:'appearance', label:'Theme',    icon:'palette',  desc:'Appearance, density, motion'},
    { id:'language',   label:'Language', icon:'globe',    desc:'Interface language'},
  ]},
];
const _SETTINGS_FLAT=_SETTINGS_GROUPS.flatMap(g=>g.items);
const _findSetting=id=>_SETTINGS_FLAT.find(s=>s.id===id);

let _settingsTab='categories';

// Localized label/desc helpers — fall back to the English literal in _SETTINGS_GROUPS
// when no translation key is registered. Keeps the array as the source of English defaults.
function _tSettingsGroupTitle(g){ const k='settings_group_'+g.id; const v=(typeof t==='function')?t(k):k; return (v&&v!==k)?v:g.title; }
function _tSettingsItemLabel(it){ const k='settings_tab_'+it.id; const v=(typeof t==='function')?t(k):k; return (v&&v!==k)?v:it.label; }
function _tSettingsItemDesc(it){ const k='settings_desc_'+it.id; const v=(typeof t==='function')?t(k):k; return (v&&v!==k)?v:(it.desc||''); }

function _renderSettingsNav(){
  const el=document.getElementById('fcl-nav-groups'); if(!el) return;
  el.innerHTML=_SETTINGS_GROUPS.map(g=>`
    <div class="fcl-group">
      <div class="fcl-group-label">${escHtml(_tSettingsGroupTitle(g))}</div>
      ${g.items.map(it=>`<button class="fcl-nav-item ${it.id===_settingsTab?'on':''}" data-tab="${escAttr(it.id)}" onclick="switchSettingsTab('${escJs(it.id)}')" aria-current="${it.id===_settingsTab?'page':'false'}"><span class="fcl-nav-icon">${icon(it.icon,16)}</span><span>${escHtml(_tSettingsItemLabel(it))}</span></button>`).join('')}
    </div>
  `).join('');
  // brand + close icons
  document.getElementById('fcl-brand-icon').innerHTML=icon('settings',16);
  document.getElementById('fcl-close-btn').innerHTML=icon('close',16,2);
  // Brand text (localized "Settings")
  const brandEl=document.querySelector('.fcl-brand-name');
  if(brandEl && typeof t==='function'){ const v=t('settings_brand'); if(v && v!=='settings_brand') brandEl.textContent=v; }
  document.getElementById('fcl-footer-ver').textContent='Focal v'+(typeof VER!=='undefined'?VER:'');
}
function _updateSettingsHeader(){
  const it=_findSetting(_settingsTab); if(!it) return;
  document.getElementById('fcl-section-icon').innerHTML=icon(it.icon,18,2);
  document.getElementById('fcl-section-name').textContent=_tSettingsItemLabel(it);
  document.getElementById('fcl-section-desc').textContent=_tSettingsItemDesc(it);
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
  ['categories','people','ai','outcomes','email','appearance','data','language'].forEach(t=>{
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
  if(tab==='language') renderLanguageTab();
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
        <div class="fcl-fieldrow-label">${window.t('ai_label_provider')}</div>
        <div class="fcl-fieldrow-hint">${window.t('ai_hint_provider')}</div>
      </div>
      <div><select class="fcl-input" style="max-width:320px" disabled><option>Anthropic — Claude</option></select></div>
    </div>
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">${window.t('ai_label_api_key')}<span class="req">*</span></div>
        <div class="fcl-fieldrow-hint">${window.t('ai_hint_api_key')}</div>
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
        <div class="fcl-fieldrow-label">${window.t('ai_label_model')}</div>
        <div class="fcl-fieldrow-hint">${window.t('ai_hint_model')}</div>
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
        <div class="fcl-fieldrow-label">${window.t('ai_label_actions')}</div>
        <div class="fcl-fieldrow-hint">${window.t('ai_hint_actions')}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="fcl-btn" type="button" onclick="testApiKey()">${icon('check',14)} ${window.t('ai_btn_test')}</button>
        <button class="fcl-btn fcl-btn--primary" type="button" onclick="saveSettings()">${icon('save',14)} ${window.t('misc_save')}</button>
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
  showToast(hasKey?window.t('toast_ai_saved'):window.t('toast_ai_no_key'));
}

// People manager
// v10.7 People tab — two-column layout (Groups | People), pseudo-groups,
// sticky letter headers, A-Z jump rail, inline group chips on rows.
let _pplGroupSel='all';      // 'all' | 'ungrouped' | group id
let _pplSearch='';           // search query within current selection
function _pplInitials(name){
  if(!name) return '?';
  const parts=String(name).trim().split(/\s+/);
  if(parts.length>=2) return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return parts[0].slice(0,2).toUpperCase();
}
function _pplGroupsForPerson(name){
  return (S.personGroups||[]).filter(g=>(g.members||[]).includes(name));
}
function _pplPeopleFiltered(){
  const all=(S.knownConnections||[]).slice().sort((a,b)=>a.localeCompare(b));
  const q=(_pplSearch||'').toLowerCase().trim();
  let list=all;
  if(_pplGroupSel==='ungrouped'){
    list=all.filter(n=>!(S.personGroups||[]).some(g=>(g.members||[]).includes(n)));
  } else if(_pplGroupSel!=='all'){
    const g=(S.personGroups||[]).find(x=>x.id===_pplGroupSel);
    list=g?(g.members||[]).slice().sort((a,b)=>a.localeCompare(b)).filter(n=>all.includes(n)):[];
  }
  if(q) list=list.filter(n=>n.toLowerCase().includes(q));
  return list;
}
function renderPeopleTab(){
  const body=document.getElementById('peopleMgrBody'); if(!body) return;
  // Auto-remove any individual whose name matches a group name
  const groupNamesLc=new Set((S.personGroups||[]).map(g=>g.name.toLowerCase()));
  const before=(S.knownConnections||[]).length;
  S.knownConnections=(S.knownConnections||[]).filter(n=>!groupNamesLc.has(n.toLowerCase()));
  if(S.knownConnections.length!==before) saveS();

  const all=(S.knownConnections||[]).slice().sort((a,b)=>a.localeCompare(b));
  const groups=(S.personGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const ungroupedCount=all.filter(n=>!(S.personGroups||[]).some(g=>(g.members||[]).includes(n))).length;
  const selectedGroup=_pplGroupSel!=='all'&&_pplGroupSel!=='ungrouped'?groups.find(g=>g.id===_pplGroupSel):null;
  if(_pplGroupSel!=='all'&&_pplGroupSel!=='ungrouped'&&!selectedGroup){ _pplGroupSel='all'; }
  const filtered=_pplPeopleFiltered();
  const letters=[...new Set(filtered.map(n=>n[0]?.toUpperCase()).filter(Boolean))];

  // ---- LEFT COLUMN: groups list ----
  let groupsCol=`<button class="ppl-grow ${_pplGroupSel==='all'?'on':''}" onclick="setPeopleGroup('all')"><span class="ppl-grow-ic">${icon('users',14)}</span><span class="ppl-grow-lbl">All people</span><span class="ppl-grow-cnt">${all.length}</span></button>`;
  groupsCol+=`<button class="ppl-grow ${_pplGroupSel==='ungrouped'?'on':''}" onclick="setPeopleGroup('ungrouped')"><span class="ppl-grow-ic ppl-grow-ic-dashed"></span><span class="ppl-grow-lbl">Ungrouped</span><span class="ppl-grow-cnt">${ungroupedCount}</span></button>`;
  groupsCol+=`<div class="ppl-grow-eyebrow"><span>Groups</span><button class="ppl-grow-new" onclick="openAddGroup()">${icon('plus',12)} New</button></div>`;
  if(groups.length){
    groups.forEach(g=>{
      const color=g.color||_pplPickColor(g.id||g.name);
      const cnt=(g.members||[]).filter(n=>all.includes(n)).length;
      groupsCol+=`<button class="ppl-grow ${_pplGroupSel===g.id?'on':''}" onclick="setPeopleGroup('${escJs(g.id)}')"><span class="ppl-grow-dot" style="background:${escAttr(color)};box-shadow:0 0 0 2px ${escAttr(color)}22"></span><span class="ppl-grow-lbl">${escHtml(g.name)}</span><span class="ppl-grow-cnt">${cnt}</span></button>`;
    });
  } else {
    groupsCol+=`<div class="ppl-grow-empty">Groups bundle people you act on together — Board, MT, family. Create one with <strong>+ New</strong>.</div>`;
  }

  // ---- RIGHT COLUMN: people panel ----
  // Context header (only when a real group is selected)
  let contextHdr='';
  if(selectedGroup){
    const color=selectedGroup.color||_pplPickColor(selectedGroup.id);
    contextHdr=`<div class="ppl-ctx-hdr">
      <span class="ppl-ctx-dot" style="background:${escAttr(color)}"></span>
      <span class="ppl-ctx-name">${escHtml(selectedGroup.name)}</span>
      <span class="ppl-ctx-cnt">${(selectedGroup.members||[]).length} member${(selectedGroup.members||[]).length===1?'':'s'}</span>
      <button class="ppl-ctx-btn" onclick="renameGroupPrompt('${escJs(selectedGroup.id)}')" title="Rename group" aria-label="Rename group">${icon('edit',14)}</button>
      <button class="ppl-ctx-btn ppl-ctx-btn-danger" onclick="deleteGroup('${escJs(selectedGroup.id)}')" title="Delete group" aria-label="Delete group">${icon('trash',14)}</button>
    </div>`;
  }
  // Search + Add row
  const searchPh=selectedGroup?`Search in ${escAttr(selectedGroup.name)}…`:_pplGroupSel==='ungrouped'?'Search ungrouped…':'Search people…';
  const addPh=selectedGroup?`Add to ${escAttr(selectedGroup.name)}…`:'New person or organization…';
  const searchRow=`<div class="ppl-search-row">
    <div class="ppl-search-wrap">${icon('search',14)}<input class="fcl-input ppl-search-inp" id="pplSearchInp" placeholder="${searchPh}" value="${escAttr(_pplSearch)}" oninput="pplSearchInput(this.value)" onkeydown="pplSearchKeydown(event)" autocomplete="off"></div>
    <button class="fcl-btn fcl-btn--primary" onclick="addPerson()">${icon('plus',14)} Add person</button>
  </div>`;
  // Build the list with sticky letter headers
  let listHtml='';
  if(filtered.length){
    let lastLetter='';
    listHtml=filtered.map(n=>{
      const L=(n[0]||'').toUpperCase();
      const header=L!==lastLetter?`<div class="ppl-letter-hdr" id="ppl-letter-${L}">${L}</div>`:'';
      lastLetter=L;
      const init=_pplInitials(n);
      const color=_pplPickColor(n);
      const memberGroups=_pplGroupsForPerson(n);
      const chips=memberGroups.map(g=>`<span class="ppl-mini-chip" style="border-color:${escAttr(g.color||_pplPickColor(g.id))};color:${escAttr(g.color||_pplPickColor(g.id))}" onclick="event.stopPropagation();setPeopleGroup('${escJs(g.id)}')"><span class="ppl-mini-dot" style="background:${escAttr(g.color||_pplPickColor(g.id))}"></span>${escHtml(g.name)}</span>`).join('');
      const ctxBtn=selectedGroup?`<button class="ppl-row-btn" onclick="toggleGrpMember('${escJs(selectedGroup.id)}','${escJs(n)}')" title="Remove from ${escAttr(selectedGroup.name)}" aria-label="Remove from group">${icon('close',14)}</button>`:`<button class="ppl-row-btn" onclick="deletePerson('${escJs(n)}')" title="Remove person" aria-label="Remove">${icon('trash',14)}</button>`;
      return header+`<div class="ppl-row2" data-name="${escAttr(n)}">
        <span class="ppl-avatar" style="background:${escAttr(color)}">${escHtml(init)}</span>
        <span class="ppl-row2-name">${escHtml(n)}</span>
        <span class="ppl-row2-chips">${chips}</span>
        ${ctxBtn}
      </div>`;
    }).join('');
  } else if(_pplSearch){
    listHtml=`<div class="ppl-empty">No matches for "${escHtml(_pplSearch)}".</div>`;
  } else if(_pplGroupSel==='ungrouped'){
    listHtml=`<div class="ppl-empty">Everyone is in at least one group.</div>`;
  } else if(selectedGroup){
    listHtml=`<div class="ppl-empty">No one in <strong>${escHtml(selectedGroup.name)}</strong> yet. Type a name above and press <kbd>⏎</kbd>.</div>`;
  } else {
    listHtml=`<div class="ppl-empty">No people yet — add someone above.</div>`;
  }
  // A-Z rail
  const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const railHtml=ALPHA.split('').map(L=>{
    const present=letters.includes(L);
    return `<button class="ppl-rail-btn ${present?'on':''}" ${present?`onclick="pplJumpLetter('${L}')"`:'disabled'}>${L}</button>`;
  }).join('');
  // Footer hint
  let footer='';
  if(_pplGroupSel==='all') footer=`Showing ${filtered.length} of ${all.length}. Click a group chip to jump there.`;
  else if(_pplGroupSel==='ungrouped') footer=`People not in any group yet. Open a person to assign.`;
  else if(selectedGroup) footer=`People in <strong>${escHtml(selectedGroup.name)}</strong>. Add by typing above and hitting <kbd>⏎</kbd>.`;

  body.innerHTML=`<div class="ppl-shell">
    <aside class="ppl-groups-col">${groupsCol}</aside>
    <section class="ppl-people-col">
      ${contextHdr}
      ${searchRow}
      <div class="ppl-list-wrap">
        <div class="ppl-list" id="pplList">${listHtml}</div>
        <div class="ppl-rail">${railHtml}</div>
      </div>
      <div class="ppl-footer">${footer}</div>
    </section>
  </div>`;
}
function setPeopleGroup(id){
  _pplGroupSel=id;
  _pplSearch='';
  renderPeopleTab();
  setTimeout(()=>document.getElementById('pplSearchInp')?.focus(),20);
}
function pplSearchInput(v){
  _pplSearch=v;
  // re-render only the list portion to avoid losing input focus
  const wrap=document.getElementById('pplList'); if(!wrap){ renderPeopleTab(); return; }
  renderPeopleTab(); // simpler: full re-render, search input is recreated and we re-focus it
  const inp=document.getElementById('pplSearchInp'); if(inp){ inp.focus(); inp.setSelectionRange(v.length,v.length); }
}
function pplSearchKeydown(e){
  if(e.key==='Enter'){
    e.preventDefault();
    addPerson();
  } else if(e.key==='Escape'){
    if(_pplSearch){ _pplSearch=''; renderPeopleTab(); setTimeout(()=>document.getElementById('pplSearchInp')?.focus(),10); }
  }
}
function pplJumpLetter(L){
  const target=document.getElementById('ppl-letter-'+L);
  const list=document.getElementById('pplList');
  if(target&&list){ list.scrollTo({top:target.offsetTop-4,behavior:'smooth'}); }
}
function renameGroupPrompt(id){
  const g=(S.personGroups||[]).find(x=>x.id===id); if(!g) return;
  const name=prompt('Rename group "'+g.name+'":',g.name);
  if(!name||!name.trim()||name.trim()===g.name) return;
  const newName=name.trim();
  if((S.personGroups||[]).some(x=>x.id!==id&&x.name.toLowerCase()===newName.toLowerCase())){
    showToast(window.t('toast_grp_exists')); return;
  }
  // Update personFilter if it referenced the old name
  personFilter=personFilter.map(f=>f===g.name?newName:f);
  g.name=newName;
  saveS(); populatePersonFilter(); renderPeopleTab(); applyF();
  showToast(window.t('toast_grp_renamed',{name:newName}));
}
function addPerson(){
  const inp=document.getElementById('pplSearchInp')||document.getElementById('pplAddInp'); if(!inp) return;
  const name=(inp.value||'').trim(); if(!name) return;
  if((S.personGroups||[]).some(g=>g.name.toLowerCase()===name.toLowerCase())){
    showToast(window.t('toast_person_is_group',{name})); return;
  }
  if(!S.knownConnections) S.knownConnections=[];
  if(!S.knownConnections.includes(name)){ S.knownConnections.push(name); }
  // If a group is currently selected, also add this person to that group
  if(_pplGroupSel!=='all'&&_pplGroupSel!=='ungrouped'){
    const g=(S.personGroups||[]).find(x=>x.id===_pplGroupSel);
    if(g){ if(!g.members) g.members=[]; if(!g.members.includes(name)) g.members.push(name); }
  }
  saveS(); populatePersonFilter();
  _pplSearch='';
  renderPeopleTab();
  setTimeout(()=>document.getElementById('pplSearchInp')?.focus(),20);
}
function deletePerson(name){
  if(!confirm(`Remove "${name}" from your connections? They'll be removed from all tasks and groups.`)) return;
  S.knownConnections=(S.knownConnections||[]).filter(n=>n!==name);
  (S.personGroups||[]).forEach(g=>{ g.members=(g.members||[]).filter(n=>n!==name); });
  personFilter=personFilter.filter(f=>f!==name);
  // also remove from any task's connections
  S.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.connections) t.connections=t.connections.filter(c=>c!==name); }));
  saveS(); populatePersonFilter(); renderPeopleTab(); applyF();
}
function openAddGroup(){ _editGrpId='__new__'; _newGrpMembers=[]; _newGrpName=''; renderPeopleTab(); setTimeout(()=>document.getElementById('pplGrpNameInp')?.focus(),50); }
function cancelAddGroup(){ _editGrpId=null; _newGrpMembers=[]; _newGrpName=''; renderPeopleTab(); }
function toggleNewGrpMember(name){ const inp=document.getElementById('pplGrpNameInp'); if(inp) _newGrpName=inp.value; const i=_newGrpMembers.indexOf(name); if(i>-1) _newGrpMembers.splice(i,1); else _newGrpMembers.push(name); renderPeopleTab(); }
function saveNewGroup(){
  const inp=document.getElementById('pplGrpNameInp');
  const name=((inp&&inp.value)||_newGrpName).trim(); if(!name){ inp?.focus(); return; }
  if(!S.personGroups) S.personGroups=[];
  if(S.personGroups.find(g=>g.name.toLowerCase()===name.toLowerCase())){ showToast(window.t('toast_grp_exists')); return; }
  S.personGroups.push({id:genId('grp'),name,members:[..._newGrpMembers]});
  S.knownConnections=(S.knownConnections||[]).filter(n=>n.toLowerCase()!==name.toLowerCase());
  _editGrpId=null; _newGrpMembers=[]; _newGrpName='';
  saveS(); populatePersonFilter(); renderPeopleTab(); showToast(window.t('toast_grp_created',{name}));
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
  if(!key){ st.textContent=window.t('ai_status_enter_key'); st.style.display='block'; st.style.background='var(--p1bg)'; st.style.color='var(--p1)'; return; }
  st.textContent=window.t('ai_status_testing'); st.style.display='block'; st.style.background='var(--bg)'; st.style.color='var(--muted)';
  const result=await _claudeRaw(key,model,[{role:'user',content:'Reply with just the word OK.'}],10);
  if(result&&result.toLowerCase().includes('ok')){ st.textContent=window.t('ai_status_ok'); st.style.background='var(--p4bg)'; st.style.color='var(--p4)'; }
  else { st.textContent=window.t('ai_status_fail'); st.style.background='var(--p1bg)'; st.style.color='var(--p1)'; }
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
  if(!key){ showToast(window.t('toast_ai_add_key')); openSettings(); return null; }
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
  if(!rawRes){ showToast(window.t('toast_ai_parse_failed')); return; }
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
    showToast(window.t('toast_ai_parsed'));
  } catch{ showToast(window.t('toast_ai_response_err')); }
}

async function nlBatchCapture(lines,btn){
  btn.disabled=true; btn.classList.add('loading'); btn.textContent=`Parsing ${lines.length} tasks…`;
  const ctx=_nlContext();
  const sys=`Return a JSON array only. Each item:{task,parentTask(title|null),note,section,priority(P1/P2/P3/P4),due(YYYY-MM-DD|null),connections[],outcomes[],type(once|recurring|decision),urgent(0|1)}. parentTask=parent title if subtask else null.`;
  const prompt=`${_nlCtxStr(ctx)}\n\nTasks:\n${lines.map((l,i)=>`${i+1}. ${l}`).join('\n')}`;
  const maxTok=Math.min(Math.max(600,lines.length*120),4000);
  const rawRes=await callClaude([{role:'user',content:prompt}],maxTok,sys);
  btn.disabled=false; btn.classList.remove('loading'); btn.textContent='✨ AI → Task';
  if(!rawRes){ showToast(window.t('toast_ai_parse_failed')); return; }
  try{
    const json=rawRes.match(/\[[\s\S]*\]/)?.[0]; if(!json) throw new Error('no array');
    const tasks=JSON.parse(json); if(!Array.isArray(tasks)||!tasks.length) throw new Error('empty');
    nlBatchShowPreview(tasks,lines.length);
  } catch(err){
    if(err instanceof SyntaxError) showToast(window.t('toast_ai_truncated'));
    else showToast(window.t('toast_ai_response_err'));
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
  showToast(subCount?window.t('toast_ai_created_parents_subs',{parents:parentCount,subs:subCount}):window.t('toast_ai_created',{n:tasks.length}));
}

// ═══ NL FILL MODAL (B.3) ═══
async function nlFillModal(){
  const desc=document.getElementById('fTask')?.value.trim();
  if(!desc){ showToast(window.t('toast_ai_need_desc')); return; }
  const btn=document.getElementById('modalAiBtn');
  btn.disabled=true; btn.textContent='Filling…';
  const ctx=_nlContext();
  const sys=`Return a JSON object only:{task,note,section,priority(P1/P2/P3/P4),due(YYYY-MM-DD|null),connections[],outcomes[],type(once|recurring|decision),urgent(0|1)}`;
  const prompt=`${_nlCtxStr(ctx)}\n\nTask:"${desc}"`;
  const rawRes=await callClaude([{role:'user',content:prompt}],250,sys);
  btn.disabled=false; btn.textContent='✨ AI-fill';
  if(!rawRes){ showToast(window.t('toast_ai_fill_failed')); return; }
  try{
    const json=rawRes.match(/\{[\s\S]*\}/)?.[0]; if(!json) throw new Error('no json');
    const p=JSON.parse(json);
    if(p.task) document.getElementById('fTask').value=p.task;
    if(p.note) document.getElementById('fNote').value=p.note;
    _nlApplyToModal(p,desc);
    showToast(window.t('toast_ai_filled'));
  } catch{ showToast(window.t('toast_ai_response_err')); }
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
    showToast(window.t('toast_bk_exported'));
  }catch(err){
    console.error('bkExport:',err);
    showToast(window.t('toast_bk_export_failed'));
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
      if(!v.ok){ showToast(window.t('toast_bk_invalid',{reason:v.reason}), 6000); return; }
      const taskCount=obj.sections.reduce((n,s)=>n+s.tasks.length,0);
      const cur=S.sections.reduce((n,s)=>n+s.tasks.length,0);
      if(!confirm(`Restore from this backup?\n\nIncoming: ${obj.sections.length} sections, ${taskCount} tasks\nCurrent:  ${S.sections.length} sections, ${cur} tasks\n\nThis OVERWRITES your current Focal data. A safety copy of your current state will be saved to localStorage as focal_v1_prerestore_<timestamp>.\n\nProceed?`)) return;
      // safety: snapshot current state before clobbering
      try{ localStorage.setItem('focal_v1_prerestore_'+Date.now(), localStorage.getItem('focal_v1')||''); }catch{}
      bkApply(obj);
      logEvent('backup_import','',{tasks:taskCount,sections:obj.sections.length});
      showToast(window.t('toast_bk_restored',{n:taskCount}));
      renderDataTab();
    }catch(err){
      console.error('bkImportFile:',err);
      showToast(window.t('toast_bk_parse_err'), 6000);
    }
  };
  reader.onerror=()=>showToast(window.t('toast_bk_read_err'));
  reader.readAsText(file);
}

// ── B. Auto-backup: connect, sync, restore via File System Access API ──
const _FSA_SUPPORTED=()=>typeof window.showSaveFilePicker==='function';

async function bkConnect(){
  if(!_FSA_SUPPORTED()){ showToast(window.t('toast_bk_browser'), 6000); return; }
  try{
    const handle=await window.showSaveFilePicker({
      suggestedName:'focal-backup.json',
      types:[{description:'Focal Backup',accept:{'application/json':['.json']}}],
      id:'focal-backup', startIn:'documents'
    });
    const db=await etOpenDB();
    await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,'focal_backup');tx.oncomplete=res;tx.onerror=rej;});
    _bkHandle=handle;
    _bkSuppressAutoSync=false; // explicit user action — re-enable
    await bkSync(true);
    showToast(window.t('toast_bk_connected'));
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
  // v10.7.1: corruption-recovery suppression. Skip non-forced syncs.
  // Forced syncs (user clicks "Save now") clear the flag — it's explicit consent.
  if(_bkSuppressAutoSync && !force) return;
  if(force) _bkSuppressAutoSync=false;
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

// Parse metadata from a safety-snapshot localStorage key.
function _snapshotInfo(key){
  const tsMatch=key.match(/_(\d+)$/);
  const ts=tsMatch?parseInt(tsMatch[1],10):0;
  const raw=(()=>{ try{ return localStorage.getItem(key); }catch{ return null; } })();
  const sizeKB=raw?(raw.length/1024).toFixed(1):'?';
  let sections=0,tasks=0,valid=false,obj=null;
  if(raw){ try{ obj=JSON.parse(raw); const v=bkValidate(obj); valid=v.ok; if(valid){ sections=obj.sections.length; tasks=obj.sections.reduce((n,s)=>n+s.tasks.length,0); } }catch{} }
  const type=key.startsWith('focal_v1_corrupted_')?'CORRUPTED':'PRE-RESTORE';
  return{ts,sizeKB,sections,tasks,valid,type,obj};
}

// Format a snapshot timestamp as a friendly string.
function _snapFriendlyTime(ts){
  if(!ts) return '—';
  const d=new Date(ts),now=new Date();
  const isToday=d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
  const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  return isToday?'Today · '+time:d.toLocaleDateString([],{month:'short',day:'numeric'})+' · '+time;
}

// Restore state from a safety snapshot key.
function bkRestoreSnapshot(key){
  const info=_snapshotInfo(key);
  const cur=S.sections.reduce((n,s)=>n+s.tasks.length,0);
  if(!confirm(`Restore this snapshot?\n\nSnapshot: ${info.sections} sections, ${info.tasks} tasks\nCurrent:  ${S.sections.length} sections, ${cur} tasks\n\nYour current state will be saved as a new pre-restore snapshot first.\n\nProceed?`)) return;
  try{ localStorage.setItem('focal_v1_prerestore_'+Date.now(), localStorage.getItem('focal_v1')||''); }catch{}
  try{
    const raw=localStorage.getItem(key);
    if(!raw){ showToast(window.t('toast_bk_snap_empty'),6000); return; }
    const obj=JSON.parse(raw);
    const v=bkValidate(obj);
    if(!v.ok){ showToast(window.t('toast_bk_invalid',{reason:v.reason}),6000); return; }
    localStorage.setItem('focal_v1',raw);
    location.reload();
  }catch(err){
    console.error('bkRestoreSnapshot:',err);
    showToast(window.t('toast_bk_parse_err'),6000);
  }
}

// Delete a safety snapshot from localStorage.
// Two-click pattern: first click arms the button; second click confirms.
// Avoids browser confirm() which gets suppressed after repeated dialogs.
let _bkDelArmed=null;
function bkDeleteSnapshot(key){
  if(_bkDelArmed!==key){
    _bkDelArmed=key;
    const btn=document.querySelector(`[data-bkdel="${CSS.escape(key)}"]`);
    if(btn){ btn.textContent=window.t('data_snap_btn_delete_confirm'); btn.style.background='var(--fcl-danger)'; btn.style.color='#fff'; btn.style.borderColor='var(--fcl-danger)'; }
    setTimeout(()=>{ if(_bkDelArmed===key){ _bkDelArmed=null; renderDataTab(); } },3000);
    return;
  }
  _bkDelArmed=null;
  try{ localStorage.removeItem(key); }catch{}
  showToast(window.t('toast_bk_snap_deleted'));
  renderDataTab();
}

// Toggle inline preview panel for a snapshot row.
function bkToggleSnapshotPreview(key){
  const el=document.getElementById('bksp-'+key);
  if(!el) return;
  const open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  const btn=document.getElementById('bksb-'+key);
  if(btn){ btn.classList.toggle('on',!open); }
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
            <h3>${window.t('data_h_manual_backup')}</h3>
            <p>${window.t('data_p_manual_backup')}</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="fcl-btn" type="button" onclick="bkExport()">${icon('download',14)} ${window.t('data_btn_export')}</button>
          <label class="fcl-btn" style="cursor:pointer">${icon('upload',14)} ${window.t('data_btn_import')}<input type="file" accept="application/json,.json" style="display:none" onchange="bkImportFile(this.files[0]);this.value=''"></label>
        </div>
      </section>

      <section class="fcl-card">
        <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <h3 style="margin:0;font-size:15.5px;font-weight:600;color:var(--fcl-text)">${window.t('data_h_autobackup')}</h3>
            ${connected&&!_bkSuppressAutoSync?`<span class="fcl-badge fcl-badge--success fcl-badge--dot">${window.t('data_badge_connected')}</span>`:''}
            ${connected&&_bkSuppressAutoSync?`<span class="fcl-badge fcl-badge--warning fcl-badge--dot">${window.t('data_badge_paused')}</span>`:''}
          </div>
        </header>
        ${connected&&_bkSuppressAutoSync?`<div style="margin-bottom:14px;padding:10px 12px;background:var(--fcl-warning-tint);border:1px solid var(--fcl-warning);border-radius:var(--fcl-r-md);color:var(--fcl-warning);font-size:12.5px;line-height:1.5"><strong>Auto-sync paused.</strong> Focal recovered from a corrupted load and is showing demo state. To protect your backup file from being overwritten, automatic saves are off. <strong>Restore your real data first</strong> (DevTools → Local Storage → focal_v1_corrupted_*), then click <strong>↻ Save now</strong> below to confirm and resume auto-sync.</div>`:''}
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
            <button class="fcl-btn fcl-btn--sm" type="button" onclick="bkSync(true)">${icon('save',14)} ${window.t('data_btn_save_now')}</button>
            <button class="fcl-btn fcl-btn--sm" type="button" onclick="bkRestoreFromFile()">${icon('refresh',14)} ${window.t('data_btn_restore')}</button>
            <button class="fcl-btn fcl-btn--sm fcl-btn--danger" type="button" onclick="bkDisconnect()" style="margin-left:auto">${icon('unlink',14)} ${window.t('data_btn_disconnect')}</button>
          </div>
        `:`
          <button class="fcl-btn fcl-btn--primary" type="button" ${fsaOk?'':'disabled style="opacity:.5;cursor:not-allowed"'} onclick="bkConnect()">${icon('link',14)} ${window.t('data_btn_connect')}</button>
        `}
      </section>

      ${snapshots.length?`
        <section>
          <div class="fcl-section-head">
            <div>
              <h3>${window.t('data_snap_h')}</h3>
              <p>${window.t('data_snap_p')}</p>
            </div>
          </div>
          <div class="fcl-list" style="padding:0">
            ${snapshots.map(k=>{
              const info=_snapshotInfo(k);
              const time=_snapFriendlyTime(info.ts);
              const isCorrupted=info.type==='CORRUPTED';
              const badgeCls=isCorrupted?'fcl-badge--warning':'fcl-badge--neutral';
              const badgeTxt=isCorrupted?window.t('data_snap_corrupted'):window.t('data_snap_pre_restore');
              const previewRows=info.valid&&info.obj
                ?info.obj.sections.map(s=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--fcl-border-subtle);font-size:12.5px"><span>${escHtml((s.icon||'')+' '+(s.title||''))}</span><span style="color:var(--fcl-text-faint)">${s.tasks.length} tasks</span></div>`).join('')
                :`<span style="color:var(--fcl-text-faint);font-size:12.5px">${info.valid?'No sections':window.t('toast_bk_parse_err')}</span>`;
              return `<div>
                <div class="fcl-list-row" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px">
                  <span class="fcl-badge ${badgeCls}" style="flex-shrink:0">${badgeTxt}</span>
                  <span style="font-size:12.5px;font-weight:500;flex:1;min-width:80px">${escHtml(time)}</span>
                  <span style="font-size:11.5px;color:var(--fcl-text-faint);white-space:nowrap">${info.sizeKB} KB · ${info.sections} sec · ${info.tasks} tasks</span>
                  <div style="display:flex;gap:5px;flex-shrink:0">
                    <button id="bksb-${escHtml(k)}" class="fcl-btn fcl-btn--sm fcl-btn--ghost" type="button" onclick="bkToggleSnapshotPreview('${k}')">${window.t('data_snap_btn_preview')}</button>
                    <button class="fcl-btn fcl-btn--sm" type="button" onclick="bkRestoreSnapshot('${k}')">${window.t('data_snap_btn_restore')}</button>
                    <button class="fcl-btn fcl-btn--sm fcl-btn--danger" type="button" data-bkdel="${escHtml(k)}" onclick="bkDeleteSnapshot('${k}')">${icon('trash',12)}</button>
                  </div>
                </div>
                <div id="bksp-${escHtml(k)}" style="display:none;background:var(--fcl-bg-code);border-radius:0 0 var(--fcl-r-sm) var(--fcl-r-sm);padding:10px 16px;margin:0 0 2px">${previewRows}</div>
              </div>`;
            }).join('')}
          </div>
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
let _etHandle=null, _etTasks=[], _etPendingId=null, _etError=null;

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
  _etError=null;
  try{
    const db=await etOpenDB();
    const handle=await new Promise((res,rej)=>{const tx=db.transaction('handles','readonly');const r=tx.objectStore('handles').get('email_tasks');r.onsuccess=e=>res(e.target.result||null);r.onerror=rej;});
    if(!handle){_etHandle=null;_etTasks=[];renderEmailTasks();return;}
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm==='denied'){_etHandle=null;_etTasks=[];renderEmailTasks();return;}
    if(perm==='prompt'){const g=await handle.requestPermission({mode:'readwrite'});if(g!=='granted'){_etHandle=null;_etTasks=[];renderEmailTasks();return;}}
    _etHandle=handle;
    const file=await handle.getFile();
    let all;
    try{ all=JSON.parse(await file.text()); }
    catch(perr){
      // Do NOT treat a parse failure as "empty" and never write over the file:
      // a mid-sync OneDrive view can look like corruption even though the home
      // copy is intact. Surface an error and stop. (Task app contract 2026-06-10.)
      console.warn('etLoad parse failed:',perr);
      _etError='parse'; _etTasks=[]; updateInboxBadge(); renderEmailTasks(); return;
    }
    if(!Array.isArray(all)){ _etError='parse'; _etTasks=[]; updateInboxBadge(); renderEmailTasks(); return; }
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

// Amsterdam-local ISO 8601 timestamp (CEST). Matches the format the extraction job writes.
function etNow(){ return new Date().toLocaleString('sv-SE',{timeZone:'Europe/Amsterdam',hour12:false}).replace(' ','T')+'+02:00'; }

// Single entry point for every triage decision. Writes ONLY status + processed_at
// on the one acted task and nothing else (Task app contract, 2026-06-10).
// Safety: re-read the file fresh at write time; if it does not parse, abort and do
// NOT overwrite (a mid-sync OneDrive view can look like corruption). Verify the
// serialized output re-parses with an unchanged task count before writing.
// createWritable() streams to a browser-managed swap file and atomically moves it
// into place on close() — a temp-file-then-rename, so tasks.json is never left
// partially written. Returns true on a successful save, false on any abort.
async function etApplyDecision(taskId, status){
  if(!_etHandle) return false;
  let all;
  try{
    const file=await _etHandle.getFile();
    all=JSON.parse(await file.text());
  }catch(err){
    console.warn('etApplyDecision read/parse failed:',err);
    showToast('Tasks file unreadable — nothing saved. Try again in a moment.');
    return false;
  }
  if(!Array.isArray(all)){ showToast('Tasks file unreadable — nothing saved.'); return false; }
  const origCount=all.length;
  const t=all.find(x=>x.task_id===taskId);
  if(!t){
    // Already processed by another writer since load — drop locally, leave file alone.
    _etTasks=_etTasks.filter(x=>x.task_id!==taskId);
    updateInboxBadge(); renderEmailTasks();
    return false;
  }
  t.status=status;
  t.processed_at=etNow();
  // Verify before replacing: output must re-parse and keep the same task count.
  const out=JSON.stringify(all,null,2);
  try{ if(JSON.parse(out).length!==origCount) throw new Error('count changed'); }
  catch(verr){ console.warn('etApplyDecision verify failed:',verr); showToast('Write verification failed — nothing saved.'); return false; }
  try{
    const w=await _etHandle.createWritable();
    await w.write(out);
    await w.close();
  }catch(err){
    console.warn('etApplyDecision write failed:',err);
    showToast('Could not save tasks file.');
    return false;
  }
  _etTasks=_etTasks.filter(x=>x.task_id!==taskId);
  updateInboxBadge();
  renderEmailTasks();
  return true;
}

// Add → status 'added' (live work until done). Called from the modal save once the
// user confirms the imported task. Before 2026-06-10 this left status 'open', which
// inflated open counts; the contract now requires 'added'.
async function etMarkProcessed(taskId){ await etApplyDecision(taskId,'added'); }

// Skip → status 'skipped' (closed, not tracked). Before 2026-06-10 the app wrote
// 'dismissed' here; 'dismissed' is now reserved for the weekly triage.
async function etSkip(taskId){ if(await etApplyDecision(taskId,'skipped')) showToast('Email task skipped'); }

// Done → status 'done'. For items Luciano already completed before they reach him.
async function etDone(taskId){ if(await etApplyDecision(taskId,'done')) showToast('Marked done'); }

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
  if(_etError==='parse'){
    el.innerHTML='<div class="et-connect" style="border-color:var(--p1)"><span>⚠️ Tasks file could not be read — it may be mid-sync in OneDrive. The file was left untouched. Wait a moment and retry.</span><button class="et-conn-btn" onclick="etLoad()">Retry</button></div>';
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
      <div class="et-acts"><button class="et-btn et-add" onclick="etAddTask('${t.task_id}')">Add as Task</button><button class="et-btn et-done" onclick="etDone('${t.task_id}')">Done</button><button class="et-btn et-skip" onclick="etSkip('${t.task_id}')">Skip</button></div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="et-section-hdr"><span>📋 Tasks</span><span class="et-count">${_etTasks.length} pending</span></div><div class="et-cards">${cards}</div>`;
}

// ═══ APPEARANCE ═══
// Three theme values: 'light' | 'dark' | 'auto'. Auto follows the OS preference
// via prefers-color-scheme and reacts live to OS changes (see _osThemeMedia listener).
function _osPrefersDark(){
  return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme(){
  const pref=(S.settings&&S.settings.theme)||'light';
  const dark = pref==='dark' || (pref==='auto' && _osPrefersDark());
  document.documentElement.classList.toggle('dark',dark);
}
function setTheme(t){
  if(!S.settings) S.settings={};
  S.settings.theme=t;
  saveS();
  applyTheme();
  renderAppearanceTab();
}
// Live OS-theme listener: when user is in Auto mode and toggles Windows/macOS dark mode,
// the app flips immediately without a reload.
(function _initOsThemeListener(){
  if(!window.matchMedia) return;
  const m=window.matchMedia('(prefers-color-scheme: dark)');
  const h=()=>{ if((typeof S!=='undefined')&&S.settings&&S.settings.theme==='auto') applyTheme(); };
  if(m.addEventListener) m.addEventListener('change',h);
  else if(m.addListener) m.addListener(h);
})();
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
    {v:'light',label:t('appearance_theme_light'),icon:'sun'},
    {v:'dark', label:t('appearance_theme_dark'), icon:'moon'},
    {v:'auto', label:t('appearance_theme_auto'), icon:'monitor'},
  ];
  const densityOpts=[
    {v:'compact',label:t('appearance_density_compact')},
    {v:'cozy',   label:t('appearance_density_cozy')},
    {v:'roomy',  label:t('appearance_density_roomy')},
  ];
  el.innerHTML=`
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">${t('appearance_theme_label')}</div>
        <div class="fcl-fieldrow-hint">${t('appearance_theme_hint')}</div>
      </div>
      <div>
        <div class="fcl-seg" role="radiogroup" aria-label="${escAttr(t('appearance_theme_label'))}">
          ${themeOpts.map(o=>`<button class="fcl-seg-btn ${theme===o.v?'on':''}" role="radio" aria-checked="${theme===o.v}" onclick="setTheme('${escJs(o.v)}')">${icon(o.icon,14)} ${escHtml(o.label)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="fcl-fieldrow">
      <div>
        <div class="fcl-fieldrow-label">${t('appearance_density_label')}</div>
        <div class="fcl-fieldrow-hint">${t('appearance_density_hint')}</div>
      </div>
      <div>
        <div class="fcl-seg" role="radiogroup" aria-label="${escAttr(t('appearance_density_label'))}">
          ${densityOpts.map(o=>`<button class="fcl-seg-btn ${density===o.v?'on':''}" role="radio" aria-checked="${density===o.v}" onclick="setDensity('${escJs(o.v)}')">${escHtml(o.label)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="fcl-fieldrow" style="border-bottom:0">
      <div>
        <div class="fcl-fieldrow-label">${t('appearance_motion_label')}</div>
        <div class="fcl-fieldrow-hint">${t('appearance_motion_hint')}</div>
      </div>
      <div>
        <button class="fcl-toggle" type="button" aria-pressed="${reduceMotion}" onclick="setReduceMotion(${!reduceMotion})">
          <span class="fcl-toggle-track"><span class="fcl-toggle-thumb"></span></span>
          <span style="font-size:13.5px;color:var(--fcl-text-dim)">${reduceMotion?t('appearance_on'):t('appearance_off')}</span>
        </button>
      </div>
    </div>
  `;
}

// ═══ LANGUAGE ═══
let _langSearch='';
function renderLanguageTab(){
  const el=document.getElementById('languageMgrBody');
  if(!el) return;
  const cur=(S.settings&&S.settings.lang)||'en';
  const matchSys=!!(S.settings&&S.settings.langAuto);
  const langs=(typeof FOCAL_LANGS!=='undefined')?FOCAL_LANGS:[{code:'en',name:'English'}];
  const q=(_langSearch||'').toLowerCase().trim();
  // Right-side card subtitle + "Currently" subtitle always show the English
  // name, never localized — gives a stable identifier regardless of UI script
  // (a German user evaluating "हिन्दी" still sees "Hindi"). Search matches both.
  const filtered=langs.filter(l=>!q || (l.name+' '+(l.english||l.name)).toLowerCase().includes(q));
  const current=langs.find(l=>l.code===cur)||langs[0];
  const currentEnglish=current.english||current.name;
  const cards=filtered.map(l=>{
    const sel=l.code===cur;
    const eng=l.english||l.name;
    return `<button class="lng-card ${sel?'on':''}" role="radio" aria-checked="${sel}" onclick="setLang('${escJs(l.code)}')">
      <div class="lng-card-l">
        <div class="lng-card-native">${escHtml(l.name)}</div>
        <div class="lng-card-eng">${escHtml(eng)}</div>
      </div>
      <div class="lng-card-r">${sel
        ? `<span class="lng-check">${icon('check',11,3)}</span>`
        : `<span class="lng-radio"></span>`}</div>
    </button>`;
  }).join('');
  el.innerHTML=`
    <div class="lng-shell">
      <div class="lng-top">
        <div class="lng-current">
          <div class="lng-current-badge">${escHtml(current.code.toUpperCase())}</div>
          <div class="lng-current-meta">
            <div class="lng-current-eyebrow">${escHtml(t('lang_currently'))}</div>
            <div class="lng-current-name">${escHtml(current.name)} <span class="lng-current-eng">· ${escHtml(currentEnglish)}</span></div>
          </div>
        </div>
        <div class="lng-search">
          <span class="lng-search-ic">${icon('search',14)}</span>
          <input class="fcl-input lng-search-inp" placeholder="${escAttr(t('lang_search_ph'))}" value="${escAttr(_langSearch)}" oninput="_langSearchInput(this.value)" autocomplete="off">
        </div>
      </div>
      <div class="lng-grid">
        ${cards}
        <button class="lng-request" onclick="requestLanguage()">
          <span class="lng-request-ic">${icon('plus',14)}</span>
          <span>${escHtml(t('lang_request'))}</span>
        </button>
      </div>
      <div class="lng-foot">
        <div class="lng-foot-item">
          <div class="lng-foot-ic">${icon('settings',14)}</div>
          <div>
            <div class="lng-foot-title">${escHtml(t('lang_match_title'))}</div>
            <div class="lng-foot-desc">${escHtml(t('lang_match_desc'))}
              <button class="lng-toggle ${matchSys?'on':''}" type="button" role="switch" aria-checked="${matchSys}" onclick="toggleLangAuto()">
                <span class="lng-toggle-track"><span class="lng-toggle-thumb"></span></span>
                <span class="lng-toggle-lbl">${matchSys?escHtml(t('lang_match_on')):escHtml(t('lang_match_enable'))}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="lng-foot-item">
          <div class="lng-foot-ic">${icon('bell',14)}</div>
          <div>
            <div class="lng-foot-title">${escHtml(t('lang_about_title'))}</div>
            <div class="lng-foot-desc">${escHtml(t('lang_about_desc'))}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function _langSearchInput(v){
  _langSearch=v;
  renderLanguageTab();
  const inp=document.querySelector('.lng-search-inp');
  if(inp){ inp.focus(); inp.setSelectionRange(v.length,v.length); }
}
function toggleLangAuto(){
  if(!S.settings) S.settings={};
  S.settings.langAuto=!S.settings.langAuto;
  saveS();
  if(S.settings.langAuto){
    // Detect browser language; map to closest supported FOCAL_LANGS entry
    const supported=(typeof FOCAL_LANGS!=='undefined')?FOCAL_LANGS.map(l=>l.code):['en'];
    const nav=(navigator.language||navigator.userLanguage||'en').toLowerCase().split('-')[0];
    const match=supported.includes(nav)?nav:'en';
    if(match!==(S.settings.lang||'en')) setLang(match); // setLang also re-renders
    else renderLanguageTab();
  } else {
    renderLanguageTab();
  }
}
function requestLanguage(){
  // Open Feedback modal preset to feature request with helpful message stub
  try{
    openFeedback();
    setTimeout(()=>{
      const cat=document.getElementById('fbCat'); if(cat) cat.value='feature';
      const msg=document.getElementById('fbMsg');
      if(msg){
        msg.value=t('lang_request_feedback_msg');
        msg.focus();
        // Move cursor to end so user can type the language name
        msg.setSelectionRange(msg.value.length,msg.value.length);
        fbCountChars();
      }
    },80);
  }catch(e){ console.error(e); }
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

// ═══ KEYBOARD HELP ═══
// Shortcuts reference overlay (opened with `?`). Content is i18n-aware and
// re-rendered on open + on language switch.
function renderKbHelp(){
  const body=document.getElementById('kbHelpBody'); if(!body) return;
  const row=(keys,label)=>`<div class="kbh-row"><span class="kbh-label">${escHtml(label)}</span><span class="kbh-keys">${keys.map(k=>`<kbd class="kbh-key">${escHtml(k)}</kbd>`).join('<span class="kbh-plus">·</span>')}</span></div>`;
  body.innerHTML=`
    <div class="kbh-group">
      <div class="kbh-gtitle">${escHtml(window.t('kb_help_nav'))}</div>
      ${row(['1','…','7'],window.t('kb_sc_view'))}
      ${row(['/'],window.t('kb_sc_search'))}
      ${row(['Esc'],window.t('kb_sc_close'))}
    </div>
    <div class="kbh-group">
      <div class="kbh-gtitle">${escHtml(window.t('kb_help_actions'))}</div>
      ${row(['n'],window.t('kb_sc_new'))}
      ${row(['?'],window.t('kb_sc_help'))}
    </div>
    <div class="kbh-group">
      <div class="kbh-gtitle">${escHtml(window.t('kb_help_tips'))}</div>
      <div class="kbh-tip">${escHtml(window.t('kb_sc_edit_inline'))}</div>
      <div class="kbh-tip">${escHtml(window.t('kb_sc_ctx'))}</div>
    </div>
    <div class="kbh-footer">${escHtml(window.t('kb_help_footer'))}</div>`;
}
function openKbHelp(){ renderKbHelp(); const el=document.getElementById('kbHelpOvl'); if(el){ el.style.display='flex'; el.setAttribute('aria-hidden','false'); const x=el.querySelector('.mx'); if(x) setTimeout(()=>x.focus(),50); } }
function closeKbHelp(){ const el=document.getElementById('kbHelpOvl'); if(el){ el.style.display='none'; el.setAttribute('aria-hidden','true'); } }
function kbHelpOvlClose(e){ if(e.target===document.getElementById('kbHelpOvl')) closeKbHelp(); }
function _kbHelpOpen(){ const el=document.getElementById('kbHelpOvl'); return !!(el&&el.style.display==='flex'); }
function _kbTyping(){ const a=document.activeElement; if(!a) return false; const tag=a.tagName; return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||a.isContentEditable; }
function _kbBlockingModalOpen(){
  return document.getElementById('ovl').classList.contains('on')
    || document.getElementById('settingsOvl').classList.contains('on')
    || document.getElementById('feedbackOvl').style.display==='flex';
}
// Global shortcut handler (additive). Ignored while typing or when a modifier is held.
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key==='?'){
    if(_kbHelpOpen()){ closeKbHelp(); e.preventDefault(); return; }
    if(_kbTyping()||_kbBlockingModalOpen()) return;
    openKbHelp(); e.preventDefault(); return;
  }
  if(_kbTyping()||_kbBlockingModalOpen()||_kbHelpOpen()) return;
  if(e.key==='/'){ const s=document.getElementById('srch'); if(s){ e.preventDefault(); s.focus(); if(s.select) s.select(); } return; }
  if(e.key==='n'){ e.preventDefault(); openAdd(); return; }
  if(/^[1-7]$/.test(e.key)){ e.preventDefault(); const views=['today','kanban','inbox','tasks','matrix','analytics','review']; sw(views[parseInt(e.key,10)-1]); return; }
});

// ═══ KEYBOARD ═══
// Keyboard
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){if(!modalHasContent())closeModal();closeDrops();kCancelSubDlg();closeCtxMenu();closeKColMenu();closeSettings();closeFeedback();closeKbHelp();} });
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
// If user opted into Match-my-system, re-detect OS language at load
// in case they switched the OS language between sessions.
if(S.settings && S.settings.langAuto){
  try{
    const supported=(typeof FOCAL_LANGS!=='undefined')?FOCAL_LANGS.map(l=>l.code):['en'];
    const nav=(navigator.language||navigator.userLanguage||'en').toLowerCase().split('-')[0];
    const match=supported.includes(nav)?nav:'en';
    if(match!==S.settings.lang){ S.settings.lang=match; saveS(); }
  }catch{}
}
applyI18n();
paintIcons();
renderAll();
renderMatrixFilter();
computeWeekSummary();
populatePersonFilter();
syncAiVisibility();
etLoad();
// Persist Notes textarea height after the user drags the resize handle
(function(){ const fn=document.getElementById('fNote'); if(fn) fn.addEventListener('mouseup',()=>{ if(fn.style.height) try{ localStorage.setItem('focal_noteH',fn.style.height); }catch{} }); })();
bkLoadHandle(); // load auto-backup file handle from IndexedDB (silent if none)
// Initialize pill disabled states for default view
(function(){ const v=curView; const noFilters=v==='inbox'||v==='review'||v==='analytics'; const noBacklog=v==='today'||v==='kanban'||v==='matrix'; document.querySelectorAll('.pill').forEach(p=>p.classList.toggle('pill-disabled',noFilters||(noBacklog&&p.dataset.f==='backlog'))); })();
