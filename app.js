import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,reauthenticateWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,collection,setDoc,deleteDoc,onSnapshot,writeBatch} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {firebaseConfig} from './config.js';

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
let fs;
try{fs=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch(e){fs=initializeFirestore(app,{})}
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
const FILES_FOLDER='Мой планировщик — файлы';
const APP_ID='moi-planirovshchik';
const COLORS=['#e5484d','#f06a3a','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#a16207','#78716c','#64748b','#2f6b4a','#4f6fa3','#b8432f','#7a5aa6'];

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const uid=()=>(crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,16):Math.random().toString(36).slice(2,10)+Date.now().toString(36));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00');d.setDate(d.getDate()+n);return iso(d)};
const addMonths=(s,n)=>{const d=new Date(s+'T00:00');const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return iso(d)};
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WD=['вс','пн','вт','ср','чт','пт','сб'];
const clone=o=>JSON.parse(JSON.stringify(o));
function fmtDate(s){if(!s)return'';const t=today();if(s===t)return'Сегодня';if(s===addDays(t,1))return'Завтра';if(s===addDays(t,-1))return'Вчера';const d=new Date(s+'T00:00');return d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'')}
function fmtLong(s){const d=new Date(s+'T00:00');const w=['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'][d.getDay()];return w+', '+d.getDate()+' '+MON[d.getMonth()]}
function fmtDur(sec){sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h} ч ${m} мин`:`${m} мин`}
function clock(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return(h?h+':'+pad(m):m)+':'+pad(s)}
function hhmm(ts){const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes())}
function addMin(t,m){const[h,mi]=t.split(':').map(Number);const x=h*60+mi+m;return pad(Math.floor(x/60)%24)+':'+pad(x%60)}
function fsize(n){n=+n||0;return n>1048576?(n/1048576).toFixed(1)+' МБ':n>1024?Math.round(n/1024)+' КБ':n+' Б'}
const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return n+' '+(m===1&&h!==11?a:m>=2&&m<=4&&(h<10||h>=20)?b:c)};
const ICONS={tag:'<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',cut:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 16L18 4M16 16L6 4"/>',more:'<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',star:'<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',bell:'<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',focus:'<circle cx="12" cy="12" r="3"/><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>',review:'<path d="M4 12a8 8 0 1014.5-4.6"/><path d="M19 3v5h-5"/><path d="M9 12l2 2 4-4"/>',gantt:'<path d="M4 6h9M8 12h10M6 18h7"/>',chat:'<path d="M5 5h14v10H10l-4 4v-4H5z"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',check:'<path d="M5 12.5l4.2 4L19 7"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',inbox:'<path d="M4 13l2.5-7h11L20 13v5H4z"/><path d="M4 13h4.5l1 2h5l1-2H20"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',next:'<path d="M4 6h10M4 12h16M4 18h12"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',cols:'<rect x="4" y="4" width="4.5" height="16" rx="1.2"/><rect x="10" y="4" width="4.5" height="11" rx="1.2"/><rect x="16" y="4" width="4" height="7" rx="1.2"/>',leaf:'<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',timer:'<circle cx="12" cy="13" r="7"/><path d="M12 13V9.5M9.5 3h5"/>',done:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.3 4.6-4.8"/>',search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',trash:'<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>',left:'<path d="M15 6l-6 6 6 6"/>',right:'<path d="M9 6l6 6-6 6"/>',play:'<path d="M8 5.5v13l10-6.5z"/>',stop:'<rect x="7" y="7" width="10" height="10" rx="1.5"/>',cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',cloudok:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/><path d="M9.5 13.2l1.9 1.9 3.4-3.6"/>',flag:'<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',repeat:'<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>',list:'<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',back:'<path d="M14 6l-6 6 6 6"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',note:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',pin:'<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/>',clip:'<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/>',sub:'<path d="M6 4v9a3 3 0 0 0 3 3h9M15 13l3 3-3 3"/>',moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'};
const ic=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ---------- state ---------- */
const S={meta:null,tasks:new Map(),notes:new Map(),user:null};
let planWeek=0,planJump=null,habMonth=today().slice(0,7),tgScroll=null,calMode='month',pendingOpen=(location.hash.match(/#t=([\w-]+)/)||[])[1]||null;const unlocked=new Set();
let view={type:'today'},selId=null,selNoteId=null,noteMode='view',projTab='tasks',showDone=false,searchQ='',calMonth=today().slice(0,7),calDay=today(),kanbanProj='',notesProj='';
function defaultMeta(){return{projects:[{id:uid(),title:'Личное',emoji:'🏠',color:COLORS[1],archived:false,order:1,parentId:null}],groups:[],tags:[],columns:[{id:'c1',title:'Надо сделать'},{id:'c2',title:'В работе'},{id:'c3',title:'Готово'}],habits:[],timeLog:[],running:null,filesFolderId:null,settings:defaultSettings(),updatedAt:Date.now()}}
function defaultSettings(){return{weekStart:1,autoRemind:false,threePane:true,archiveMode:'now',overdue:true,anim:true,hideTpl:false,dim:false,toc:true,qaStrip:true,qaProj:'@',qaTag:'#',list:{icons:true,tags:true,path:true,stats:true},tbHidden:[],hidden:[],pomo:{work:25,short:5,long:15,every:4,auto:false,sound:true}}}
function normMeta(m){m=Object.assign({},m||{});for(const k of['projects','groups','tags','columns','habits','timeLog'])if(!Array.isArray(m[k]))m[k]=[];if(!m.columns.length)m.columns=defaultMeta().columns;m.projects.forEach(p=>{if(p.parentId===undefined)p.parentId=null});if(m.running===undefined)m.running=null;const ds=defaultSettings();m.settings=Object.assign(ds,m.settings||{});m.settings.pomo=Object.assign(defaultSettings().pomo,m.settings.pomo||{});if(!Array.isArray(m.settings.hidden))m.settings.hidden=[];return m}
function normTask(t){return Object.assign({title:'',note:'',projectId:null,groupId:null,parentId:null,tags:[],priority:1,start:null,deadline:null,time:null,duration:null,repeat:null,deferred:false,state:'open',columnId:null,checklist:[],files:[],timeSpent:0,remind:null,repeatEvery:1,repeatDays:[],repeatFromDone:false,repeatEnd:null,repeatCount:null,repeatUntil:null,comments:[],fav:false,lock:null,createdAt:Date.now(),completedAt:null,deletedAt:null,order:Date.now()},t)}
function normNote(n){return Object.assign({title:'',body:'',projectId:null,tags:[],files:[],pinned:false,createdAt:Date.now(),updatedAt:Date.now(),deletedAt:null},n)}
const proj=id=>S.meta?.projects.find(p=>p.id===id);
const tagOf=id=>S.meta?.tags.find(t=>t.id===id);
const groupOf=id=>S.meta?.groups.find(g=>g.id===id);
const open=t=>t.state==='open';
const dueDay=t=>{const a=t.start,b=t.deadline;if(a&&b)return a<b?a:b;return a||b||null};
const pcol=t=>{const p=t&&t.projectId&&proj(t.projectId);return p?p.color:'#8a8f8b'};const pcs=t=>`--pc:${esc(pcol(t))}`;
const isOver=t=>open(t)&&!!dueDay(t)&&dueDay(t)<today();
function cmp(a,b){return(a.priority-b.priority)||((a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:0)||((dueDay(a)||'9')<(dueDay(b)||'9')?-1:(dueDay(a)||'9')>(dueDay(b)||'9')?1:0)||(a.order-b.order)}
const allTasks=()=>[...S.tasks.values()].filter(t=>!t.deletedAt);
const allNotes=()=>[...S.notes.values()].filter(n=>!n.deletedAt);
const kids=id=>allTasks().filter(t=>t.parentId===id);
const activeProj=()=>S.meta.projects.filter(p=>!p.archived).sort((a,b)=>a.order-b.order);
function projTree(side){const ps=activeProj();const ids=new Set(ps.map(p=>p.id));const out=[];const walk=(p,d)=>{out.push([p,d]);if(side&&p.collapsed)return;ps.filter(c=>c.parentId===p.id).forEach(c=>walk(c,d+1))};ps.filter(p=>!p.parentId||!ids.has(p.parentId)).forEach(p=>walk(p,0));return out}

/* ---------- Firestore storage ---------- */
let metaRef=null,tasksCol=null,notesCol=null,unsubs=[],syncNote='',metaTimer=null,metaDirty=false;
const timers=new Map(),dirty=new Set(),purged={t:false,n:false};
const colOf=k=>k==='t'?tasksCol:notesCol, mapOf=k=>k==='t'?S.tasks:S.notes;
function put(k,o,opts={}){o.updatedAt=Date.now();mapOf(k).set(o.id,o);const key=k+o.id;dirty.add(key);clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>flush(k,o.id),opts.now?0:500));if(!opts.quiet)render()}
async function flush(k,id){const key=k+id;timers.delete(key);const o=mapOf(k).get(id);try{if(o)await setDoc(doc(colOf(k),id),clone(o));syncNote=''}catch(e){fsErr(e)}finally{if(!timers.has(key))dirty.delete(key);renderSync()}}
function hardDel(k,id){mapOf(k).delete(id);const key=k+id;clearTimeout(timers.get(key));timers.delete(key);dirty.add(key);deleteDoc(doc(colOf(k),id)).catch(fsErr).finally(()=>dirty.delete(key))}
const saveTask=(t,o)=>put('t',t,o), saveNote=(n,o)=>put('n',n,o);
function saveMeta(opts={}){S.meta.updatedAt=Date.now();metaDirty=true;clearTimeout(metaTimer);metaTimer=setTimeout(async()=>{metaTimer=null;try{await setDoc(metaRef,clone(S.meta))}catch(e){fsErr(e)}finally{if(!metaTimer)metaDirty=false}},400);if(!opts.quiet)render()}
function fsErr(e){console.error(e);const c=e&&e.code;syncNote=c==='permission-denied'?'Нет доступа к базе. Войди заново':c==='resource-exhausted'?'Дневной лимит базы исчерпан, сохраню позже':'Не удалось сохранить, повторю';renderSync()}
function startData(u){
  stopData();
  metaRef=doc(fs,'users',u.uid);tasksCol=collection(fs,'users',u.uid,'tasks');notesCol=collection(fs,'users',u.uid,'notes');
  unsubs.push(onSnapshot(metaRef,{includeMetadataChanges:false},snap=>{if(metaDirty)return;if(snap.exists()){S.meta=normMeta(snap.data());render()}else if(!snap.metadata.fromCache){S.meta=defaultMeta();saveMeta()}},fsErr));
  for(const k of['t','n'])unsubs.push(onSnapshot(colOf(k),snap=>{snap.docChanges().forEach(ch=>{const id=ch.doc.id;if(dirty.has(k+id))return;if(ch.type==='removed')mapOf(k).delete(id);else mapOf(k).set(id,(k==='t'?normTask:normNote)({...ch.doc.data(),id}))});if(!snap.metadata.fromCache&&!purged[k]){purged[k]=true;purge(k)}if(selId&&!S.tasks.has(selId))selId=null;if(selNoteId&&!S.notes.has(selNoteId))selNoteId=null;render()},fsErr));
}
function stopData(){unsubs.forEach(f=>f());unsubs=[];S.meta=null;S.tasks=new Map();S.notes=new Map();purged.t=purged.n=false}
function purge(k){const lim=Date.now()-30*864e5;for(const o of[...mapOf(k).values()])if(o.deletedAt&&o.deletedAt<lim)hardDel(k,o.id)}

/* ---------- auth ---------- */
const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
let driveToken=null,driveExp=0;
async function signIn(){$('#loginMsg').textContent='';try{await signInWithPopup(auth,provider)}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){await signInWithRedirect(auth,provider)}else if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request'){$('#loginMsg').textContent='Не получилось войти: '+(e.code||e.message)}}}
getRedirectResult(auth).catch(()=>{});
onAuthStateChanged(auth,u=>{S.user=u;$('#login').hidden=!!u;if(u){startData(u);render()}else{stopData();selId=selNoteId=null}});
$('#signIn').addEventListener('click',signIn);

/* ---------- Google Drive files ---------- */
async function getDriveToken(){
  if(driveToken&&Date.now()<driveExp-60000)return driveToken;
  const p=new GoogleAuthProvider();p.addScope(DRIVE_SCOPE);p.setCustomParameters({login_hint:S.user?.email||''});
  const r=await reauthenticateWithPopup(auth.currentUser,p);
  const cred=GoogleAuthProvider.credentialFromResult(r);
  if(!cred?.accessToken)throw new Error('Google не выдал доступ к Диску');
  driveToken=cred.accessToken;driveExp=Date.now()+55*60000;renderSync();return driveToken;
}
async function gfetch(url,opts={},tok){const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+tok,...(opts.headers||{})}});if(r.status===401){driveToken=null;throw new Error('Доступ к Диску истёк, нажми ещё раз')}if(!r.ok)throw new Error('Диск ответил ошибкой '+r.status);return r.status===204?null:r.json()}
async function filesFolder(tok){
  if(S.meta.filesFolderId)return S.meta.filesFolderId;
  const q=encodeURIComponent(`name='${FILES_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  let r=await gfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,{},tok);let id=r.files?.[0]?.id;
  if(!id){r=await gfetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FILES_FOLDER,mimeType:'application/vnd.google-apps.folder'})},tok);id=r.id}
  S.meta.filesFolderId=id;saveMeta({quiet:true});return id;
}
async function uploadOne(file,tok,retry=true){
  const folder=await filesFolder(tok);
  const form=new FormData();form.append('metadata',new Blob([JSON.stringify({name:file.name,parents:[folder]})],{type:'application/json'}));form.append('file',file);
  try{return await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',{method:'POST',body:form},tok)}
  catch(e){if(retry&&/404/.test(e.message)){S.meta.filesFolderId=null;return uploadOne(file,tok,false)}throw e}
}
let attachTarget=null;
async function attachClick(kind,id){
  attachTarget={kind,id};
  if(driveToken&&Date.now()<driveExp-60000){$('#fileInput').click();return}
  try{await getDriveToken();toast('Диск подключён. Выбери файлы');$('#fileInput').click()}catch(e){if(e.code!=='auth/popup-closed-by-user')toast('Нет доступа к Диску: '+(e.code||e.message))}
}
$('#fileInput').addEventListener('change',async e=>{
  const files=[...e.target.files];e.target.value='';if(!files.length||!attachTarget)return;
  const {kind,id}=attachTarget;const o=(kind==='t'?S.tasks:S.notes).get(id);if(!o)return;
  try{const tok=await getDriveToken();for(const f of files){toast(`Загружаю «${f.name}»…`);const r=await uploadOne(f,tok);o.files=[...(o.files||[]),{id:r.id,name:r.name,mime:r.mimeType,size:+r.size||f.size,link:r.webViewLink}];put(kind,o,{now:true})}
    toast(files.length>1?`Загружено файлов: ${files.length}`:'Файл прикреплён');renderDetail(true)}
  catch(err){toast('Не удалось загрузить: '+(err.code||err.message))}
});
async function detachFile(kind,id,fid){const o=(kind==='t'?S.tasks:S.notes).get(id);if(!o)return;const f=(o.files||[]).find(x=>x.id===fid);if(!f)return;
  if(!await confirmBox('Открепить файл?',`«${f.name}» уберётся из карточки и переместится в корзину твоего Google Диска.`,'Открепить'))return;
  o.files=o.files.filter(x=>x.id!==fid);put(kind,o,{now:true});renderDetail(true);
  try{const tok=await getDriveToken();await gfetch(`https://www.googleapis.com/drive/v3/files/${fid}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})},tok)}catch(e){}
}
function filesHTML(o,kind){return`<div class="field"><span class="flabel">Файлы ${o.files?.length?'· '+o.files.length:''}</span>${o.files?.length?`<ul class="files">${o.files.map(f=>`<li>${ic('clip')}<a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.name)}</a><small>${fsize(f.size)}</small><button data-act="detach" data-kind="${kind}" data-fid="${esc(f.id)}" aria-label="Открепить файл">${ic('x')}</button></li>`).join('')}</ul>`:''}<div class="rowbtns"><button class="btn ghost sm" data-act="attach" data-kind="${kind}">${ic('clip')}Прикрепить с устройства</button></div><span class="small">Файлы сохраняются в папку «${FILES_FOLDER}» на твоём Google Диске.</span></div>`}

/* ---------- task ops ---------- */
const REVIEW_F=val=>({id:'review',label:'Проверка проекта',type:'select',value:String(val),options:[['0','Не проверять'],['7','Раз в неделю'],['14','Раз в 2 недели'],['30','Раз в месяц'],['180','Раз в полгода']]});
function moveProject(id,targetId,zone){const ps=S.meta.projects,p=proj(id);if(!p||id===targetId)return;
  const desc=new Set();const w=x=>ps.filter(c=>c.parentId===x).forEach(c=>{desc.add(c.id);w(c.id)});w(id);
  if(targetId&&desc.has(targetId)){toast('Нельзя вложить проект в его же подпроект');return}
  let parent=null,anchor=null;if(targetId){const t=proj(targetId);if(zone==='in'){parent=t.id}else{parent=t.parentId||null;anchor=t}}
  p.parentId=parent;const sib=activeProj().filter(x=>(x.parentId||null)===parent&&x.id!==id).sort((x,y)=>x.order-y.order);
  let i=anchor?sib.indexOf(anchor)+(zone==='after'?1:0):(zone==='top'?0:sib.length);sib.splice(Math.max(0,i),0,p);sib.forEach((x,k)=>x.order=k+1);
  saveMeta();toast(parent?`«${p.title}» теперь внутри «${proj(parent).title}»`:'Проект перемещён')}
function newTask(f){const t=normTask(Object.assign({id:uid(),columnId:S.meta.columns[0]?.id||null},f));saveTask(t);return t}
const monOf=d=>addDays(d,-((new Date(d+'T00:00').getDay()+6)%7));
function nextDate(s,r,t){const k=Math.max(1,parseInt(t?.repeatEvery)||1);const days=t?.repeatDays||[];
  if(r==='daily'&&k>1)return addDays(s,k);if(r==='monthly'&&k>1)return addMonths(s,k);if(r==='yearly'&&k>1)return addMonths(s,12*k);
  if(r==='weekly'&&days.length){let d=addDays(s,1);for(let i=0;i<7*k+8;i++){if(days.includes(new Date(d+'T00:00').getDay())&&Math.round((new Date(monOf(d))-new Date(monOf(s)))/6048e5)%k===0)return d;d=addDays(d,1)}return d}
  if(r==='weekly'&&k>1)return addDays(s,7*k);
  return nextDate0(s,r)}
function nextDate0(s,r){return r==='daily'?addDays(s,1):r==='weekdays'?(()=>{let d=addDays(s,1);while([0,6].includes(new Date(d+'T00:00').getDay()))d=addDays(d,1);return d})():r==='weekly'?addDays(s,7):r==='monthly'?addMonths(s,1):r==='yearly'?addMonths(s,12):addDays(s,1)}
function toggleTask(t){const before=clone(t);if(open(t)&&S.meta.settings.anim)doneBurst();
  if(t.repeat&&open(t)){const base=t.repeatFromDone?today():(t.start||today());let n=nextDate(base,t.repeat,t);if(!t.repeatFromDone)while(n<=today())n=nextDate(n,t.repeat,t);
    const last=(t.repeatEnd==='count'&&(parseInt(t.repeatCount)||1)<=1)||(t.repeatEnd==='date'&&t.repeatUntil&&n>t.repeatUntil);
    if(!last){if(t.repeatEnd==='count')t.repeatCount=(parseInt(t.repeatCount)||1)-1;if(t.deadline&&t.start){t.deadline=addDays(t.deadline,Math.round((new Date(n)-new Date(t.start))/864e5))}t.start=n;t.checklist.forEach(c=>c.state=0);saveTask(t);toast(`Сделано. Следующий раз: ${fmtDate(n)}`,()=>{S.tasks.set(t.id,before);saveTask(before)});return}}
  if(open(t)){t.state='done';t.completedAt=Date.now();const last=S.meta.columns[S.meta.columns.length-1];if(last&&/готов/i.test(last.title))t.columnId=last.id;saveTask(t);toast('Задача выполнена',()=>{S.tasks.set(t.id,before);saveTask(before)})}
  else{t.state='open';t.completedAt=null;saveTask(t)}}
function trashTask(t){const list=[t];const walk=id=>kids(id).forEach(c=>{list.push(c);walk(c.id)});walk(t.id);const now=Date.now();list.forEach(x=>{x.deletedAt=now;saveTask(x,{quiet:true})});if(list.some(x=>x.id===selId))selId=null;render();toast(list.length>1?`В корзине: задача и ${list.length-1} подзадач`:'Задача в корзине',()=>{list.forEach(x=>{x.deletedAt=null;saveTask(x,{quiet:true})});render()})}
const MONG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WDF=[['воскресенье','вс'],['понедельник','пн'],['вторник','вт'],['среду','среда','ср'],['четверг','чт'],['пятницу','пятница','пт'],['субботу','суббота','сб']];
function parseQuick(text){let pinned=false,title=' '+text+' ',start=null,priority=1,time=null,projectId=null,remind=null;const tags=[];
  const cut=(re,f)=>{title=title.replace(re,(...m)=>{f(m);return' '})};
  cut(/(^|\s)(?:напомни(?:ть)?\s+вовремя|будильник)(?=\s)/i,()=>{remind=0});cut(/(^|\s)без\s+напоминани[яй](?=\s)/i,()=>{remind=-1});
  cut(/(^|\s)напомни(?:ть)?\s+за\s+(час|день)(?=\s)/i,m=>{remind=m[2].toLowerCase()==='час'?60:1440});
  cut(/(^|\s)напомни(?:ть)?(?:\s+за\s+(\d+)\s*(мин(?:ут[уы]?)?|час(?:а|ов)?|ч|дн(?:я|ей)?|день))?(?=\s)/i,m=>{if(!m[2])remind=0;else{const n=+m[2],u=m[3].toLowerCase();remind=u.startsWith('ч')?n*60:u.startsWith('д')?n*1440:n}});
  cut(/(^|\s)(?:в\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)(?=\s)/,m=>{time=pad(+m[2])+':'+m[3]});
  cut(/(^|\s)(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?=\s)/i,m=>{const mo=MONG.indexOf(m[3].toLowerCase());const y=new Date().getFullYear();let d=iso(new Date(y,mo,+m[2]));if(d<today())d=iso(new Date(y+1,mo,+m[2]));start=d});
  WDF.forEach((ws,wd)=>ws.forEach(w=>cut(new RegExp('(^|\\s)(?:в(?:о)?\\s+)?'+w+'(?=\\s)','i'),()=>{let d=addDays(today(),1);while(new Date(d+'T00:00').getDay()!==wd)d=addDays(d,1);start=d})));
  cut(/(^|\s)[pр]([0-3])(?=\s)/i,m=>{const v=+m[2];if(v===0)pinned=true;else priority=Math.min(2,v-1)});
  cut(new RegExp('(^|\\s)'+(S.meta.settings.qaProj||'@').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([\\p{L}\\p{N}_-]+)','u'),m=>{const q=m[2].toLowerCase().replace(/_/g,' ');const p=activeProj().find(x=>x.title.toLowerCase()===q)||activeProj().find(x=>x.title.toLowerCase().startsWith(q));if(p)projectId=p.id});
  const day=(w,n)=>{const re=new RegExp('(^|\\s)'+w+'(?=\\s)','i');if(re.test(title)){start=addDays(today(),n);title=title.replace(re,' ')}};
  day('послезавтра',2);day('завтра',1);day('сегодня',0);
  if(/(^|\s)!!(?=\s)/.test(title)){priority=0;title=title.replace(/(^|\s)!!(?=\s)/,' ')}
  title=title.replace(new RegExp('(^|\\s)'+(S.meta.settings.qaTag||'#').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([\\p{L}\\p{N}_-]+)','gu'),(m,s,name)=>{let tg=S.meta.tags.find(x=>x.title.toLowerCase()===name.toLowerCase());if(!tg){tg={id:uid(),title:name,color:COLORS[S.meta.tags.length%COLORS.length]};S.meta.tags.push(tg);saveMeta({quiet:true})}tags.push(tg.id);return' '});
  if(remind===-1)remind=null;if((time||remind!==null)&&!start)start=today();if(S.meta.settings.qaStrip===false)title=' '+text+' ';return{title:title.replace(/\s+/g,' ').trim(),start,priority,tags,time,projectId,remind,pinned}}

/* ---------- markdown ---------- */
function inl(s){s=esc(s);return s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|\s)(https?:\/\/[^\s<]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>')}
function md(src){const lines=String(src||'').split('\n');let h='',list=null;const close=()=>{if(list){h+=`</${list==='cl'?'ul':list}>`;list=null}};const want=t=>{if(list!==t){close();h+=t==='cl'?'<ul class="md-check">':`<${t}>`;list=t}};
  lines.forEach((ln,i)=>{let m;
    if(/^\s*$/.test(ln)){close();return}
    if(m=ln.match(/^(#{1,3})\s+(.*)/)){close();const n=m[1].length+1;h+=`<h${n}>${inl(m[2])}</h${n}>`;return}
    if(/^\s*(-{3,}|\*{3,})\s*$/.test(ln)){close();h+='<hr>';return}
    if(m=ln.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)/)){want('cl');const on=m[1]!==' ';h+=`<li><button class="mdcb ${on?'on':''}" data-act="mdcheck" data-line="${i}" aria-label="Отметить пункт">${on?ic('check'):''}</button><span>${inl(m[2])}</span></li>`;return}
    if(m=ln.match(/^\s*[-*]\s+(.*)/)){want('ul');h+=`<li>${inl(m[1])}</li>`;return}
    if(m=ln.match(/^\s*\d+[.)]\s+(.*)/)){want('ol');h+=`<li>${inl(m[1])}</li>`;return}
    if(m=ln.match(/^>\s?(.*)/)){close();h+=`<blockquote>${inl(m[1])}</blockquote>`;return}
    close();h+=`<p>${inl(ln)}</p>`});close();return h}
const plain=s=>String(s||'').replace(/[#>*`\[\]_-]+/g,' ').replace(/\(https?:[^)]+\)/g,'').replace(/\s+/g,' ').trim();

/* ---------- rendering ---------- */
const VIEWS={inbox:['Входящие','inbox'],today:['Сегодня','sun'],upcoming:['Планы','next'],calendar:['Календарь','cal'],someday:['Когда-нибудь','moon'],notes:['Заметки','note'],kanban:['Канбан','cols'],habits:['Привычки','leaf'],time:['Время','timer'],review:['Проверка','review'],done:['Архив','done'],unplaced:['Без проекта','folder']};
const SIDE_TOP=['inbox','today','upcoming','calendar','habits'],SIDE_BOTTOM=['unplaced','someday','done','trash','settings'],ICV={trash:['Корзина','trash'],settings:['Настройки','gear']};
const dueReview=()=>activeProj().filter(p=>+p.review>0&&(!p.reviewedAt||p.reviewedAt+p.review*864e5<=Date.now()));
function counts(){const t=today();let inbox=0,td=0,over=0;for(const x of allTasks()){if(!open(x))continue;if(!x.projectId&&!x.deferred&&!x.parentId)inbox++;const d=dueDay(x);if(d&&d<t)over++;else if(d===t)td++}return{inbox,td,over}}
function renderSide(){
  if(!S.meta){$('#side').innerHTML='';return}
  const c=counts();const pc={};for(const x of allTasks())if(open(x)&&x.projectId)pc[x.projectId]=(pc[x.projectId]||0)+1;
  const on=(t,id)=>view.type===t&&(id===undefined||view.id===id)?'on':'';
  const habitsLeft=S.meta.habits.filter(h=>!h.archived&&(h.log?.[today()]||0)<(h.goal||1)).length;
  const run=S.meta.running;const rt=run&&S.tasks.get(run.taskId);
  $('#side').innerHTML=`<div class="brand"><i>${ic('check')}</i><span class="bname">Мой планировщик</span><span class="ssync ${syncNote?'err':''}" title="${syncNote?esc(syncNote):'Синхронизировано'}">${ic(syncNote?'cloud':'cloudok')}</span><button class="ic bmenu" data-x="appMenu" title="Меню" aria-label="Меню">${ic('dots')}</button></div>
   
   <nav class="nav">${SIDE_TOP.filter(k=>!S.meta.settings.hidden.includes(k)).map(k=>{const n=k==='inbox'?c.inbox:k==='today'?c.td+c.over:k==='habits'?habitsLeft:k==='notes'?allNotes().length:k==='review'?dueReview().length:0;return`<button class="${on(k)}" data-nav="${k}" ${k==='inbox'||k==='today'||k==='someday'?`data-dropview="${k}"`:''}>${ic(VIEWS[k][1])}${VIEWS[k][0]}${n?`<span class="n ${k==='today'&&c.over?'warn':''}">${n}</span>`:''}</button>`}).join('')}</nav>
   ${(()=>{const fp=activeProj().filter(p=>p.fav),ft=allTasks().filter(t=>t.fav&&open(t));return fp.length||ft.length?`<div class="sect">Избранное</div><nav class="nav">${fp.map(p=>`<button class="${on('project',p.id)}" data-nav="project" data-id="${p.id}">${picon(p)}<span class="ptl">${esc(p.title)}</span></button>`).join('')}${ft.map(t=>`<button data-act="openId" data-id="${t.id}">${ic('star')}${esc(t.title||'Без названия')}</button>`).join('')}</nav>`:''})()}
   <div class="sect psect" data-droproot="1"><i class="pgrid">${ic('grid')}</i><span>Мои проекты<b class="mlong"> и списки</b></span><button class="padd" data-act="addProject" aria-label="Новый проект" title="Новый проект">${ic('plus')}</button><button class="pcol ${S.meta.settings.projHidden?'shut':''}" data-x="projHide" aria-label="Свернуть список проектов" title="Свернуть или развернуть список">${ic('down')}</button></div>
   <nav class="nav pnav" ${S.meta.settings.projHidden?'hidden':''}>${projTree(true).map(([p,d])=>{const hasKids=activeProj().some(c=>c.parentId===p.id);return`<button class="${on('project',p.id)} ${d?'child':'ptop'} ${hasKids?'haskids':''}" style="--pc:${esc(p.color)};${d>1?`padding-left:${10+d*16}px`:''}" data-nav="project" data-id="${p.id}" draggable="true" data-pdrag="${p.id}" data-dropproj="${p.id}" data-depth="${d}" title="Перетащи выше или ниже. Сдвинь вправо — станет подпроектом, влево под точку главного проекта — станет равным ему">${hasKids?`<span class="tw ${p.collapsed?'':'open'}" data-ptoggle="${p.id}" role="button" aria-label="${p.collapsed?'Раскрыть':'Свернуть'}" title="${p.collapsed?'Раскрыть':'Свернуть'}">${ic('right')}</span>`:'<span class="tw0"></span>'}${picon(p)}<span class="ptl">${esc(p.title)}</span></button>`}).join('')}<button class="newp" data-act="addProject">${ic('plus')}Новый проект</button></nav>
   
   <div class="side-foot">${rt?`<div class="runbox">${ic('timer')}<span>${esc(rt.title)}</span><b id="runclock">${clock((Date.now()-run.start)/1000)}</b><button data-act="stopTimer" aria-label="Остановить таймер">${ic('stop')}</button></div>`:''}
    <nav class="icrow">${SIDE_BOTTOM.filter(k=>!S.meta.settings.hidden.includes(k)).map(k=>{const[l,i]=VIEWS[k]||ICV[k];return`<button class="${on(k)}" data-nav="${k}" ${k==='someday'?'data-dropview="someday"':''} title="${l}" aria-label="${l}">${ic(i)}</button>`}).join('')}</nav></div>`;
}
function renderTabbar(){const pins=(S.meta&&S.meta.settings.mbar)||['today','upcoming'];const tabs=[['_menu','Меню','menu'],...pins.map(k=>{const v=VIEWS[k]||[k,'list'];return[k,v[0],v[1]]})];$('#tabbar').innerHTML=tabs.map(([k,l,i])=>`<button class="${view.type===k?'on':''}" data-nav="${k}">${ic(i)}<span>${l}</span></button>`).join('')+`<button class="fab" data-act="addIn" aria-label="Новая задача">${ic('plus')}</button>`}
function renderSync(){const el=$('#sync');if(!el)return;el.innerHTML=syncNote?`<span class="pill err" title="${esc(syncNote)}">${ic('cloud')}<span class="stx">${esc(syncNote.length>34?'Нет синхронизации':syncNote)}</span></span>`:S.user?`<span class="pill ok" title="Синхронизировано: всё сохранено в облаке" aria-label="Синхронизировано">${ic('cloudok')}<span class="stx">Синхронизировано</span></span>`:''}
function keepDone(t){const m=S.meta.settings.archiveMode;if(open(t)||t.archived)return false;if(m==='day')return!!t.completedAt&&iso(new Date(t.completedAt))===today();if(m==='manual')return true;return false}
let lastPt={x:innerWidth/2,y:innerHeight/2};document.addEventListener('pointerdown',e=>{lastPt={x:e.clientX,y:e.clientY}},true);
function doneBurst(){const b=document.createElement('div');b.className='burst';b.style.left=lastPt.x+'px';b.style.top=lastPt.y+'px';b.innerHTML=ic('check');document.body.appendChild(b);setTimeout(()=>b.remove(),700)}
function ageCls(d){const n=Math.round((new Date(today())-new Date(d))/864e5);return n>7?'o7':n>3?'o3':'o1'}
function chipsFor(t,ctx){const out=[];const t0=today();const d=t.start;
  if(ctx!=='nest'&&t.parentId){const p=S.tasks.get(t.parentId);if(p&&!p.deletedAt)out.push(`<span>${ic('sub')}${esc(p.title.slice(0,30))}</span>`)}
  if(d){const cls=open(t)&&d<t0?(S.meta.settings.overdue?'over '+ageCls(d):''):d===t0?'today':'';out.push(`<span class="${cls}">${ic('cal')}${fmtDate(d)}${t.time?' · '+esc(t.time)+(t.duration?'–'+addMin(t.time,t.duration):''):''}</span>`)}else if(t.time)out.push(`<span>${ic('clock')}${esc(t.time)}</span>`);
  if(t.deadline)out.push(`<span class="${open(t)&&t.deadline<t0?'over':''}">${ic('flag')}до ${fmtDate(t.deadline)}</span>`);
  if(t.repeat)out.push(`<span>${ic('repeat')}${repeatText(t)}</span>`);
  if(t.deferred)out.push(`<span>${ic('moon')}когда-нибудь</span>`);
  if(t.pinned)out.push(`<span title="Закреплена">${ic('pin')}</span>`);if(t.fav)out.push(`<span>${ic('star')}</span>`);if(t.remind!=null&&t.remind!=='')out.push(`<span>${ic('bell')}</span>`);if(t.comments?.length)out.push(`<span>${ic('chat')}${t.comments.length}</span>`);if(t.lock)out.push(`<span>${ic('lock')}</span>`);
  const k=kids(t.id);if(k.length)out.push(`<span>${ic('sub')}${k.filter(x=>!open(x)).length}/${k.length}</span>`);
  if(t.checklist.length)out.push(`<span>${ic('list')}${t.checklist.filter(c=>c.state).length}/${t.checklist.length}</span>`);
  if(t.files?.length)out.push(`<span>${ic('clip')}${t.files.length}</span>`);
  if(t.timeSpent>=60)out.push(`<span>${ic('timer')}${fmtDur(t.timeSpent)}</span>`);
  if(ctx!=='project'&&ctx!=='nest'&&t.projectId){const p=proj(t.projectId);if(p)out.push(`<span class="ppath"><span class="tag"><i style="background:${esc(p.color)}"></i>${esc(p.title)}${t.groupId&&groupOf(t.groupId)?' / '+esc(groupOf(t.groupId).title):''}</span></span>`)}
  for(const id of t.tags){const g=tagOf(id);if(g)out.push(`<span class="tag ttag"><i style="background:${esc(g.color)}"></i>#${esc(g.title)}</span>`)}
  if(t.note)out.push(`<span>${ic('edit')}заметка</span>`);return out.join('')}
const WDS=['вс','пн','вт','ср','чт','пт','сб'];
function repeatText(t){const k=Math.max(1,parseInt(t.repeatEvery)||1);const base={daily:k>1?`каждые ${k} дн.`:'каждый день',weekdays:'по будням',weekly:k>1?`раз в ${k} нед.`:'каждую неделю',monthly:k>1?`раз в ${k} мес.`:'каждый месяц',yearly:k>1?`раз в ${k} г.`:'каждый год'}[t.repeat]||'';const d=t.repeat==='weekly'&&t.repeatDays?.length?' · '+[1,2,3,4,5,6,0].filter(x=>t.repeatDays.includes(x)).map(x=>WDS[x]).join(', '):'';return base+d+(t.repeatFromDone?' после выполнения':'')}
function rowHTML(t,ctx,depth=0){const done=!open(t);return`<li ${open(t)?'draggable="true"':''} style="${pcs(t)}" class="task d${Math.min(depth,3)} ${done?'is-done':''} ${t.state==='cancelled'?'is-cancel':''} ${selId===t.id?'is-sel':''}" data-id="${t.id}"><button class="chk pr${t.priority}" data-act="toggle" aria-label="${done?'Вернуть в работу':'Отметить выполненной'}">${done?ic(t.state==='cancelled'?'x':'check'):''}</button><div class="tbody" data-act="open" tabindex="0" role="button"><div class="ttl">${t.title?esc(t.title):'<span class="muted">Без названия</span>'}</div><div class="tmeta">${chipsFor(t,depth||ctx==='project'?(ctx==='project'?'project':'nest'):ctx)}</div></div></li>`}
function listHTML(arr,ctx){return arr.length?`<ul class="tasks">${arr.map(t=>rowHTML(t,ctx)).join('')}</ul>`:''}
const SORT=()=>{const base=['project','inbox','someday','unplaced'].includes(view.type)?(x,y)=>(x.order-y.order):cmp;const m=(S.meta.settings.sorts||{})[view.type+(view.id||'')];const f=(m&&SORTF[m])||base;return(x,y)=>((y.pinned?1:0)-(x.pinned?1:0))||f(x,y)};
function nestHTML(arr,ctx){const set=new Set(arr.map(t=>t.id));const ch={};const top=[];for(const t of arr){if(t.parentId&&set.has(t.parentId))(ch[t.parentId]=ch[t.parentId]||[]).push(t);else top.push(t)}const out=[];const walk=(t,d)=>{out.push(rowHTML(t,ctx,d));(ch[t.id]||[]).sort(SORT()).forEach(c=>walk(c,d+1))};top.sort(SORT()).forEach(t=>walk(t,0));return out.length?`<ul class="tasks">${out.join('')}</ul>`:''}
function group(title,arr,o={}){if(!arr.length&&!o.always)return'';return`<section class="group" ${o.add?'data-dg="1" '+o.add:''}><div class="ghead ${o.warn?'warn':''}"><span class="t">${title}</span><span>${arr.length||''}</span>${o.act?`<span class="act">${o.act}</span>`:''}</div>${o.nest?nestHTML(arr,o.ctx):listHTML(arr,o.ctx)}${o.add?`<button class="addline" data-act="addIn" ${o.add}>${ic('plus')}Добавить задачу</button>`:''}</section>`}
const emptyHTML=(b,s)=>`<div class="empty"><b>${b}</b>${s}</div>`;
const doneToggle=()=>`<div class="toolbar"><button class="btn ghost sm" data-act="toggleDone">${showDone?'Скрыть выполненные':'Показать выполненные'}</button></div>`;
function setHead(t,s){$('#vtitle').innerHTML=t;$('#vsub').textContent=s||''}
function noteCards(list){return list.length?`<div class="notes-grid">${list.sort((a,b)=>(b.pinned-a.pinned)||(b.updatedAt-a.updatedAt)).map(n=>{const p=proj(n.projectId);return`<button class="ncard ${selNoteId===n.id?'on':''}" data-act="openNote" data-id="${n.id}"><b>${n.pinned?ic('pin'):''}${esc(n.title||'Без названия')}</b><p>${esc(plain(n.body).slice(0,220))}</p><small>${fmtDate(iso(new Date(n.updatedAt)))}${p?` · <span class="tag"><i style="background:${esc(p.color)}"></i>${esc(p.title)}</span>`:''}${n.files?.length?` · ${ic('clip')}${n.files.length}`:''}</small></button>`}).join('')}</div>`:''}
function renderContent(){
  const c=$('#content');if(!S.meta){c.innerHTML=emptyHTML('Загружаю…','Подключаюсь к твоим данным');return}
  const t0=today();const tasks=allTasks();let h='';
  const qaOn=!['habits','time','settings','trash'].includes(view.type);$('#qa').hidden=!qaOn;$('#qaHint').hidden=!qaOn||view.type==='notes'||(view.type==='project'&&projTab==='notes');
  $('#qaInput').placeholder=view.type==='notes'||(view.type==='project'&&projTab==='notes')?'Новая заметка (название)':'Новая задача';
  if(searchQ){const q=searchQ.toLowerCase();const r=tasks.filter(t=>(t.title+' '+t.note+' '+t.checklist.map(c=>c.text).join(' ')).toLowerCase().includes(q)).sort(cmp);const rn=allNotes().filter(n=>(n.title+' '+n.body).toLowerCase().includes(q));
    setHead('Поиск',`«${searchQ}» · ${plural(r.length,'задача','задачи','задач')}, ${plural(rn.length,'заметка','заметки','заметок')}`);
    c.innerHTML=`<div class="wrap">${r.length||rn.length?group('Задачи',r)+(rn.length?`<section class="group"><div class="ghead"><span class="t">Заметки</span><span>${rn.length}</span></div>${noteCards(rn)}</section>`:''):emptyHTML('Ничего не нашёл','Попробуй другое слово')}</div>`;return}
  switch(view.type){
  case 'today':{const over=tasks.filter(isOver).sort(cmp);const td=tasks.filter(t=>open(t)&&dueDay(t)===t0).sort(cmp);const doneToday=tasks.filter(t=>t.state==='done'&&t.completedAt&&iso(new Date(t.completedAt))===t0);
    setHead('Сегодня',fmtLong(t0));const sch=td.filter(t=>t.time).sort((a,b)=>a.time<b.time?-1:1);const nowT=pad(new Date().getHours())+':'+pad(new Date().getMinutes());
    if(sch.length)h+=`<div class="sched"><ul>${sch.map(t=>`<li data-act="openId" data-id="${t.id}" style="${pcs(t)}"><span class="tm ${t.duration&&t.time<=nowT&&addMin(t.time,t.duration)>nowT?'now':''}">${esc(t.time)}${t.duration?'–'+addMin(t.time,t.duration):''}</span><span>${esc(t.title)}</span></li>`).join('')}</ul></div>`;
    h+=(over.length?(S.meta.settings.overOpen?group(`<button class="gfold open" data-x="overFold">Просроченные задачи ${ic('right')}</button>`,over,{warn:true}):`<section class="group gclosed"><div class="ghead warn"><button class="gfold" data-x="overFold"><span>Просроченные задачи</span><b>${over.length}</b>${ic('right')}</button></div></section>`):'')+group('На сегодня',td,{always:true,add:`data-start="${t0}"`})+(showDone?group('Сделано сегодня',doneToday):'');
    h=`<div class="toolbar"><button class="btn ghost sm" data-act="print">${ic('print')}Напечатать план дня</button></div>`+h;
    if(!over.length&&!td.length)h+=emptyHTML('На сегодня всё чисто','Добавь задачу строкой сверху. Слово «завтра» в тексте сразу поставит дату.');h+=doneToggle();break}
  case 'inbox':{const a=tasks.filter(t=>!t.projectId&&!t.deferred&&(showDone||open(t)||keepDone(t)));setHead('Входящие','Задачи без проекта');h=(a.length?nestHTML(a):emptyHTML('Входящие пусты','Сюда попадает всё, что ещё не разложено по проектам.'))+doneToggle();break}
  case 'unplaced':{const a=tasks.filter(t=>!t.projectId&&(showDone||open(t)||keepDone(t)));setHead('Без проекта','Все задачи вне проектов');h=(a.length?nestHTML(a):emptyHTML('Пусто','Здесь задачи без проекта, с датой и без.'))+doneToggle();break}
  case 'someday':{const a=tasks.filter(t=>t.deferred&&open(t));setHead('Когда-нибудь','Идеи и дела без срока');h=a.length?nestHTML(a):emptyHTML('Пока пусто','Отметь в карточке задачи «Когда-нибудь», и она переедет сюда из списков.');break}
  case 'upcoming':{setHead('Планы','');const ws=S.meta.settings.weekStart;const wk0=addDays(t0,planWeek*7);
    h=`<div class="pstrip"><button class="ic" data-act="planW" data-v="-1" aria-label="Предыдущая неделя">${ic('left')}</button>${[...Array(7)].map((_,i)=>{const d=addDays(wk0,i);const n=tasks.filter(t=>open(t)&&dueDay(t)===d).length;return`<button class="pday ${d===t0?'today':''}" data-act="planJump" data-d="${d}"><small>${WDS[new Date(d+'T00:00').getDay()]}.</small><b>${+d.slice(8)}</b>${n?`<i>${n}</i>`:''}</button>`}).join('')}<button class="ic" data-act="planW" data-v="1" aria-label="Следующая неделя">${ic('right')}</button></div>`;
    for(let i=0;i<14;i++){const d=addDays(t0,i);const a=tasks.filter(t=>open(t)&&dueDay(t)===d).sort(cmp);h+=`<div id="pd-${d}"></div>`+group(`${+d.slice(8)} ${WD[new Date(d+'T00:00').getDay()].toLowerCase()}${i===0?', Сегодня':i===1?', Завтра':''}`,a,{always:true,add:`data-start="${d}" data-dropday="${d}"`})}
    const end=addDays(t0,13);const rest=tasks.filter(t=>open(t)&&dueDay(t)>end).sort((x,y)=>dueDay(x)<dueDay(y)?-1:1);const byM={};for(const t of rest){const d=dueDay(t),k=d.slice(0,7);(byM[k]=byM[k]||[]).push(t)}
    const m0=end.slice(0,7);if(!byM[m0])byM[m0]=[];for(let i=1;i<=3;i++){const dd=new Date(t0+'T00:00');dd.setMonth(dd.getMonth()+i,1);const k=iso(dd).slice(0,7);if(!byM[k])byM[k]=[]}
    Object.keys(byM).sort().forEach(k=>{const [y,m]=k.split('-').map(Number);const last=new Date(y,m,0).getDate();const lbl=k===m0?`${MONN[m-1].toLowerCase()} ${+addDays(end,1).slice(8)}–${last}`:MONN[m-1].toLowerCase()+(y!==new Date().getFullYear()?' '+y:'');h+=group(lbl,byM[k],{always:true})});
    setTimeout(()=>{if(planJump){document.getElementById('pd-'+planJump)?.scrollIntoView({block:'start'});planJump=null}},0);break}
  case 'calendar':{const ws=S.meta.settings.weekStart;const [y,m]=calMonth.split('-').map(Number);const first=new Date(y,m-1,1);const off=(first.getDay()-ws+7)%7;const gs=iso(new Date(y,m-1,1-off));const by={};for(const t of tasks){if(t.state==='cancelled')continue;for(const d of new Set([t.start,t.deadline].filter(Boolean)))(by[d]=by[d]||[]).push(t)}
    const bar=`<div class="toolbar"><div class="seg">${[['day','День'],['3d','3 дня'],['week','Неделя'],['month','Месяц']].map(([v,l])=>`<button class="${calMode===v?'on':''}" data-act="calMode" data-v="${v}">${l}</button>`).join('')}</div><button class="btn ghost sm" data-act="calPrev" aria-label="Назад">${ic('left')}</button><button class="btn ghost sm" data-act="calToday">Сегодня</button><button class="btn ghost sm" data-act="calNext" aria-label="Вперёд">${ic('right')}</button><input class="inp sm" type="date" id="calJump" value="${calDay}" aria-label="Перейти к дате"></div>`;
    if(calMode!=='month'){const wk0=addDays(calDay,-((new Date(calDay+'T00:00').getDay()-ws+7)%7));const ds=calMode==='week'?[...Array(7)].map((_,i)=>addDays(wk0,i)).filter(d=>!S.meta.settings.hideWE||![0,6].includes(new Date(d+'T00:00').getDay())):calMode==='3d'?[calDay,addDays(calDay,1),addDays(calDay,2)]:[calDay];
      setHead(calMode==='week'||calMode==='3d'?`${fmtDate(ds[0])} — ${fmtDate(ds[ds.length-1])}`:fmtLong(calDay),'Перетаскивай задачи между днями');
      const HH=innerWidth>820?60:52,nowD=new Date(),nowM=nowD.getHours()*60+nowD.getMinutes();const mins=x=>{const [hh,mm]=x.split(':').map(Number);return hh*60+mm};
      const col=d=>{const ev=(by[d]||[]).filter(t=>t.time&&t.start===d).map(t=>({t,s:mins(t.time),e:mins(t.time)+Math.max(20,+t.duration||60)})).sort((x,y)=>x.s-y.s);const lanes=[];for(const x of ev){let k=lanes.findIndex(end=>end<=x.s);if(k<0){k=lanes.length;lanes.push(0)}lanes[k]=x.e;x.k=k}
        for(const x of ev)x.n=Math.max(1,...ev.filter(y=>y.s<x.e&&y.e>x.s).map(y=>y.k+1));
        return ev.map(({t,s,e,k,n})=>`<div class="tgev pr${t.priority} ${!open(t)?'is-done':''}" draggable="true" data-id="${t.id}" data-act="openId" style="${pcs(t)};top:${s/60*HH}px;height:${Math.max(20,(Math.min(e,1440)-s)/60*HH-2)}px;left:calc(${k/n*100}% + 2px);width:calc(${100/n}% - 4px)"><small>${esc(t.time)}${t.duration?'–'+addMin(t.time,t.duration):''}</small>${cchk(t)}${t.priority===0?'<b class="hi">!</b> ':''}${esc(t.title||'Без названия')}</div>`).join('')};
      h=bar+`<div class="tg ${calMode}" style="--n:${ds.length};--hh:${HH}px"><div class="tgrow tghead"><span></span>${ds.map(d=>`<button class="${d===t0?'today':''} ${d===calDay?'on':''}" data-act="calDay" data-d="${d}">${WD[new Date(d+'T00:00').getDay()]} <b>${+d.slice(8)}</b></button>`).join('')}</div>
      <div class="tgrow tgall"><span>весь день</span>${ds.map(d=>{const a2=(by[d]||[]).filter(t=>!t.time||t.start!==d).sort(cmp);return`<div data-dropday="${d}" data-allday="1">${a2.map(t=>`<div class="wki pr${t.priority} ${!open(t)?'is-done':''}" style="${pcs(t)}" draggable="true" data-id="${t.id}" data-act="openId">${cchk(t)}${t.deadline===d&&t.start!==d?ic('flag'):''}${esc(t.title||'Без названия')}</div>`).join('')}<button class="addline" data-act="addIn" data-start="${d}" aria-label="Добавить на день">${ic('plus')}</button></div>`}).join('')}</div>
      <div class="tgbody" id="tgbody"><div class="tgrow" style="height:${24*HH}px"><div class="tgtimes">${[...Array(24)].map((_,x)=>`<span style="top:${x*HH}px">${pad(x)}:00</span>`).join('')}</div>${ds.map(d=>`<div class="tgcol ${d===t0?'today':''}">${[...Array(24)].map((_,x)=>`<div class="tgslot" data-dropday="${d}" data-droptime="${pad(x)}:00" data-act="addIn" data-start="${d}" data-time="${pad(x)}:00" title="Новая задача на ${pad(x)}:00"></div>`).join('')}${col(d)}${d===t0?`<i class="tgnow" style="top:${nowM/60*HH}px"></i>`:''}</div>`).join('')}</div></div></div>`;break}
    setHead(MONN[m-1]+' '+y,'Нажми на день, чтобы увидеть задачи. Задачу можно перетащить на другой день');h=bar+`<div class="cal">`+[...Array(7)].map((_,i)=>`<div class="wd">${WDS[(i+ws)%7]}</div>`).join('');
    for(let i=0;i<42;i++){const d=addDays(gs,i);const a=by[d]||[];if(i>=35&&i%7===0&&d.slice(5,7)!==pad(m))break;h+=`<button class="${d.slice(0,7)!==calMonth?'out':''} ${d===t0?'today':''} ${d===calDay?'on':''}" data-act="calDay" data-d="${d}" data-dropday="${d}"><span class="d">${+d.slice(8)}</span><span class="mts">${a.sort(cmp).slice(0,innerWidth<=820?4:3).map(t=>`<span class="mt pr${t.priority} ${!open(t)?'is-done':''}" style="${pcs(t)}" draggable="true" data-id="${t.id}" data-act="openId">${cchk(t)}${t.time?`<small>${esc(t.time)}</small> `:''}${esc(t.title||'Без названия')}</span>`).join('')}${a.length>(innerWidth<=820?4:3)?`<span class="cnt">${innerWidth<=820?'+'+(a.length-4):'+ ещё '+(a.length-3)}</span>`:''}</span></button>`}
    h+='</div>'+group(fmtLong(calDay),(by[calDay]||[]).sort(cmp),{always:true,add:`data-start="${calDay}"`});break}
  case 'project':{const p=proj(view.id);if(!p){view={type:'today'};return renderContent()}
    const sub=S.meta.projects.filter(x=>x.parentId===p.id&&!x.archived);const pn=allNotes().filter(n=>n.projectId===p.id);
    setHead(`<span class="dot" style="width:12px;height:12px;border-radius:50%;background:${esc(p.color)}"></span>${p.emoji?esc(p.emoji)+' ':''}${esc(p.title)}${p.fav?' '+ic('star'):''}`,p.parentId&&proj(p.parentId)?'в проекте «'+proj(p.parentId).title+'»':'');const rvDue=dueReview().includes(p);
    h=`${sub.length?`<div class="subp">${sub.map(s=>`<button data-nav="project" data-id="${s.id}"><i style="background:${esc(s.color)}"></i>${esc(s.title)}</button>`).join('')}</div>`:''}${p.desc?`<p class="pdesc">${inl(p.desc)}</p>`:''}${rvDue?`<div class="rvbar">${ic('review')}<span>Пора проверить проект: всё ли актуально, нет ли застрявших задач?</span><button class="btn sm" data-act="reviewed" data-id="${p.id}">Проверено</button></div>`:''}<div class="tabs"><button class="${projTab==='tasks'?'on':''}" data-act="projTab" data-v="tasks">Задачи</button><button class="${projTab==='gantt'?'on':''}" data-act="projTab" data-v="gantt">Гант</button><button class="${projTab==='notes'?'on':''}" data-act="projTab" data-v="notes">Заметки${pn.length?' · '+pn.length:''}</button></div>`;
    if(projTab==='notes'){h+=`<div class="toolbar"><button class="btn sm" data-act="newNote" data-project="${p.id}">${ic('plus')}Заметка</button></div>`+(pn.length?noteCards(pn):emptyHTML('В проекте нет заметок','Сюда удобно складывать планы, тексты, ссылки и файлы по проекту.'));break}
    if(projTab==='gantt'){h+=ganttHTML(tasks.filter(t=>t.projectId===p.id&&open(t)));break}
    const a=tasks.filter(t=>t.projectId===p.id&&(showDone||open(t)||keepDone(t))&&!(S.meta.settings.hideTpl&&t.repeat&&t.start&&t.start>t0));const groups=S.meta.groups.filter(g=>g.projectId===p.id).sort((x,y)=>x.order-y.order);
    h+=`<button class="ic pmorebtn2" data-x="projMenu" data-id="${p.id}" title="Действия с проектом" aria-label="Действия с проектом">${ic('dots')}</button>`;
    h+=group('Без раздела',a.filter(t=>!t.groupId||!groupOf(t.groupId)),{always:!groups.length,nest:true,ctx:'project',add:`data-project="${p.id}"`});
    for(const g of groups)h+=group(esc(g.title),a.filter(t=>t.groupId===g.id),{always:true,nest:true,ctx:'project',add:`data-project="${p.id}" data-group="${g.id}"`,act:`<button data-act="editGroup" data-id="${g.id}" aria-label="Переименовать раздел">${ic('edit')}</button><button data-act="delGroup" data-id="${g.id}" aria-label="Удалить раздел">${ic('trash')}</button>`});break}
  case 'tag':{const g=tagOf(view.id);if(!g){view={type:'today'};return renderContent()}setHead('#'+esc(g.title),'');const a=tasks.filter(t=>t.tags.includes(g.id)&&(showDone||open(t)||keepDone(t))).sort(cmp);const nn=allNotes().filter(n=>n.tags.includes(g.id));h=(a.length?listHTML(a):'')+(nn.length?`<section class="group"><div class="ghead"><span class="t">Заметки</span></div>${noteCards(nn)}</section>`:'')+(!a.length&&!nn.length?emptyHTML('С этим тегом пока ничего нет','Тег можно поставить в карточке или написать #'+esc(g.title)+' в строке добавления.'):'')+doneToggle();break}
  case 'notes':{const list=allNotes().filter(n=>!notesProj||(notesProj==='_none'?!n.projectId:n.projectId===notesProj));setHead('Заметки',plural(list.length,'заметка','заметки','заметок'));
    h=`<div class="toolbar"><button class="btn sm" data-act="newNote">${ic('plus')}Новая заметка</button><select class="sel" id="notesProj" aria-label="Блокнот"><option value="">Все заметки</option><option value="_none" ${notesProj==='_none'?'selected':''}>Без проекта</option>${projTree().map(([p,d])=>`<option value="${p.id}" ${notesProj===p.id?'selected':''}>${'— '.repeat(d)}${esc(p.title)}</option>`).join('')}</select></div>`+(list.length?noteCards(list):emptyHTML('Заметок пока нет','Пиши мысли, планы проповедей, конспекты. Поддерживаются заголовки (#), списки (-), чек-листы (- [ ]) и ссылки.'));break}
  case 'review':{setHead('Проверка проектов','Регулярно пересматривай проекты, чтобы ничего не застряло');const due=dueReview();const sched=activeProj().filter(p=>+p.review>0&&!due.includes(p));const row=p=>`<li><span class="dot" style="background:${esc(p.color)}"></span><button class="g" data-nav="project" data-id="${p.id}">${p.emoji?esc(p.emoji)+' ':''}${esc(p.title)}</button><span class="v">${p.reviewedAt?'проверен '+fmtDate(iso(new Date(p.reviewedAt))):'ещё не проверялся'} · раз в ${p.review} дн.</span>${due.includes(p)?`<button class="btn sm" data-act="reviewed" data-id="${p.id}">Проверено</button>`:''}</li>`;
    h=(due.length?`<section class="group"><div class="ghead warn"><span class="t">Пора проверить</span><span>${due.length}</span></div><ul class="list2">${due.map(row).join('')}</ul></section>`:emptyHTML('Все проекты проверены','Интервал проверки задаётся в настройках проекта («Изменить»).'))+(sched.length?`<section class="group"><div class="ghead"><span class="t">По расписанию</span></div><ul class="list2">${sched.map(row).join('')}</ul></section>`:'');break}
  case 'done':{const a=tasks.filter(t=>!open(t)).sort((x,y)=>(y.completedAt||y.updatedAt||0)-(x.completedAt||x.updatedAt||0)).slice(0,300);setHead('Выполненные','Последние 300 закрытых задач');h=a.length?listHTML(a):emptyHTML('Пока ничего не выполнено','Отмеченные задачи появятся здесь.');break}
  case 'trash':{const tt=[...S.tasks.values()].filter(t=>t.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);const tn=[...S.notes.values()].filter(n=>n.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);setHead('Корзина','Удалённое хранится 30 дней');
    h=(tt.length||tn.length)?`<div class="toolbar"><button class="btn danger sm" data-act="emptyTrash">${ic('trash')}Очистить корзину</button></div><ul class="list2">${tt.map(t=>`<li><span class="g">${esc(t.title||'Без названия')}</span><span class="v">${fmtDate(iso(new Date(t.deletedAt)))}</span><button data-act="restore" data-kind="t" data-id="${t.id}" aria-label="Восстановить">${ic('repeat')}</button><button data-act="purgeOne" data-kind="t" data-id="${t.id}" aria-label="Удалить навсегда">${ic('x')}</button></li>`).join('')}${tn.map(n=>`<li>${ic('note')}<span class="g">${esc(n.title||'Без названия')}</span><span class="v">${fmtDate(iso(new Date(n.deletedAt)))}</span><button data-act="restore" data-kind="n" data-id="${n.id}" aria-label="Восстановить">${ic('repeat')}</button><button data-act="purgeOne" data-kind="n" data-id="${n.id}" aria-label="Удалить навсегда">${ic('x')}</button></li>`).join('')}</ul>`:emptyHTML('Корзина пуста','Удалённые задачи и заметки лежат здесь 30 дней.');break}
  case 'kanban':{setHead('Канбан','Перетаскивай карточки или двигай стрелками');const cols=S.meta.columns;const a=tasks.filter(t=>(open(t)||t.state==='done')&&(!kanbanProj||t.projectId===kanbanProj||(kanbanProj==='_none'&&!t.projectId)));
    h=`<div class="toolbar"><select class="sel" id="kanbanProj" aria-label="Проект"><option value="">Все проекты</option><option value="_none" ${kanbanProj==='_none'?'selected':''}>Входящие</option>${projTree().map(([p,d])=>`<option value="${p.id}" ${kanbanProj===p.id?'selected':''}>${'— '.repeat(d)}${esc(p.title)}</option>`).join('')}</select><button class="btn ghost sm" data-nav="settings">${ic('gear')}Колонки</button></div><div class="board">`;
    cols.forEach((col,i)=>{const items=a.filter(t=>(t.columnId&&cols.some(c=>c.id===t.columnId)?t.columnId:cols[0].id)===col.id).sort(cmp);h+=`<div class="col" data-col="${col.id}"><h3><span>${esc(col.title)}</span><span class="muted">${items.length}</span></h3>${items.map(t=>`<div class="card ${!open(t)?'is-done':''}" style="${pcs(t)}" draggable="true" data-id="${t.id}"><div class="ttl" data-act="open">${esc(t.title)||'Без названия'}</div><div class="tmeta">${chipsFor(t)}</div><div class="row"><button class="chk pr${t.priority}" data-act="toggle" aria-label="Отметить">${!open(t)?ic('check'):''}</button><span class="mv"><button data-act="mv" data-dir="-1" ${i===0?'disabled':''} aria-label="В предыдущую колонку">${ic('left')}</button><button data-act="mv" data-dir="1" ${i===cols.length-1?'disabled':''} aria-label="В следующую колонку">${ic('right')}</button></span></div></div>`).join('')}<button class="addline" data-act="addIn" data-col="${col.id}" ${kanbanProj&&kanbanProj!=='_none'?`data-project="${kanbanProj}"`:''}>${ic('plus')}Карточка</button></div>`});h+='</div>';break}
  case 'habits':{const [hy,hm]=habMonth.split('-').map(Number);const nd=new Date(hy,hm,0).getDate();const ds=[...Array(nd)].map((_,i)=>`${habMonth}-${pad(i+1)}`);
    setHead(`Привычки, ${MONN[hm-1].toLowerCase()} ${hy}`,'');const hs=S.meta.habits.filter(x=>!x.archived);
    h=`<div class="toolbar"><button class="btn ghost sm" data-act="habM" data-v="-1" aria-label="Предыдущий месяц">${ic('left')}</button><button class="btn ghost sm" data-act="habM" data-v="0">Сегодня</button><button class="btn ghost sm" data-act="habM" data-v="1" aria-label="Следующий месяц">${ic('right')}</button><button class="btn sm" data-act="addHabit">${ic('plus')}Добавить привычку</button></div>`;
    if(!hs.length)h+=emptyHTML('Привычек пока нет','Например: «Утреннее чтение Библии» или «Прогулка 30 минут». Отмечай клетку каждый день.');
    else h+=`<div class="hgrid" style="--nd:${nd}"><div class="hrow hdays"><span></span>${ds.map(d=>`<span class="${d===t0?'td':''} ${[0,6].includes(new Date(d+'T00:00').getDay())?'we':''}"><b>${+d.slice(8)}</b><small>${WDS[new Date(d+'T00:00').getDay()]}</small></span>`).join('')}</div>${hs.map(x=>{const goal=x.goal||1;return`<div class="hrow" style="${x.color?`--hc:${esc(x.color)}`:''}"><button class="hname" data-act="editHabit" data-id="${x.id}" title="Изменить"><span>${esc(x.emoji||'•')} ${esc(x.title)}</span><small>серия ${streak(x)} · ${habitRate(x)}% за 30 дн.</small></button>${ds.map(d=>{const v=x.log?.[d]||0;const fut=d>t0;return`<button class="hc ${v>=goal?'full':v>0?'part':''} ${d===t0?'td':''}" ${fut?'disabled':''} data-act="habitTap" data-id="${x.id}" data-d="${d}" aria-label="${esc(x.title)}, ${fmtLong(d)}: ${v} из ${goal}">${v>=goal?ic('check'):v?v:''}</button>`}).join('')}</div>`}).join('')}</div>`;
    const ar=S.meta.habits.filter(x=>x.archived);if(ar.length)h+=`<p class="small" style="margin-top:16px">В архиве: ${ar.map(x=>`<button class="tag" data-act="unarchHabit" data-id="${x.id}">${esc(x.title)} · вернуть</button>`).join(' ')}</p>`;
    setTimeout(()=>{const g=document.querySelector('.hgrid .td');if(g&&g.scrollIntoView)g.scrollIntoView({inline:'center',block:'nearest'})},0);break}
  case 'time':{setHead('Время и статистика','');const run=S.meta.running;const rt=run&&S.tasks.get(run.taskId);const log=S.meta.timeLog;const days=[...Array(7)].map((_,i)=>addDays(t0,i-6));const per=days.map(d=>log.filter(e=>iso(new Date(e.start))===d).reduce((s,e)=>s+e.dur,0));const max=Math.max(3600,...per);
    const doneD=days.map(d=>[...S.tasks.values()].filter(t=>t.completedAt&&t.state==='done'&&iso(new Date(t.completedAt))===d).length);const maxD=Math.max(1,...doneD);const byP={};for(const e of log)if(iso(new Date(e.start))>=days[0]){const k=e.projectId||'_';byP[k]=(byP[k]||0)+e.dur}
    h=`<div class="timerbig">${rt?`<div><div class="small">Сейчас: ${esc(rt.title)}${run.limit?' · помодоро':''}</div><div class="clock" id="bigclock">${clock((Date.now()-run.start)/1000)}</div></div><div style="flex:1"></div><button class="btn danger" data-act="stopTimer">${ic('stop')}Остановить</button>`:`<div><div class="small">Таймер не запущен</div><div class="clock">0:00</div></div><div style="flex:1"></div><span class="small">Запусти таймер из карточки задачи</span>`}</div>
     <div class="stat-row"><div class="stat"><small>Время сегодня</small><b>${fmtDur(per[6])}</b></div><div class="stat"><small>Время за 7 дней</small><b>${fmtDur(per.reduce((a,b)=>a+b,0))}</b></div><div class="stat"><small>Выполнено за 7 дней</small><b>${doneD.reduce((a,b)=>a+b,0)}</b></div></div>
     <section class="group"><div class="ghead"><span class="t">Выполненные задачи по дням</span></div><div class="bars" role="img" aria-label="Выполненные задачи по дням">${doneD.map((n,i)=>`<div class="${i===6?'td':''}"><span>${n||''}</span><i style="height:${Math.round(n/maxD*100)}%"></i></div>`).join('')}</div><div class="blabels">${days.map(d=>`<span>${WD[new Date(d+'T00:00').getDay()]}</span>`).join('')}</div></section>
     <section class="group"><div class="ghead"><span class="t">Время по дням</span></div><div class="bars" role="img" aria-label="Время по дням">${per.map((s,i)=>`<div class="${i===6?'td':''}"><span>${s>=60?Math.round(s/60)+'м':''}</span><i style="height:${Math.round(s/max*100)}%"></i></div>`).join('')}</div><div class="blabels">${days.map(d=>`<span>${WD[new Date(d+'T00:00').getDay()]}</span>`).join('')}</div></section>
     <section class="group"><div class="ghead"><span class="t">По проектам за неделю</span></div><ul class="list2">${Object.entries(byP).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const p=proj(k);return`<li><span class="g">${p?esc(p.title):'Без проекта'}</span><span class="v">${fmtDur(v)}</span></li>`}).join('')||'<li class="small">Пока нет записей</li>'}</ul></section>
     <section class="group"><div class="ghead"><span class="t">Последние сессии</span></div><ul class="list2">${log.slice(-25).reverse().map(e=>`<li><span class="g">${esc(S.tasks.get(e.taskId)?.title||e.title||'Задача')}</span><span class="v">${fmtDate(iso(new Date(e.start)))}, ${hhmm(e.start)} · ${fmtDur(e.dur)}</span><button data-act="delLog" data-id="${e.id}" aria-label="Удалить запись">${ic('trash')}</button></li>`).join('')||'<li class="small">Пока нет записей</li>'}</ul></section>`;break}
  case 'settings':{setHead('Настройки','');const u=S.user;
    h=`<div class="wrap"><div class="card-s"><h2>Аккаунт</h2><div class="acct">${u?.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">`:''}<div><b>${esc(u?.displayName||'')}</b><small>${esc(u?.email||'')}</small></div><div style="flex:1"></div><button class="btn ghost sm" data-act="signOut">${ic('out')}Выйти</button></div><p>Задачи и заметки хранятся в облаке и видны только тебе. Файлы лежат на твоём Google Диске в папке «${FILES_FOLDER}».</p></div>
     <div class="card-s"><h2>Данные</h2><p>Экспорт сохраняет всё в один файл. Через импорт можно загрузить такой файл обратно или перенести данные из старого планировщика.</p><div class="rowbtns"><button class="btn ghost" data-act="export">Скачать копию</button><button class="btn ghost" data-act="import">Импорт из файла</button><button class="btn ghost" data-act="csvAll">Все задачи в CSV (Excel)</button></div></div>
     <div class="card-s"><h2>Теги</h2><div class="chips">${S.meta.tags.map(t=>`<button data-act="editTag" data-id="${t.id}"><i style="background:${esc(t.color)}"></i>#${esc(t.title)}</button>`).join('')}<button data-act="addTag">${ic('plus')}Тег</button></div></div>
     <div class="card-s"><h2>Колонки канбана</h2><p>Если последняя колонка называется «Готово», выполненные задачи сами попадают в неё.</p><ul class="list2">${S.meta.columns.map((c,i)=>`<li><span class="g">${esc(c.title)}</span><button data-act="colUp" data-i="${i}" aria-label="Выше" ${i===0?'disabled':''}>${ic('left')}</button><button data-act="colDown" data-i="${i}" aria-label="Ниже" ${i===S.meta.columns.length-1?'disabled':''}>${ic('right')}</button><button data-act="editCol" data-i="${i}" aria-label="Переименовать">${ic('edit')}</button><button data-act="delCol" data-i="${i}" aria-label="Удалить" ${S.meta.columns.length<2?'disabled':''}>${ic('trash')}</button></li>`).join('')}</ul><div class="rowbtns" style="margin-top:10px"><button class="btn ghost sm" data-act="addCol">${ic('plus')}Колонка</button></div></div>
     <div class="card-s"><h2>Проекты в архиве</h2>${S.meta.projects.filter(p=>p.archived).map(p=>`<button class="tag" data-act="unarchProject" data-id="${p.id}">${esc(p.title)} · вернуть</button> `).join('')||'<p>Архив пуст.</p>'}</div>
     <div class="card-s"><h2>Общие</h2><div class="srow"><span>Начало недели</span><div class="seg">${[[1,'Понедельник'],[0,'Воскресенье']].map(([v,l])=>`<button class="${S.meta.settings.weekStart===v?'on':''}" data-act="setWS" data-v="${v}">${l}</button>`).join('')}</div></div>
      <label class="srow ck"><input type="checkbox" id="s-autoRemind" ${S.meta.settings.autoRemind?'checked':''}><span>Напоминать о начале всех задач со временем, даже без своего напоминания</span></label>
      <div class="srow"><span>Уведомления в этом браузере: <b>${!('Notification' in window)?'не поддерживаются':Notification.permission==='granted'?'включены':Notification.permission==='denied'?'запрещены в настройках браузера':'не включены'}</b></span>${'Notification' in window&&Notification.permission==='default'?`<button class="btn ghost sm" data-act="askNotify">${ic('bell')}Включить</button>`:''}</div>
      <p class="small">Напоминания приходят, пока сайт открыт во вкладке или установлен как приложение и запущен.</p></div>
     <div class="card-s"><h2>Интерфейс</h2>
      <p>Параметры задачи: включённые видны в карточке всегда, остальные — когда заполнены или по кнопке внизу карточки.</p>
      <div class="seg" style="margin-bottom:8px">${[['min','Минимум'],['std','Стандарт'],['all','Всё']].map(([v,l])=>`<button data-act="setS" data-k="preset" data-v="${v}" class="${JSON.stringify([...(S.meta.settings.params||PRESETS.std)].sort())===JSON.stringify([...PRESETS[v]].sort())?'on':''}">${l}</button>`).join('')}</div>
      <div class="chips">${PARAMS.map(([k,l,i])=>`<button class="${(S.meta.settings.params||PRESETS.std).includes(k)?'on':''}" data-act="setS" data-k="param" data-v="${k}">${ic(i)}${l}</button>`).join('')}</div>
      <label class="srow ck"><input type="checkbox" data-sk="threePane" ${S.meta.settings.threePane!==false?'checked':''}><span>Трёхпанельный режим: карточка задачи справа. Если выключить — карточка открывается под задачей в списке</span></label>
      <p style="margin-top:12px">Верхний тулбар</p><div class="chips">${[['qaFocus','Новая задача','plus'],['dictate','Диктовка','wave'],['twoPane','Двухпанельный режим','panel'],['dateJump','Переход к дате','calday'],['timers','Помодоро','timer'],['notif','Уведомления','bell'],['sideToggle','Свернуть панель','dleft']].map(([k,l,i])=>`<button class="${S.meta.settings.tbHidden.includes(k)?'':'on'}" data-act="setS" data-k="tb" data-v="${k}">${ic(i)}${l}</button>`).join('')}</div>
      <p style="margin-top:12px">Список задач</p><div class="chips">${[['icons','Иконки'],['tags','Теги'],['path','Путь до задачи (проект)'],['stats','Счётчики в разделах']].map(([k,l])=>`<button class="${S.meta.settings.list[k]!==false?'on':''}" data-act="setS" data-k="list.${k}">${l}</button>`).join('')}</div>
      <label class="srow ck"><input type="checkbox" data-sk="dim" ${S.meta.settings.dim?'checked':''}><span>Фокусировать на рабочей области: затенять левую панель, пока курсор не над ней</span></label>
      <label class="srow ck"><input type="checkbox" data-sk="toc" ${S.meta.settings.toc!==false?'checked':''}><span>Оглавление в длинных заметках (от трёх заголовков)</span></label></div>
     <div class="card-s"><h2>Задачи</h2>
      <div class="srow"><span>Переносить выполненные в архив</span><div class="seg">${[['now','Сразу'],['day','На следующий день'],['manual','Вручную']].map(([v,l])=>`<button class="${S.meta.settings.archiveMode===v?'on':''}" data-act="setS" data-k="archiveMode" data-v="${v}">${l}</button>`).join('')}</div></div>
      <label class="srow ck"><input type="checkbox" data-sk="overdue" ${S.meta.settings.overdue?'checked':''}><span>Выделять просроченные даты цветом по давности (1 день, 4+ дня, неделя+)</span></label>
      <label class="srow ck"><input type="checkbox" data-sk="anim" ${S.meta.settings.anim?'checked':''}><span>Анимация при выполнении задачи</span></label>
      <label class="srow ck"><input type="checkbox" data-sk="hideTpl" ${S.meta.settings.hideTpl?'checked':''}><span>Скрывать в проектах будущие повторяющиеся задачи (они остаются в «Планах» и календаре)</span></label>
      <p class="small">Изменения сохраняются сразу, без интервала автосохранения.</p></div>
     <div class="card-s"><h2>Быстрое добавление</h2>
      <label class="srow ck"><input type="checkbox" data-sk="qaStrip" ${S.meta.settings.qaStrip!==false?'checked':''}><span>Удалять распознанные даты, время, напоминания, теги и проект из названия</span></label>
      <div class="srow"><span>Символ проекта</span><input class="inp sm" style="width:60px" maxlength="2" data-sv="qaProj" value="${esc(S.meta.settings.qaProj||'@')}"></div>
      <div class="srow"><span>Символ тега</span><input class="inp sm" style="width:60px" maxlength="2" data-sv="qaTag" value="${esc(S.meta.settings.qaTag||'#')}"></div>
      <p class="small">Понимает: «завтра», «в пятницу», «25 декабря», «в 10:00», «напомни за час», «напомни вовремя», «будильник», «без напоминания», p0 — закрепить, p1–p3 или «!!» — приоритет.</p></div>
     <div class="card-s"><h2>Помодоро</h2><p>Работа ${S.meta.settings.pomo.work} мин · короткий перерыв ${S.meta.settings.pomo.short} мин · длинный ${S.meta.settings.pomo.long} мин после каждых ${S.meta.settings.pomo.every} помодоро${S.meta.settings.pomo.auto?' · следующий период стартует сам':''}${S.meta.settings.pomo.sound?' · со звуком':''}</p><button class="btn ghost sm" data-act="editPomo">${ic('edit')}Изменить</button></div>
     <div class="card-s"><h2>Левая панель</h2><p>Какие разделы показывать.</p><div class="chips">${[...SIDE_TOP,...SIDE_BOTTOM.filter(k=>k!=='settings')].map(k=>{const[l,i]=VIEWS[k]||ICV[k];return`<button class="${S.meta.settings.hidden.includes(k)?'':'on'}" data-act="toggleView" data-v="${k}">${ic(i)}${l}</button>`}).join('')}</div></div>
     <div class="card-s"><h2>Горячие клавиши</h2><ul class="list2 keys"><li><kbd>N</kbd><span class="g">новая задача</span></li><li><kbd>/</kbd><span class="g">поиск</span></li><li><kbd>F</kbd><span class="g">режим фокуса</span></li><li><kbd>Ctrl</kbd>+<kbd>Enter</kbd><span class="g">выполнить открытую задачу</span></li><li><kbd>Esc</kbd><span class="g">закрыть карточку или окно</span></li></ul></div>
     <div class="card-s"><h2>Оформление</h2><p>Цветовая тема</p><div class="seg">${[['night','Ночь'],['dark','Тёмная'],['graphite','Графит'],['gray','Серая'],['normal','Обычная'],['light','Светлая'],['sepia','Сепия'],['system','Как в системе']].map(([v,l])=>`<button class="${getTheme()===v?'on':''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div><p style="margin-top:14px">Акцентный цвет</p><div class="swatches">${ACCENTS.map(c=>`<button class="${getAccent()===c?'on':''}" data-act="accent" data-v="${c}" style="${c?`background:${c}`:''}" aria-label="${c||'Цвет темы'}" title="${c||'Как в теме'}">${c?'':'А'}</button>`).join('')}<label class="cpick ${getAccent()&&!ACCENTS.includes(getAccent())?'on':''}" title="Свой цвет" style="${getAccent()&&!ACCENTS.includes(getAccent())?`background:${getAccent()}`:''}"><input type="color" id="accentCustom" value="${getAccent()||'#5b8def'}" aria-label="Свой акцентный цвет"></label></div><p class="small" style="margin-top:12px">Цвет проекта меняется в его меню «…» → «Изменить»: 24 готовых цвета или свой.</p></div></div>`;break}
  }
  c.innerHTML=`<div class="${view.type==='kanban'?'':'wrap'}">${h}</div>`;
  const tgb=c.querySelector('.tg');if(tgb){tgb.scrollTop=tgScroll??Math.max(0,(new Date().getHours()-2))*(innerWidth>820?60:52);tgb.onscroll=()=>{tgScroll=tgb.scrollTop}}
}
function habitRate(x){const g=x.goal||1;let n=0;for(let i=0;i<30;i++)if((x.log?.[addDays(today(),-i)]||0)>=g)n++;return Math.round(n/30*100)}
function ganttHTML(arr){const it=arr.filter(t=>t.start||t.deadline).map(t=>({t,a:t.start||t.deadline,b:t.deadline&&t.start&&t.deadline>t.start?t.deadline:(t.start||t.deadline)})).sort((x,y)=>x.a<y.a?-1:1);
  if(!it.length)return emptyHTML('Нечего показать на диаграмме','Поставь задачам проекта дату начала и крайний срок — они выстроятся на шкале времени.');
  let a0=it[0].a<today()?it[0].a:addDays(today(),-1);a0=addDays(a0,-1);let b0=it.reduce((m,x)=>x.b>m?x.b:m,today());b0=addDays(b0,2);let n=Math.round((new Date(b0)-new Date(a0))/864e5)+1;if(n>120){n=120;b0=addDays(a0,119)}
  const pos=d=>Math.max(0,Math.min(n,Math.round((new Date(d)-new Date(a0))/864e5)));const ti=pos(today());
  const ticks=[...Array(n)].map((_,i)=>addDays(a0,i)).filter((d,i)=>i===0||d.slice(8)==='01'||new Date(d+'T00:00').getDay()===1);
  return`<div class="gantt"><div class="gscale">${ticks.map(d=>`<span style="left:${pos(d)/n*100}%">${fmtDate(d)}</span>`).join('')}</div>${it.map(({t,a,b})=>`<div class="grow2"><button class="glabel" data-act="openId" data-id="${t.id}">${esc(t.title||'Без названия')}</button><div class="gtrack"><i class="gnow" style="left:${(ti+.5)/n*100}%"></i><button class="gbar pr${t.priority} ${isOver(t)?'over':''}" data-act="openId" data-id="${t.id}" style="${pcs(t)};left:${pos(a)/n*100}%;width:${Math.max(1,pos(b)-pos(a)+1)/n*100}%" title="${fmtDate(a)} — ${fmtDate(b)}"></button></div></div>`).join('')}</div>`}
function exportCSV(list,name){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const rows=[['Название','Проект','Раздел','Дата','Время','Крайний срок','Важность','Статус','Повтор','Теги','Заметка']];
  for(const t of list)rows.push([t.title,proj(t.projectId)?.title||'Входящие',groupOf(t.groupId)?.title||'',t.start||'',t.time||'',t.deadline||'',['высокая','обычная','низкая'][t.priority],{open:'в работе',done:'выполнена',cancelled:'отменена'}[t.state],t.repeat?repeatText(t):'',t.tags.map(i=>tagOf(i)?.title).filter(Boolean).join(', '),t.lock?'':t.note]);
  const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const el=document.createElement('a');el.href=URL.createObjectURL(blob);el.download=name+'.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(el.href),2000)}
function streak(x){const goal=x.goal||1;let d=today();if((x.log?.[d]||0)<goal)d=addDays(d,-1);let n=0;while((x.log?.[d]||0)>=goal){n++;d=addDays(d,-1)}return n}
let calXKey='',calX=0;
function render(){if(!S.user)return;applyUI();if(S.meta&&!S.meta.settings.threePane){const d=$("#detail");if(d&&d.parentElement!==$('#app'))$('#app').appendChild(d)}setTimeout(()=>{const tgw=document.querySelector('.tg.week');if(tgw&&tgw.scrollWidth>tgw.clientWidth+4){const key=calDay+'|'+tgw.scrollWidth;if(calXKey!==key){calXKey=key;const td=tgw.querySelector('.tghead .today')||tgw.querySelector('.tghead .on');if(td)tgw.scrollLeft=Math.max(0,td.offsetLeft-60)}else tgw.scrollLeft=calX;tgw.addEventListener('scroll',()=>calX=tgw.scrollLeft)}document.querySelectorAll('.task[data-id]').forEach(r=>r.classList.toggle('msel',multi.has(r.dataset.id)));bulkBar()},0);if(pendingOpen&&S.tasks.has(pendingOpen)){selId=pendingOpen;selNoteId=null;pendingOpen=null;history.replaceState(null,'',location.pathname+location.search)}renderSide();renderTabbar();renderContent();renderDetail();renderSync()}

/* ---------- detail: task / note ---------- */
function projOptions(sel,emptyLabel){return`<option value="">${emptyLabel}</option>`+projTree().map(([p,d])=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${'— '.repeat(d)}${esc(p.title)}</option>`).join('')}
const PARAMS=[['project','Проект','folder'],['group','Раздел','cols'],['date','Дата старта','cal'],['remind','Напоминание','bell'],['repeat','Повторять','repeat'],['deadline','Крайний срок','flag'],['duration','Длительность','timer'],['priority','Приоритет','flag'],['tags','Теги','tag'],['checklist','Чек-лист','check'],['subtasks','Подзадачи','sub'],['note','Заметка','note'],['files','Файлы','clip'],['comments','Комментарии','chat'],['time','Помодоро и время','timer'],['kanban','Колонка в канбане','cols']];
const PRESETS={min:['note'],std:['project','date','repeat','deadline','checklist','subtasks','note','comments'],all:PARAMS.map(x=>x[0])};
const shownParams=new Map();
function paramFilled(k,t){switch(k){case'project':return!!t.projectId;case'group':return!!t.groupId;case'date':return!!(t.start||t.time);case'remind':return t.remind!=null&&t.remind!=='';case'repeat':return!!t.repeat;case'deadline':return!!t.deadline;case'duration':return!!t.duration;case'priority':return t.priority!==1||t.deferred;case'tags':return t.tags.length>0;case'checklist':return t.checklist.length>0;case'subtasks':return kids(t.id).length>0;case'note':return!!t.note;case'files':return(t.files||[]).length>0;case'comments':return(t.comments||[]).length>0;case'time':return t.timeSpent>0||(S.meta.running&&S.meta.running.taskId===t.id);case'kanban':return false}return false}
function paramOfField(f){const q=s=>f.querySelector(s);if(f.classList.contains('rep'))return'repeat';if(q('#d-project'))return'project';if(q('#d-group'))return'group';if(q('#d-start')||q('#d-time'))return'date';if(q('#d-remind'))return'remind';if(q('#d-repeat'))return'repeat';if(q('#d-deadline'))return'deadline';if(q('#d-duration'))return'duration';if(q('#d-col'))return'kanban';if(q('.prio'))return'priority';if(q('[data-act=dTag]')||q('[data-attach=t]'))return'tags';if(q('#d-subnew'))return'subtasks';if(q('#d-clnew'))return'checklist';if(q('#d-note'))return'note';if(q('[data-act=attach]')||f.classList.contains('files'))return'files';if(q('#d-cmnew'))return'comments';if(q('[data-act=startTimer],[data-act=stopTimer]'))return'time';return null}
function paramize(el,t){const st=S.meta.settings;const always=new Set(st.params||PRESETS.std);const extra=shownParams.get(t.id)||new Set();const hidden=[];
  el.querySelectorAll('.dbody .field').forEach(f=>{const k=paramOfField(f);if(!k)return;f.dataset.param=k;if(!(always.has(k)||paramFilled(k,t)||extra.has(k))){f.hidden=true;if(!hidden.includes(k))hidden.push(k)}});
  el.querySelectorAll('.dbody .grid2').forEach(g=>{if(![...g.children].some(c=>!c.hidden))g.hidden=true});
  const bar=document.createElement('div');bar.className='pchips';const order=(st.paramOrder||PARAMS.map(x=>x[0]));
  bar.innerHTML=order.filter(k=>hidden.includes(k)).map(k=>{const P=PARAMS.find(x=>x[0]===k);return P?`<button data-act="showParam" data-v="${k}" title="Добавить: ${P[1]}">${ic(P[2])}${P[1]}</button>`:''}).join('')+`<button data-act="taskMenu" class="pmorebtn" title="Ещё действия" aria-label="Ещё действия">${ic('more')}</button>`;
  el.querySelector('.dactions')?.before(bar)}
function revealParam(k,focusSel){const t=S.tasks.get(selId);if(!t)return;const s=shownParams.get(t.id)||new Set();s.add(k);shownParams.set(t.id,s);renderDetail(true);const f=$('#detail [data-param="'+k+'"]');if(f){f.scrollIntoView({block:'nearest'});(focusSel?f.querySelector(focusSel):f.querySelector('input,select,textarea,button'))?.focus();f.classList.add('flash');setTimeout(()=>f.classList.remove('flash'),900)}}
function runAct(act,ds={}){const b=document.createElement('button');b.dataset.act=act;Object.assign(b.dataset,ds);b.hidden=true;$('#detail').appendChild(b);b.click();b.remove()}
/* context menu */
let CLIP=null;const multi=new Set();
function closeCtx(){document.querySelectorAll('.ctxmenu').forEach(x=>x.remove())}
function taskMenu(t,x,y){closeCtx();if(selId!==t.id){selId=t.id;selNoteId=null;render();renderDetail(true)}
  const many=multi.size>1&&multi.has(t.id);const kb=k=>`<kbd>${k}</kbd>`;
  const items=many?[['bulkDone','check',`Выполнить (${multi.size})`],['bulkToday','cal','На сегодня'],['bulkTomorrow','cal','На завтра'],['bulkProject','folder','Изменить проект…'],['-'],['cut','cut','Вырезать',kb('Ctrl X')],['copy','copy','Копировать',kb('Ctrl C')],['-'],['bulkDel','trash','Удалить',kb('Del')]]
  :[['date','cal','Установить дату и время',kb('Ctrl D')],['repeat','repeat','Повторять',kb('Ctrl ⇧ R')],['pomo','timer','Запустить Помодоро'],['toNote','note','Конвертировать в заметку'],['pri','flag','Приоритет'],['tag','tag','Новый тег',kb('Ctrl G')],['checklist','check','Чек-лист',kb('Ctrl I')],['file','clip','Прикрепить файл',kb('Ctrl ⇧ J')],['-'],['done','done',open(t)?'Завершить задачу':'Вернуть в работу',kb('Ctrl Enter')],['pin','pin',t.pinned?'Открепить':'Закрепить сверху'],['someday','moon',t.deferred?'Убрать из «Когда-нибудь»':'В «Когда-нибудь»'],['lock','lock',t.lock?'Пароль…':'Установить пароль',kb('Ctrl ⇧ X')],['fav','star',t.fav?'Убрать из избранного':'Добавить в избранное',kb('Ctrl ⇧ L')],['project','folder','Изменить проект',kb('Ctrl ⇧ M')],['sub','sub','Новая подзадача',kb('Alt ⇧ N')],['-'],['cut','cut','Вырезать задачу',kb('Ctrl X')],['copy','copy','Копировать задачу',kb('Ctrl C')],['dup','copy','Дублировать'],['link','link','Скопировать ссылку'],['-'],['del','trash','Удалить',kb('Del')]];
  const m=document.createElement('div');m.className='ctxmenu';m.setAttribute('role','menu');
  m.innerHTML=items.map(i=>i[0]==='-'?'<hr>':i[0]==='pri'?`<div class="ctxpri"><span>${ic('flag')}Приоритет</span>${[[0,'Высокий'],[1,'Обычный'],[2,'Низкий']].map(([v,l])=>`<button data-tm="pri" data-v="${v}" class="p${v} ${t.priority===v?'on':''}" title="${l}">${l}</button>`).join('')}</div>`:`<button data-tm="${i[0]}" role="menuitem">${ic(i[1])}<span>${i[2]}</span>${i[3]||''}</button>`).join('');
  document.body.appendChild(m);const r=m.getBoundingClientRect();m.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';m.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px';
  m.addEventListener('click',ev=>{const b=ev.target.closest('[data-tm]');if(!b)return;closeCtx();doTM(b.dataset.tm,t,b.dataset.v)})}
async function doTM(k,t,v){const ids=multi.size>1&&multi.has(t.id)?[...multi]:[t.id];const each=f=>{ids.forEach(id=>{const x=S.tasks.get(id);if(x){f(x);saveTask(x)}})};
  switch(k){case'date':revealParam('date','#d-start');break;case'repeat':revealParam('repeat','#d-repeat');break;case'pomo':startTimer(t.id,S.meta.settings.pomo.work*60,true);renderDetail(true);toast('Помодоро запущен');break;
   case'toNote':runAct('dToNote');break;case'pri':runAct('dPri',{v});break;case'tag':runAct('addTag',{attach:'t'});break;case'checklist':revealParam('checklist','#d-clnew');break;
   case'file':revealParam('files');$('#detail [data-param=files] [data-act=attach]')?.click();break;case'done':toggleTask(t);renderDetail(true);break;case'pin':t.pinned=!t.pinned;saveTask(t);break;case'someday':runAct('dDefer');break;
   case'lock':runAct('dLock');break;case'fav':runAct('dFav');break;case'project':revealParam('project','#d-project');break;case'sub':revealParam('subtasks','#d-subnew');break;
   case'cut':case'copy':CLIP={mode:k,ids};toast(k==='cut'?`Вырезано: ${ids.length}. Вставь в нужном проекте — Ctrl V`:`Скопировано: ${ids.length}. Вставь — Ctrl V`);break;
   case'dup':runAct('dDup');break;case'link':runAct('dLink');break;case'del':runAct('dDelete');break;
   case'bulkDone':ids.forEach(id=>{const x=S.tasks.get(id);if(x&&open(x))toggleTask(x)});multi.clear();render();break;
   case'bulkToday':each(x=>{x.start=today();x.deferred=false});break;case'bulkTomorrow':each(x=>{x.start=addDays(today(),1);x.deferred=false});break;
   case'bulkProject':{const v2=await form('Переместить в проект',[{id:'p',label:'Проект',type:'select',value:'',options:[['','Входящие'],...activeProj().map(p=>[p.id,p.title])]}],'Переместить');if(v2){each(x=>{x.projectId=v2.p||null;x.groupId=null});multi.clear();render()}break}
   case'bulkDel':{const before=ids.map(id=>clone(S.tasks.get(id)));each(x=>x.deletedAt=Date.now());multi.clear();selId=null;render();toast(`Удалено: ${ids.length}`,()=>before.forEach(b=>{S.tasks.set(b.id,b);saveTask(b)}));break}}}
function pasteClip(){if(!CLIP)return;const dest=view.type==='project'?view.id:view.type==='inbox'?null:undefined;let n=0;
  for(const id of CLIP.ids){const x=S.tasks.get(id);if(!x)continue;if(CLIP.mode==='cut'){if(dest!==undefined){x.projectId=dest;x.groupId=null}x.parentId=null;x.order=Date.now()+n;saveTask(x)}else{const c=normTask({...clone(x),id:uid(),createdAt:Date.now(),completedAt:null,state:'open',order:Date.now()+n,parentId:null,projectId:dest!==undefined?dest:x.projectId,groupId:dest!==undefined?null:x.groupId,files:[]});saveTask(c)}n++}
  toast(CLIP.mode==='cut'?`Перемещено: ${n}`:`Вставлено копий: ${n}`);if(CLIP.mode==='cut')CLIP=null}
function bulkBar(){let b=$('#bulkbar');if(multi.size<2){b?.remove();return}if(!b){b=document.createElement('div');b.id='bulkbar';document.body.appendChild(b)}
  b.innerHTML=`<b>Выбрано: ${multi.size}</b><button data-bulk="bulkDone">${ic('check')}Выполнить</button><button data-bulk="bulkToday">${ic('cal')}Сегодня</button><button data-bulk="bulkTomorrow">Завтра</button><button data-bulk="bulkProject">${ic('folder')}Проект</button><button data-bulk="bulkDel">${ic('trash')}Удалить</button><button data-bulk="clear" aria-label="Снять выделение">${ic('x')}</button>`;
  b.onclick=e=>{const k=e.target.closest('[data-bulk]')?.dataset.bulk;if(!k)return;if(k==='clear'){multi.clear();render();return}const t=S.tasks.get([...multi][0]);if(t)doTM(k,t)}}
function applyUI(){if(!S.meta)return;const st=S.meta.settings,b=document.body,L=st.list||{};b.classList.toggle('lo-noicons',L.icons===false);b.classList.toggle('lo-notags',L.tags===false);b.classList.toggle('lo-nopath',L.path===false);b.classList.toggle('lo-nostats',L.stats===false);b.classList.toggle('dimside',!!st.dim);b.classList.toggle('inline-det',st.threePane===false);b.classList.toggle('v-cal',view.type==='calendar');
  document.querySelectorAll('.tbar>button').forEach(x=>x.hidden=(st.tbHidden||[]).includes(x.dataset.act||x.dataset.nav||x.dataset.x))}
function placeInline(){if(S.meta.settings.threePane!==false)return;const d=$('#detail');const row=selId&&document.querySelector(`.task[data-id="${selId}"]`);if(d&&row&&!d.hidden){let li=row.nextElementSibling;if(!li||!li.classList.contains('inline-host')){li=document.createElement('li');li.className='inline-host';row.after(li)}li.appendChild(d)}else if(d&&d.parentElement!==$('#app'))$('#app').appendChild(d)}
function renderDetail(force){
  const el=$('#detail');const t=selId&&S.tasks.get(selId);const n=!t&&selNoteId&&S.notes.get(selNoteId);document.body.classList.toggle('has-detail',!!(t||n));
  if(!t&&!n){el.hidden=true;el.innerHTML='';el.dataset.id='';el.style.height='';el.style.transform='';document.body.classList.remove('sheet-full');return}
  const key=(t?'t':'n')+(t||n).id;
  if(!force&&el.dataset.id===key&&el.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select'))return;
  el.hidden=false;el.dataset.id=key;
  if(n){const p=proj(n.projectId);
    el.innerHTML=`<div class="dhead"><button class="ic" data-act="closeDetail" aria-label="Закрыть">${ic('back')}</button><span class="small">${p?esc(p.title):'Заметка'}</span><span class="grow"></span><button class="ic" data-act="nPin" aria-label="${n.pinned?'Открепить':'Закрепить'}" title="${n.pinned?'Открепить':'Закрепить'}" style="${n.pinned?'color:var(--mid)':''}">${ic('pin')}</button><button class="ic" data-act="nDelete" aria-label="Удалить заметку" title="Удалить">${ic('trash')}</button></div>
    <div class="dbody"><textarea class="dtitle" id="n-title" rows="1" placeholder="Название заметки" aria-label="Название">${esc(n.title)}</textarea>
    <div class="grid2"><div class="field"><label for="n-project">Проект</label><select class="inp" id="n-project">${projOptions(n.projectId,'Без проекта')}</select></div><div class="field"><span class="flabel">Режим</span><div class="seg"><button class="${noteMode==='view'?'on':''}" data-act="noteMode" data-v="view">Просмотр</button><button class="${noteMode==='edit'?'on':''}" data-act="noteMode" data-v="edit">Редактор</button></div></div></div>
    ${noteMode==='edit'?`<textarea class="inp nbody" id="n-body" placeholder="# Заголовок&#10;Текст, **жирный**, *курсив*&#10;- пункт списка&#10;- [ ] дело для чек-листа&#10;Ссылки вставляй как есть">${esc(n.body)}</textarea>`:`<div class="md" data-act="toEdit">${n.body?md(n.body):'<p class="muted">Пусто. Нажми «Редактор», чтобы писать.</p>'}</div>`}
    <div class="field"><span class="flabel">Теги</span><div class="chips">${S.meta.tags.map(g=>`<button class="${n.tags.includes(g.id)?'on':''}" data-act="nTag" data-id="${g.id}"><i style="background:${esc(g.color)}"></i>#${esc(g.title)}</button>`).join('')}<button data-act="addTag" data-attach="n">${ic('plus')}Новый</button></div></div>
    ${filesHTML(n,'n')}
    <div class="dactions"><button class="btn ghost" data-act="noteToTask">${ic('check')}Сделать задачей</button></div>
    <p class="small">Создана ${fmtDate(iso(new Date(n.createdAt)))} · изменена ${fmtDate(iso(new Date(n.updatedAt)))}, ${hhmm(n.updatedAt)}</p></div>`;
    autosize($('#n-title'));if(S.meta.settings.toc!==false&&noteMode==='view'){const hs=[...el.querySelectorAll('.md h1,.md h2,.md h3')];if(hs.length>=3){const nav=document.createElement('nav');nav.className='toc';nav.innerHTML='<b>Оглавление</b>'+hs.map((x,i)=>{x.id='h-'+i;return`<button type="button" data-h="h-${i}" class="l${x.tagName[1]}">${esc(x.textContent)}</button>`}).join('');nav.onclick=e=>{const b=e.target.closest('[data-h]');if(b)document.getElementById(b.dataset.h)?.scrollIntoView({behavior:'smooth',block:'start'})};el.querySelector('.md')?.before(nav)}}return}
  const p=proj(t.projectId);const groups=S.meta.groups.filter(g=>g.projectId===t.projectId);const run=S.meta.running;const running=run&&run.taskId===t.id;const parent=t.parentId&&S.tasks.get(t.parentId);const ch=kids(t.id).sort(cmp);
  el.innerHTML=`<div class="dhead"><button class="ic" data-act="closeDetail" aria-label="Закрыть">${ic('back')}</button><span class="small">${p?esc(p.title):'Входящие'}</span><span class="grow"></span>${t.fav?`<span class="dflag" title="В избранном">${ic('star')}</span>`:''}${t.pinned?`<span class="dflag" title="Закреплена">${ic('pin')}</span>`:''}${t.lock?`<span class="dflag" title="Под паролем">${ic('lock')}</span>`:''}<button class="ic" data-act="dToggle" aria-label="${open(t)?'Выполнить':'Вернуть'}" title="${open(t)?'Выполнить':'Вернуть'}">${ic(open(t)?'done':'repeat')}</button><button class="ic" data-act="dDelete" aria-label="Удалить" title="В корзину">${ic('trash')}</button></div>
  <div class="dbody">${parent&&!parent.deletedAt?`<div class="parentlink">${ic('sub')}Подзадача к <button data-act="openId" data-id="${parent.id}">${esc(parent.title)}</button></div>`:''}
   <textarea class="dtitle" id="d-title" rows="1" placeholder="Название задачи" aria-label="Название">${esc(t.title)}</textarea>
   <div class="grid2">
    <div class="field"><label for="d-project">Проект</label><select class="inp" id="d-project">${projOptions(t.projectId,'Входящие')}</select></div>
    <div class="field"><label for="d-group">Раздел</label><select class="inp" id="d-group" ${!t.projectId?'disabled':''}><option value="">Без раздела</option>${groups.map(g=>`<option value="${g.id}" ${g.id===t.groupId?'selected':''}>${esc(g.title)}</option>`).join('')}</select></div>
    <div class="field"><label for="d-start">Дата</label><input class="inp" type="date" id="d-start" value="${t.start||''}"></div>
    <div class="field"><label for="d-time">Время</label><input class="inp" type="time" id="d-time" value="${t.time||''}"></div>
    <div class="field"><label for="d-remind">Напоминание</label><select class="inp" id="d-remind">${[['','Без напоминания'],['0','В момент начала'],['5','За 5 минут'],['15','За 15 минут'],['30','За 30 минут'],['60','За час'],['180','За 3 часа'],['1440','За день']].map(([v,l])=>`<option value="${v}" ${String(t.remind??'')===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="d-duration">Длительность, мин</label><input class="inp" type="number" min="0" step="5" id="d-duration" value="${t.duration||''}" placeholder="например, 60"></div>
    <div class="field"><label for="d-deadline">Крайний срок</label><input class="inp" type="date" id="d-deadline" value="${t.deadline||''}"></div>
    <div class="field"><label for="d-repeat">Повтор</label><select class="inp" id="d-repeat">${[['','Не повторять'],['daily','Каждый день'],['weekdays','По будням'],['weekly','Каждую неделю'],['monthly','Каждый месяц'],['yearly','Каждый год']].map(([v,l])=>`<option value="${v}" ${(t.repeat||'')===v?'selected':''}>${l}</option>`).join('')}</select></div>
    ${t.repeat?`<div class="field rep" style="grid-column:1/-1"><span class="flabel">Настройка повтора · ${esc(repeatText(t))}</span><div class="reprow">${t.repeat!=='weekdays'?`<label>Каждые <input class="inp" type="number" min="1" id="d-every" value="${Math.max(1,parseInt(t.repeatEvery)||1)}"> ${{daily:'дн.',weekly:'нед.',monthly:'мес.',yearly:'г.'}[t.repeat]}</label>`:''}<label class="ck"><input type="checkbox" id="d-rfd" ${t.repeatFromDone?'checked':''}>считать от дня выполнения</label></div>
      ${t.repeat==='weekly'?`<div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="${t.repeatDays?.includes(d)?'on':''}" data-act="dRDay" data-v="${d}">${WDS[d]}</button>`).join('')}</div>`:''}
      <div class="reprow"><label>Окончание <select class="inp" id="d-rend"><option value="">никогда</option><option value="count" ${t.repeatEnd==='count'?'selected':''}>после N раз</option><option value="date" ${t.repeatEnd==='date'?'selected':''}>в дату</option></select></label>${t.repeatEnd==='count'?`<label>осталось <input class="inp" type="number" min="1" id="d-rcount" value="${parseInt(t.repeatCount)||1}"> раз</label>`:t.repeatEnd==='date'?`<input class="inp" type="date" id="d-runtil" value="${t.repeatUntil||''}">`:''}</div></div>`:''}
    <div class="field"><label for="d-col">Колонка канбана</label><select class="inp" id="d-col">${S.meta.columns.map(c=>`<option value="${c.id}" ${(t.columnId||S.meta.columns[0].id)===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></div>
   </div>
   <div class="field"><span class="flabel">Важность</span><div class="chips prio">${[[0,'Высокая'],[1,'Обычная'],[2,'Низкая']].map(([v,l])=>`<button class="p${v} ${t.priority===v?'on':''}" data-act="dPri" data-v="${v}">${l}</button>`).join('')}<button class="${t.deferred?'on':''}" data-act="dDefer">${ic('moon')}Когда-нибудь</button></div></div>
   <div class="field"><span class="flabel">Теги</span><div class="chips">${S.meta.tags.map(g=>`<button class="${t.tags.includes(g.id)?'on':''}" data-act="dTag" data-id="${g.id}"><i style="background:${esc(g.color)}"></i>#${esc(g.title)}</button>`).join('')}<button data-act="addTag" data-attach="t">${ic('plus')}Новый</button></div></div>
   <div class="field"><span class="flabel">Подзадачи ${ch.length?`· ${ch.filter(x=>!open(x)).length} из ${ch.length}`:''}</span><ul class="subs">${ch.map(c=>`<li class="${!open(c)?'is-done':''}" data-id="${c.id}"><button class="chk pr${c.priority}" data-act="subToggle" data-id="${c.id}" aria-label="Отметить подзадачу">${!open(c)?ic('check'):''}</button><span data-act="openId" data-id="${c.id}">${esc(c.title||'Без названия')}</span></li>`).join('')}</ul><input class="inp" id="d-subnew" placeholder="Новая подзадача и Enter" aria-label="Новая подзадача"></div>
   ${t.lock&&!unlocked.has(t.id)?`<div class="lockbox">${ic('lock')}<div><b>Задача под паролем</b><small>Заметка, чек-лист, комментарии и файлы скрыты.</small></div><button class="btn sm" data-act="dUnlock">Открыть</button></div>`:`
   <div class="field"><span class="flabel">Чек-лист ${t.checklist.length?`· ${t.checklist.filter(c=>c.state===1).length} из ${t.checklist.length}`:''}</span><ul class="cl">${t.checklist.map(c=>`<li class="st${c.state}" data-cid="${c.id}"><button class="cb" data-act="clState" aria-label="Отметить пункт">${c.state===1?ic('check'):c.state===2?ic('x'):''}</button><input value="${esc(c.text)}" data-cl="${c.id}" aria-label="Пункт"><button class="del" data-act="clDel" aria-label="Удалить пункт">${ic('x')}</button></li>`).join('')}<li><span class="cb" style="border-style:dashed"></span><input id="d-clnew" placeholder="Добавить пункт и нажать Enter" aria-label="Новый пункт"></li></ul></div>
   <div class="field"><label for="d-note">Заметка</label><textarea class="inp" id="d-note" placeholder="Подробности, ссылки, мысли">${esc(t.note)}</textarea></div>
   ${filesHTML(t,'t')}
   <div class="field"><span class="flabel">Комментарии ${t.comments?.length?'· '+t.comments.length:''}</span><ul class="cmts">${(t.comments||[]).map(c=>`<li><p>${inl(c.text)}</p><small>${fmtDate(iso(new Date(c.at)))}, ${hhmm(c.at)}</small><button data-act="cmDel" data-id="${c.id}" aria-label="Удалить комментарий">${ic('x')}</button></li>`).join('')}</ul><input class="inp" id="d-cmnew" placeholder="Написать комментарий и Enter" aria-label="Новый комментарий"></div>`}
   <div class="field"><span class="flabel">Время на задачу · ${fmtDur(t.timeSpent)}</span><div class="rowbtns">${running?`<button class="btn danger sm" data-act="stopTimer">${ic('stop')}Остановить</button>`:`<button class="btn sm" data-act="startTimer">${ic('play')}Секундомер</button><button class="btn ghost sm" data-act="startTimer" data-limit="${S.meta.settings.pomo.work*60}" data-pomo="1">${ic('timer')}Помодоро ${S.meta.settings.pomo.work} мин</button>`}</div></div>
   <div class="dactions">${open(t)?`<button class="btn" data-act="dToggle">${ic('check')}${t.repeat?'Сделано, перенести дальше':'Выполнить'}</button><button class="btn ghost" data-act="dCancel">${ic('x')}Не буду делать</button>`:`<button class="btn ghost" data-act="dToggle">${ic('repeat')}Вернуть в работу</button>`}<button class="btn ghost" data-act="dDup">Копия</button><button class="btn ghost" data-act="dToNote">${ic('note')}В заметку</button></div>
   <p class="small">Создана ${fmtDate(iso(new Date(t.createdAt)))}${t.completedAt?` · закрыта ${fmtDate(iso(new Date(t.completedAt)))}`:''}</p></div>`;
  autosize($('#d-title'));paramize(el,t);placeInline();
}
function autosize(ta){if(!ta)return;ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'}
function newNote(f={}){const n=normNote(Object.assign({id:uid()},f));saveNote(n,{now:true});selNoteId=n.id;selId=null;noteMode='edit';render();renderDetail(true);setTimeout(()=>{const b=$(f.title?'#n-body':'#n-title');b&&b.focus()},50);return n}

/* ---------- modal & toast ---------- */
function modal(html){const m=$('#modal');m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;setTimeout(()=>{const f=m.querySelector('input,select,button.btn');f&&f.focus()},30);return m}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML=''}
function confirmBox(title,text,ok='Да',danger=true){return new Promise(res=>{const m=modal(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="mbtns"><button class="btn ghost" data-r="0">Отмена</button><button class="btn ${danger?'danger':''}" data-r="1">${esc(ok)}</button></div>`);m.onclick=e=>{const b=e.target.closest('[data-r]');if(b||e.target===m){closeModal();m.onclick=null;res(b?.dataset.r==='1')}}})}
function form(title,fields,ok='Сохранить',extra=''){return new Promise(res=>{
  const m=modal(`<h3>${esc(title)}</h3><form id="mform" style="display:flex;flex-direction:column;gap:12px">${fields.map(f=>f.type==='color'?`<div class="field"><span class="flabel">${esc(f.label)}</span><div class="swatches" data-color="${f.id}">${COLORS.map(c=>`<button type="button" style="background:${c}" data-c="${c}" class="${c===f.value?'on':''}" aria-label="Цвет"></button>`).join('')}<label class="cpick ${f.value&&!COLORS.includes(f.value)?'on':''}" title="Свой цвет" style="${f.value&&!COLORS.includes(f.value)?`background:${f.value}`:''}"><input type="color" data-cpick="${f.id}" value="${f.value&&/^#[0-9a-f]{6}$/i.test(f.value)?f.value:'#5b8def'}" aria-label="Свой цвет"></label></div></div>`:f.type==='select'?`<div class="field"><label for="m-${f.id}">${esc(f.label)}</label><select class="inp" id="m-${f.id}">${f.options.map(([v,l])=>`<option value="${esc(v)}" ${v===(f.value||'')?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`:`<div class="field"><label for="m-${f.id}">${esc(f.label)}</label><input class="inp" id="m-${f.id}" type="${f.type||'text'}" value="${esc(f.value??'')}" ${f.min!==undefined?`min="${f.min}"`:''} placeholder="${esc(f.ph||'')}"></div>`).join('')}<div class="mbtns">${extra}<button type="button" class="btn ghost" data-r="cancel">Отмена</button><button class="btn" type="submit">${esc(ok)}</button></div></form>`);
  const colors={};fields.filter(f=>f.type==='color').forEach(f=>colors[f.id]=f.value);m.addEventListener('cpick',e=>{colors[e.detail.id]=e.detail.v});const finish=v=>{closeModal();m.onclick=null;res(v)};
  m.onclick=e=>{const sw=e.target.closest('[data-c]');if(sw){sw.parentElement.querySelector('.cpick')?.classList.remove('on');const box=sw.parentElement;box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===sw));colors[box.dataset.color]=sw.dataset.c;return}const r=e.target.closest('[data-r]');if(r){finish(r.dataset.r==='cancel'?null:{_action:r.dataset.r});return}if(e.target===m)finish(null)};
  m.querySelector('#mform').onsubmit=e=>{e.preventDefault();const v={};for(const f of fields)v[f.id]=f.type==='color'?colors[f.id]:m.querySelector('#m-'+f.id).value.trim();finish(v)}})}
let toastTimer=null;
function toast(text,undo){const el=$('#toast');el.innerHTML=`<span>${esc(text)}</span>${undo?'<button data-undo>Отменить</button>':''}`;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,undo?6000:3200);if(undo)el.querySelector('[data-undo]').onclick=()=>{el.hidden=true;undo()}}

/* ---------- theme ---------- */
function getTheme(){try{return localStorage.getItem('planner-theme')||'night'}catch(e){return'night'}}
function getAccent(){try{return localStorage.getItem('planner-accent')||''}catch(e){return''}}
const ACCENTS=['','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#22c55e','#84cc16','#eab308','#f59e0b','#f06a3a','#e5484d','#ec4899','#d946ef','#a855f7','#8b5cf6','#6366f1','#94a3b8'];
document.addEventListener('input',e=>{const ci=e.target.closest&&e.target.closest('[data-cpick]');if(ci){const box=ci.closest('.swatches');box.querySelectorAll('button').forEach(b=>b.classList.remove('on'));const l=ci.parentElement;l.classList.add('on');l.style.background=ci.value;window.__cpick={id:ci.dataset.cpick,v:ci.value};const fe=new CustomEvent('cpick',{bubbles:true,detail:{id:ci.dataset.cpick,v:ci.value}});box.dispatchEvent(fe);return}
  if(e.target.id==='accentCustom'){try{localStorage.setItem('planner-accent',e.target.value)}catch(err){}applyTheme()}});
function applyTheme(){const v=getTheme(),r=document.documentElement;if(v&&v!=='system')r.setAttribute('data-theme',v);else r.removeAttribute('data-theme');const ac=getAccent();if(ac){r.style.setProperty('--accent',ac);r.style.setProperty('--accent-soft',`color-mix(in srgb,${ac} 22%,var(--surface))`)}else{r.style.removeProperty('--accent');r.style.removeProperty('--accent-soft')}}
function setTheme(v){try{v?localStorage.setItem('planner-theme',v):localStorage.removeItem('planner-theme')}catch(e){}applyTheme()}
applyTheme();

/* ---------- timer ---------- */
function startTimer(id,limit,pomo){if(S.meta.running)stopTimer(true);S.meta.running={taskId:id,start:Date.now(),limit:limit||null,pomo:!!pomo};saveMeta()}
let breakEnd=0,breakTask=null;
function pomoFloat(){let f=$('#pomoFloat');const r=S.meta?.running;const brk=breakEnd&&breakEnd>Date.now();if(!r&&!brk){f?.remove();return}
  if(!f){f=document.createElement('div');f.id='pomoFloat';document.body.appendChild(f);let st=null;f.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;st={x:e.clientX-f.offsetLeft,y:e.clientY-f.offsetTop};f.setPointerCapture(e.pointerId)});f.addEventListener('pointermove',e=>{if(st){f.style.left=(e.clientX-st.x)+'px';f.style.top=(e.clientY-st.y)+'px';f.style.right='auto';f.style.bottom='auto'}});f.addEventListener('pointerup',()=>st=null)}
  const t=r&&S.tasks.get(r.taskId);let txt,lbl;if(r){const s=(Date.now()-r.start)/1000;txt=r.limit?clock(Math.max(0,r.limit-s)):clock(s);lbl=r.pomo?'Помодоро':'Секундомер'}else{txt=clock((breakEnd-Date.now())/1000);lbl='Перерыв'}
  f.innerHTML=`<small>${lbl}</small><b>${txt}</b><span>${esc(t?.title||'')}</span>${r?`<button data-act="stopTimer" aria-label="Остановить">${ic('stop')}</button>`:`<button data-act="skipBreak" aria-label="Пропустить перерыв">${ic('x')}</button>`}`}
setInterval(pomoFloat,1000);
function beep(){try{const c=new (window.AudioContext||window.webkitAudioContext)();[0,.35,.7].forEach(t=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.18,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.3);o.start(c.currentTime+t);o.stop(c.currentTime+t+.3)})}catch(e){}}
function pomoDone(taskId){const pc=S.meta.settings.pomo;let n=0;try{const k='pomo-'+today();n=(+localStorage.getItem(k)||0)+1;localStorage.setItem(k,n)}catch(e){}
  const long=n%Math.max(1,pc.every)===0;const mins=long?pc.long:pc.short;if(pc.sound)beep();notify('Помодоро закончено',`Перерыв ${mins} мин${long?' (длинный)':''}. Сегодня помодоро: ${n}`,taskId);toast(`Помодоро закончено. Перерыв ${mins} мин`);
  breakEnd=Date.now()+mins*60000;breakTask=taskId}
function stopTimer(silent){const r=S.meta.running;if(!r)return;S.meta.running=null;const dur=Math.round((Math.min(Date.now(),r.limit?r.start+r.limit*1000:Infinity)-r.start)/1000);const t=S.tasks.get(r.taskId);
  if(dur>=5){S.meta.timeLog.push({id:uid(),taskId:r.taskId,projectId:t?.projectId||null,title:t?.title||'',start:r.start,dur});if(S.meta.timeLog.length>1500)S.meta.timeLog=S.meta.timeLog.slice(-1500);if(t){t.timeSpent=(t.timeSpent||0)+dur;saveTask(t,{quiet:true})}}saveMeta();if(!silent)toast(`Записано: ${fmtDur(dur)}`)}
setInterval(()=>{if(breakEnd&&Date.now()>=breakEnd&&S.meta){const pc=S.meta.settings.pomo;breakEnd=0;if(pc.sound)beep();if(pc.auto&&breakTask&&S.tasks.get(breakTask)&&!S.meta.running){startTimer(breakTask,pc.work*60,true);notify('Перерыв окончен','Начался новый помодоро',breakTask)}else notify('Перерыв окончен','Можно продолжать',breakTask)}
  const r=S.meta?.running;if(!r)return;const s=(Date.now()-r.start)/1000;if(r.limit&&s>=r.limit){stopTimer(true);if(r.pomo)pomoDone(r.taskId);else toast('Время вышло');return}const a=$('#runclock'),b=$('#bigclock');if(a)a.textContent=clock(s);if(b)b.textContent=clock(s)},1000);

/* ---------- reminders ---------- */
function askNotify(){if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(()=>view.type==='settings'&&render())}
function notify(title,body,taskId){let shown=false;if('Notification' in window&&Notification.permission==='granted'){const o={body,tag:'t'+(taskId||Date.now()),icon:'icon.svg',data:{taskId}};
    navigator.serviceWorker?.getRegistration().then(r=>{if(r)r.showNotification(title,o);else{const nn=new Notification(title,o);nn.onclick=()=>{window.focus();if(taskId){selId=taskId;render();renderDetail(true)}}}}).catch(()=>{try{new Notification(title,o)}catch(e){}});shown=true}
  if(!shown||document.visibilityState==='visible')toast(title+(body?': '+body:''))}
function remindAt(t){if(!open(t)||!t.start)return null;let m=t.remind;if((m===null||m===''||m===undefined)){if(S.meta.settings.autoRemind&&t.time)m=0;else return null}
  const base=new Date(t.start+'T'+(t.time||'09:00')).getTime();return base-(+m)*60000}
function fired(){try{return JSON.parse(localStorage.getItem('planner-fired')||'{}')}catch(e){return{}}}
function checkReminders(){if(!S.meta)return;const now=Date.now();const f=fired();let ch=false;
  for(const t of allTasks()){const at=remindAt(t);if(at===null||at>now||now-at>6*3600e3)continue;const key=t.id+'|'+t.start+'|'+(t.time||'')+'|'+t.remind;if(f[key])continue;f[key]=now;ch=true;
    notify(t.title||'Задача',(t.time?`${fmtDate(t.start)}, ${t.time}`:fmtDate(t.start))+(proj(t.projectId)?' · '+proj(t.projectId).title:''),t.id)}
  if(ch){for(const k in f)if(now-f[k]>14*864e5)delete f[k];try{localStorage.setItem('planner-fired',JSON.stringify(f))}catch(e){}}}
setInterval(checkReminders,30000);setTimeout(checkReminders,5000);
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.openTask){selId=e.data.openTask;render();renderDetail(true)}});
window.addEventListener('hashchange',()=>{const m=location.hash.match(/#t=([\w-]+)/);if(m){pendingOpen=m[1];render()}});

/* ---------- import / export ---------- */
function exportData(){const data={app:APP_ID,version:2,savedAt:new Date().toISOString(),meta:S.meta,tasks:[...S.tasks.values()],notes:[...S.notes.values()]};const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`planirovshchik-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function importData(file){let data;try{data=JSON.parse(await file.text())}catch(e){toast('Это не файл планировщика');return}
  if(!data||data.app!==APP_ID||!data.meta){toast('Это не файл планировщика');return}
  const tasks=(data.tasks||[]).map(normTask),notes=(data.notes||[]).map(normNote);
  const v=await form('Импорт',[],'Добавить к моим',`<button type="button" class="btn danger" data-r="replace">Заменить всё</button>`);if(!v)return;
  const replace=v._action==='replace';toast('Импортирую…');
  try{const ops=[];
    if(replace){S.meta=normMeta(data.meta);ops.push(['set',metaRef,clone(S.meta)]);for(const t of S.tasks.values())if(!tasks.some(x=>x.id===t.id))ops.push(['del',doc(tasksCol,t.id)]);for(const n of S.notes.values())if(!notes.some(x=>x.id===n.id))ops.push(['del',doc(notesCol,n.id)])}
    else{const m=normMeta(data.meta);for(const k of['projects','groups','tags','habits']){const ids=new Set(S.meta[k].map(x=>x.id));S.meta[k].push(...m[k].filter(x=>!ids.has(x.id)))}ops.push(['set',metaRef,clone(S.meta)])}
    for(const t of tasks)ops.push(['set',doc(tasksCol,t.id),clone(t)]);for(const n of notes)ops.push(['set',doc(notesCol,n.id),clone(n)]);
    for(let i=0;i<ops.length;i+=400){const b=writeBatch(fs);for(const [op,ref,d] of ops.slice(i,i+400))op==='set'?b.set(ref,d):b.delete(ref);await b.commit()}
    toast(`Готово: ${plural(tasks.length,'задача','задачи','задач')}, ${plural(notes.length,'заметка','заметки','заметок')}`);render()}
  catch(e){fsErr(e);toast('Импорт не удался: '+(e.code||e.message))}}
$('#importInput').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)importData(f)});

/* ---------- events ---------- */
document.addEventListener('keydown',e=>{const typing=e.target.matches&&e.target.matches('input,textarea,select,[contenteditable]');
  if(!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&$('#modal').hidden&&S.meta){const k=e.key.toLowerCase();
    if(k==='n'||k==='т'){e.preventDefault();const q=$('#qaInput');if(q&&!$('#qa').hidden)q.focus();return}
    if(k==='/'||k==='.'){e.preventDefault();document.body.classList.remove('focus');$('#q')?.focus();return}
    if(k==='f'||k==='а'){document.body.classList.toggle('focus');return}}
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&selId){const t=S.tasks.get(selId);if(t){e.preventDefault();toggleTask(t);renderDetail(true)}return}
  if(e.target.id==='d-cmnew'&&e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();const t=S.tasks.get(selId);if(!v||!t)return;t.comments=[...(t.comments||[]),{id:uid(),text:v,at:Date.now()}];saveTask(t);renderDetail(true);$('#d-cmnew')?.focus();return}
  if(e.key==='Escape'&&document.body.classList.contains('focus')&&$('#modal').hidden&&!selId){document.body.classList.remove('focus');return}
  if(e.key==='Escape'){if(!$('#modal').hidden)closeModal();else if(selId||selNoteId){selId=selNoteId=null;render()}else document.body.classList.remove('drawer')}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tbody')){e.preventDefault();e.target.click()}
  if(e.target.id==='d-title'&&e.key==='Enter'){e.preventDefault();e.target.blur()}
  if(e.target.id==='d-clnew'&&e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();const t=S.tasks.get(selId);if(!v||!t)return;t.checklist.push({id:uid(),text:v,state:0});saveTask(t);renderDetail(true);$('#d-clnew')?.focus()}
  if(e.target.id==='d-subnew'&&e.key==='Enter'){e.preventDefault();const v=e.target.value.trim();const t=S.tasks.get(selId);if(!v||!t)return;newTask({title:v,parentId:t.id,projectId:t.projectId,groupId:t.groupId});renderDetail(true);$('#d-subnew')?.focus()}});
document.addEventListener('click',async e=>{
  const tw=e.target.closest('[data-ptoggle]');if(tw){const p=proj(tw.dataset.ptoggle);if(p){p.collapsed=!p.collapsed;saveMeta()}return}
  const nav=e.target.closest('[data-nav]');
  if(nav){const k=nav.dataset.nav;closeModal();const qq=$('#q');if(qq)qq.value='';if(k==='_menu'){document.body.classList.toggle('drawer');return}view={type:k,id:nav.dataset.id};searchQ='';showDone=false;selId=selNoteId=null;if(k==='project')projTab=proj(nav.dataset.id)?.notebook?'notes':'tasks';document.body.classList.remove('drawer');render();$('#content').scrollTop=0;return}
  if(document.body.classList.contains('drawer')&&!e.target.closest('#side')&&!e.target.closest('#menuBtn')){document.body.classList.remove('drawer');return}
  const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
  const row=a.closest('.task[data-id],.card[data-id]');const t=row?S.tasks.get(row.dataset.id):(selId?S.tasks.get(selId):null);const n=selNoteId?S.notes.get(selNoteId):null;
  switch(act){
   case 'toggle':if(row&&t)toggleTask(t);break;
   case 'archDone':{const p=proj(view.id);let n=0;allTasks().filter(x=>x.projectId===p?.id&&!open(x)&&!x.archived).forEach(x=>{x.archived=true;saveTask(x);n++});toast(`В архив: ${n}`);break}
   case 'projKanban':kanbanProj=view.id;view={type:'kanban'};render();break;
   case 'projNotebook':{const p=proj(view.id);if(p){p.notebook=!p.notebook;projTab=p.notebook?'notes':'tasks';saveMeta()}break}
   case 'projArchive':{const p=proj(view.id);if(p){p.archived=true;saveMeta();view={type:'inbox'};render();toast(`Проект «${p.title}» в архиве. Вернуть можно в настройках`,()=>{p.archived=false;saveMeta()})}break}
   case 'setS':{const st=S.meta.settings,k=a.dataset.k,v=a.dataset.v;if(k.startsWith('list.'))st.list[k.slice(5)]=!(st.list[k.slice(5)]!==false);else if(k==='tb'){st.tbHidden=st.tbHidden.includes(v)?st.tbHidden.filter(x=>x!==v):[...st.tbHidden,v]}else if(k==='param'){const cur=new Set(st.params||PRESETS.std);cur.has(v)?cur.delete(v):cur.add(v);st.params=[...cur]}else if(k==='preset'){st.params=[...PRESETS[v]]}else st[k]=v==='true'?true:v==='false'?false:v;saveMeta();break}
   case 'skipBreak':breakEnd=0;pomoFloat();break;
   case 'planW':planWeek+=+a.dataset.v;render();break;
   case 'planJump':planJump=a.dataset.d;render();break;
   case 'habM':{const v=+a.dataset.v;if(!v)habMonth=today().slice(0,7);else{const [y,m]=habMonth.split('-').map(Number);const d=new Date(y,m-1+v,1);habMonth=iso(d).slice(0,7)}render();break}
   case 'showParam':revealParam(a.dataset.v);break;
   case 'taskMenu':if(t){const r=a.getBoundingClientRect();taskMenu(t,r.left,r.top-8)}break;
   case 'open':if(row){const id=row.dataset.id;if(e.ctrlKey||e.metaKey||e.shiftKey){if(e.shiftKey&&selId&&!multi.size)multi.add(selId);if(e.shiftKey&&multi.size){const rows=[...document.querySelectorAll('.task[data-id]')].map(r=>r.dataset.id);const last=[...multi].pop();let i1=rows.indexOf(last),i2=rows.indexOf(id);if(i1>=0&&i2>=0){if(i1>i2)[i1,i2]=[i2,i1];rows.slice(i1,i2+1).forEach(x=>multi.add(x))}else multi.add(id)}else{multi.has(id)?multi.delete(id):multi.add(id);if(selId&&!multi.size)multi.add(selId)}render();break}multi.clear();selId=id;selNoteId=null;render();renderDetail(true)}break;
   case 'openId':selId=a.dataset.id;selNoteId=null;render();renderDetail(true);break;
   case 'openNote':selNoteId=a.dataset.id;selId=null;noteMode='view';render();renderDetail(true);break;
   case 'closeDetail':selId=selNoteId=null;render();break;
   case 'toggleDone':showDone=!showDone;render();break;
   case 'projTab':projTab=a.dataset.v;render();break;
   case 'newNote':newNote({projectId:a.dataset.project||(notesProj&&notesProj!=='_none'?notesProj:null)});break;
   case 'noteMode':noteMode=a.dataset.v;renderDetail(true);if(noteMode==='edit')setTimeout(()=>$('#n-body')?.focus(),30);break;
   case 'toEdit':if(e.target.closest('a,button'))break;noteMode='edit';renderDetail(true);setTimeout(()=>$('#n-body')?.focus(),30);break;
   case 'mdcheck':if(n){const lines=n.body.split('\n');const i=+a.dataset.line;lines[i]=lines[i].replace(/\[( |x|X)\]/,m=>m==='[ ]'?'[x]':'[ ]');n.body=lines.join('\n');saveNote(n);renderDetail(true)}break;
   case 'nPin':if(n){n.pinned=!n.pinned;saveNote(n);renderDetail(true)}break;
   case 'nDelete':if(n){n.deletedAt=Date.now();saveNote(n);selNoteId=null;render();toast('Заметка в корзине',()=>{n.deletedAt=null;saveNote(n)})}break;
   case 'nTag':if(n){const id=a.dataset.id;n.tags=n.tags.includes(id)?n.tags.filter(x=>x!==id):[...n.tags,id];saveNote(n);renderDetail(true)}break;
   case 'noteToTask':if(n){const nt=newTask({title:n.title||'Задача из заметки',note:n.body,projectId:n.projectId,tags:[...n.tags],files:[...(n.files||[])]});selId=nt.id;selNoteId=null;render();renderDetail(true);toast('Задача создана, заметка осталась')}break;
   case 'attach':attachClick(a.dataset.kind,a.dataset.kind==='t'?selId:selNoteId);break;
   case 'detach':detachFile(a.dataset.kind,a.dataset.kind==='t'?selId:selNoteId,a.dataset.fid);break;
   case 'addIn':{const v=await form(a.dataset.time?`Новая задача · ${fmtDate(a.dataset.start)}, ${a.dataset.time}`:'Новая задача',[{id:'title',label:'Название',ph:'Что нужно сделать?'}],'Добавить');if(!v||!v.title)break;const q=parseQuick(v.title);const nt=newTask({pinned:q.pinned,title:q.title,priority:q.priority,tags:q.tags,time:q.time||a.dataset.time||null,remind:q.remind,start:q.start||a.dataset.start||null,projectId:a.dataset.project||q.projectId||(view.type==='project'?view.id:null),groupId:a.dataset.group||null,columnId:a.dataset.col||S.meta.columns[0]?.id});if(view.type==='tag'){nt.tags.push(view.id);saveTask(nt)}break}
   case 'addProject':case 'addSubProject':{const parentId=act==='addSubProject'?view.id:'';const v=await form(parentId?'Новый подпроект':'Новый проект',[{id:'title',label:'Название',ph:'Например, Продлёнка'},{id:'desc',label:'Описание (необязательно)',ph:'Зачем этот проект'},REVIEW_F(0),{id:'emoji',label:'Значок (эмодзи, необязательно)',ph:'📖'},{id:'parent',label:'Внутри проекта',type:'select',value:parentId,options:[['','— верхний уровень —'],...projTree().map(([p,d])=>[p.id,'— '.repeat(d)+p.title])]},{id:'color',label:'Цвет',type:'color',value:COLORS[S.meta.projects.length%COLORS.length]}],'Создать');if(!v||!v.title)break;
     const p={id:uid(),title:v.title,desc:v.desc,review:+v.review||0,reviewedAt:Date.now(),fav:false,emoji:v.emoji,color:v.color,archived:false,order:Date.now(),parentId:v.parent||null};S.meta.projects.push(p);view={type:'project',id:p.id};projTab='tasks';document.body.classList.remove('drawer');saveMeta();break}
   case 'editProject':{const p=proj(view.id);if(!p)break;const desc=new Set();const w=id=>S.meta.projects.filter(x=>x.parentId===id).forEach(x=>{desc.add(x.id);w(x.id)});w(p.id);
     const v=await form('Проект',[{id:'title',label:'Название',value:p.title},{id:'desc',label:'Описание',value:p.desc||''},REVIEW_F(p.review||0),{id:'emoji',label:'Значок',value:p.emoji},{id:'parent',label:'Внутри проекта',type:'select',value:p.parentId||'',options:[['','— верхний уровень —'],...projTree().filter(([x])=>x.id!==p.id&&!desc.has(x.id)).map(([x,d])=>[x.id,'— '.repeat(d)+x.title])]},{id:'color',label:'Цвет',type:'color',value:p.color}],'Сохранить','<button type="button" class="btn ghost" data-r="archive">В архив</button><button type="button" class="btn ghost" data-r="delete">Удалить</button>');if(!v)break;
     if(v._action==='archive'){p.archived=true;view={type:'today'};saveMeta();toast('Проект в архиве. Вернуть можно в настройках');break}
     if(v._action==='delete'){if(!await confirmBox('Удалить проект?','Задачи и заметки проекта перейдут во Входящие, подпроекты поднимутся на уровень выше.','Удалить'))break;S.meta.projects.forEach(x=>{if(x.parentId===p.id)x.parentId=p.parentId||null});S.meta.projects=S.meta.projects.filter(x=>x.id!==p.id);S.meta.groups=S.meta.groups.filter(g=>g.projectId!==p.id);for(const x of allTasks())if(x.projectId===p.id){x.projectId=null;x.groupId=null;saveTask(x,{quiet:true})}for(const x of allNotes())if(x.projectId===p.id){x.projectId=null;saveNote(x,{quiet:true})}view={type:'inbox'};saveMeta();break}
     if(+v.review&&!p.reviewedAt)p.reviewedAt=Date.now();Object.assign(p,{title:v.title||p.title,desc:v.desc,review:+v.review||0,emoji:v.emoji,color:v.color,parentId:v.parent||null});saveMeta();break}
   case 'unarchProject':{const p=proj(a.dataset.id);if(p){p.archived=false;saveMeta()}break}
   case 'addGroup':{const v=await form('Новый раздел',[{id:'title',label:'Название',ph:'Например, Подготовка'}],'Создать');if(!v||!v.title)break;S.meta.groups.push({id:uid(),projectId:view.id,title:v.title,order:Date.now()});saveMeta();break}
   case 'editGroup':{const g=groupOf(a.dataset.id);if(!g)break;const v=await form('Раздел',[{id:'title',label:'Название',value:g.title}]);if(!v||!v.title)break;g.title=v.title;saveMeta();break}
   case 'delGroup':{const g=groupOf(a.dataset.id);if(!g||!await confirmBox('Удалить раздел?','Задачи останутся в проекте без раздела.','Удалить'))break;S.meta.groups=S.meta.groups.filter(x=>x.id!==g.id);for(const x of allTasks())if(x.groupId===g.id){x.groupId=null;saveTask(x,{quiet:true})}saveMeta();break}
   case 'addTag':{const v=await form('Новый тег',[{id:'title',label:'Название',ph:'например, проповедь'},{id:'color',label:'Цвет',type:'color',value:COLORS[S.meta.tags.length%COLORS.length]}],'Создать');if(!v||!v.title)break;const g={id:uid(),title:v.title.replace(/^#/,''),color:v.color};S.meta.tags.push(g);if(a.dataset.attach==='t'&&selId){const x=S.tasks.get(selId);x.tags.push(g.id);saveTask(x,{quiet:true})}if(a.dataset.attach==='n'&&n){n.tags.push(g.id);saveNote(n,{quiet:true})}saveMeta();renderDetail(true);break}
   case 'editTag':{const g=tagOf(a.dataset.id);if(!g)break;const v=await form('Тег',[{id:'title',label:'Название',value:g.title},{id:'color',label:'Цвет',type:'color',value:g.color}],'Сохранить','<button type="button" class="btn ghost" data-r="delete">Удалить</button>');if(!v)break;
     if(v._action==='delete'){S.meta.tags=S.meta.tags.filter(x=>x.id!==g.id);for(const x of allTasks())if(x.tags.includes(g.id)){x.tags=x.tags.filter(i=>i!==g.id);saveTask(x,{quiet:true})}for(const x of allNotes())if(x.tags.includes(g.id)){x.tags=x.tags.filter(i=>i!==g.id);saveNote(x,{quiet:true})}saveMeta();break}g.title=v.title.replace(/^#/,'')||g.title;g.color=v.color;saveMeta();break}
   case 'addCol':{const v=await form('Новая колонка',[{id:'title',label:'Название'}],'Создать');if(!v||!v.title)break;S.meta.columns.push({id:uid(),title:v.title});saveMeta();break}
   case 'editCol':{const c=S.meta.columns[+a.dataset.i];const v=await form('Колонка',[{id:'title',label:'Название',value:c.title}]);if(!v||!v.title)break;c.title=v.title;saveMeta();break}
   case 'delCol':{const i=+a.dataset.i,c=S.meta.columns[i];if(S.meta.columns.length<2||!await confirmBox('Удалить колонку?','Карточки из неё перейдут в первую колонку.','Удалить'))break;S.meta.columns.splice(i,1);for(const x of allTasks())if(x.columnId===c.id){x.columnId=S.meta.columns[0].id;saveTask(x,{quiet:true})}saveMeta();break}
   case 'colUp':case 'colDown':{const i=+a.dataset.i,j=act==='colUp'?i-1:i+1;const cs=S.meta.columns;if(j<0||j>=cs.length)break;[cs[i],cs[j]]=[cs[j],cs[i]];saveMeta();break}
   case 'mv':{if(!t)break;const cs=S.meta.columns;let i=cs.findIndex(c=>c.id===t.columnId);if(i<0)i=0;const j=i+(+a.dataset.dir);if(j<0||j>=cs.length)break;t.columnId=cs[j].id;saveTask(t);break}
   case 'calPrev':case 'calNext':{if(calMode!=='month'){calDay=addDays(calDay,(act==='calNext'?1:-1)*(calMode==='week'?7:calMode==='3d'?3:1));calMonth=calDay.slice(0,7);render();break}const [y,m]=calMonth.split('-').map(Number);calMonth=iso(new Date(y,m-1+(act==='calNext'?1:-1),1)).slice(0,7);render();break}
   case 'calToday':calMonth=today().slice(0,7);calDay=today();render();break;
   case 'calDay':calDay=a.dataset.d;calMonth=calDay.slice(0,7);render();break;
   case 'addHabit':{const v=await form('Новая привычка',[{id:'title',label:'Название',ph:'Утреннее чтение Библии'},{id:'desc',label:'Описание (необязательно)'},{id:'emoji',label:'Значок',ph:'📖'},{id:'color',label:'Цвет',type:'color',value:COLORS[S.meta.habits.length%COLORS.length]},{id:'goal',label:'Сколько раз в день',type:'number',value:1,min:1}],'Создать');if(!v||!v.title)break;S.meta.habits.push({id:uid(),title:v.title,desc:v.desc,color:v.color,emoji:v.emoji,goal:Math.max(1,parseInt(v.goal)||1),log:{},archived:false,createdAt:Date.now()});saveMeta();break}
   case 'editHabit':{const x=S.meta.habits.find(h=>h.id===a.dataset.id);if(!x)break;const v=await form('Привычка',[{id:'title',label:'Название',value:x.title},{id:'desc',label:'Описание',value:x.desc||''},{id:'emoji',label:'Значок',value:x.emoji},{id:'color',label:'Цвет',type:'color',value:x.color||COLORS[0]},{id:'goal',label:'Сколько раз в день',type:'number',value:x.goal||1,min:1}],'Сохранить','<button type="button" class="btn ghost" data-r="archive">В архив</button><button type="button" class="btn ghost" data-r="delete">Удалить</button>');if(!v)break;
     if(v._action==='archive'){x.archived=true;saveMeta();break}if(v._action==='delete'){if(!await confirmBox('Удалить привычку?','Вся история отметок пропадёт.','Удалить'))break;S.meta.habits=S.meta.habits.filter(h=>h.id!==x.id);saveMeta();break}Object.assign(x,{title:v.title||x.title,desc:v.desc,color:v.color,emoji:v.emoji,goal:Math.max(1,parseInt(v.goal)||1)});saveMeta();break}
   case 'unarchHabit':{const x=S.meta.habits.find(h=>h.id===a.dataset.id);if(x){x.archived=false;saveMeta()}break}
   case 'habitTap':{const x=S.meta.habits.find(h=>h.id===a.dataset.id);if(!x)break;x.log=x.log||{};const d=a.dataset.d,g=x.goal||1;const v=(x.log[d]||0)+1;if(v>g)delete x.log[d];else x.log[d]=v;saveMeta();break}
   case 'startTimer':if(t){startTimer(t.id,a.dataset.limit?+a.dataset.limit:null,!!a.dataset.pomo);renderDetail(true)}break;
   case 'stopTimer':stopTimer();renderDetail(true);break;
   case 'delLog':{const e2=S.meta.timeLog.find(x=>x.id===a.dataset.id);if(!e2)break;S.meta.timeLog=S.meta.timeLog.filter(x=>x!==e2);const tt=S.tasks.get(e2.taskId);if(tt){tt.timeSpent=Math.max(0,(tt.timeSpent||0)-e2.dur);saveTask(tt,{quiet:true})}saveMeta();break}
   case 'restore':{const k=a.dataset.kind;const o=mapOf(k).get(a.dataset.id);if(o){o.deletedAt=null;put(k,o)}break}
   case 'purgeOne':{if(await confirmBox('Удалить навсегда?','Восстановить уже не получится.','Удалить'))hardDel(a.dataset.kind,a.dataset.id),render();break}
   case 'emptyTrash':{const tt=[...S.tasks.values()].filter(x=>x.deletedAt),tn=[...S.notes.values()].filter(x=>x.deletedAt);if(!await confirmBox('Очистить корзину?',`Навсегда удалится: ${plural(tt.length,'задача','задачи','задач')} и ${plural(tn.length,'заметка','заметки','заметок')}.`,'Очистить'))break;tt.forEach(x=>hardDel('t',x.id));tn.forEach(x=>hardDel('n',x.id));render();break}
   case 'dPri':if(t){t.priority=+a.dataset.v;saveTask(t);renderDetail(true)}break;
   case 'dDefer':if(t){t.deferred=!t.deferred;saveTask(t);renderDetail(true);toast(t.deferred?'Перенесено в «Когда-нибудь»':'Вернул в обычные задачи')}break;
   case 'dTag':if(t){const id=a.dataset.id;t.tags=t.tags.includes(id)?t.tags.filter(x=>x!==id):[...t.tags,id];saveTask(t);renderDetail(true)}break;
   case 'dToggle':if(t){toggleTask(t);renderDetail(true)}break;
   case 'subToggle':{const c=S.tasks.get(a.dataset.id);if(c){toggleTask(c);renderDetail(true)}break}
   case 'dCancel':if(t){t.state='cancelled';t.completedAt=Date.now();saveTask(t);renderDetail(true)}break;
   case 'dDup':if(t){const nt=normTask(Object.assign(clone(t),{id:uid(),title:t.title+' (копия)',state:'open',completedAt:null,timeSpent:0,createdAt:Date.now(),files:[],checklist:t.checklist.map(c=>({...c,id:uid(),state:0}))}));saveTask(nt);selId=nt.id;render();renderDetail(true)}break;
   case 'dDelete':if(t)trashTask(t);break;
   case 'clState':{const li=a.closest('[data-cid]');const c=t&&t.checklist.find(x=>x.id===li.dataset.cid);if(c){c.state=(c.state+1)%3;saveTask(t);renderDetail(true)}break}
   case 'clDel':{const li=a.closest('[data-cid]');if(t){t.checklist=t.checklist.filter(x=>x.id!==li.dataset.cid);saveTask(t);renderDetail(true)}break}
   case 'export':exportData();break;
   case 'accent':try{if(a.dataset.v)localStorage.setItem('planner-accent',a.dataset.v);else localStorage.removeItem('planner-accent')}catch(e){}applyTheme();render();break;
   case 'qaFocus':{if($('#qa').hidden){view={type:'inbox'};render()}setTimeout(()=>$('#qaInput')?.focus(),30);break}
   case 'sideToggle':document.body.classList.toggle('sidecollapsed');try{localStorage.setItem('planner-sidecollapsed',document.body.classList.contains('sidecollapsed')?'1':'')}catch(e){}break;
   case 'tagMenu':{const m=modal(`<h3>Теги</h3>${S.meta.tags.length?`<div class="chips">${S.meta.tags.map(t=>`<button data-nav="tag" data-id="${t.id}"><i style="background:${esc(t.color)}"></i>#${esc(t.title)}</button>`).join('')}</div>`:'<p class="small">Тегов пока нет. Напиши #тег в строке задачи или создай в настройках.</p>'}<div class="mbtns"><button class="btn ghost" data-r="x">Закрыть</button></div>`);m.onclick=e=>{if(e.target===m||e.target.closest('[data-r]'))closeModal()};break}
   case 'csvAll':exportCSV(allTasks(),'zadachi-'+today());break;
   case 'csv':{const p=proj(view.id);if(p)exportCSV(allTasks().filter(x=>x.projectId===p.id),p.title);break}
   case 'print':window.print();break;
   case 'focus':document.body.classList.toggle('focus');toast(document.body.classList.contains('focus')?'Режим фокуса. Выход — клавиша F или Esc':'Фокус выключен');break;
   case 'pFav':{const p=proj(view.id);if(p){p.fav=!p.fav;saveMeta()}break}
   case 'reviewed':{const p=proj(a.dataset.id);if(p){p.reviewedAt=Date.now();saveMeta();toast('Проект отмечен проверенным')}break}
   case 'calMode':calMode=a.dataset.v;render();break;
   case 'setWS':S.meta.settings.weekStart=+a.dataset.v;saveMeta();break;
   case 'askNotify':askNotify();break;
   case 'toggleView':{const hd=S.meta.settings.hidden,k=a.dataset.v;S.meta.settings.hidden=hd.includes(k)?hd.filter(x=>x!==k):[...hd,k];saveMeta();break}
   case 'editPomo':{const pc=S.meta.settings.pomo;const v=await form('Помодоро',[{id:'work',label:'Работа, минут',type:'number',value:pc.work,min:1},{id:'short',label:'Короткий перерыв, минут',type:'number',value:pc.short,min:1},{id:'long',label:'Длинный перерыв, минут',type:'number',value:pc.long,min:1},{id:'every',label:'Длинный перерыв после скольких помодоро',type:'number',value:pc.every,min:1},{id:'auto',label:'Начинать следующий период сам',type:'select',value:pc.auto?'1':'',options:[['','Нет'],['1','Да']]},{id:'sound',label:'Звук в конце периода',type:'select',value:pc.sound?'1':'',options:[['1','Да'],['','Нет']]}]);if(!v)break;
     S.meta.settings.pomo={work:Math.max(1,+v.work||25),short:Math.max(1,+v.short||5),long:Math.max(1,+v.long||15),every:Math.max(1,+v.every||4),auto:!!v.auto,sound:!!v.sound};saveMeta();break}
   case 'dFav':if(t){t.fav=!t.fav;saveTask(t);renderDetail(true)}break;
   case 'dLink':if(t){const u=location.origin+location.pathname+'#t='+t.id;try{await navigator.clipboard.writeText(u);toast('Ссылка скопирована. Откроется только у тебя после входа')}catch(err){await form('Ссылка на задачу',[{id:'u',label:'Скопируй',value:u}],'Готово')}}break;
   case 'dLock':if(t){if(t.lock&&!unlocked.has(t.id)){toast('Сначала открой задачу паролем');break}
     if(t.lock){const v=await form('Пароль задачи',[],'Оставить','<button type="button" class="btn danger" data-r="remove">Снять пароль</button>');if(v?._action==='remove'){t.lock=null;saveTask(t);renderDetail(true);toast('Пароль снят')}break}
     const v=await form('Поставить пароль',[{id:'p',label:'Пароль (запомни его — восстановить нельзя)',type:'password'},{id:'p2',label:'Ещё раз',type:'password'}],'Поставить');if(!v||!v.p)break;if(v.p!==v.p2){toast('Пароли не совпали');break}
     t.lock=await sha(t.id+v.p);unlocked.delete(t.id);saveTask(t);renderDetail(true);toast('Готово. Подробности задачи скрыты за паролем')}break;
   case 'dUnlock':if(t){const v=await form('Открыть задачу',[{id:'p',label:'Пароль',type:'password'}],'Открыть');if(!v)break;if(await sha(t.id+v.p)===t.lock){unlocked.add(t.id);renderDetail(true)}else toast('Неверный пароль')}break;
   case 'dToNote':if(t){if(t.lock&&!unlocked.has(t.id)){toast('Сначала открой задачу паролем');break}const body=[t.note,t.checklist.map(c=>`- [${c.state===1?'x':' '}] ${c.text}`).join('\n'),(t.comments||[]).map(c=>'> '+c.text).join('\n')].filter(Boolean).join('\n\n');
     const nn=normNote({id:uid(),title:t.title,body,projectId:t.projectId,tags:[...t.tags],files:[...(t.files||[])]});saveNote(nn,{now:true});t.files=[];t.deletedAt=Date.now();saveTask(t);selId=null;selNoteId=nn.id;noteMode='view';render();renderDetail(true);toast('Задача превращена в заметку',()=>{t.deletedAt=null;t.files=[...nn.files];saveTask(t);nn.deletedAt=Date.now();saveNote(nn)})}break;
   case 'dRDay':if(t){const d=+a.dataset.v;t.repeatDays=t.repeatDays?.includes(d)?t.repeatDays.filter(x=>x!==d):[...(t.repeatDays||[]),d];saveTask(t);renderDetail(true)}break;
   case 'cmDel':if(t){t.comments=(t.comments||[]).filter(c=>c.id!==a.dataset.id);saveTask(t);renderDetail(true)}break;
   case 'import':$('#importInput').click();break;
   case 'signOut':if(await confirmBox('Выйти из аккаунта?','Данные останутся в облаке, войти можно снова через Google.','Выйти',false))signOut(auth);break;
   case 'theme':setTheme(a.dataset.v);render();break;
  }
});
$('#qa').addEventListener('submit',e=>{e.preventDefault();const inp=$('#qaInput');const raw=inp.value.trim();if(!raw||!S.meta)return;
  if(view.type==='notes'||(view.type==='project'&&projTab==='notes')){inp.value='';newNote({title:raw,projectId:view.type==='project'?view.id:(notesProj&&notesProj!=='_none'?notesProj:null)});return}
  const q=parseQuick(raw);if(!q.title)return;const f={pinned:q.pinned,title:q.title,priority:q.priority,tags:q.tags,start:q.start,time:q.time,remind:q.remind,projectId:q.projectId};if(q.remind!=null)askNotify();
  if(view.type==='project'&&!f.projectId)f.projectId=view.id;else if(view.type==='today'&&!f.start)f.start=today();else if(view.type==='calendar'&&!f.start)f.start=calDay;else if(view.type==='tag')f.tags=[...new Set([...f.tags,view.id])];else if(view.type==='someday')f.deferred=true;else if(view.type==='kanban'&&kanbanProj&&kanbanProj!=='_none')f.projectId=kanbanProj;
  newTask(f);inp.value='';toast(f.start?`Добавлено на ${fmtDate(f.start).toLowerCase()}`:'Задача добавлена')});
document.addEventListener('input',e=>{const el=e.target;
  if(el.id==='q'){searchQ=el.value;renderContent();return}
  const n=selNoteId&&S.notes.get(selNoteId);
  if(n){if(el.id==='n-title'){n.title=el.value.replace(/\n/g,' ');autosize(el);saveNote(n,{quiet:true});renderContent()}else if(el.id==='n-body'){n.body=el.value;saveNote(n,{quiet:true})}return}
  const t=selId&&S.tasks.get(selId);if(!t)return;
  if(el.id==='d-title'){t.title=el.value.replace(/\n/g,' ');autosize(el);saveTask(t)}else if(el.id==='d-note'){t.note=el.value;saveTask(t)}else if(el.dataset.cl){const c=t.checklist.find(x=>x.id===el.dataset.cl);if(c){c.text=el.value;saveTask(t)}}});
document.addEventListener('change',e=>{const el=e.target;
  if(el.id==='kanbanProj'){kanbanProj=el.value;renderContent();return}
  if(el.id==='calJump'&&el.value){calDay=el.value;calMonth=calDay.slice(0,7);render();return}
  if(el.dataset&&el.dataset.sk){S.meta.settings[el.dataset.sk]=el.checked;saveMeta();return}
  if(el.dataset&&el.dataset.sv){S.meta.settings[el.dataset.sv]=el.value.trim()||(el.dataset.sv==='qaProj'?'@':'#');saveMeta();return}
  if(el.id==='s-autoRemind'){S.meta.settings.autoRemind=el.checked;if(el.checked)askNotify();saveMeta();return}if(el.id==='notesProj'){notesProj=el.value;renderContent();return}
  if(el.id==='n-project'){const n=S.notes.get(selNoteId);if(n){n.projectId=el.value||null;saveNote(n)}return}
  const t=selId&&S.tasks.get(selId);if(!t)return;const map={'d-start':'start','d-deadline':'deadline','d-time':'time','d-repeat':'repeat','d-col':'columnId'};
  if(map[el.id]){t[map[el.id]]=el.value||null;if(el.id==='d-repeat'&&t.repeat==='weekly'&&!t.repeatDays?.length&&t.start)t.repeatDays=[new Date(t.start+'T00:00').getDay()];saveTask(t);renderDetail(true)}
  else if(el.id==='d-duration'){t.duration=parseInt(el.value)||null;saveTask(t)}
  else if(el.id==='d-remind'){t.remind=el.value===''?null:+el.value;if(t.remind!==null){askNotify();if(!t.start){t.start=today();toast('Поставил дату на сегодня, чтобы напоминание сработало')}}saveTask(t);renderDetail(true)}
  else if(el.id==='d-every'){t.repeatEvery=Math.max(1,parseInt(el.value)||1);saveTask(t);renderDetail(true)}
  else if(el.id==='d-rfd'){t.repeatFromDone=el.checked;saveTask(t);renderDetail(true)}
  else if(el.id==='d-rend'){t.repeatEnd=el.value||null;if(t.repeatEnd==='count'&&!t.repeatCount)t.repeatCount=5;saveTask(t);renderDetail(true)}
  else if(el.id==='d-rcount'){t.repeatCount=Math.max(1,parseInt(el.value)||1);saveTask(t)}
  else if(el.id==='d-runtil'){t.repeatUntil=el.value||null;saveTask(t)}
  else if(el.id==='d-project'){t.projectId=el.value||null;t.groupId=null;saveTask(t);renderDetail(true)}
  else if(el.id==='d-group'){t.groupId=el.value||null;saveTask(t)}});
document.addEventListener('dragstart',e=>{const pd=e.target.closest&&e.target.closest('[data-pdrag]');if(pd){e.dataTransfer.setData('application/x-proj',pd.dataset.pdrag);e.dataTransfer.effectAllowed='move';return}const c=e.target.closest&&e.target.closest('.card,.wki,.tgev,.mt,.task[draggable]');if(c){e.dataTransfer.setData('text/plain',c.dataset.id);e.dataTransfer.effectAllowed='move'}});
const clrDrop=()=>{document.getElementById('pdline')?.remove();document.querySelectorAll('.drop,.drop-before,.drop-after,.drop-in,.drop-out').forEach(x=>x.classList.remove('drop','drop-before','drop-after','drop-in','drop-out'))};
const pZone=(el,e)=>{const r=el.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;return y<.28?'before':y>.72?'after':'in'};
document.addEventListener('dragover',e=>{const isP=[...(e.dataTransfer?.types||[])].includes('application/x-proj');
  const dp=e.target.closest&&e.target.closest('[data-dropproj]');const dr=e.target.closest&&e.target.closest('[data-droproot]');const dv=e.target.closest&&e.target.closest('[data-dropview]');
  if(dp||dr||(dv&&!isP)){e.preventDefault();clrDrop();if(dr)dr.classList.add('drop-in');else if(dv)dv.classList.add('drop-in');else dp.classList.add(isP?'drop-'+pZone(dp,e):'drop-in');return}const dd=e.target.closest&&e.target.closest('[data-dropday]');if(dd){e.preventDefault();document.querySelectorAll('.drop').forEach(x=>x!==dd&&x.classList.remove('drop'));dd.classList.add('drop');return}const col=e.target.closest&&e.target.closest('.col');if(col){e.preventDefault();document.querySelectorAll('.col.drop').forEach(x=>x!==col&&x.classList.remove('drop'));col.classList.add('drop')}});
document.addEventListener('dragend',clrDrop);
document.addEventListener('contextmenu',e=>{const row=e.target.closest&&e.target.closest('.task[data-id],.card[data-id],.tgev,.wki,.mt');if(!row||e.target.closest('input,textarea'))return;const t=S.tasks.get(row.dataset.id);if(!t)return;e.preventDefault();taskMenu(t,e.clientX,e.clientY)});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.ctxmenu'))closeCtx()},true);
window.addEventListener('blur',closeCtx);window.addEventListener('resize',closeCtx);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.ctxmenu')){closeCtx();e.stopImmediatePropagation();return}
  const typing=e.target.matches&&e.target.matches('input,textarea,select,[contenteditable]');if(typing||!S.meta||!$('#modal').hidden)return;const c=e.ctrlKey||e.metaKey,K=e.key.toLowerCase(),code=e.code;
  if(e.key==='Escape'&&multi.size){multi.clear();render();return}
  if(c&&code==='KeyV'&&CLIP){e.preventDefault();pasteClip();return}
  const t=selId&&S.tasks.get(selId);if(!t)return;const go=k=>{e.preventDefault();doTM(k,t)};
  if(c&&e.shiftKey&&code==='KeyR')return go('repeat');if(c&&e.shiftKey&&code==='KeyJ')return go('file');if(c&&e.shiftKey&&code==='KeyX')return go('lock');if(c&&e.shiftKey&&code==='KeyL')return go('fav');if(c&&e.shiftKey&&code==='KeyM')return go('project');
  if(e.altKey&&e.shiftKey&&code==='KeyN')return go('sub');if(c&&!e.shiftKey&&code==='KeyG')return go('tag');if(c&&!e.shiftKey&&code==='KeyI')return go('checklist');if(c&&!e.shiftKey&&code==='KeyD')return go('date');
  if(c&&!e.shiftKey&&code==='KeyC'&&!getSelection().toString())return go('copy');if(c&&!e.shiftKey&&code==='KeyX')return go('cut');
  if(e.key==='Delete'||(e.key==='Backspace'&&c)){if(multi.size>1)return go('bulkDel');return go('del')}},true);
/* pointer drag: works with mouse and touch (long press) */
const DSEL='[data-pdrag],.tgev,.wki,.mt,.task[draggable],.card[draggable]';
let PD=null,swallow=false;
document.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest(DSEL))e.preventDefault()},true);
function projPlace(tg,e){const rows=[...document.querySelectorAll('#side .nav [data-pdrag]')].map(el=>({el,id:el.dataset.pdrag,d:+el.dataset.depth||0}));
  const si=rows.findIndex(r=>r.id===PD.id);if(si<0)return null;const d0=rows[si].d;let se=si+1;while(se<rows.length&&rows[se].d>d0)se++;
  const dotX=r=>{const q=r.el.querySelector('.pico,.dot');if(!q)return 0;const b=q.getBoundingClientRect();return b.left+b.width/2};
  if(!PD.dx){PD.dx={};rows.forEach(r=>{if(r.id!==PD.id&&PD.dx[r.d]==null)PD.dx[r.d]=dotX(r)});PD.dx[d0]=PD.dot0=dotX(rows[si])}
  const list=rows.slice(0,si).concat(rows.slice(se));let gi;
  if(tg.dataset.pdrag===PD.id)gi=si;else{const ti=list.findIndex(r=>r.el===tg);if(ti<0)return null;const rc=tg.getBoundingClientRect();gi=(e.clientY-rc.top)<rc.height/2?ti:ti+1}
  const prev=list[gi-1],next=list[gi];if(!prev&&!next)return null;const maxD=prev?prev.d+1:0,minD=0;
  const X=k=>{if(PD.dx[k]!=null)return PD.dx[k];let j=k;while(j>0&&PD.dx[j]==null)j--;return(PD.dx[j]!=null?PD.dx[j]:PD.dot0-d0*16)+(k-j)*16};
  const x=PD.dot0+(e.clientX-PD.x);let D=minD,best=1e9;for(let k=minD;k<=maxD;k++){const v=Math.abs(X(k)-x);if(v<best){best=v;D=k}}
  let parent=null,after=null;for(let i=gi-1;i>=0;i--){const r=list[i];if(r.d===D&&after===null)after=r.id;if(r.d<D){parent=r.id;break}}
  return{parent,after,x:X(D),prev,next}}
function showPLine(pl){let l=document.getElementById('pdline');if(!l){l=document.createElement('div');l.id='pdline';document.body.appendChild(l)}const y=pl.next?pl.next.el.getBoundingClientRect().top:pl.prev.el.getBoundingClientRect().bottom;const nv=document.querySelector('#side .nav').getBoundingClientRect();l.style.top=(y-1)+'px';l.style.left=(pl.x-4)+'px';l.style.width=Math.max(20,nv.right-pl.x-2)+'px'}
function moveProjectTo(id,parent,after){const ps=S.meta.projects,p=proj(id);if(!p)return;const desc=new Set();const w=x=>ps.filter(c=>c.parentId===x).forEach(c=>{desc.add(c.id);w(c.id)});w(id);if(parent&&(parent===id||desc.has(parent)))return;
  const was=p.parentId||null;p.parentId=parent;const sib=activeProj().filter(x=>(x.parentId||null)===parent&&x.id!==id).sort((x,y)=>x.order-y.order);const i=after?sib.findIndex(x=>x.id===after)+1:0;sib.splice(Math.max(0,i),0,p);sib.forEach((x,k)=>x.order=k+1);
  if(parent){const pp=proj(parent);if(pp&&pp.collapsed)pp.collapsed=false}saveMeta();toast(was===parent?'Проект перемещён':parent?`«${p.title}» теперь внутри «${proj(parent).title}»`:`«${p.title}» теперь на верхнем уровне`)}
function pdTarget(x,y){const el=document.elementFromPoint(x,y);if(!el)return null;return el.closest((PD&&PD.kind==='task'?'.task[data-id],':'')+'[data-dropproj],[data-droproot],[data-dropview],[data-dropday],.col,[data-dg]')}
function rowZone(tg,e){const r=tg.getBoundingClientRect();const below=(e.clientY-r.top)>r.height/2;const dx=e.clientX-(PD?PD.x:e.clientX);return dx>40?'in':dx<-40?'out':below?'after':'before'}
function dropOnRow(t,tg,e,before,undo){const target=S.tasks.get(tg.dataset.id);if(!target)return;const z=PD_LAST.zone;
  const isDesc=x=>{let c=x;while(c&&c.parentId){if(c.parentId===t.id)return true;c=S.tasks.get(c.parentId)}return false};
  if(target.id===t.id){if(z==='out'&&t.parentId){const par=S.tasks.get(t.parentId);t.parentId=par?.parentId||null;t.order=(par?.order||Date.now())+1;saveTask(t);toast('Вынесено из подзадач',undo)}else if(z==='in'){const sib=allTasks().filter(x=>x.parentId===t.parentId&&x.projectId===t.projectId&&x.id!==t.id&&x.order<t.order).sort((x,y)=>y.order-x.order)[0];if(sib){t.parentId=sib.id;saveTask(t);toast('Стало подзадачей «'+sib.title+'»',undo)}}return}
  if(isDesc(target))return;
  if(z==='in'){t.parentId=target.id;t.projectId=target.projectId;t.groupId=target.groupId;t.order=Date.now();saveTask(t);toast('Стало подзадачей «'+target.title+'»',undo);return}
  t.parentId=target.parentId||null;t.projectId=target.projectId;t.groupId=target.groupId;t.deferred=target.deferred;
  const sib=allTasks().filter(x=>x.id!==t.id&&(x.parentId||null)===(target.parentId||null)&&x.projectId===target.projectId&&(x.groupId||null)===(target.groupId||null)).sort((x,y)=>x.order-y.order);const i=sib.indexOf(target);
  const nb=z==='before'?sib[i-1]:sib[i+1];t.order=nb?(target.order+nb.order)/2:target.order+(z==='before'?-1000:1000);saveTask(t)}
let PD_LAST={};
function pdStart(){PD.started=true;const g=document.createElement('div');g.className='dghost';g.textContent=(PD.el.innerText||'').split('\n').filter(Boolean).slice(-1)[0]?.slice(0,40)||'…';document.body.appendChild(g);PD.g=g;PD.el.classList.add('dragging');document.body.classList.add('dnd');if(navigator.vibrate&&PD.touch)navigator.vibrate(15)}
function pdEnd(){if(!PD)return;clearTimeout(PD.timer);PD.g&&PD.g.remove();PD.el.classList.remove('dragging');document.body.classList.remove('dnd');clrDrop();PD=null}
document.addEventListener('pointerdown',e=>{if(e.button!==0||PD)return;const el=e.target.closest&&e.target.closest(DSEL);if(!el||e.target.closest('.chk,input,textarea,select,.mv,.del'))return;
  const id=el.dataset.pdrag||el.dataset.id;if(!id)return;PD={el,id,kind:el.dataset.pdrag?'proj':'task',x:e.clientX,y:e.clientY,touch:e.pointerType!=='mouse',started:false};
  if(PD.touch)PD.timer=setTimeout(()=>{if(PD&&!PD.started)pdStart()},380)});
document.addEventListener('pointermove',e=>{if(!PD)return;const dx=e.clientX-PD.x,dy=e.clientY-PD.y,dist=Math.hypot(dx,dy);
  if(!PD.started){if(PD.touch){if(dist>10)pdEnd();return}if(dist<6)return;pdStart()}
  {const sc=e.target.closest&&document.elementFromPoint(e.clientX,e.clientY)?.closest('.tg,#content,#side');if(sc){const r=sc.getBoundingClientRect();if(e.clientY<r.top+40)sc.scrollTop-=14;else if(e.clientY>r.bottom-40)sc.scrollTop+=14}}
  e.preventDefault();PD.g.style.transform=`translate(${e.clientX+12}px,${e.clientY+10}px)`;clrDrop();const tg=pdTarget(e.clientX,e.clientY);PD.tg=tg;PD.cy=e.clientY;if(!tg)return;
  if(PD.kind==='proj'){if(tg.matches('[data-droproot]'))tg.classList.add('drop-in');else if(tg.matches('[data-dropproj]')){const pl=projPlace(tg,e);if(pl)showPLine(pl)}}
  else if(tg.matches('.task[data-id]')){const z=rowZone(tg,e);PD_LAST.zone=z;tg.classList.add(z==='in'?'drop-in':z==='out'?'drop-out':'drop-'+z)}
  else if(tg.matches('[data-dg]'))tg.classList.add('drop')
  else if(tg.matches('[data-dropday],.col,[data-dropview],[data-dropproj]'))tg.classList.add(tg.matches('[data-dropday],.col')?'drop':'drop-in')},{passive:false});
document.addEventListener('touchmove',e=>{if(PD&&PD.started)e.preventDefault()},{passive:false});
document.addEventListener('pointercancel',pdEnd);
document.addEventListener('contextmenu',e=>{if(PD&&PD.touch)e.preventDefault()});
document.addEventListener('pointerup',e=>{if(!PD)return;if(!PD.started){pdEnd();return}const tg=pdTarget(e.clientX,e.clientY),{kind,id}=PD;const ev={clientY:e.clientY};const PDK=PD;pdEnd();swallow=true;setTimeout(()=>swallow=false,50);if(!tg)return;
  if(kind==='proj'){if(tg.matches('[data-droproot]'))moveProject(id,null,'top');else if(tg.matches('[data-dropproj]')){PD=PDK;const pl=projPlace(tg,e);PD=null;if(pl)moveProjectTo(id,pl.parent,pl.after)}return}
  const t=S.tasks.get(id);if(!t)return;const before=clone(t);const undo=()=>{S.tasks.set(t.id,before);saveTask(before)};
  if(tg.matches('.task[data-id]')){dropOnRow(t,tg,e,before,undo);return}
  if(tg.matches('[data-dg]')&&!tg.dataset.dropday){t.projectId=tg.dataset.project||t.projectId;t.groupId=tg.dataset.group||null;t.parentId=null;t.order=Date.now();saveTask(t);toast('Перенесено в раздел',undo);return}
  if(tg.matches('[data-dropday]')){const d=tg.dataset.dropday;if(tg.dataset.droptime)t.time=tg.dataset.droptime;else if(tg.dataset.allday)t.time=null;if(t.deadline&&t.start)t.deadline=addDays(t.deadline,Math.round((new Date(d)-new Date(t.start))/864e5));else if(t.deadline&&!t.start)t.deadline=d;if(t.start||!t.deadline)t.start=d;t.deferred=false;saveTask(t);toast('Перенесено на '+fmtDate(d).toLowerCase()+(t.time?', '+t.time:''),undo);return}
  if(tg.matches('.col')){if(t.columnId!==tg.dataset.col){t.columnId=tg.dataset.col;saveTask(t)}return}
  if(tg.matches('[data-dropproj]')){t.projectId=tg.dataset.dropproj;t.groupId=null;t.deferred=false;saveTask(t);toast(`Перенесено в «${proj(t.projectId).title}»`,undo);return}
  if(tg.matches('[data-dropview]')){const k=tg.dataset.dropview;if(k==='inbox'){t.projectId=null;t.groupId=null;t.deferred=false}else if(k==='today'){t.start=today();t.deferred=false}else if(k==='someday')t.deferred=true;saveTask(t);toast('Готово',undo)}});
document.addEventListener('click',e=>{const pm=document.querySelector('details.pmore[open]');if(pm&&(!e.target.closest('details.pmore')||e.target.closest('.pmenu button')))pm.open=false;if(swallow){e.preventDefault();e.stopPropagation();swallow=false}},true);
document.addEventListener('dragleave',e=>{const col=e.target.closest&&e.target.closest('.col');if(col&&!col.contains(e.relatedTarget))col.classList.remove('drop')});
document.addEventListener('drop',e=>{const pid=e.dataTransfer.getData('application/x-proj');
  const dp=e.target.closest&&e.target.closest('[data-dropproj]');const dr=e.target.closest&&e.target.closest('[data-droproot]');const dv=e.target.closest&&e.target.closest('[data-dropview]');
  if(pid&&(dp||dr)){e.preventDefault();const z=dr?'top':pZone(dp,e);clrDrop();moveProject(pid,dr?null:dp.dataset.dropproj,z);return}
  if(!pid&&(dp||dv)){e.preventDefault();clrDrop();const t=S.tasks.get(e.dataTransfer.getData('text/plain'));if(!t)return;const before=clone(t);
    if(dp){t.projectId=dp.dataset.dropproj;t.groupId=null;t.deferred=false;toast(`Перенесено в «${proj(t.projectId).title}»`,()=>{S.tasks.set(t.id,before);saveTask(before)})}
    else{const k=dv.dataset.dropview;if(k==='inbox'){t.projectId=null;t.groupId=null;t.deferred=false}else if(k==='today'){t.start=today();t.deferred=false}else if(k==='someday'){t.deferred=true}toast('Готово',()=>{S.tasks.set(t.id,before);saveTask(before)})}
    saveTask(t);return}const dd=e.target.closest&&e.target.closest('[data-dropday]');if(dd){e.preventDefault();document.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop'));const t=S.tasks.get(e.dataTransfer.getData('text/plain'));const d=dd.dataset.dropday;if(t&&d){const before=clone(t);if(dd.dataset.droptime)t.time=dd.dataset.droptime;else if(dd.dataset.allday)t.time=null;if(t.deadline&&t.start)t.deadline=addDays(t.deadline,Math.round((new Date(d)-new Date(t.start))/864e5));else if(t.deadline&&!t.start)t.deadline=d;if(t.start||!t.deadline)t.start=d;saveTask(t);toast('Перенесено на '+fmtDate(d).toLowerCase()+(t.time?', '+t.time:''),()=>{S.tasks.set(t.id,before);saveTask(before)})}return}const col=e.target.closest&&e.target.closest('.col');if(!col)return;e.preventDefault();col.classList.remove('drop');const t=S.tasks.get(e.dataTransfer.getData('text/plain'));if(t&&t.columnId!==col.dataset.col){t.columnId=col.dataset.col;saveTask(t)}});
(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const b=document.createElement('button');b.type='button';b.className='btn ghost mic';b.setAttribute('aria-label','Надиктовать');b.title='Надиктовать задачу';b.innerHTML=ic('mic');$('#qa').insertBefore(b,$('#qaBtn'));let rec=null;
  b.addEventListener('click',()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='ru-RU';rec.interimResults=false;b.classList.add('on');rec.onresult=ev=>{const txt=[...ev.results].map(r=>r[0].transcript).join(' ');const i=$('#qaInput');i.value=(i.value?i.value+' ':'')+txt;i.focus()};rec.onerror=ev=>{if(ev.error==='not-allowed')toast('Разреши доступ к микрофону')};rec.onend=()=>{rec=null;b.classList.remove('on')};rec.start()})})();
$('#menuBtn').innerHTML=ic('menu');
(()=>{const tb=document.createElement('div');tb.className='tbar';tb.innerHTML=`<button data-act="qaFocus" title="Новая задача (N)" aria-label="Новая задача">${ic('plus')}</button><button data-x="dictate" class="dict" title="Надиктовать задачу" aria-label="Надиктовать задачу">${ic('wave')}</button><label class="search">${ic('search')}<input id="q" placeholder="Поиск" aria-label="Поиск задач и заметок"></label><button data-x="twoPane" title="Двухпанельный режим: карточка задачи под задачей в списке" aria-label="Двухпанельный режим">${ic('panel')}</button><button data-x="dateJump" title="Переход к дате" aria-label="Переход к дате">${ic('calday')}</button><button data-x="timers" title="Помодоро" aria-label="Помодоро">${ic('timer')}</button><button data-x="notif" class="notifb" title="Уведомления" aria-label="Уведомления">${ic('bell')}</button><button data-act="sideToggle" title="Свернуть или развернуть левую панель" aria-label="Левая панель">${ic('dleft')}</button>`;$('#sync').before(tb);
  try{const w=+localStorage.getItem('planner-sw');if(w)document.documentElement.style.setProperty('--sw',w+'px');if(localStorage.getItem('planner-sidecollapsed'))document.body.classList.add('sidecollapsed')}catch(e){}
  const g=document.createElement('div');g.id='sideGrip';g.title='Потяни, чтобы изменить ширину. Двойной клик — исходная';$('#app').appendChild(g);
  let st=null;g.addEventListener('pointerdown',e=>{st={x:e.clientX,w:$('#side').getBoundingClientRect().width};g.setPointerCapture(e.pointerId);document.body.classList.add('resizing')});
  g.addEventListener('pointermove',e=>{if(!st)return;const w=Math.max(180,Math.min(460,st.w+e.clientX-st.x));document.documentElement.style.setProperty('--sw',w+'px')});
  g.addEventListener('pointerup',()=>{if(!st)return;st=null;document.body.classList.remove('resizing');try{localStorage.setItem('planner-sw',parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sw'))||250)}catch(e){}});
  g.addEventListener('dblclick',()=>{document.documentElement.style.removeProperty('--sw');try{localStorage.removeItem('planner-sw')}catch(e){}})})();$('#menuBtn').addEventListener('click',()=>document.body.classList.toggle('drawer'));
window.addEventListener('online',()=>{syncNote='';renderSync()});
setTimeout(()=>{if(!auth.currentUser)$('#login').hidden=false},1200);

/* mobile bottom sheet for task card (like Singularity mobile) */
(()=>{const mob=()=>innerWidth<=820&&!document.body.classList.contains('inline-det');let st=null;
  const H=()=>innerHeight-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0)-8;
  const close=el=>{el.style.transition='transform .2s ease-in';el.style.transform='translateY(100%)';setTimeout(()=>{el.style.transition='';el.style.transform='';el.style.height='';selId=null;selNoteId=null;document.body.classList.remove('sheet-full');render();renderDetail()},190)};
  document.addEventListener('touchstart',e=>{const el=$('#detail');if(!mob()||!el||el.hidden||!el.contains(e.target))return;if(e.target.closest('input,textarea,select,[contenteditable]'))return;
    const r=el.getBoundingClientRect(),y=e.touches[0].clientY;const head=y-r.top<64||!!e.target.closest('.dhead');
    st={y,h:r.height,head,top:el.scrollTop<=0,on:false}},{passive:true});
  document.addEventListener('touchmove',e=>{if(!st)return;const el=$('#detail');const dy=e.touches[0].clientY-st.y;const full=document.body.classList.contains('sheet-full');
    if(!st.on){if(Math.abs(dy)<6)return;if(st.head||(st.top&&dy>0)||(!full&&dy<0&&st.top))st.on=true;else{st=null;return}el.classList.add('sdrag')}
    e.preventDefault();const h=Math.min(H(),Math.max(120,st.h-dy));el.style.height=h+'px'},{passive:false});
  document.addEventListener('touchend',e=>{if(!st)return;const el=$('#detail');const on=st.on;const s0=st;st=null;if(!on||!el)return;el.classList.remove('sdrag');
    const h=el.getBoundingClientRect().height,hh=H();el.style.height='';
    if(h>hh*.86||(h>s0.h+40&&h>hh*.6))document.body.classList.add('sheet-full');
    else if(h<hh*.5||h<s0.h-120){if(document.body.classList.contains('sheet-full')&&h>hh*.45){document.body.classList.remove('sheet-full')}else close(el)}
    else document.body.classList.remove('sheet-full')});
  document.addEventListener('click',e=>{if(mob()&&e.target===document.body&&document.body.classList.contains('has-detail')){const el=$('#detail');if(el&&!el.hidden)close(el)}});
})();

/* mobile menu as bottom sheet: swipe down to close */
(()=>{let st=null;document.addEventListener('touchstart',e=>{const sd=$('#side');if(innerWidth>820||!document.body.classList.contains('drawer')||!sd||!sd.contains(e.target))return;const r=sd.getBoundingClientRect(),y=e.touches[0].clientY;st={y,head:y-r.top<48,top:sd.scrollTop<=0,on:false}},{passive:true});
  document.addEventListener('touchmove',e=>{if(!st)return;const sd=$('#side');const dy=e.touches[0].clientY-st.y;if(!st.on){if(Math.abs(dy)<6)return;if(dy>0&&st.head&&!PD)st.on=true;else{st=null;return}sd.style.transition='none'}e.preventDefault();sd.style.transform=`translateY(${Math.max(0,dy)}px)`},{passive:false});
  document.addEventListener('touchend',e=>{if(!st)return;const sd=$('#side');const on=st.on,y0=st.y;st=null;if(!on)return;const dy=(e.changedTouches[0]?.clientY||y0)-y0;sd.style.transition='';sd.style.transform='';if(dy>110)document.body.classList.remove('drawer')});
})();

/* ===== Stage 1: Singularity-like shell (toolbar, app menu, sidebar, project menu, sort, bottom bar, settings window) ===== */
Object.assign(ICONS,{
 star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z"/>',
 calday:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 13.5l1.5-1v5"/><path d="M13.5 12.5H16l-1.6 5"/>',
 calgrid:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01M16 17h.01"/>',
 target:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5"/><circle cx="12" cy="12" r="1.4"/>',
 shuffle:'<path d="M4 7h3.5l9 10H20M4 17h3.5l2.5-2.8M14 9.8L16.5 7H20M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>',
 rainbow:'<path d="M3.5 17a8.5 8.5 0 0 1 17 0"/><path d="M7.5 17a4.5 4.5 0 0 1 9 0"/>',
 history:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5V8H8"/><path d="M12 8.5v3.8l2.6 1.7"/>',
 layers:'<path d="M12 4l8 4.5-8 4.5-8-4.5z"/><path d="M4 13l8 4.5 8-4.5"/>',
 sort:'<path d="M4 7h16M8 12h12M12 17h8"/>',
 wave:'<path d="M4 10.5v3M7.5 7v10M11 4v16M14.5 8v8M18 10v4"/>',
 panel:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M10 5v14"/>',
 dleft:'<path d="M12 6l-6 6 6 6M18 6l-6 6 6 6"/>',
 down:'<path d="M6 9l6 6 6-6"/>',
 heart:'<path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.6 12 19 12 19z"/>',
 expand:'<path d="M5 9V5h4M19 15v4h-4"/>',collapse:'<path d="M9 5v4H5M15 19v-4h4"/>',
 refresh:'<path d="M19 12a7 7 0 0 1-12.2 4.7M5 12a7 7 0 0 1 12.2-4.7"/><path d="M17.5 3.5v4h-4M6.5 20.5v-4h4"/>',
 undo:'<path d="M9 7L5 11l4 4"/><path d="M5 11h9a5 5 0 0 1 0 10h-2"/>',
 kbd:'<rect x="3" y="7" width="18" height="11" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M7 14.5h10"/>',
 info:'<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
 full:'<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/>',
 dots:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
 palette:'<path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.6-.9 1.2-1.8-.5-1 .2-2.2 1.3-2.2H17a3 3 0 0 0 3-3c0-4.9-3.6-9-8-9z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.8" r="1"/><circle cx="15" cy="8.5" r="1"/>',
 move:'<path d="M12 4v16M4 12h16M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"/>',
 prio:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5v5.5M12 16h.01"/>',
 paste:'<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V3.5h6V5"/>',
 csv:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10.5a1.5 1.5 0 1 0 0 3M11 10.5h-1v1.5h1v1.5h-1M14 10.5l1 3 1-3"/>',
 notebook:'<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 11.5h6M9 15h3"/>',
 list2:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h7"/>',
 square:'<rect x="5" y="5" width="14" height="14" rx="3"/>',
 calx:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 13l4 4M14 13l-4 4"/>',
 sun2:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
 sofa:'<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z"/><path d="M5 17v2M19 17v2"/>'
});
Object.assign(VIEWS,{today:['Сегодня','star'],upcoming:['Планы','calday'],calendar:['Календарь','calgrid'],habits:['Привычки','target'],someday:['Когда-нибудь','rainbow'],done:['Архив','history'],unplaced:['Без проекта','shuffle']});
if(!VIEWS.tag)VIEWS.tag=['Теги','tag'];if(!VIEWS.trash)VIEWS.trash=['Корзина','trash'];else VIEWS.trash=['Корзина','trash'];if(VIEWS.notes)VIEWS.notes=['Заметки','note'];
{const im={dictate:'wave',twoPane:'panel',dateJump:'calday',timers:'timer',notif:'bell'};document.querySelectorAll('.tbar>button').forEach(b=>{const k=b.dataset.x||b.dataset.act;const n=im[k]||(k==='sideToggle'?'dleft':k==='qaFocus'?'plus':null);if(n)b.innerHTML=ic(n)})}

/* project icon: ring with progress (or emoji) like Singularity */
let _pstat=null,_pstatAt=0;
function pstats(){if(_pstat&&Date.now()-_pstatAt<300)return _pstat;const m={};for(const t of allTasks()){if(!t.projectId||t.parentId)continue;const o=m[t.projectId]||(m[t.projectId]={n:0,d:0});o.n++;if(!open(t))o.d++}_pstat=m;_pstatAt=Date.now();return m}
function picon(p){if(p.emoji)return`<span class="pico emo">${esc(p.emoji)}</span>`;const st=pstats()[p.id]||{n:0,d:0};const fr=st.n?st.d/st.n:0;const kidsP=S.meta.projects.some(c=>c.parentId===p.id&&!c.archived);const r=6.2,C=2*Math.PI*r;
  return`<span class="pico" style="color:${esc(p.color)}"><svg viewBox="0 0 ${kidsP?24:20} 20" aria-hidden="true"><circle cx="10" cy="10" r="${r}" fill="none" stroke="currentColor" stroke-width="1.9" ${fr?'opacity=".38"':''}/>${fr?`<circle cx="10" cy="10" r="${r}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-dasharray="${(C*fr).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 10 10)" stroke-linecap="round"/>`:''}${kidsP?'<path d="M17.6 4.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>':''}</svg></span>`}

/* sorting like Singularity */
const SORTF={prio:(a,b)=>(a.priority-b.priority)||(a.order-b.order),prioR:(a,b)=>(b.priority-a.priority)||(a.order-b.order),
 time:(a,b)=>((dueDay(a)||'9')+(a.time||'99')).localeCompare((dueDay(b)||'9')+(b.time||'99'))||(a.order-b.order),
 timeR:(a,b)=>((dueDay(b)||'0')+(b.time||'00')).localeCompare((dueDay(a)||'0')+(a.time||'00'))||(a.order-b.order),
 dl:(a,b)=>(a.deadline||'9').localeCompare(b.deadline||'9')||(a.order-b.order),dlR:(a,b)=>(b.deadline||'0').localeCompare(a.deadline||'0')||(a.order-b.order),
 az:(a,b)=>(a.title||'').localeCompare(b.title||'','ru'),za:(a,b)=>(b.title||'').localeCompare(a.title||'','ru'),smart:(a,b)=>cmp(a,b)};
const SORTS=[['','Пользовательская сортировка','sort'],['prio','По приоритету','prio'],['prioR','Обратно приоритету','prio'],['time','По времени','calday'],['timeR','Обратно времени','calday'],['dl','По дедлайну','flag'],['dlR','Обратно дедлайну','flag'],['az','По алфавиту','list'],['za','Обратно алфавиту','list'],['smart','Умная сортировка','focus']];

/* generic popup menu with submenus */
function popMenu(items,x,y,opts={}){closeCtx();const m=document.createElement('div');m.className='ctxmenu pmenu2';m.setAttribute('role','menu');
  const html=list=>list.map((it,i)=>it==='-'?'<hr>':it.tabs?`<div class="mtabs">${it.tabs.map(t=>`<button data-mk="${t.k}" class="${t.on?'on':''}">${ic(t.icon)}<span>${esc(t.label)}</span></button>`).join('')}</div>`:it.head?`<div class="mhead">${esc(it.head)}</div>`:`<button role="menuitem" data-mk="${it.k||''}" data-i="${i}" class="${it.dis?'dis':''} ${it.cls||''} ${it.sub?'hassub':''}" ${it.dis?'aria-disabled="true"':''}>${it.check!==undefined?`<i class="mchk">${it.check?ic('check'):''}</i>`:''}${it.icon?ic(it.icon):''}<span>${esc(it.label)}</span>${it.kb?`<kbd>${esc(it.kb)}</kbd>`:''}${it.sub?ic('right'):''}</button>`).join('');
  m.innerHTML=html(items);document.body.appendChild(m);const place=(el,x,y)=>{const r=el.getBoundingClientRect();el.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';el.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px'};place(m,x,y);
  let sub=null;const openSub=(btn,list)=>{sub?.remove();sub=document.createElement('div');sub.className='ctxmenu pmenu2 sub';sub.innerHTML=html(list);document.body.appendChild(sub);const r=btn.getBoundingClientRect();let sx=r.right+2;if(sx+sub.offsetWidth>innerWidth-6)sx=r.left-sub.offsetWidth-2;place(sub,sx,r.top-6);
    sub.addEventListener('click',ev=>{const b=ev.target.closest('[data-mk]');if(!b||b.classList.contains('dis'))return;const it=list[+b.dataset.i];closeCtx();it&&it.run&&it.run()})};
  m.addEventListener('mouseover',ev=>{const b=ev.target.closest('button[data-i]');if(!b)return;const it=items[+b.dataset.i];if(it&&it.sub)openSub(b,typeof it.sub==='function'?it.sub():it.sub);else if(sub&&!ev.target.closest('.sub')){sub.remove();sub=null}});
  m.addEventListener('click',ev=>{const b=ev.target.closest('[data-mk]');if(!b||b.classList.contains('dis'))return;if(b.closest('.mtabs')){const tb=items.find(x=>x.tabs).tabs.find(t=>t.k===b.dataset.mk);closeCtx();tb&&tb.run&&tb.run();return}const it=items[+b.dataset.i];if(it&&it.sub){openSub(b,typeof it.sub==='function'?it.sub():it.sub);return}closeCtx();it&&it.run&&it.run()});
  return m}
const selTask=()=>selId&&S.tasks.get(selId);
const goView=(type,id)=>{view={type,id};searchQ='';selId=selNoteId=null;render();const c=$('#content');if(c)c.scrollTop=0};

function appMenu(x,y){const t=selTask();const T=k=>()=>{const tt=selTask();if(tt)doTM(k,tt)};
  popMenu([
   {label:'Файл',icon:'file',sub:()=>[{label:'Синхронизировать',icon:'refresh',run:()=>location.reload()},{label:'Настройки',icon:'gear',kb:'Ctrl ,',run:()=>goView('settings')},'-',{label:'Новая задача',icon:'square',kb:'N',run:()=>runAct('qaFocus')},{label:'Новая подзадача',icon:'sub',kb:'Alt ⇧ N',dis:!t,run:T('sub')},{label:'Новая секция',icon:'layers',dis:view.type!=='project',run:()=>runAct('addGroup')},{label:'Новый проект',icon:'folder',run:()=>runAct('addProject')},{label:'Новый подпроект',icon:'folder',dis:view.type!=='project',run:()=>runAct('addSubProject')},{label:'Новая заметка',icon:'note',run:()=>runAct('newNote')},'-',{label:'Скачать копию данных',icon:'history',run:()=>runAct('export')},{label:'Импорт из файла',icon:'paste',run:()=>runAct('import')},{label:'Выйти из аккаунта',icon:'out',run:()=>runAct('signOut')}]},
   {label:'Правка',icon:'edit',sub:()=>[{label:'Вырезать',icon:'cut',kb:'Ctrl X',dis:!t,run:T('cut')},{label:'Копировать',icon:'copy',kb:'Ctrl C',dis:!t,run:T('copy')},{label:'Вставить',icon:'paste',kb:'Ctrl V',dis:!CLIP,run:()=>pasteClip()},{label:'Удалить',icon:'trash',kb:'Del',dis:!t,run:T('del')},'-',{label:'Быстрый поиск',icon:'search',kb:'Ctrl F',run:()=>$('#q')?.focus()}]},
   {label:'Перейти в раздел',icon:'move',sub:()=>[['inbox','Входящие','inbox','Alt 1'],['today','Сегодня','star','Alt 2'],['upcoming','Планы','calday','Alt 3'],['calendar','Календарь','calgrid','Alt 8'],['habits','Привычки','target'],['_tags','Теги','tag'],['unplaced','Без проекта','shuffle','Alt 4'],['someday','Когда-нибудь','rainbow','Alt 5'],['done','Архив','history','Alt 6'],['trash','Корзина','trash','Alt 7'],'-',['notes','Заметки','note'],['kanban','Канбан','cols'],['review','Проверка проектов','review'],['time','Время и Помодоро','timer']].map(v=>v==='-'?'-':{label:v[1],icon:v[2],kb:v[3],run:()=>v[0]==='_tags'?runAct('tagMenu'):goView(v[0])})},
   {label:'Вид',icon:'panel',sub:()=>[{label:'Полноэкранный режим',icon:'full',run:()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.()}},{label:'Фокус',icon:'focus',kb:'F',run:()=>runAct('focus')},{label:'Режим проверки',icon:'review',run:()=>goView('review')},'-',{label:S.meta.settings.threePane===false?'Включить трёхпанельный режим':'Включить двухпанельный режим',icon:'panel',run:()=>xAct('twoPane')},{label:'Свернуть панель задачи',icon:'x',dis:!selId&&!selNoteId,run:()=>{selId=selNoteId=null;render()}},{label:'Свернуть левую панель',icon:'dleft',run:()=>runAct('sideToggle')}]},
   {label:'Задачи',icon:'check',sub:()=>[{label:'Установить дату и время',icon:'calday',kb:'Ctrl D',dis:!t,run:T('date')},{label:'Приоритет',icon:'prio',dis:!t,run:()=>{const tt=selTask();if(tt)taskMenu(tt,x+40,y+40)}},{label:'Завершить задачу',icon:'done',kb:'Ctrl Enter',dis:!t,run:T('done')},{label:'Изменить проект',icon:'move',kb:'Ctrl ⇧ M',dis:!t,run:T('project')},{label:'Новая подзадача',icon:'sub',kb:'Alt ⇧ N',dis:!t,run:T('sub')},{label:'Вырезать',icon:'cut',dis:!t,run:T('cut')},{label:'Копировать',icon:'copy',dis:!t,run:T('copy')},{label:'Скопировать ссылку',icon:'link',dis:!t,run:T('link')},'-',{label:'Архивировать завершённые',icon:'history',dis:view.type!=='project',run:()=>runAct('archDone')}]},
   {label:'Справка',icon:'info',sub:()=>[{head:'Мой планировщик'},{label:'Горячие клавиши',icon:'kbd',run:()=>{setTab='Горячие клавиши';goView('settings')}},{label:'О программе',icon:'info',run:()=>{setTab='О программе';goView('settings')}}]}
  ],x,y)}
function xAct(k){const el=document.createElement('button');el.dataset.x=k;el.hidden=true;document.body.appendChild(el);el.click();el.remove()}

function projMenu(p,x,y){if(!p)return;const inView=view.type==='project'&&view.id===p.id;const go=f=>()=>{if(!inView){view={type:'project',id:p.id};selId=selNoteId=null}f();render()};
  const kidsP=S.meta.projects.filter(c=>c.parentId===p.id);
  popMenu([
   {tabs:[{k:'list',label:'Список',icon:'list2',on:!p.notebook,run:go(()=>{if(p.notebook){p.notebook=false;saveMeta()}projTab='tasks'})},{k:'kanban',label:'Канбан',icon:'cols',run:()=>{kanbanProj=p.id;view={type:'kanban'};render()}},{k:'notes',label:'Заметки',icon:'note',on:!!p.notebook,run:go(()=>{projTab='notes'})}]},
   {label:'Развернуть всё',icon:'expand',run:()=>{const w=id=>S.meta.projects.filter(c=>c.parentId===id).forEach(c=>{c.collapsed=false;w(c.id)});p.collapsed=false;w(p.id);saveMeta()}},
   {label:'Свернуть всё',icon:'collapse',dis:!kidsP.length,run:()=>{p.collapsed=true;saveMeta()}},'-',
   {label:'Фокус',icon:'focus',kb:'F',run:go(()=>runAct('focus'))},
   {label:'Проверка',icon:'review',sub:()=>[[0,'Не проверять'],[7,'Раз в неделю'],[14,'Раз в 2 недели'],[30,'Раз в месяц'],[182,'Раз в полгода']].map(([d,l])=>({label:l,check:(+p.review||0)===d,run:()=>{p.review=d||'';if(d&&!p.reviewedAt)p.reviewedAt=Date.now();saveMeta();toast(d?`Проверка: ${l.toLowerCase()}`:'Проверка выключена')}}))},
   {label:p.notebook?'Конвертировать в проект':'Конвертировать в блокнот',icon:'notebook',run:go(()=>runAct('projNotebook'))},
   {label:p.fav?'Убрать из избранного':'Добавить в избранное',icon:'heart',kb:'Ctrl ⇧ L',run:()=>{p.fav=!p.fav;saveMeta()}},
   {label:'Экспорт в CSV',icon:'csv',run:()=>exportCSV(allTasks().filter(x=>x.projectId===p.id),p.title)},'-',
   {label:'Создать',icon:'plus',sub:()=>[{label:'Задачу',icon:'square',run:go(()=>setTimeout(()=>runAct('qaFocus'),30))},{label:'Секцию',icon:'layers',run:go(()=>setTimeout(()=>runAct('addGroup'),30))},{label:'Подпроект',icon:'folder',run:go(()=>setTimeout(()=>runAct('addSubProject'),30))},{label:'Заметку',icon:'note',run:go(()=>{projTab='notes';setTimeout(()=>runAct('newNote'),30)})}]},
   {label:'Вставить',icon:'paste',kb:'Ctrl V',dis:!CLIP,run:go(()=>pasteClip())},
   {label:'Изменить название и цвет',icon:'edit',run:go(()=>setTimeout(()=>runAct('editProject'),30))},
   {label:showDone?'Скрыть выполненные':'Показать выполненные',icon:'done',run:go(()=>{showDone=!showDone})},
   {label:'Архивировать выполненные',icon:'history',run:go(()=>setTimeout(()=>runAct('archDone'),30))},'-',
   {label:'Удалить',icon:'trash',cls:'danger',run:()=>delProject(p)},
   {label:'Архивировать',icon:'history',kb:'Ctrl Alt L',run:go(()=>setTimeout(()=>runAct('projArchive'),30))}
  ],x,y)}
async function delProject(p){const ids=new Set([p.id]);let ch=true;while(ch){ch=false;for(const c of S.meta.projects)if(c.parentId&&ids.has(c.parentId)&&!ids.has(c.id)){ids.add(c.id);ch=true}}
  const ts=allTasks().filter(t=>ids.has(t.projectId));if(!await confirmBox('Удалить проект?',`«${p.title}»${ids.size>1?` и подпроекты (${ids.size-1})`:''} будут удалены. Задачи (${ts.length}) попадут в корзину, оттуда их можно вернуть.`,'Удалить'))return;
  const before=clone(S.meta.projects);const now=Date.now();ts.forEach(t=>{t.deletedAt=now;saveTask(t,{quiet:true})});S.meta.projects=S.meta.projects.filter(x=>!ids.has(x.id));if(view.type==='project'&&ids.has(view.id))view={type:'inbox'};saveMeta();
  toast('Проект удалён',()=>{S.meta.projects=before;ts.forEach(t=>{t.deletedAt=null;saveTask(t,{quiet:true})});saveMeta()})}

/* pomodoro / stopwatch window like Singularity "Таймеры" */
let tmTab='pomo',tmMin=null;
function timersWin(){const pc=S.meta.settings.pomo;if(tmMin==null)tmMin=pc.work;const r=S.meta.running;const t=selTask();
  const left=r?(r.limit?Math.max(0,r.limit-(Date.now()-r.start)/1000):(Date.now()-r.start)/1000):(tmTab==='pomo'?tmMin*60:0);
  const m=modal(`<div class="timers"><div class="tmh"><b>Таймеры</b><button class="ic" data-tm="close" aria-label="Закрыть">${ic('x')}</button></div>
   <div class="tmtabs"><button class="${tmTab==='pomo'?'on':''}" data-tm="tab" data-v="pomo">Помодоро</button><button class="${tmTab==='sw'?'on':''}" data-tm="tab" data-v="sw">Секундомер</button></div>
   ${tmTab==='pomo'?`<div class="tmpre">${[5,10,15,20,25,30,45,60].map((v,i)=>`<button data-tm="min" data-v="${v}" class="${tmMin===v?'on':''}"><i style="--s:${8+i*1.6}px"></i><small>${v}</small></button>`).join('')}</div>`:''}
   <div class="tmdial ${tmTab}"><b id="tmclock">${clock(left)}</b><span>${r?esc(S.tasks.get(r.taskId)?.title||(r.pomo?'Помодоро':'Секундомер')):t?esc(t.title):''}</span></div>
   <p class="small">${tmTab==='pomo'?`Работа ${pc.work} мин · перерыв ${pc.short} мин`:'Считает время, пока не остановишь'}</p>
   <div class="tmbtns"><button class="ic" data-tm="set" title="Настройки Помодоро" aria-label="Настройки Помодоро">${ic('gear')}</button><button class="tmplay" data-tm="${r?'stop':'play'}" aria-label="${r?'Остановить':'Старт'}">${ic(r?'stop':'play')}</button><button class="ic" data-tm="time" title="Статистика времени" aria-label="Статистика времени">${ic('history')}</button></div></div>`);
  m.querySelector('.mbox').classList.add('tmbox');
  m.onclick=e=>{const b=e.target.closest('[data-tm]');if(e.target===m){closeModal();return}if(!b)return;const k=b.dataset.tm;
   if(k==='close'){closeModal();return}if(k==='tab'){tmTab=b.dataset.v;timersWin();return}if(k==='min'){tmMin=+b.dataset.v;timersWin();return}
   if(k==='play'){startTimer(selId||null,tmTab==='pomo'?tmMin*60:null,tmTab==='pomo');timersWin();return}if(k==='stop'){stopTimer();timersWin();return}
   if(k==='set'){closeModal();setTab='Помодоро';goView('settings');return}if(k==='time'){closeModal();goView('time')}};
  clearInterval(timersWin._i);timersWin._i=setInterval(()=>{const c=document.getElementById('tmclock');if(!c){clearInterval(timersWin._i);return}const r=S.meta.running;if(r)c.textContent=clock(r.limit?Math.max(0,r.limit-(Date.now()-r.start)/1000):(Date.now()-r.start)/1000)},1000)}

/* notifications panel */
function notifList(){const now=Date.now(),from=now-14*864e5;const out=[];for(const t of allTasks()){if(!open(t))continue;const at=typeof remindAt==='function'?remindAt(t):null;if(at&&at<=now&&at>=from)out.push({t,at})}return out.sort((a,b)=>b.at-a.at).slice(0,40)}
function notifPanel(x,y){closeCtx();const read=S.meta.settings.notifRead||0;const L=notifList();const m=document.createElement('div');m.className='ctxmenu notifp';
  m.innerHTML=`<div class="nph"><button data-n="read">${ic('check')}Отметить как прочитанные</button></div>${L.length?L.map(({t,at})=>`<button class="nitem" data-n="open" data-id="${t.id}"><b>${esc(t.title||'Без названия')}</b><span>${t.start?fmtDate(t.start):''}${t.time?', '+esc(t.time):''}</span><small><i class="${at>read?'unread':''}"></i>${fmtDate(iso(new Date(at)))}, в ${new Date(at).toTimeString().slice(0,5)}</small></button>`).join(''):'<p class="small" style="padding:14px">Пока нет уведомлений</p>'}`;
  document.body.appendChild(m);m.style.left=Math.max(6,Math.min(x-300,innerWidth-m.offsetWidth-6))+'px';m.style.top=y+'px';
  m.onclick=e=>{const b=e.target.closest('[data-n]');if(!b)return;if(b.dataset.n==='read'){S.meta.settings.notifRead=Date.now();saveMeta({quiet:true});closeCtx();updBell();return}closeCtx();selId=b.dataset.id;render();renderDetail(true)}}
function updBell(){const b=document.querySelector('.tbar .notifb');if(!b||!S.meta)return;const read=S.meta.settings.notifRead||0;b.classList.toggle('dot',notifList().some(n=>n.at>read))}
setInterval(updBell,30000);

/* date jump popover */
function dateJump(x,y){closeCtx();const m=document.createElement('div');m.className='ctxmenu djump';const ws=S.meta.settings.weekStart;const t0=today();
  const month=ym=>{const [Y,M]=ym.split('-').map(Number);const first=new Date(Y,M-1,1);const off=(first.getDay()-ws+7)%7;const n=new Date(Y,M,0).getDate();const has=new Set(allTasks().filter(open).map(dueDay).filter(Boolean));
    return`<div class="djm"><b>${first.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b><div class="djg">${(ws?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['Вс','Пн','Вт','Ср','Чт','Пт','Сб']).map(d=>`<span>${d}</span>`).join('')}${'<span></span>'.repeat(off)}${[...Array(n)].map((_,i)=>{const d=`${Y}-${String(M).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return`<button data-d="${d}" class="${d===t0?'td':''} ${has.has(d)?'has':''}">${i+1}</button>`}).join('')}</div></div>`};
  const m0=t0.slice(0,7),m1=iso(new Date(+t0.slice(0,4),+t0.slice(5,7),1)).slice(0,7);
  m.innerHTML=`<input class="inp" type="date" id="djIn" aria-label="Дата">${month(m0)}${month(m1)}`;document.body.appendChild(m);m.style.left=Math.max(6,Math.min(x-150,innerWidth-m.offsetWidth-6))+'px';m.style.top=y+'px';
  const go=d=>{closeCtx();calMode='day';calDay=d;calMonth=d.slice(0,7);goView('calendar')};
  m.onclick=e=>{const b=e.target.closest('[data-d]');if(b)go(b.dataset.d)};m.querySelector('#djIn').onchange=e=>{if(e.target.value)go(e.target.value)}}

/* dictation from toolbar */
function dictate(btn){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Браузер не поддерживает диктовку');return}const rec=new SR();rec.lang='ru-RU';btn.classList.add('on');
  rec.onresult=ev=>{const txt=[...ev.results].map(r=>r[0].transcript).join(' ').trim();if(!txt)return;const i=$('#qaInput');i.value=txt;$('#qa').requestSubmit?$('#qa').requestSubmit():$('#qaBtn').click()};rec.onerror=ev=>{if(ev.error==='not-allowed')toast('Разреши доступ к микрофону')};rec.onend=()=>btn.classList.remove('on');rec.start();toast('Говори задачу…')}

/* settings window with sections on the left */
let setTab='Аккаунт и синхронизация',setQ='',lastView={type:'today'};
const SET_NAV=[['Общие',[['Аккаунт и синхронизация','cloud',['Аккаунт','Данные']],['Общие настройки','gear',['Общие','Задачи']],['Темы и оформление','palette',['Оформление']],['Интерфейс','panel',['Интерфейс','Левая панель']]]],
 ['Функции',[['Помодоро','timer',['Помодоро']],['Быстрое добавление задач','plus',['Быстрое добавление']],['Теги','tag',['Теги']],['Канбан','cols',['Колонки канбана']],['Проекты в архиве','history',['Проекты в архиве']],['Горячие клавиши','kbd',['Горячие клавиши']]]],
 ['Справка',[['О программе','info',[]]]]];
function settingsWin(){const c=$('#content');const cards={};c.querySelectorAll('.card-s').forEach(k=>{const h=k.querySelector('h2');if(h)cards[h.textContent.trim()]=k});
  const all=SET_NAV.flatMap(g=>g[1]);if(!all.some(x=>x[0]===setTab))setTab=all[0][0];const u=S.user;
  const match=it=>!setQ||it[0].toLowerCase().includes(setQ)||it[2].some(t=>(cards[t]?.textContent||'').toLowerCase().includes(setQ));
  const wrap=document.createElement('div');wrap.className='setov';
  wrap.innerHTML=`<div class="setdlg" role="dialog" aria-label="Настройки"><aside class="setnav"><div class="setacct">${u?.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">`:`<i>${esc((u?.email||'?')[0].toUpperCase())}</i>`}<div><b>${esc(u?.email||'')}</b><small>${esc(u?.displayName||'')}</small></div></div><label class="search">${ic('search')}<input id="setQ" placeholder="Поиск" value="${esc(setQ)}" aria-label="Поиск по настройкам"></label>
   ${SET_NAV.map(([g,items])=>{const vis=items.filter(match);return vis.length?`<div class="setg">${g}</div>${vis.map(it=>`<button class="${it[0]===setTab?'on':''}" data-st="${esc(it[0])}">${ic(it[1])}<span>${it[0]}</span></button>`).join('')}`:''}).join('')}</aside>
   <section class="setpane"><div class="seth">${ic((all.find(x=>x[0]===setTab)||[])[1]||'gear')}<b>${setTab}</b><span class="grow"></span><button class="ic" data-st="_close" aria-label="Закрыть настройки">${ic('x')}</button></div><div class="setbody"></div></section></div>`;
  const body=wrap.querySelector('.setbody');const cur=all.find(x=>x[0]===setTab);
  if(setTab==='О программе')body.innerHTML=`<div class="card-s"><h2>Мой планировщик</h2><p>Задачи, проекты, календарь, привычки и заметки. Данные хранятся в твоём аккаунте и синхронизируются между телефоном и компьютером.</p><p class="small">Версия ${esc((document.querySelector('script[type=module]')?.src.match(/v=([\w]+)/)||[])[1]||'')}</p></div>`;
  else cur[2].forEach(t=>{if(cards[t])body.appendChild(cards[t])});
  c.innerHTML='';c.appendChild(wrap);
  wrap.addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(e.target===wrap){closeSet();return}if(!b)return;if(b.dataset.st==='_close'){closeSet();return}setTab=b.dataset.st;render()});
  const q=wrap.querySelector('#setQ');q.addEventListener('input',()=>{setQ=q.value.trim().toLowerCase();const pos=q.selectionStart;render();const q2=document.getElementById('setQ');if(q2){q2.focus();q2.setSelectionRange(pos,pos)}})}
function closeSet(){view=lastView&&lastView.type!=='settings'?lastView:{type:'today'};render()}

/* bottom floating bar like Singularity */
function fbar(){let b=document.getElementById('fbar');const listV=['inbox','today','upcoming','project','someday','unplaced','tag'].includes(view.type)&&!(view.type==='project'&&projTab==='notes');
  if(!listV||innerWidth<=820||multi.size>1){b?.remove();return}
  if(!b){b=document.createElement('div');b.id='fbar';$('#main').appendChild(b)}const t=selTask();
  b.innerHTML=`<button class="fnew" data-act="qaFocus">${ic('plus')}Новая задача</button>${view.type==='project'?`<button class="ic" data-act="addGroup" title="Новая секция" aria-label="Новая секция">${ic('layers')}</button>`:''}${t?`<button class="ic" data-fb="date" title="Дата и время" aria-label="Дата и время">${ic('calday')}</button><button class="ic" data-fb="project" title="Изменить проект" aria-label="Изменить проект">${ic('move')}</button><button class="ic" data-fb="del" title="Удалить" aria-label="Удалить">${ic('trash')}</button><span class="fhint">⇧ ENTER к заметке и параметрам</span>`:''}`;
  b.onclick=e=>{const x=e.target.closest('[data-fb]');if(!x)return;const tt=selTask();if(tt)doTM(x.dataset.fb,tt)}}

/* header extras: project "…" next to title, sort button */
function headExtras(){const vt=$('#vtitle');if(!vt)return;const pm=document.querySelector('#content .pmorebtn2');if(pm){vt.appendChild(pm)}
  let sb=document.getElementById('sortBtn');const can=['inbox','today','upcoming','project','someday','unplaced','tag','done'].includes(view.type);
  if(!can){sb?.remove();return}if(!sb){sb=document.createElement('button');sb.id='sortBtn';sb.className='ic sortb';sb.dataset.x='sort';sb.title='Сортировка';sb.setAttribute('aria-label','Сортировка');sb.innerHTML=ic('sort');const tb=document.querySelector('.top .tbar');tb?tb.before(sb):$('.top').appendChild(sb)}
  sb.classList.toggle('on',!!(S.meta.settings.sorts||{})[view.type+(view.id||'')])}

/* wrap render */
{const _r=render;render=function(){if(view.type!=='settings')lastView={...view};_pstat=null;_r();if(!S.meta)return;document.body.classList.toggle('v-settings',view.type==='settings');if(view.type==='settings')settingsWin();headExtras();fbar();updBell()}}

document.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b||!S.meta)return;const k=b.dataset.x;const r=b.getBoundingClientRect();e.preventDefault();e.stopPropagation();
  if(k==='appMenu')appMenu(r.left,r.bottom+4);
  else if(k==='projMenu')projMenu(proj(b.dataset.id||view.id),r.left,r.bottom+4);
  else if(k==='projHide'){S.meta.settings.projHidden=!S.meta.settings.projHidden;saveMeta()}
  else if(k==='dictate')dictate(b);
  else if(k==='twoPane'){S.meta.settings.threePane=S.meta.settings.threePane===false;saveMeta();toast(S.meta.settings.threePane===false?'Двухпанельный режим: карточка открывается под задачей':'Трёхпанельный режим: карточка справа')}
  else if(k==='dateJump')dateJump(r.right,r.bottom+6);
  else if(k==='timers')timersWin();
  else if(k==='notif')notifPanel(r.right,r.bottom+6);
  else if(k==='sort'){const key=view.type+(view.id||'');const cur=(S.meta.settings.sorts||{})[key]||'';popMenu(SORTS.map(([v,l,i])=>({label:l,icon:i,check:cur===v,run:()=>{S.meta.settings.sorts={...(S.meta.settings.sorts||{}),[key]:v};if(!v)delete S.meta.settings.sorts[key];saveMeta()}})),r.right-260,r.bottom+4)}
},true);
/* right click on a project in the sidebar → project menu */
document.addEventListener('contextmenu',e=>{const p=e.target.closest&&e.target.closest('#side [data-nav="project"][data-id]');if(!p||!S.meta)return;e.preventDefault();e.stopPropagation();projMenu(proj(p.dataset.id),e.clientX,e.clientY)},true);
/* Esc closes settings window */
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&view.type==='settings'&&!document.querySelector('.ctxmenu')&&$('#modal').hidden){closeSet()}
  if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();goView('settings')}
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&/^Digit[1-8]$/.test(e.code)&&!(e.target.matches&&e.target.matches('input,textarea'))){const v={1:'inbox',2:'today',3:'upcoming',4:'unplaced',5:'someday',6:'done',7:'trash',8:'calendar'}[e.code.slice(5)];if(v){e.preventDefault();goView(v)}}});

/* ===== Mobile parity (from Singularity mobile video) ===== */
function cchk(t){return`<i class="cchk ${!open(t)?'on':''}" data-cchk="${t.id}" role="checkbox" aria-checked="${!open(t)}" aria-label="${open(t)?'Отметить выполненной':'Вернуть в работу'}">${!open(t)?ic('check'):''}</i>`}
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('[data-cchk]');if(!c||!S.meta)return;e.preventDefault();e.stopPropagation();const t=S.tasks.get(c.dataset.cchk);if(t){toggleTask(t);if(S.meta.settings.vibDone!==false&&navigator.vibrate)navigator.vibrate(15)}},true);
document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('[data-cchk]'))e.stopPropagation()},true);
/* menu sheet: bottom icon row for phone (search, timer, habits, sections with pins) */
function mobileMenuRow(){const sd=$('#side');if(!sd||sd.querySelector('.mrow'))return;const r=document.createElement('nav');r.className='mrow';r.innerHTML=`<button data-mm="close" class="on" aria-label="Меню">${ic('menu')}</button><button data-mm="search" aria-label="Поиск">${ic('search')}</button><button data-mm="timer" aria-label="Помодоро">${ic('timer')}</button><button data-mm="notif" class="notifm" aria-label="Уведомления">${ic('bell')}</button><button data-mm="more" aria-label="Разделы и нижняя панель">${ic('dots')}</button>`;sd.appendChild(r);
  r.onclick=e=>{const b=e.target.closest('[data-mm]');if(!b)return;const k=b.dataset.mm;document.body.classList.remove('drawer');
   if(k==='close'){}else if(k==='notif')notifPanel(innerWidth,60);else if(k==='search')mSearch();else if(k==='timer')timersWin();else if(k==='habits')goView('habits');else if(k==='settings')goView('settings');
   else{const all=[['inbox'],['today'],['upcoming'],['calendar'],['habits'],['unplaced'],['someday'],['done'],['trash'],['notes']];const pins=S.meta.settings.mbar||['today','upcoming'];
    popMenu([{head:'Булавка — показать в нижней панели (до 3)'},...all.map(([v])=>{const V=VIEWS[v]||[v,'list'];return{label:V[0],icon:V[1],check:pins.includes(v),run:()=>{let p=[...pins];if(p.includes(v))p=p.filter(x=>x!==v);else{if(p.length>=3)p.shift();p.push(v)}S.meta.settings.mbar=p;saveMeta()}}}),'-',...all.map(([v])=>({label:'Открыть: '+(VIEWS[v]||[v])[0],run:()=>goView(v)}))],0,innerHeight)}}}
function mSearch(){const m=modal(`<div class="msearch"><label class="search">${ic('search')}<input id="msq" placeholder="Поиск" autocomplete="off"></label><div class="mstabs">${[['t','Задачи'],['p','Проекты'],['g','Секции'],['h','Теги']].map(([k,l],i)=>`<button data-ms="${k}" class="${i?'':'on'}">${l}</button>`).join('')}</div><div class="msres"></div></div>`);let tab='t';const inp=m.querySelector('#msq');const res=m.querySelector('.msres');
  const draw=()=>{const q=inp.value.trim().toLowerCase();let items=[];if(q){if(tab==='t')items=allTasks().filter(t=>(t.title+' '+(t.note||'')).toLowerCase().includes(q)).slice(0,60).map(t=>`<button data-go="t" data-id="${t.id}">${ic(open(t)?'square':'check')}<span>${esc(t.title||'Без названия')}</span><small>${esc(proj(t.projectId)?.title||'Входящие')}</small></button>`);
   if(tab==='p')items=activeProj().filter(p=>p.title.toLowerCase().includes(q)).map(p=>`<button data-go="p" data-id="${p.id}">${picon(p)}<span>${esc(p.title)}</span></button>`);
   if(tab==='g')items=S.meta.groups.filter(g=>g.title.toLowerCase().includes(q)).map(g=>`<button data-go="p" data-id="${g.projectId}">${ic('layers')}<span>${esc(g.title)}</span><small>${esc(proj(g.projectId)?.title||'')}</small></button>`);
   if(tab==='h')items=S.meta.tags.filter(g=>g.title.toLowerCase().includes(q)).map(g=>`<button data-go="h" data-id="${g.id}">${ic('tag')}<span>#${esc(g.title)}</span></button>`)}
   res.innerHTML=items.join('')||`<p class="small">${q?'Ничего не найдено':'Начни вводить текст'}</p>`};
  inp.oninput=draw;draw();setTimeout(()=>inp.focus(),50);
  m.onclick=e=>{if(e.target===m){closeModal();return}const t=e.target.closest('[data-ms]');if(t){tab=t.dataset.ms;m.querySelectorAll('[data-ms]').forEach(x=>x.classList.toggle('on',x===t));draw();return}const g=e.target.closest('[data-go]');if(!g)return;closeModal();
   if(g.dataset.go==='t'){selId=g.dataset.id;render();renderDetail(true)}else if(g.dataset.go==='p')goView('project',g.dataset.id);else goView('tag',g.dataset.id)}}
/* settings on phone: list of sections first, then a section with a back arrow */
let setOpenM=false;
{const _sw=settingsWin;settingsWin=function(){_sw();const dlg=document.querySelector('.setdlg');if(!dlg)return;dlg.classList.toggle('m-open',setOpenM);
  dlg.querySelector('.setnav').addEventListener('click',e=>{if(e.target.closest('[data-st]')&&innerWidth<=820)setOpenM=true},true);
  const h=dlg.querySelector('.seth');if(h&&!h.querySelector('.mback')){const b=document.createElement('button');b.className='ic mback';b.setAttribute('aria-label','Назад');b.innerHTML=ic('left');b.onclick=()=>{setOpenM=false;render()};h.prepend(b)}}}
/* extra settings found in the mobile app */
{const _sw2=settingsWin;settingsWin=function(){_sw2();if(setTab!=='Общие настройки')return;const body=document.querySelector('.setbody');if(!body||body.querySelector('.xgen'))return;const st=S.meta.settings;const c=document.createElement('div');c.className='card-s xgen';
  c.innerHTML=`<h2>Дополнительно</h2><div class="srow"><span>Начало вечера (для «Сегодня вечером»)</span><input class="inp sm" type="time" data-sx="evening" value="${esc(st.evening||'18:00')}" style="width:110px"></div>
  <label class="srow ck"><input type="checkbox" data-sxk="vibDone" ${st.vibDone!==false?'checked':''}><span>Вибрация при завершении задач (на телефоне)</span></label>
  <label class="srow ck"><input type="checkbox" data-sxk="vibMove" ${st.vibMove!==false?'checked':''}><span>Вибрация при перемещении задач</span></label>
  <label class="srow ck"><input type="checkbox" data-sxk="hideWE" ${st.hideWE?'checked':''}><span>Скрывать выходные в календаре (неделя)</span></label>`;
  body.appendChild(c);c.onchange=e=>{const el=e.target;if(el.dataset.sxk)st[el.dataset.sxk]=el.checked;if(el.dataset.sx)st[el.dataset.sx]=el.value;saveMeta()}}}
/* calendar "…" menu: hide weekends, new task, new note */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-x="calMore"]');if(!b||!S.meta)return;e.stopPropagation();const r=b.getBoundingClientRect();const st=S.meta.settings;
  popMenu([{label:st.hideWE?'Показать выходные':'Скрыть выходные',icon:'calx',run:()=>{st.hideWE=!st.hideWE;saveMeta()}},{label:'Новая задача',icon:'square',kb:'N',run:()=>runAct('addIn')},{label:'Новая заметка',icon:'note',run:()=>runAct('newNote')}],r.left,r.bottom+4)},true);
{const _r2=render;render=function(){_r2();if(!S.meta)return;mobileMenuRow();if(view.type==='calendar'){const vt=$('#vtitle');if(vt&&!vt.querySelector('[data-x="calMore"]')){const b=document.createElement('button');b.className='ic pmorebtn2';b.dataset.x='calMore';b.setAttribute('aria-label','Действия календаря');b.innerHTML=ic('dots');vt.appendChild(b)}}}}
/* vibration when tasks are dropped */
document.addEventListener('pointerup',()=>{if(document.querySelector('.dragging')&&S.meta&&S.meta.settings.vibMove!==false&&navigator.vibrate)navigator.vibrate(10)},true);

/* ===== Stage 2: task menus and pickers like Singularity ===== */
const nextWeekend=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return addDays(today(),d.getDay()===6?0:add)};
const nextMonth=()=>{const d=new Date();return iso(new Date(d.getFullYear(),d.getMonth()+1,1))};
function setDate(ids,start,time){ids.forEach(id=>{const x=S.tasks.get(id);if(!x)return;x.start=start;x.deferred=false;if(time!==undefined)x.time=time;saveTask(x)})}
taskMenu=function(t,x,y){closeCtx();if(selId!==t.id){selId=t.id;selNoteId=null;render();renderDetail(true)}const many=multi.size>1&&multi.has(t.id);const ids=many?[...multi]:[t.id];const ev=S.meta.settings.evening||'18:00';
  const each=f=>()=>{ids.forEach(id=>{const z=S.tasks.get(id);if(z){f(z);saveTask(z)}})};
  const dateSub=()=>[{label:'Настроить вручную',icon:'calday',kb:'Ctrl D',run:()=>datePicker(t)},{label:'Сегодня',icon:'star',run:()=>setDate(ids,today())},{label:'Сегодня вечером',icon:'moon',run:()=>setDate(ids,today(),ev)},{label:'Отложить до завтра',icon:'sun2',run:()=>setDate(ids,addDays(today(),1))},{label:'На выходных',icon:'sofa',run:()=>setDate(ids,nextWeekend())},{label:'В следующем месяце',icon:'calgrid',run:()=>setDate(ids,nextMonth())},{label:'Когда-нибудь',icon:'rainbow',run:each(z=>{z.deferred=true;z.start=null;z.time=null})},{label:'Очистить дату и время',icon:'x',run:each(z=>{z.start=null;z.time=null})},'-',{label:'Крайний срок',icon:'flag',kb:'Ctrl Y',run:()=>revealParam('deadline','#d-deadline')}];
  const priSub=()=>[{label:t.pinned?'Открепить':'Закрепить',icon:'pin',kb:'Ctrl 0',run:each(z=>{z.pinned=!z.pinned})},{label:'Высокий приоритет',icon:'prio',cls:'danger',kb:'Ctrl 1',check:t.priority===0,run:each(z=>{z.priority=0})},{label:'Средний приоритет',icon:'prio',kb:'Ctrl 2',check:t.priority===1,run:each(z=>{z.priority=1})},{label:'Низкий приоритет',icon:'prio',kb:'Ctrl 3',check:t.priority===2,run:each(z=>{z.priority=2})}];
  const doneSub=()=>[{label:open(t)?'Отметить как выполненную':'Вернуть в работу',icon:'check',kb:'⇧ Space',run:()=>ids.forEach(id=>{const z=S.tasks.get(id);if(z)toggleTask(z)})},{label:'Отметить как отменённую',icon:'x',run:each(z=>{z.state='cancelled';z.completedAt=Date.now()})}];
  const f=d=>new Date(d).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');
  const items=[{label:'Установить дату и время',icon:'calday',sub:dateSub},{label:'Повторять',icon:'repeat',kb:'Ctrl ⇧ R',run:()=>doTM('repeat',t)},{label:'Запустить Помодоро',icon:'timer',run:()=>doTM('pomo',t)},{label:'Конвертировать в заметку',icon:'note',run:()=>doTM('toNote',t)},'-',
   {label:'Приоритет',icon:'prio',sub:priSub},{label:'Завершить задачу',icon:'done',sub:doneSub},'-',
   {label:t.lock?'Пароль…':'Установить пароль',icon:'lock',kb:'Ctrl ⇧ X',run:()=>doTM('lock',t)},{label:t.fav?'Убрать из избранного':'Добавить в избранное',icon:'heart',kb:'Ctrl ⇧ L',run:()=>doTM('fav',t)},{label:'Изменить проект',icon:'move',kb:'Ctrl ⇧ M',run:()=>projPicker(ids,x,y)},{label:'Перейти к событию в календаре',icon:'calgrid',dis:!t.start,run:()=>{calDay=t.start;calMonth=t.start.slice(0,7);calMode='day';goView('calendar')}},'-',
   {label:'Новая подзадача',icon:'plus',kb:'Alt ⇧ N',run:()=>doTM('sub',t)},{label:'Вырезать',icon:'cut',kb:'Ctrl X',run:()=>doTM('cut',t)},{label:'Копировать',icon:'copy',kb:'Ctrl C',run:()=>doTM('copy',t)},{label:'Дублировать',icon:'copy',run:()=>doTM('dup',t)},{label:'Удалить',icon:'trash',kb:'Del',run:()=>doTM(many?'bulkDel':'del',t)},'-',{label:'Скопировать ссылку',icon:'link',run:()=>doTM('link',t)},{head:`Создана ${f(t.createdAt||Date.now())}${t.updatedAt?' · изменена '+f(t.updatedAt):''}`}];
  if(many)items.unshift({head:`Выбрано задач: ${ids.length}`});
  popMenu(items,x,y)};
if(!ICONS.pin)ICONS.pin='<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z"/><path d="M12 14v6"/>';
/* project picker like «Куда» */
function projPicker(ids,x,y){closeCtx();const m=document.createElement('div');m.className='ctxmenu ppick';const cur=S.tasks.get(ids[0])?.projectId||null;
  const rows=()=>{const q=(m.querySelector('input')?.value||'').toLowerCase();return[[null,'Входящие','inbox',0],...projTree(false).map(([p,d])=>[p.id,p.title,p,d])].filter(r=>!q||r[1].toLowerCase().includes(q)).map(([id,l,i,d])=>`<button data-pp="${id||''}" style="padding-left:${10+d*16}px">${typeof i==='string'?ic(i):picon(i)}<span>${esc(l)}</span>${(id||null)===cur?ic('check'):''}</button>`).join('')};
  m.innerHTML=`<label class="search">${ic('search')}<input placeholder="Куда" aria-label="Куда переместить"></label><div class="pplist">${rows()}</div>`;document.body.appendChild(m);const r=m.getBoundingClientRect();m.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';m.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px';
  const inp=m.querySelector('input');inp.oninput=()=>m.querySelector('.pplist').innerHTML=rows();setTimeout(()=>inp.focus(),30);
  m.onclick=e=>{const b=e.target.closest('[data-pp]');if(!b)return;const pid=b.dataset.pp||null;ids.forEach(id=>{const z=S.tasks.get(id);if(z){z.projectId=pid;z.groupId=null;saveTask(z)}});closeCtx();toast('Перемещено')}}
/* date picker popover */
function datePicker(t,anchor){closeCtx();const ws=S.meta.settings.weekStart;let d=t.start||today(),tm=t.time||'',te=t.duration&&t.time?addMin(t.time,t.duration):'',rem=t.remind??'';const ev=S.meta.settings.evening||'18:00';
  const m=document.createElement('div');m.className='ctxmenu dpick';document.body.appendChild(m);
  const month=ym=>{const [Y,M]=ym.split('-').map(Number);const first=new Date(Y,M-1,1);const off=(first.getDay()-ws+7)%7;const n=new Date(Y,M,0).getDate();return`<div class="djm"><b>${first.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b><div class="djg">${(ws?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['Вс','Пн','Вт','Ср','Чт','Пт','Сб']).map(x=>`<span>${x}</span>`).join('')}${'<span></span>'.repeat(off)}${[...Array(n)].map((_,i)=>{const dd=`${Y}-${pad(M)}-${pad(i+1)}`;return`<button data-dd="${dd}" class="${dd===today()?'tdy':''} ${dd===d?'td':''}">${i+1}</button>`}).join('')}</div></div>`};
  const remL={'':'Напомнить','0':'Во время','5':'За 5 минут','15':'За 15 минут','30':'За 30 минут','60':'За 1 час','1440':'За 1 день'};
  const draw=()=>{const m0=d.slice(0,7);const [Y,M]=m0.split('-').map(Number);const m1=iso(new Date(Y,M,1)).slice(0,7);
   m.innerHTML=`<div class="dph">${d?new Date(d+'T00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'Без даты'}${tm?' '+tm:''}</div>
   <div class="dpq"><button data-q="today" title="Сегодня">${ic('star')}</button><button data-q="eve" title="Сегодня вечером">${ic('moon')}</button><button data-q="tom" title="Завтра">${ic('sun2')}</button><button data-q="we" title="На выходных">${ic('sofa')}</button><button data-q="nw" title="На следующей неделе">${ic('calday')}</button><button data-q="some" title="Когда-нибудь">${ic('rainbow')}</button></div>
   <div class="dpcal">${month(m0)}${month(m1)}</div>
   <div class="dpt">${ic('timer')}<input type="time" id="dpT1" value="${tm}" aria-label="Время начала"><span>–</span><input type="time" id="dpT2" value="${te}" aria-label="Время окончания"><button data-q="clrT" class="ic" aria-label="Убрать время">${ic('x')}</button></div>
   <button class="dpr" data-q="rem">${ic('bell')}<span>${remL[String(rem)]||('За '+rem+' мин')}</span></button>
   <button class="dpr" data-q="rep">${ic('repeat')}<span>${t.repeat?esc(repeatText(t)):'Повторять'}</span></button>
   <div class="dpb"><button data-q="cancel" class="btn ghost">Отмена</button><button data-q="ok" class="btn">OK</button></div>`};
  draw();const place=()=>{const r=m.getBoundingClientRect();const a=anchor?anchor.getBoundingClientRect():{left:innerWidth/2-r.width/2,bottom:innerHeight/2-r.height/2};m.style.left=Math.max(6,Math.min(a.left,innerWidth-r.width-6))+'px';m.style.top=Math.max(6,Math.min(a.bottom+4,innerHeight-r.height-6))+'px'};place();
  m.addEventListener('input',e=>{if(e.target.id==='dpT1')tm=e.target.value;if(e.target.id==='dpT2')te=e.target.value});
  m.onclick=e=>{const b=e.target.closest('[data-dd],[data-q]');if(!b)return;e.stopPropagation();if(b.dataset.dd){d=b.dataset.dd;draw();return}const q=b.dataset.q;
   if(q==='today'){d=today()}else if(q==='eve'){d=today();tm=ev}else if(q==='tom'){d=addDays(today(),1)}else if(q==='we'){d=nextWeekend()}else if(q==='nw'){const x=new Date();d=addDays(today(),((ws-x.getDay()+7)%7)||7)}
   else if(q==='some'){t.deferred=true;t.start=null;t.time=null;saveTask(t);closeCtx();return}else if(q==='clrT'){tm='';te=''}
   else if(q==='rem'){const opts=['','0','5','15','30','60','1440'];rem=opts[(opts.indexOf(String(rem))+1)%opts.length]}
   else if(q==='rep'){closeCtx();doTM('repeat',t);return}else if(q==='cancel'){closeCtx();return}
   else if(q==='ok'){t.start=d;t.deferred=false;t.time=tm||null;if(tm&&te){const [a1,b1]=tm.split(':').map(Number),[a2,b2]=te.split(':').map(Number);const dur=(a2*60+b2)-(a1*60+b1);t.duration=dur>0?dur:t.duration}t.remind=rem===''?null:rem;saveTask(t);closeCtx();renderDetail(true);return}
   draw()}}
/* Ctrl+D opens the picker */
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.code==='KeyD'&&selId&&!(e.target.matches&&e.target.matches('input,textarea'))){e.preventDefault();e.stopImmediatePropagation();const t=S.tasks.get(selId);if(t)datePicker(t)}},true);
/* in the task card: clicking the date field opens the picker */
document.addEventListener('click',e=>{const f=e.target.closest&&e.target.closest('#detail [data-param="date"] label');if(!f||!selId)return;const t=S.tasks.get(selId);if(t){e.preventDefault();datePicker(t,f)}},true);
/* touch: dragging a project far to the left makes it top level; hit-test rows even when the finger is at the screen edge */
{const _pdT=pdTarget;pdTarget=function(x,y){if(PD&&PD.kind==='proj'){const nv=document.querySelector('#side .pnav')||document.querySelector('#side .nav');if(nv){const r=nv.getBoundingClientRect();x=Math.min(Math.max(x,r.left+40),r.right-12)}}return _pdT(x,y)}}
{const _pp=projPlace;projPlace=function(tg,e){const pl=_pp(tg,e);if(!pl||!PD)return pl;const nv=document.querySelector('#side .pnav')||document.querySelector('#side .nav');const left=nv?nv.getBoundingClientRect().left:0;
  if(e.clientX<left+28||(PD.dot0&&e.clientX<PD.dot0-PD.x+e.clientX-0&&false)){let top=null;const rows=[...document.querySelectorAll('#side .nav [data-pdrag]')].map(el=>({id:el.dataset.pdrag,d:+el.dataset.depth||0,el}));
   const i=pl.prev?rows.findIndex(r=>r.el===pl.prev.el):-1;for(let k=i;k>=0;k--){if(rows[k].d===0&&rows[k].id!==PD.id){top=rows[k].id;break}}return{...pl,parent:null,after:top,x:PD.dx&&PD.dx[0]!=null?PD.dx[0]:left+20}}return pl}}
/* interface size like Singularity "Масштаб интерфейса" */
function applyZoom(){let z=1;try{z=+(localStorage.getItem('planner-zoom')||(S.meta&&S.meta.settings.zoom)||1)}catch(e){}document.documentElement.style.zoom=z===1?'':String(z)}
applyZoom();
{const _sw3=settingsWin;settingsWin=function(){_sw3();if(setTab!=='Темы и оформление')return;const body=document.querySelector('.setbody');if(!body||body.querySelector('.xzoom'))return;let z=1;try{z=+(localStorage.getItem('planner-zoom')||S.meta.settings.zoom||1)}catch(e){}
  const c=document.createElement('div');c.className='card-s xzoom';c.innerHTML=`<h2>Размер интерфейса</h2><div class="zrow"><span>A</span><input type="range" min="0.8" max="1.6" step="0.05" value="${z}" id="zoomR" aria-label="Размер интерфейса"><b>A</b><output id="zoomV">${Math.round(z*100)}%</output></div><p class="small">Меняет размер текста, кнопок и отступов. Сохраняется для этого устройства.</p>`;
  body.prepend(c);const r=c.querySelector('#zoomR');r.oninput=()=>{c.querySelector('#zoomV').textContent=Math.round(r.value*100)+'%'};r.onchange=()=>{try{localStorage.setItem('planner-zoom',r.value)}catch(err){}S.meta.settings.zoom=+r.value;applyZoom();saveMeta()}}}
/* ===== live drag of projects: row lifts, others make room (like Singularity) ===== */
let LV=null;
showPLine=function(){};
function lvInit(){const side=$('#side');const rows=[...document.querySelectorAll('#side .pnav [data-pdrag]')].map(el=>{const r=el.getBoundingClientRect();return{el,id:el.dataset.pdrag,d:+el.dataset.depth||0,top:r.top,h:r.height}});
  const si=rows.findIndex(r=>r.id===PD.id);if(si<0)return null;let se=si+1;while(se<rows.length&&rows[se].d>rows[si].d)se++;const block=rows.slice(si,se);const H=block.reduce((a,r)=>a+r.h,0);
  const list=rows.slice(0,si).concat(rows.slice(se).map(r=>({...r,top:r.top-H})));const nv=side.querySelector('.pnav').getBoundingClientRect();
  block.forEach(r=>r.el.classList.add('lvdrag'));rows.forEach(r=>r.el.classList.add('lvrow'));if(PD.g)PD.g.style.display='none';
  return{rows,si,se,block,H,list,d0:rows[si].d,top0:rows[si].top,left:nv.left,sc0:side.scrollTop,side}}
function lvMove(e){if(!LV)LV=lvInit();if(!LV)return;const dy=e.clientY-PD.y+(LV.side.scrollTop-LV.sc0),dx=e.clientX-PD.x;const c=LV.top0+dy+LV.block[0].h/2;
  let gi=0;for(const r of LV.list){if(r.top+r.h/2<c)gi++;else break}
  const prev=LV.list[gi-1];const maxD=prev?prev.d+1:0;let D=Math.max(0,Math.min(maxD,LV.d0+Math.round(dx/22)));if(e.clientX<LV.left+28)D=0;
  let parent=null,after=null;for(let i=gi-1;i>=0;i--){const r=LV.list[i];if(r.d===D&&after===null)after=r.id;if(r.d<D){parent=r.id;break}}
  LV.res={parent,after};
  LV.block.forEach(r=>{r.el.style.transform=`translate(${(D-LV.d0)*16}px,${dy}px)`});
  LV.list.forEach((r,j)=>{const orig=j<LV.si?j:j+(LV.se-LV.si);let sh=0;if(j<LV.si&&j>=gi)sh=LV.H;else if(j>=LV.si&&j<gi)sh=-LV.H;r.el.style.transform=sh?`translateY(${sh}px)`:''})}
function lvClear(){if(!LV)return;LV.rows.forEach(r=>{r.el.style.transform='';r.el.classList.remove('lvdrag','lvrow')});LV=null}
document.addEventListener('pointermove',e=>{if(PD&&PD.started&&PD.kind==='proj'&&e.target.closest&&(e.target.closest('#side')||LV)){lvMove(e)}},true);
document.addEventListener('pointerup',e=>{if(!(PD&&PD.started&&PD.kind==='proj'&&LV))return;e.stopImmediatePropagation();const id=PD.id,res=LV.res;lvClear();pdEnd();swallow=true;setTimeout(()=>swallow=false,50);if(res)moveProjectTo(id,res.parent,res.after)},true);
document.addEventListener('pointercancel',()=>{if(LV){lvClear();pdEnd()}},true);
/* while dragging with a finger, don't let the page or sheet scroll */
document.addEventListener('touchmove',e=>{if(PD&&PD.started)e.preventDefault()},{passive:false});
/* phone menu: account row with the email and the settings gear, then search of sections and projects (like the app) */
function mobileAcct(){const sd=$('#side');if(!sd||sd.querySelector('.macct'))return;const u=S.user;const d=document.createElement('div');d.className='macct';
  d.innerHTML=`<div class="mau">${u?.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">`:`<i>${esc((u?.email||'?')[0].toUpperCase())}</i>`}<span>${esc(u?.email||'')}</span><button data-ma="set" aria-label="Настройки">${ic('gear')}</button></div><label class="search">${ic('search')}<input placeholder="Поиск разделов и проектов" aria-label="Поиск разделов и проектов"></label>`;
  sd.querySelector('.brand')?.after(d);d.querySelector('[data-ma=set]').onclick=()=>{document.body.classList.remove('drawer');goView('settings')};
  const inp=d.querySelector('input');inp.oninput=()=>{const q=inp.value.trim().toLowerCase();sd.querySelectorAll('.nav>button').forEach(b=>{b.style.display=!q||b.textContent.toLowerCase().includes(q)?'':'none'})}}
{const _r3=render;render=function(){_r3();if(S.meta)mobileAcct()}}
/* real cog icon */
ICONS.gear='<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>';
/* screen-height sheets must account for the interface size */
{const _az=applyZoom;applyZoom=function(){_az();let z=1;try{z=+(localStorage.getItem('planner-zoom')||(S.meta&&S.meta.settings.zoom)||1)}catch(e){}document.documentElement.style.setProperty('--z',String(z||1))}}
applyZoom();
/* Android/browser Back: close the top layer or go to the previous section instead of leaving the app */
{let vstack=[],lastKey=null,lastObj=null,navBack=false,armed=false;
  const _r5=render;render=function(){_r5();if(!S.meta)return;const key=view.type+'|'+(view.id||'');if(view.type!=='settings'&&key!==lastKey){if(lastObj&&!navBack){vstack.push(lastObj);if(vstack.length>50)vstack.shift()}lastKey=key;lastObj={...view}}
    if(!armed){armed=true;try{history.pushState({pl:1},'')}catch(e){}}};
  window.addEventListener('popstate',()=>{if(!S.meta)return;const modalOpen=$('#modal')&&!$('#modal').hidden;
    if(document.querySelector('.ctxmenu'))closeCtx();
    else if(modalOpen)closeModal();
    else if(document.body.classList.contains('drawer'))document.body.classList.remove('drawer');
    else if(selId||selNoteId){selId=selNoteId=null;document.body.classList.remove('sheet-full');render();renderDetail()}
    else if(view.type==='settings'){if(typeof setOpenM!=='undefined'&&setOpenM&&innerWidth<=820){setOpenM=false;render()}else closeSet()}
    else if(vstack.length){navBack=true;view=vstack.pop();selId=selNoteId=null;render();navBack=false}
    else{armed=false;history.back();return}
    try{history.pushState({pl:1},'')}catch(e){}});}
/* phone calendar like Singularity: plain tabs, swipe to change period, month collapses to one week + day list */
let calCollapsed=false;
function calMobile(){if(view.type!=='calendar'||innerWidth>820)return;const c=$('#content');const cal=c.querySelector('.cal');if(cal){
   const btns=[...cal.querySelectorAll('button[data-d]')];const idx=btns.findIndex(b=>b.dataset.d===calDay);const wk=idx<0?0:Math.floor(idx/7);
   btns.forEach((b,i)=>{b.hidden=calCollapsed&&Math.floor(i/7)!==wk});
   const grp=cal.nextElementSibling;if(grp&&grp.matches('.group'))grp.hidden=!calCollapsed;
   if(!c.querySelector('.calfold')){const f=document.createElement('button');f.className='calfold';f.setAttribute('aria-label',calCollapsed?'Развернуть месяц':'Свернуть до недели');f.innerHTML=ic('down');if(!calCollapsed)f.classList.add('up');f.onclick=()=>{calCollapsed=!calCollapsed;render()};cal.after(f)}}}
{const _r6=render;render=function(){_r6();if(S.meta)calMobile()}}
{let sx=null,sy=0;document.addEventListener('touchstart',e=>{if(view.type!=='calendar'||innerWidth>820||!e.target.closest('#content')||e.target.closest('.tg'))return;sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
 document.addEventListener('touchend',e=>{if(sx==null)return;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)runAct(dx<0?'calNext':'calPrev')})}
/* tapping a day in month view on the phone selects it and shows its tasks in the collapsed mode */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.cal button[data-d]');if(!b||innerWidth>820||view.type!=='calendar')return;if(e.target.closest('[data-cchk],.mt'))return;calCollapsed=true},true);
if(!ICONS.grid)ICONS.grid='<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>';
/* overdue group folds like Singularity */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-x="overFold"]');if(!b||!S.meta)return;e.stopPropagation();S.meta.settings.overOpen=!S.meta.settings.overOpen;saveMeta();render()},true);
