import {db,user,cors,json} from '../_shared/runtime.mjs';
const out=(body,status=200,h={})=>json(body,status,h);
Deno.serve(async req=>{
 let headers={};try{
 headers=cors(req);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return out({error:'POST required'},405,headers);
 const u=await user(req);
 if(u.role!=='admin')return out({error:'Admin permission required'},403,headers);
 const body=await req.json();
 if(body.action==='key')return out({publicKey:Deno.env.get('PUSH_VAPID_PUBLIC_KEY')||''},200,headers);
 if(body.action==='subscribe'){
  const s=body.subscription;
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048||!/^https:\/\//.test(s.endpoint)||!s.keys||!/^[-_A-Za-z0-9]+$/.test(s.keys.p256dh||'')||!/^[-_A-Za-z0-9]+$/.test(s.keys.auth||''))throw Error('Invalid push subscription');
  const match=await db('rm_push_subscriptions?endpoint=eq.'+encodeURIComponent(s.endpoint));
  if(match.length&&match[0].admin_id!==u.id)return out({error:'Subscription belongs to another account'},409,headers);
  if(match.length)await db('rm_push_subscriptions?endpoint=eq.'+encodeURIComponent(s.endpoint),{method:'PATCH',body:{subscription:s,updated_at:new Date().toISOString()}});
  else await db('rm_push_subscriptions',{method:'POST',body:{admin_id:u.id,endpoint:s.endpoint,subscription:s}});
  return out({ok:true},200,headers);
 }
 if(body.action==='unsubscribe'){
  const endpoint=body.endpoint;
  if(typeof endpoint!=='string')throw Error('Invalid subscription');
  await db('rm_push_subscriptions?admin_id=eq.'+u.id+'&endpoint=eq.'+encodeURIComponent(endpoint),{method:'DELETE'});
  return out({ok:true},200,headers);
 }
 return out({error:'Unknown action'},400,headers);
 }catch(e){return out({error:e.message||'Push setup failed'},400,headers);}
});