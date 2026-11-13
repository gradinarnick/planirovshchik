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
const COLORS=['#2f6b4a','#4f6fa3','#b8432f','#b07a1e','#7a5aa6','#2d8a8a','#a3527a','#6b7a3a','#5d665e'];

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
const ICONS={more:'<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',star:'<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',bell:'<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',focus:'<circle cx="12" cy="12" r="3"/><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>',review:'<path d="M4 12a8 8 0 1014.5-4.6"/><path d="M19 3v5h-5"/><path d="M9 12l2 2 4-4"/>',gantt:'<path d="M4 6h9M8 12h10M6 18h7"/>',chat:'<path d="M5 5h14v10H10l-4 4v-4H5z"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',check:'<path d="M5 12.5l4.2 4L19 7"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',inbox:'<path d="M4 13l2.5-7h11L20 13v5H4z"/><path d="M4 13h4.5l1 2h5l1-2H20"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',next:'<path d="M4 6h10M4 12h16M4 18h12"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',cols:'<rect x="4" y="4" width="4.5" height="16" rx="1.2"/><rect x="10" y="4" width="4.5" height="11" rx="1.2"/><rect x="16" y="4" width="4" height="7" rx="1.2"/>',leaf:'<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',timer:'<circle cx="12" cy="13" r="7"/><path d="M12 13V9.5M9.5 3h5"/>',done:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.3 4.6-4.8"/>',search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',trash:'<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>',left:'<path d="M15 6l-6 6 6 6"/>',right:'<path d="M9 6l6 6-6 6"/>',play:'<path d="M8 5.5v13l10-6.5z"/>',stop:'<rect x="7" y="7" width="10" height="10" rx="1.5"/>',cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',flag:'<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',repeat:'<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>',list:'<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',back:'<path d="M14 6l-6 6 6 6"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',note:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',pin:'<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/>',clip:'<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/>',sub:'<path d="M6 4v9a3 3 0 0 0 3 3h9M15 13l3 3-3 3"/>',moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'};
const ic=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ---------- state ---------- */
const S={meta:null,tasks:new Map(),notes:new Map(),user:null};
let tgScroll=null,calMode='month',pendingOpen=(location.hash.match(/#t=([\w-]+)/)||[])[1]||null;const unlocked=new Set();
let view={type:'today'},selId=null,selNoteId=null,noteMode='view',projTab='tasks',showDone=false,searchQ='',calMonth=today().slice(0,7),calDay=today(),kanbanProj='',notesProj='';
function defaultMeta(){return{projects:[{id:uid(),title:'Личное',emoji:'🏠',color:COLORS[1],archived:false,order:1,parentId:null}],groups:[],tags:[],columns:[{id:'c1',title:'Надо сделать'},{id:'c2',title:'В работе'},{id:'c3',title:'Готово'}],habits:[],timeLog:[],running:null,filesFolderId:null,settings:defaultSettings(),updatedAt:Date.now()}}
function defaultSettings(){return{weekStart:1,autoRemind:false,hidden:[],pomo:{work:25,short:5,long:15,every:4,auto:false,sound:true}}}
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
function toggleTask(t){const before=clone(t);
  if(t.repeat&&open(t)){const base=t.repeatFromDone?today():(t.start||today());let n=nextDate(base,t.repeat,t);if(!t.repeatFromDone)while(n<=today())n=nextDate(n,t.repeat,t);
    const last=(t.repeatEnd==='count'&&(parseInt(t.repeatCount)||1)<=1)||(t.repeatEnd==='date'&&t.repeatUntil&&n>t.repeatUntil);
    if(!last){if(t.repeatEnd==='count')t.repeatCount=(parseInt(t.repeatCount)||1)-1;if(t.deadline&&t.start){t.deadline=addDays(t.deadline,Math.round((new Date(n)-new Date(t.start))/864e5))}t.start=n;t.checklist.forEach(c=>c.state=0);saveTask(t);toast(`Сделано. Следующий раз: ${fmtDate(n)}`,()=>{S.tasks.set(t.id,before);saveTask(before)});return}}
  if(open(t)){t.state='done';t.completedAt=Date.now();const last=S.meta.columns[S.meta.columns.length-1];if(last&&/готов/i.test(last.title))t.columnId=last.id;saveTask(t);toast('Задача выполнена',()=>{S.tasks.set(t.id,before);saveTask(before)})}
  else{t.state='open';t.completedAt=null;saveTask(t)}}
function trashTask(t){const list=[t];const walk=id=>kids(id).forEach(c=>{list.push(c);walk(c.id)});walk(t.id);const now=Date.now();list.forEach(x=>{x.deletedAt=now;saveTask(x,{quiet:true})});if(list.some(x=>x.id===selId))selId=null;render();toast(list.length>1?`В корзине: задача и ${list.length-1} подзадач`:'Задача в корзине',()=>{list.forEach(x=>{x.deletedAt=null;saveTask(x,{quiet:true})});render()})}
const MONG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WDF=[['воскресенье','вс'],['понедельник','пн'],['вторник','вт'],['среду','среда','ср'],['четверг','чт'],['пятницу','пятница','пт'],['субботу','суббота','сб']];
function parseQuick(text){let title=' '+text+' ',start=null,priority=1,time=null,projectId=null,remind=null;const tags=[];
  const cut=(re,f)=>{title=title.replace(re,(...m)=>{f(m);return' '})};
  cut(/(^|\s)напомни(?:ть)?\s+за\s+(час|день)(?=\s)/i,m=>{remind=m[2].toLowerCase()==='час'?60:1440});
  cut(/(^|\s)напомни(?:ть)?(?:\s+за\s+(\d+)\s*(мин(?:ут[уы]?)?|час(?:а|ов)?|ч|дн(?:я|ей)?|день))?(?=\s)/i,m=>{if(!m[2])remind=0;else{const n=+m[2],u=m[3].toLowerCase();remind=u.startsWith('ч')?n*60:u.startsWith('д')?n*1440:n}});
  cut(/(^|\s)(?:в\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)(?=\s)/,m=>{time=pad(+m[2])+':'+m[3]});
  cut(/(^|\s)(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?=\s)/i,m=>{const mo=MONG.indexOf(m[3].toLowerCase());const y=new Date().getFullYear();let d=iso(new Date(y,mo,+m[2]));if(d<today())d=iso(new Date(y+1,mo,+m[2]));start=d});
  WDF.forEach((ws,wd)=>ws.forEach(w=>cut(new RegExp('(^|\\s)(?:в(?:о)?\\s+)?'+w+'(?=\\s)','i'),()=>{let d=addDays(today(),1);while(new Date(d+'T00:00').getDay()!==wd)d=addDays(d,1);start=d})));
  cut(/(^|\s)[pр]([0-3])(?=\s)/i,m=>{const v=+m[2];priority=v===0?0:Math.min(2,v-1)});
  cut(/(^|\s)@([\p{L}\p{N}_-]+)/u,m=>{const q=m[2].toLowerCase().replace(/_/g,' ');const p=activeProj().find(x=>x.title.toLowerCase()===q)||activeProj().find(x=>x.title.toLowerCase().startsWith(q));if(p)projectId=p.id});
  const day=(w,n)=>{const re=new RegExp('(^|\\s)'+w+'(?=\\s)','i');if(re.test(title)){start=addDays(today(),n);title=title.replace(re,' ')}};
  day('послезавтра',2);day('завтра',1);day('сегодня',0);
  if(/(^|\s)!!(?=\s)/.test(title)){priority=0;title=title.replace(/(^|\s)!!(?=\s)/,' ')}
  title=title.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu,(m,s,name)=>{let tg=S.meta.tags.find(x=>x.title.toLowerCase()===name.toLowerCase());if(!tg){tg={id:uid(),title:name,color:COLORS[S.meta.tags.length%COLORS.length]};S.meta.tags.push(tg);saveMeta({quiet:true})}tags.push(tg.id);return' '});
  if((time||remind!==null)&&!start)start=today();return{title:title.replace(/\s+/g,' ').trim(),start,priority,tags,time,projectId,remind}}

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
  $('#side').innerHTML=`<div class="brand"><i>${ic('check')}</i>Мой планировщик</div>
   
   <nav class="nav">${SIDE_TOP.filter(k=>!S.meta.settings.hidden.includes(k)).map(k=>{const n=k==='inbox'?c.inbox:k==='today'?c.td+c.over:k==='habits'?habitsLeft:k==='notes'?allNotes().length:k==='review'?dueReview().length:0;return`<button class="${on(k)}" data-nav="${k}" ${k==='inbox'||k==='today'||k==='someday'?`data-dropview="${k}"`:''}>${ic(VIEWS[k][1])}${VIEWS[k][0]}${n?`<span class="n ${k==='today'&&c.over?'warn':''}">${n}</span>`:''}</button>`}).join('')}</nav>
   ${(()=>{const fp=activeProj().filter(p=>p.fav),ft=allTasks().filter(t=>t.fav&&open(t));return fp.length||ft.length?`<div class="sect">Избранное</div><nav class="nav">${fp.map(p=>`<button class="${on('project',p.id)}" data-nav="project" data-id="${p.id}"><span class="dot" style="background:${esc(p.color)}"></span>${p.emoji?esc(p.emoji)+' ':''}${esc(p.title)}</button>`).join('')}${ft.map(t=>`<button data-act="openId" data-id="${t.id}">${ic('star')}${esc(t.title||'Без названия')}</button>`).join('')}</nav>`:''})()}
   <div class="sect" data-droproot="1">Проекты<button data-act="addProject" aria-label="Новый проект">${ic('plus')}</button></div>
   <nav class="nav">${projTree(true).map(([p,d])=>{const hasKids=activeProj().some(c=>c.parentId===p.id);return`<button class="${on('project',p.id)} ${d?'child':''} ${hasKids?'haskids':''}" style="${d>1?`padding-left:${10+d*16}px`:''}" data-nav="project" data-id="${p.id}" draggable="true" data-pdrag="${p.id}" data-dropproj="${p.id}" title="Перетащи: на середину другого проекта — сделать подпроектом, выше или ниже — поставить рядом">${hasKids?`<span class="tw ${p.collapsed?'':'open'}" data-ptoggle="${p.id}" role="button" aria-label="${p.collapsed?'Раскрыть':'Свернуть'}" title="${p.collapsed?'Раскрыть':'Свернуть'}">${ic('right')}</span>`:'<span class="tw0"></span>'}<span class="dot" style="background:${esc(p.color)}"></span>${p.emoji?esc(p.emoji)+' ':''}${esc(p.title)}${pc[p.id]?`<span class="n">${pc[p.id]}</span>`:''}</button>`}).join('')||'<span class="small" style="padding:0 8px">Пока нет проектов</span>'}</nav>
   
   <div class="side-foot">${rt?`<div class="runbox">${ic('timer')}<span>${esc(rt.title)}</span><b id="runclock">${clock((Date.now()-run.start)/1000)}</b><button data-act="stopTimer" aria-label="Остановить таймер">${ic('stop')}</button></div>`:''}
    <nav class="icrow">${SIDE_BOTTOM.filter(k=>!S.meta.settings.hidden.includes(k)).map(k=>{const[l,i]=VIEWS[k]||ICV[k];return`<button class="${on(k)}" data-nav="${k}" ${k==='someday'?'data-dropview="someday"':''} title="${l}" aria-label="${l}">${ic(i)}</button>`}).join('')}</nav></div>`;
}
function renderTabbar(){const tabs=[['today','Сегодня','sun'],['inbox','Входящие','inbox'],['notes','Заметки','note'],['habits','Привычки','leaf'],['_menu','Ещё','menu']];$('#tabbar').innerHTML=tabs.map(([k,l,i])=>`<button class="${view.type===k?'on':''}" data-nav="${k}">${ic(i)}${l}</button>`).join('')}
function renderSync(){const el=$('#sync');if(!el)return;el.innerHTML=syncNote?`<span class="pill err" title="${esc(syncNote)}">${ic('cloud')}${esc(syncNote.length>34?'Нет синхронизации':syncNote)}</span>`:S.user?`<span class="pill ok" title="Всё сохранено в облаке">${ic('cloud')}Синхронизировано</span>`:''}
function chipsFor(t,ctx){const out=[];const t0=today();const d=t.start;
  if(ctx!=='nest'&&t.parentId){const p=S.tasks.get(t.parentId);if(p&&!p.deletedAt)out.push(`<span>${ic('sub')}${esc(p.title.slice(0,30))}</span>`)}
  if(d){const cls=open(t)&&d<t0?'over':d===t0?'today':'';out.push(`<span class="${cls}">${ic('cal')}${fmtDate(d)}${t.time?' · '+esc(t.time)+(t.duration?'–'+addMin(t.time,t.duration):''):''}</span>`)}else if(t.time)out.push(`<span>${ic('clock')}${esc(t.time)}</span>`);
  if(t.deadline)out.push(`<span class="${open(t)&&t.deadline<t0?'over':''}">${ic('flag')}до ${fmtDate(t.deadline)}</span>`);
  if(t.repeat)out.push(`<span>${ic('repeat')}${repeatText(t)}</span>`);
  if(t.deferred)out.push(`<span>${ic('moon')}когда-нибудь</span>`);
  if(t.fav)out.push(`<span>${ic('star')}</span>`);if(t.remind!=null&&t.remind!=='')out.push(`<span>${ic('bell')}</span>`);if(t.comments?.length)out.push(`<span>${ic('chat')}${t.comments.length}</span>`);if(t.lock)out.push(`<span>${ic('lock')}</span>`);
  const k=kids(t.id);if(k.length)out.push(`<span>${ic('sub')}${k.filter(x=>!open(x)).length}/${k.length}</span>`);
  if(t.checklist.length)out.push(`<span>${ic('list')}${t.checklist.filter(c=>c.state).length}/${t.checklist.length}</span>`);
  if(t.files?.length)out.push(`<span>${ic('clip')}${t.files.length}</span>`);
  if(t.timeSpent>=60)out.push(`<span>${ic('timer')}${fmtDur(t.timeSpent)}</span>`);
  if(ctx!=='project'&&ctx!=='nest'&&t.projectId){const p=proj(t.projectId);if(p)out.push(`<span><span class="tag"><i style="background:${esc(p.color)}"></i>${esc(p.title)}${t.groupId&&groupOf(t.groupId)?' / '+esc(groupOf(t.groupId).title):''}</span></span>`)}
  for(const id of t.tags){const g=tagOf(id);if(g)out.push(`<span class="tag"><i style="background:${esc(g.color)}"></i>#${esc(g.title)}</span>`)}
  if(t.note)out.push(`<span>${ic('edit')}заметка</span>`);return out.join('')}
const WDS=['вс','пн','вт','ср','чт','пт','сб'];
function repeatText(t){const k=Math.max(1,parseInt(t.repeatEvery)||1);const base={daily:k>1?`каждые ${k} дн.`:'каждый день',weekdays:'по будням',weekly:k>1?`раз в ${k} нед.`:'каждую неделю',monthly:k>1?`раз в ${k} мес.`:'каждый месяц',yearly:k>1?`раз в ${k} г.`:'каждый год'}[t.repeat]||'';const d=t.repeat==='weekly'&&t.repeatDays?.length?' · '+[1,2,3,4,5,6,0].filter(x=>t.repeatDays.includes(x)).map(x=>WDS[x]).join(', '):'';return base+d+(t.repeatFromDone?' после выполнения':'')}
function rowHTML(t,ctx,depth=0){const done=!open(t);return`<li ${open(t)?'draggable="true"':''} style="${pcs(t)}" class="task d${Math.min(depth,3)} ${done?'is-done':''} ${t.state==='cancelled'?'is-cancel':''} ${selId===t.id?'is-sel':''}" data-id="${t.id}"><button class="chk pr${t.priority}" data-act="toggle" aria-label="${done?'Вернуть в работу':'Отметить выполненной'}">${done?ic(t.state==='cancelled'?'x':'check'):''}</button><div class="tbody" data-act="open" tabindex="0" role="button"><div class="ttl">${t.title?esc(t.title):'<span class="muted">Без названия</span>'}</div><div class="tmeta">${chipsFor(t,depth||ctx==='project'?(ctx==='project'?'project':'nest'):ctx)}</div></div></li>`}
function listHTML(arr,ctx){return arr.length?`<ul class="tasks">${arr.map(t=>rowHTML(t,ctx)).join('')}</ul>`:''}
const SORT=()=>['project','inbox','someday','unplaced'].includes(view.type)?(x,y)=>(x.order-y.order):cmp;
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
    h+=group('Просрочено',over,{warn:true})+group('На сегодня',td,{always:true,add:`data-start="${t0}"`})+(showDone?group('Сделано сегодня',doneToday):'');
    h=`<div class="toolbar"><button class="btn ghost sm" data-act="print">${ic('print')}Напечатать план дня</button></div>`+h;
    if(!over.length&&!td.length)h+=emptyHTML('На сегодня всё чисто','Добавь задачу строкой сверху. Слово «завтра» в тексте сразу поставит дату.');h+=doneToggle();break}
  case 'inbox':{const a=tasks.filter(t=>!t.projectId&&!t.deferred&&(showDone||open(t)));setHead('Входящие','Задачи без проекта');h=(a.length?nestHTML(a):emptyHTML('Входящие пусты','Сюда попадает всё, что ещё не разложено по проектам.'))+doneToggle();break}
  case 'unplaced':{const a=tasks.filter(t=>!t.projectId&&(showDone||open(t)));setHead('Без проекта','Все задачи вне проектов');h=(a.length?nestHTML(a):emptyHTML('Пусто','Здесь задачи без проекта, с датой и без.'))+doneToggle();break}
  case 'someday':{const a=tasks.filter(t=>t.deferred&&open(t));setHead('Когда-нибудь','Идеи и дела без срока');h=a.length?nestHTML(a):emptyHTML('Пока пусто','Отметь в карточке задачи «Когда-нибудь», и она переедет сюда из списков.');break}
  case 'upcoming':{setHead('Предстоящие','Ближайшие две недели');for(let i=0;i<14;i++){const d=addDays(t0,i);const a=tasks.filter(t=>open(t)&&dueDay(t)===d).sort(cmp);h+=group((i<2?fmtDate(d)+', ':'')+fmtLong(d).toLowerCase(),a,{always:i<7,add:`data-start="${d}"`})}const later=tasks.filter(t=>open(t)&&dueDay(t)>addDays(t0,13)).sort((a,b)=>dueDay(a)<dueDay(b)?-1:1);h+=group('Позже',later);break}
  case 'calendar':{const ws=S.meta.settings.weekStart;const [y,m]=calMonth.split('-').map(Number);const first=new Date(y,m-1,1);const off=(first.getDay()-ws+7)%7;const gs=iso(new Date(y,m-1,1-off));const by={};for(const t of tasks){if(!open(t))continue;for(const d of new Set([t.start,t.deadline].filter(Boolean)))(by[d]=by[d]||[]).push(t)}
    const bar=`<div class="toolbar"><div class="seg">${[['month','Месяц'],['week','Неделя'],['day','День']].map(([v,l])=>`<button class="${calMode===v?'on':''}" data-act="calMode" data-v="${v}">${l}</button>`).join('')}</div><button class="btn ghost sm" data-act="calPrev" aria-label="Назад">${ic('left')}</button><button class="btn ghost sm" data-act="calToday">Сегодня</button><button class="btn ghost sm" data-act="calNext" aria-label="Вперёд">${ic('right')}</button><input class="inp sm" type="date" id="calJump" value="${calDay}" aria-label="Перейти к дате"></div>`;
    if(calMode!=='month'){const wk0=addDays(calDay,-((new Date(calDay+'T00:00').getDay()-ws+7)%7));const ds=calMode==='week'?[...Array(7)].map((_,i)=>addDays(wk0,i)):[calDay];
      setHead(calMode==='week'?`${fmtDate(ds[0])} — ${fmtDate(ds[6])}`:fmtLong(calDay),'Перетаскивай задачи между днями');
      const HH=48,nowD=new Date(),nowM=nowD.getHours()*60+nowD.getMinutes();const mins=x=>{const [hh,mm]=x.split(':').map(Number);return hh*60+mm};
      const col=d=>{const ev=(by[d]||[]).filter(t=>t.time&&t.start===d).map(t=>({t,s:mins(t.time),e:mins(t.time)+Math.max(20,+t.duration||60)})).sort((x,y)=>x.s-y.s);const lanes=[];for(const x of ev){let k=lanes.findIndex(end=>end<=x.s);if(k<0){k=lanes.length;lanes.push(0)}lanes[k]=x.e;x.k=k}
        for(const x of ev)x.n=Math.max(1,...ev.filter(y=>y.s<x.e&&y.e>x.s).map(y=>y.k+1));
        return ev.map(({t,s,e,k,n})=>`<div class="tgev pr${t.priority} ${!open(t)?'is-done':''}" draggable="true" data-id="${t.id}" data-act="openId" style="${pcs(t)};top:${s/60*HH}px;height:${Math.max(20,(Math.min(e,1440)-s)/60*HH-2)}px;left:calc(${k/n*100}% + 2px);width:calc(${100/n}% - 4px)"><small>${esc(t.time)}${t.duration?'–'+addMin(t.time,t.duration):''}</small>${t.priority===0?'<b class="hi">!</b> ':''}${esc(t.title||'Без названия')}</div>`).join('')};
      h=bar+`<div class="tg ${calMode}" style="--n:${ds.length};--hh:${HH}px"><div class="tgrow tghead"><span></span>${ds.map(d=>`<button class="${d===t0?'today':''} ${d===calDay?'on':''}" data-act="calDay" data-d="${d}">${WD[new Date(d+'T00:00').getDay()]} <b>${+d.slice(8)}</b></button>`).join('')}</div>
      <div class="tgrow tgall"><span>весь день</span>${ds.map(d=>{const a2=(by[d]||[]).filter(t=>!t.time||t.start!==d).sort(cmp);return`<div data-dropday="${d}" data-allday="1">${a2.map(t=>`<div class="wki pr${t.priority}" style="${pcs(t)}" draggable="true" data-id="${t.id}" data-act="openId">${t.deadline===d&&t.start!==d?ic('flag'):''}${esc(t.title||'Без названия')}</div>`).join('')}<button class="addline" data-act="addIn" data-start="${d}" aria-label="Добавить на день">${ic('plus')}</button></div>`}).join('')}</div>
      <div class="tgbody" id="tgbody"><div class="tgrow" style="height:${24*HH}px"><div class="tgtimes">${[...Array(24)].map((_,x)=>`<span style="top:${x*HH}px">${pad(x)}:00</span>`).join('')}</div>${ds.map(d=>`<div class="tgcol ${d===t0?'today':''}">${[...Array(24)].map((_,x)=>`<div class="tgslot" data-dropday="${d}" data-droptime="${pad(x)}:00" data-act="addIn" data-start="${d}" data-time="${pad(x)}:00" title="Новая задача на ${pad(x)}:00"></div>`).join('')}${col(d)}${d===t0?`<i class="tgnow" style="top:${nowM/60*HH}px"></i>`:''}</div>`).join('')}</div></div></div>`;break}
    setHead(MONN[m-1]+' '+y,'Нажми на день, чтобы увидеть задачи. Задачу можно перетащить на другой день');h=bar+`<div class="cal">`+[...Array(7)].map((_,i)=>`<div class="wd">${WDS[(i+ws)%7]}</div>`).join('');
    for(let i=0;i<42;i++){const d=addDays(gs,i);const a=by[d]||[];if(i>=35&&d.slice(5,7)!==pad(m))break;h+=`<button class="${d.slice(0,7)!==calMonth?'out':''} ${d===t0?'today':''} ${d===calDay?'on':''}" data-act="calDay" data-d="${d}" data-dropday="${d}"><span class="d">${+d.slice(8)}</span><span class="mts">${a.sort(cmp).slice(0,3).map(t=>`<span class="mt pr${t.priority}" style="${pcs(t)}" draggable="true" data-id="${t.id}" data-act="openId">${t.time?`<small>${esc(t.time)}</small> `:''}${esc(t.title||'Без названия')}</span>`).join('')}${a.length>3?`<span class="cnt">ещё ${a.length-3}</span>`:''}</span></button>`}
    h+='</div>'+group(fmtLong(calDay),(by[calDay]||[]).sort(cmp),{always:true,add:`data-start="${calDay}"`});break}
  case 'project':{const p=proj(view.id);if(!p){view={type:'today'};return renderContent()}
    const sub=S.meta.projects.filter(x=>x.parentId===p.id&&!x.archived);const pn=allNotes().filter(n=>n.projectId===p.id);
    setHead(`<span class="dot" style="width:12px;height:12px;border-radius:50%;background:${esc(p.color)}"></span>${p.emoji?esc(p.emoji)+' ':''}${esc(p.title)}${p.fav?' '+ic('star'):''}`,p.parentId&&proj(p.parentId)?'в проекте «'+proj(p.parentId).title+'»':'');const rvDue=dueReview().includes(p);
    h=`${sub.length?`<div class="subp">${sub.map(s=>`<button data-nav="project" data-id="${s.id}"><i style="background:${esc(s.color)}"></i>${esc(s.title)}</button>`).join('')}</div>`:''}${p.desc?`<p class="pdesc">${inl(p.desc)}</p>`:''}${rvDue?`<div class="rvbar">${ic('review')}<span>Пора проверить проект: всё ли актуально, нет ли застрявших задач?</span><button class="btn sm" data-act="reviewed" data-id="${p.id}">Проверено</button></div>`:''}<div class="tabs"><button class="${projTab==='tasks'?'on':''}" data-act="projTab" data-v="tasks">Задачи</button><button class="${projTab==='gantt'?'on':''}" data-act="projTab" data-v="gantt">Гант</button><button class="${projTab==='notes'?'on':''}" data-act="projTab" data-v="notes">Заметки${pn.length?' · '+pn.length:''}</button></div>`;
    if(projTab==='notes'){h+=`<div class="toolbar"><button class="btn sm" data-act="newNote" data-project="${p.id}">${ic('plus')}Заметка</button></div>`+(pn.length?noteCards(pn):emptyHTML('В проекте нет заметок','Сюда удобно складывать планы, тексты, ссылки и файлы по проекту.'));break}
    if(projTab==='gantt'){h+=ganttHTML(tasks.filter(t=>t.projectId===p.id&&open(t)));break}
    const a=tasks.filter(t=>t.projectId===p.id&&(showDone||open(t)));const groups=S.meta.groups.filter(g=>g.projectId===p.id).sort((x,y)=>x.order-y.order);
    h+=`<details class="pmore"><summary aria-label="Действия с проектом" title="Действия с проектом">${ic('more')}</summary><div class="pmenu"><button class="btn ghost sm" data-act="addGroup">${ic('plus')}Раздел</button><button class="btn ghost sm" data-act="addSubProject">${ic('plus')}Подпроект</button><button class="btn ghost sm" data-act="editProject">${ic('edit')}Изменить</button><button class="btn ghost sm" data-act="pFav">${ic('star')}${p.fav?'Из избранного':'В избранное'}</button><button class="btn ghost sm" data-act="focus">${ic('focus')}Фокус</button><button class="btn ghost sm" data-act="csv">CSV</button><button class="btn ghost sm" data-act="toggleDone">${showDone?'Скрыть выполненные':'Показать выполненные'}</button></div></details>`;
    h+=group('Без раздела',a.filter(t=>!t.groupId||!groupOf(t.groupId)),{always:!groups.length,nest:true,ctx:'project',add:`data-project="${p.id}"`});
    for(const g of groups)h+=group(esc(g.title),a.filter(t=>t.groupId===g.id),{always:true,nest:true,ctx:'project',add:`data-project="${p.id}" data-group="${g.id}"`,act:`<button data-act="editGroup" data-id="${g.id}" aria-label="Переименовать раздел">${ic('edit')}</button><button data-act="delGroup" data-id="${g.id}" aria-label="Удалить раздел">${ic('trash')}</button>`});break}
  case 'tag':{const g=tagOf(view.id);if(!g){view={type:'today'};return renderContent()}setHead('#'+esc(g.title),'');const a=tasks.filter(t=>t.tags.includes(g.id)&&(showDone||open(t))).sort(cmp);const nn=allNotes().filter(n=>n.tags.includes(g.id));h=(a.length?listHTML(a):'')+(nn.length?`<section class="group"><div class="ghead"><span class="t">Заметки</span></div>${noteCards(nn)}</section>`:'')+(!a.length&&!nn.length?emptyHTML('С этим тегом пока ничего нет','Тег можно поставить в карточке или написать #'+esc(g.title)+' в строке добавления.'):'')+doneToggle();break}
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
  case 'habits':{setHead('Привычки',fmtLong(t0));const hs=S.meta.habits.filter(x=>!x.archived);h=`<div class="toolbar"><button class="btn sm" data-act="addHabit">${ic('plus')}Новая привычка</button></div>`;if(!hs.length)h+=emptyHTML('Привычек пока нет','Например: «Утреннее чтение Библии» или «Прогулка 30 минут». Отмечай каждый день и следи за серией.');
    for(const x of hs){const goal=x.goal||1;const days=[...Array(7)].map((_,i)=>addDays(t0,i-6));h+=`<div class="habit" style="${x.color?`--accent:${esc(x.color)};--accent-soft:${esc(x.color)}33`:''}"><div class="hn"><span class="em">${esc(x.emoji||'•')}</span><div style="min-width:0"><b>${esc(x.title)}</b>${x.desc?`<small>${esc(x.desc)}</small>`:''}<small>Серия: ${plural(streak(x),'день','дня','дней')}${goal>1?` · цель ${goal} в день`:''} · за 30 дней: ${habitRate(x)}%</small></div><button class="btn ghost sm" data-act="editHabit" data-id="${x.id}" aria-label="Изменить привычку" style="margin-left:auto">${ic('edit')}</button></div><div class="week">${days.map(d=>{const v=x.log?.[d]||0;const cls=v>=goal?'full':v>0?'part':'';return`<button class="${cls} ${d===t0?'td':''}" data-act="habitTap" data-id="${x.id}" data-d="${d}" aria-label="${fmtLong(d)}: ${v} из ${goal}"><i>${v>=goal?ic('check'):v?v:''}</i>${WD[new Date(d+'T00:00').getDay()]}</button>`}).join('')}</div></div>`}
    const ar=S.meta.habits.filter(x=>x.archived);if(ar.length)h+=`<p class="small" style="margin-top:16px">В архиве: ${ar.map(x=>`<button class="tag" data-act="unarchHabit" data-id="${x.id}">${esc(x.title)} · вернуть</button>`).join(' ')}</p>`;break}
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
     <div class="card-s"><h2>Помодоро</h2><p>Работа ${S.meta.settings.pomo.work} мин · короткий перерыв ${S.meta.settings.pomo.short} мин · длинный ${S.meta.settings.pomo.long} мин после каждых ${S.meta.settings.pomo.every} помодоро${S.meta.settings.pomo.auto?' · следующий период стартует сам':''}${S.meta.settings.pomo.sound?' · со звуком':''}</p><button class="btn ghost sm" data-act="editPomo">${ic('edit')}Изменить</button></div>
     <div class="card-s"><h2>Разделы в меню</h2><p>Выключи то, чем не пользуешься.</p><div class="chips">${Object.keys(VIEWS).map(k=>`<button class="${S.meta.settings.hidden.includes(k)?'':'on'}" data-act="toggleView" data-v="${k}">${ic(VIEWS[k][1])}${VIEWS[k][0]}</button>`).join('')}</div></div>
     <div class="card-s"><h2>Горячие клавиши</h2><ul class="list2 keys"><li><kbd>N</kbd><span class="g">новая задача</span></li><li><kbd>/</kbd><span class="g">поиск</span></li><li><kbd>F</kbd><span class="g">режим фокуса</span></li><li><kbd>Ctrl</kbd>+<kbd>Enter</kbd><span class="g">выполнить открытую задачу</span></li><li><kbd>Esc</kbd><span class="g">закрыть карточку или окно</span></li></ul></div>
     <div class="card-s"><h2>Оформление</h2><p>Цветовая тема</p><div class="seg">${[['night','Ночь'],['dark','Тёмная'],['gray','Серая'],['light','Светлая'],['system','Как в системе']].map(([v,l])=>`<button class="${getTheme()===v?'on':''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div><p style="margin-top:14px">Акцентный цвет</p><div class="swatches">${ACCENTS.map(c=>`<button class="${getAccent()===c?'on':''}" data-act="accent" data-v="${c}" style="${c?`background:${c}`:''}" aria-label="${c||'Цвет темы'}" title="${c||'Как в теме'}">${c?'':'А'}</button>`).join('')}</div></div></div>`;break}
  }
  c.innerHTML=`<div class="${view.type==='kanban'?'':'wrap'}">${h}</div>`;
  const tgb=c.querySelector('#tgbody');if(tgb){tgb.scrollTop=tgScroll??Math.max(0,(new Date().getHours()-2))*48;tgb.onscroll=()=>{tgScroll=tgb.scrollTop}}
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
function render(){if(!S.user)return;if(pendingOpen&&S.tasks.has(pendingOpen)){selId=pendingOpen;selNoteId=null;pendingOpen=null;history.replaceState(null,'',location.pathname+location.search)}renderSide();renderTabbar();renderContent();renderDetail();renderSync()}

/* ---------- detail: task / note ---------- */
function projOptions(sel,emptyLabel){return`<option value="">${emptyLabel}</option>`+projTree().map(([p,d])=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${'— '.repeat(d)}${esc(p.title)}</option>`).join('')}
function renderDetail(force){
  const el=$('#detail');const t=selId&&S.tasks.get(selId);const n=!t&&selNoteId&&S.notes.get(selNoteId);document.body.classList.toggle('has-detail',!!(t||n));
  if(!t&&!n){el.hidden=true;el.innerHTML='';el.dataset.id='';return}
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
    autosize($('#n-title'));return}
  const p=proj(t.projectId);const groups=S.meta.groups.filter(g=>g.projectId===t.projectId);const run=S.meta.running;const running=run&&run.taskId===t.id;const parent=t.parentId&&S.tasks.get(t.parentId);const ch=kids(t.id).sort(cmp);
  el.innerHTML=`<div class="dhead"><button class="ic" data-act="closeDetail" aria-label="Закрыть">${ic('back')}</button><span class="small">${p?esc(p.title):'Входящие'}</span><span class="grow"></span><button class="ic" data-act="dFav" aria-label="${t.fav?'Убрать из избранного':'В избранное'}" title="${t.fav?'Убрать из избранного':'В избранное'}" style="${t.fav?'color:var(--mid)':''}">${ic('star')}</button><button class="ic" data-act="dLink" aria-label="Скопировать ссылку" title="Скопировать ссылку">${ic('link')}</button><button class="ic" data-act="dLock" aria-label="Пароль" title="${t.lock?'Задача под паролем':'Поставить пароль'}" style="${t.lock?'color:var(--mid)':''}">${ic('lock')}</button><button class="ic" data-act="dToggle" aria-label="${open(t)?'Выполнить':'Вернуть'}" title="${open(t)?'Выполнить':'Вернуть'}">${ic(open(t)?'done':'repeat')}</button><button class="ic" data-act="dDelete" aria-label="Удалить" title="В корзину">${ic('trash')}</button></div>
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
  autosize($('#d-title'));
}
function autosize(ta){if(!ta)return;ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'}
function newNote(f={}){const n=normNote(Object.assign({id:uid()},f));saveNote(n,{now:true});selNoteId=n.id;selId=null;noteMode='edit';render();renderDetail(true);setTimeout(()=>{const b=$(f.title?'#n-body':'#n-title');b&&b.focus()},50);return n}

/* ---------- modal & toast ---------- */
function modal(html){const m=$('#modal');m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;setTimeout(()=>{const f=m.querySelector('input,select,button.btn');f&&f.focus()},30);return m}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML=''}
function confirmBox(title,text,ok='Да',danger=true){return new Promise(res=>{const m=modal(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="mbtns"><button class="btn ghost" data-r="0">Отмена</button><button class="btn ${danger?'danger':''}" data-r="1">${esc(ok)}</button></div>`);m.onclick=e=>{const b=e.target.closest('[data-r]');if(b||e.target===m){closeModal();m.onclick=null;res(b?.dataset.r==='1')}}})}
function form(title,fields,ok='Сохранить',extra=''){return new Promise(res=>{
  const m=modal(`<h3>${esc(title)}</h3><form id="mform" style="display:flex;flex-direction:column;gap:12px">${fields.map(f=>f.type==='color'?`<div class="field"><span class="flabel">${esc(f.label)}</span><div class="swatches" data-color="${f.id}">${COLORS.map(c=>`<button type="button" style="background:${c}" data-c="${c}" class="${c===f.value?'on':''}" aria-label="Цвет"></button>`).join('')}</div></div>`:f.type==='select'?`<div class="field"><label for="m-${f.id}">${esc(f.label)}</label><select class="inp" id="m-${f.id}">${f.options.map(([v,l])=>`<option value="${esc(v)}" ${v===(f.value||'')?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`:`<div class="field"><label for="m-${f.id}">${esc(f.label)}</label><input class="inp" id="m-${f.id}" type="${f.type||'text'}" value="${esc(f.value??'')}" ${f.min!==undefined?`min="${f.min}"`:''} placeholder="${esc(f.ph||'')}"></div>`).join('')}<div class="mbtns">${extra}<button type="button" class="btn ghost" data-r="cancel">Отмена</button><button class="btn" type="submit">${esc(ok)}</button></div></form>`);
  const colors={};fields.filter(f=>f.type==='color').forEach(f=>colors[f.id]=f.value);const finish=v=>{closeModal();m.onclick=null;res(v)};
  m.onclick=e=>{const sw=e.target.closest('[data-c]');if(sw){const box=sw.parentElement;box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===sw));colors[box.dataset.color]=sw.dataset.c;return}const r=e.target.closest('[data-r]');if(r){finish(r.dataset.r==='cancel'?null:{_action:r.dataset.r});return}if(e.target===m)finish(null)};
  m.querySelector('#mform').onsubmit=e=>{e.preventDefault();const v={};for(const f of fields)v[f.id]=f.type==='color'?colors[f.id]:m.querySelector('#m-'+f.id).value.trim();finish(v)}})}
let toastTimer=null;
function toast(text,undo){const el=$('#toast');el.innerHTML=`<span>${esc(text)}</span>${undo?'<button data-undo>Отменить</button>':''}`;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,undo?6000:3200);if(undo)el.querySelector('[data-undo]').onclick=()=>{el.hidden=true;undo()}}

/* ---------- theme ---------- */
function getTheme(){try{return localStorage.getItem('planner-theme')||'night'}catch(e){return'night'}}
function getAccent(){try{return localStorage.getItem('planner-accent')||''}catch(e){return''}}
const ACCENTS=['','#5b8def','#7c6cf0','#d0619b','#e0644f','#e39b2f','#3fae7a','#2aa7b8'];
function applyTheme(){const v=getTheme(),r=document.documentElement;if(v&&v!=='system')r.setAttribute('data-theme',v);else r.removeAttribute('data-theme');const ac=getAccent();if(ac){r.style.setProperty('--accent',ac);r.style.setProperty('--accent-soft',`color-mix(in srgb,${ac} 22%,var(--surface))`)}else{r.style.removeProperty('--accent');r.style.removeProperty('--accent-soft')}}
function setTheme(v){try{v?localStorage.setItem('planner-theme',v):localStorage.removeItem('planner-theme')}catch(e){}applyTheme()}
applyTheme();

/* ---------- timer ---------- */
function startTimer(id,limit,pomo){if(S.meta.running)stopTimer(true);S.meta.running={taskId:id,start:Date.now(),limit:limit||null,pomo:!!pomo};saveMeta()}
let breakEnd=0,breakTask=null;
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
  if(nav){const k=nav.dataset.nav;closeModal();const qq=$('#q');if(qq)qq.value='';if(k==='_menu'){document.body.classList.toggle('drawer');return}view={type:k,id:nav.dataset.id};searchQ='';showDone=false;selId=selNoteId=null;if(k==='project')projTab='tasks';document.body.classList.remove('drawer');render();$('#content').scrollTop=0;return}
  if(document.body.classList.contains('drawer')&&!e.target.closest('#side')&&!e.target.closest('#menuBtn')){document.body.classList.remove('drawer');return}
  const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
  const row=a.closest('.task[data-id],.card[data-id]');const t=row?S.tasks.get(row.dataset.id):(selId?S.tasks.get(selId):null);const n=selNoteId?S.notes.get(selNoteId):null;
  switch(act){
   case 'toggle':if(row&&t)toggleTask(t);break;
   case 'open':if(row){selId=row.dataset.id;selNoteId=null;render();renderDetail(true)}break;
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
   case 'addIn':{const v=await form(a.dataset.time?`Новая задача · ${fmtDate(a.dataset.start)}, ${a.dataset.time}`:'Новая задача',[{id:'title',label:'Название',ph:'Что нужно сделать?'}],'Добавить');if(!v||!v.title)break;const q=parseQuick(v.title);const nt=newTask({title:q.title,priority:q.priority,tags:q.tags,time:q.time||a.dataset.time||null,remind:q.remind,start:q.start||a.dataset.start||null,projectId:a.dataset.project||q.projectId||(view.type==='project'?view.id:null),groupId:a.dataset.group||null,columnId:a.dataset.col||S.meta.columns[0]?.id});if(view.type==='tag'){nt.tags.push(view.id);saveTask(nt)}break}
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
   case 'calPrev':case 'calNext':{if(calMode!=='month'){calDay=addDays(calDay,(act==='calNext'?1:-1)*(calMode==='week'?7:1));calMonth=calDay.slice(0,7);render();break}const [y,m]=calMonth.split('-').map(Number);calMonth=iso(new Date(y,m-1+(act==='calNext'?1:-1),1)).slice(0,7);render();break}
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
  const q=parseQuick(raw);if(!q.title)return;const f={title:q.title,priority:q.priority,tags:q.tags,start:q.start,time:q.time,remind:q.remind,projectId:q.projectId};if(q.remind!=null)askNotify();
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
const clrDrop=()=>document.querySelectorAll('.drop,.drop-before,.drop-after,.drop-in,.drop-out').forEach(x=>x.classList.remove('drop','drop-before','drop-after','drop-in','drop-out'));
const pZone=(el,e)=>{const r=el.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;return y<.28?'before':y>.72?'after':'in'};
document.addEventListener('dragover',e=>{const isP=[...(e.dataTransfer?.types||[])].includes('application/x-proj');
  const dp=e.target.closest&&e.target.closest('[data-dropproj]');const dr=e.target.closest&&e.target.closest('[data-droproot]');const dv=e.target.closest&&e.target.closest('[data-dropview]');
  if(dp||dr||(dv&&!isP)){e.preventDefault();clrDrop();if(dr)dr.classList.add('drop-in');else if(dv)dv.classList.add('drop-in');else dp.classList.add(isP?'drop-'+pZone(dp,e):'drop-in');return}const dd=e.target.closest&&e.target.closest('[data-dropday]');if(dd){e.preventDefault();document.querySelectorAll('.drop').forEach(x=>x!==dd&&x.classList.remove('drop'));dd.classList.add('drop');return}const col=e.target.closest&&e.target.closest('.col');if(col){e.preventDefault();document.querySelectorAll('.col.drop').forEach(x=>x!==col&&x.classList.remove('drop'));col.classList.add('drop')}});
document.addEventListener('dragend',clrDrop);
/* pointer drag: works with mouse and touch (long press) */
const DSEL='[data-pdrag],.tgev,.wki,.mt,.task[draggable],.card[draggable]';
let PD=null,swallow=false;
document.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest(DSEL))e.preventDefault()},true);
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
  {const sc=e.target.closest&&document.elementFromPoint(e.clientX,e.clientY)?.closest('#content,#tgbody,#side');if(sc){const r=sc.getBoundingClientRect();if(e.clientY<r.top+40)sc.scrollTop-=14;else if(e.clientY>r.bottom-40)sc.scrollTop+=14}}
  e.preventDefault();PD.g.style.transform=`translate(${e.clientX+12}px,${e.clientY+10}px)`;clrDrop();const tg=pdTarget(e.clientX,e.clientY);PD.tg=tg;PD.cy=e.clientY;if(!tg)return;
  if(PD.kind==='proj'){if(tg.matches('[data-droproot]'))tg.classList.add('drop-in');else if(tg.matches('[data-dropproj]'))tg.classList.add('drop-'+pZone(tg,e))}
  else if(tg.matches('.task[data-id]')){const z=rowZone(tg,e);PD_LAST.zone=z;tg.classList.add(z==='in'?'drop-in':z==='out'?'drop-out':'drop-'+z)}
  else if(tg.matches('[data-dg]'))tg.classList.add('drop')
  else if(tg.matches('[data-dropday],.col,[data-dropview],[data-dropproj]'))tg.classList.add(tg.matches('[data-dropday],.col')?'drop':'drop-in')},{passive:false});
document.addEventListener('touchmove',e=>{if(PD&&PD.started)e.preventDefault()},{passive:false});
document.addEventListener('pointercancel',pdEnd);
document.addEventListener('contextmenu',e=>{if(PD&&PD.touch)e.preventDefault()});
document.addEventListener('pointerup',e=>{if(!PD)return;if(!PD.started){pdEnd();return}const tg=pdTarget(e.clientX,e.clientY),{kind,id}=PD;const ev={clientY:e.clientY};pdEnd();swallow=true;setTimeout(()=>swallow=false,50);if(!tg)return;
  if(kind==='proj'){if(tg.matches('[data-droproot]'))moveProject(id,null,'top');else if(tg.matches('[data-dropproj]'))moveProject(id,tg.dataset.dropproj,pZone(tg,ev));return}
  const t=S.tasks.get(id);if(!t)return;const before=clone(t);const undo=()=>{S.tasks.set(t.id,before);saveTask(before)};
  if(tg.matches('.task[data-id]')){dropOnRow(t,tg,e,before,undo);return}
  if(tg.matches('[data-dg]')){t.projectId=tg.dataset.project||t.projectId;t.groupId=tg.dataset.group||null;t.parentId=null;t.order=Date.now();saveTask(t);toast('Перенесено в раздел',undo);return}
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
(()=>{const tb=document.createElement('div');tb.className='tbar';tb.innerHTML=`<label class="search">${ic('search')}<input id="q" placeholder="Поиск" aria-label="Поиск задач и заметок"></label><button data-act="qaFocus" title="Новая задача (N)" aria-label="Новая задача">${ic('plus')}</button><button data-act="tagMenu" title="Теги" aria-label="Теги" class="hashb">#</button><button data-nav="notes" title="Заметки" aria-label="Заметки" class="opt">${ic('note')}</button><button data-nav="kanban" title="Канбан" aria-label="Канбан" class="opt">${ic('cols')}</button><button data-nav="time" title="Помодоро и время" aria-label="Помодоро и время" class="opt">${ic('timer')}</button><button data-nav="review" title="Проверка проектов" aria-label="Проверка проектов" class="opt">${ic('review')}</button><button data-act="focus" title="Фокус (F)" aria-label="Фокус" class="opt">${ic('focus')}</button><button data-act="sideToggle" title="Свернуть или развернуть левую панель" aria-label="Левая панель" class="opt">${ic('left')}</button>`;$('#sync').before(tb);
  try{const w=+localStorage.getItem('planner-sw');if(w)document.documentElement.style.setProperty('--sw',w+'px');if(localStorage.getItem('planner-sidecollapsed'))document.body.classList.add('sidecollapsed')}catch(e){}
  const g=document.createElement('div');g.id='sideGrip';g.title='Потяни, чтобы изменить ширину. Двойной клик — исходная';$('#app').appendChild(g);
  let st=null;g.addEventListener('pointerdown',e=>{st={x:e.clientX,w:$('#side').getBoundingClientRect().width};g.setPointerCapture(e.pointerId);document.body.classList.add('resizing')});
  g.addEventListener('pointermove',e=>{if(!st)return;const w=Math.max(180,Math.min(460,st.w+e.clientX-st.x));document.documentElement.style.setProperty('--sw',w+'px')});
  g.addEventListener('pointerup',()=>{if(!st)return;st=null;document.body.classList.remove('resizing');try{localStorage.setItem('planner-sw',parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sw'))||250)}catch(e){}});
  g.addEventListener('dblclick',()=>{document.documentElement.style.removeProperty('--sw');try{localStorage.removeItem('planner-sw')}catch(e){}})})();$('#menuBtn').addEventListener('click',()=>document.body.classList.toggle('drawer'));
window.addEventListener('online',()=>{syncNote='';renderSync()});
setTimeout(()=>{if(!auth.currentUser)$('#login').hidden=false},1200);
