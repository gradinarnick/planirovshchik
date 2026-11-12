// Сервис-воркер: установка сайта как приложения и работа без интернета
const C='plan-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();const id=e.notification.data&&e.notification.data.taskId;e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{const w=ws.find(x=>x.url.startsWith(self.registration.scope));if(w){w.focus();if(id)w.postMessage({openTask:id});return}return clients.openWindow(self.registration.scope+(id?'#t='+id:''))}))});
