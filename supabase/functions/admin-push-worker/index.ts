import webpush from 'npm:web-push@3.6.7';
import {db,json} from '../_shared/runtime.mjs';
const secret=()=>Deno.env.get('PUSH_WORKER_SECRET')||'';
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'POST required'},405);
 if(!secret()||req.headers.get('authorization')!=='Bearer '+secret())return json({error:'Unauthorized'},401);
 const pub=Deno.env.get('PUSH_VAPID_PUBLIC_KEY'),priv=Deno.env.get('PUSH_VAPID_PRIVATE_KEY'),contact=Deno.env.get('PUSH_VAPID_SUBJECT');
 if(!pub||!priv||!contact)return json({error:'VAPID not configured'},503);
 webpush.setVapidDetails(contact,pub,priv);
 const jobs=await db('rm_admin_alerts?select=*&status=in.(queued,retry)&next_attempt_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=created_at.asc&limit=20');
 let sent=0,failed=0;
 for(const job of jobs){
  const match=await db('rm_admin_alerts?id=eq.'+job.id+'&status=in.(queued,retry)',{method:'PATCH',body:{status:'sending',attempts:job.attempts+1,updated_at:new Date().toISOString()}});
  if(!match.length)continue;
  try{
   const o=(await db('rm_orders?id=eq.'+job.order_id))[0];
   if(!o||!o.payload?.paymentId||o.payload?.paymentState!=='captured')throw Error('Captured payment not confirmed');
   const subs=await db('rm_push_subscriptions?admin_id=eq.'+job.admin_id);
   if(!subs.length)throw Error('No admin device subscribed');
   let accepted=0;
   for(const s of subs){try{
    await webpush.sendNotification(s.subscription,JSON.stringify({title:'RacharlaMart · New paid order',body:'A paid order needs preparation',orderId:job.order_id,url:'/connected.html'}),{TTL:3600,urgency:'high'});
    accepted++;
   }catch(err){if([404,410].includes(err.statusCode))await db('rm_push_subscriptions?id=eq.'+s.id,{method:'DELETE'});}}
   if(!accepted)throw Error('No push endpoint accepted message');
   await db('rm_admin_alerts?id=eq.'+job.id,{method:'PATCH',body:{status:'sent',updated_at:new Date().toISOString()}});sent++;
  }catch{
   const attempts=job.attempts+1;
   await db('rm_admin_alerts?id=eq.'+job.id,{method:'PATCH',body:{status:attempts>=8?'failed':'retry',next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(attempts,5))).toISOString(),updated_at:new Date().toISOString()}});failed++;
  }
 }
 return json({processed:jobs.length,sent,failed});
});