import {settings,db,json,razor} from '../_shared/runtime.mjs';
import {verifyWebhookSignature} from '../_shared/provider-contracts.mjs';
import {capture,refundEvidence} from '../_shared/payments.mjs';
Deno.serve(async req=>{try{if(req.method!=='POST')return json({error:'POST required'},405);const raw=await req.text();if(raw.length>1000000)return json({error:'Too large'},413);if(!await verifyWebhookSignature(raw,req.headers.get('x-razorpay-signature'),settings().webhook))return json({error:'Invalid signature'},401);const data=JSON.parse(raw);
 if(data.event==='payment.captured'){const p=data.payload?.payment?.entity;if(!p?.order_id)throw Error('Missing payment order');const rows=await db('rm_orders?payload->>paymentOrderId=eq.'+encodeURIComponent(p.order_id));if(!rows.length)return json({error:'Order not yet linked; retry'},503);const verified=await razor('payments/'+p.id);await capture(rows[0].id,verified);}
 if(['refund.processed','refund.failed','refund.created'].includes(data.event)){const r=data.payload?.refund?.entity;if(r?.id){const verified=await razor('refunds/'+r.id);await refundEvidence(verified);}}
 return json({received:true});
 }catch{return json({error:'Webhook processing pending; retry required'},503);}});
