import {settings,db,json,razor} from '../_shared/runtime.mjs';
import {verifyWebhookSignature} from '../_shared/provider-contracts.mjs';
import {capture,refundEvidence} from '../_shared/payments.mjs';
const EVENTS=new Set(['payment.authorized','payment.failed','payment.captured','order.paid','refund.created','refund.processed','refund.failed']);
async function linkedOrder(providerOrderId){
 if(!/^order_[A-Za-z0-9]+$/.test(providerOrderId||''))throw Error('Invalid provider order');
 const rows=await db('rm_orders?payload->>paymentOrderId=eq.'+encodeURIComponent(providerOrderId));
 if(rows.length!==1)throw Error('Order not yet linked; provider should retry');
 return rows[0].id;
}
Deno.serve(async req=>{try{
 if(req.method!=='POST')return json({error:'POST required'},405);
 const raw=await req.text();if(raw.length>1000000)return json({error:'Too large'},413);
 if(!await verifyWebhookSignature(raw,req.headers.get('x-razorpay-signature'),settings().webhook))return json({error:'Invalid signature'},401);
 const data=JSON.parse(raw);
 if(!EVENTS.has(data.event))return json({received:true,ignored:true});
 if(data.event==='payment.captured'){
  const p=data.payload?.payment?.entity;
  if(!/^pay_[A-Za-z0-9]+$/.test(p?.id||''))throw Error('Invalid payment');
  const verified=await razor('payments/'+p.id);
  await capture(await linkedOrder(verified.order_id),verified);
 }else if(data.event==='order.paid'){
  const providerOrderId=data.payload?.order?.entity?.id;
  const id=await linkedOrder(providerOrderId);
  const payments=await razor('orders/'+providerOrderId+'/payments');
  const p=payments.items?.find(x=>x.order_id===providerOrderId&&x.status==='captured'&&x.captured===true);
  if(!p)throw Error('Captured payment not yet visible; retry required');
  await capture(id,await razor('payments/'+p.id));
 }else if(data.event==='payment.authorized'||data.event==='payment.failed'){
  // Advisory only. A failed attempt is not proof the order is unpaid; another
  // attempt may succeed. Never cancel, release stock or fulfil from this event.
  const p=data.payload?.payment?.entity;
  if(!/^pay_[A-Za-z0-9]+$/.test(p?.id||''))throw Error('Invalid payment');
  const verified=await razor('payments/'+p.id);
  if(!verified.order_id)throw Error('Payment lacks gateway order');
  await linkedOrder(verified.order_id);
  // Storefront retry/refresh uses resumePayment/reconcilePayment already.
 }else{
  const r=data.payload?.refund?.entity;
  if(!/^rfnd_[A-Za-z0-9]+$/.test(r?.id||''))throw Error('Invalid refund');
  await refundEvidence(await razor('refunds/'+r.id));
 }
 return json({received:true});
 }catch{return json({error:'Webhook processing pending; retry required'},503);}});
