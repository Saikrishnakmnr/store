/* Optional admin-only Web Push; no order/payment mutation. */
(()=>{'use strict';let activeClient=null,config=null,currentUser=null,working=false;
const btn=document.createElement('button');btn.id='rm-admin-push';btn.type='button';btn.textContent='Enable order alerts';btn.hidden=true;btn.title='Receive verified paid-order alerts on this device';
const host=document.getElementById('live-admin');host?.insertAdjacentElement('afterend',btn);
function bytes(base64){const s=atob(base64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64.length%4)%4));return Uint8Array.from(s,c=>c.charCodeAt(0));}
async function call(action,fields={}){const {data:{session}}=await activeClient.auth.getSession();if(!session)throw Error('Sign in as admin first.');const r=await fetch(config.supabaseUrl+'/functions/v1/admin-push',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action,...fields})});const data=await r.json();if(!r.ok)throw Error(data.error||'Notification setup failed');return data;}
function message(t){const el=document.getElementById('live-message');if(el){el.hidden=false;el.textContent=t;}}
window.RMAdminPush={update(user,client,cfg){currentUser=user;activeClient=client;config=cfg;btn.hidden=user?.role!=='admin';if(btn.hidden)return;btn.textContent=(typeof Notification!=='undefined'&&Notification.permission==='granted')?'Manage order alerts':'Enable order alerts';}};
btn.addEventListener('click',async()=>{if(working||currentUser?.role!=='admin')return;working=true;btn.disabled=true;try{
 if(!isSecureContext||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Background push unavailable in this browser. Use HTTPS.');
 const {publicKey}=await call('key');if(!publicKey)throw Error('Push public key is not configured in Supabase.');
 const allowed=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(allowed!=='granted')throw Error('Notifications were not allowed.');
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
 await call('subscribe',{subscription:sub.toJSON()});
 message('Order notifications enabled on this device.');btn.textContent='Order alerts enabled';
 }catch(e){message(e.message||'Unable to enable notifications');}finally{working=false;btn.disabled=false;}});
})();