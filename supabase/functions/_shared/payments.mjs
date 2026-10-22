import {db,store,order,commit,retry,razor} from './runtime.mjs';
import {assertCapturedPayment} from './provider-contracts.mjs';
import {event,required,uuid} from './engine.mjs';
export async function capture(id,payment){
 return retry(async()=>{const s=await store(),r=await order(id),o=r.payload;
 assertCapturedPayment(payment,{orderId:o.paymentOrderId,amountPaise:o.pricingSnapshot.total,currency:'INR',paymentId:payment.id});
 if(o.paymentId===payment.id&&o.paidPaise)return o;
 required(!o.paymentId,'Another payment is already recorded; reconcile with provider.');
 o.paymentId=payment.id;o.paidPaise=payment.amount;o.paymentState='captured';o.paymentConfirmedAt=new Date().toISOString();
 if(o.status==='Awaiting payment')o.status=o.physical?'Preparing':'Delivered';else if(o.status==='Cancelled')o.refund='Captured after cancellation — admin refund review required';
 await commit(s,r,[event(o,'System','Payment verified: '+o.status)]);return o;
 });
}
export async function reconcile(id){const r=await order(id),o=r.payload;if(!o.paymentOrderId)return o;const result=await razor('orders/'+o.paymentOrderId+'/payments');const p=result.items?.find(x=>x.status==='captured');if(p)return capture(id,p);return o;}
export async function refundEvidence(refund){
 const rows=await db('rm_orders?payload->>paymentId=eq.'+encodeURIComponent(refund.payment_id));
 if(!rows.length)return;
 await retry(async()=>{const s=await store(),r=await order(rows[0].id),o=r.payload;
 const f=o.refunds?.find(x=>x.providerId===refund.id||x.id===refund.notes?.requestId);
 if(!f)return;
 required(f.amountPaise===refund.amount&&refund.payment_id===o.paymentId,'Refund amount or payment mismatch.');
 if(f.state==='processed'||f.state==='failed')return;
 f.providerId=refund.id;
 if(refund.status==='processed'){f.state='processed';o.refundedPaise+=f.amountPaise;o.pendingRefundPaise-=f.amountPaise;o.refund='Refund processed';}
 else if(refund.status==='failed'){f.state='failed';o.pendingRefundPaise-=f.amountPaise;o.refund='Refund failed — admin review';}
 else {f.state='pending';o.refund='Refund processing';}
 await commit(s,r,[event(o,'System',o.refund)]);
 });
}
export async function submitRefund(id,user,input){
 const amount=Number(input.amountPaise);required(Number.isSafeInteger(amount)&&amount>0&&typeof input.reason==='string'&&input.reason.trim().length>=3,'Enter refund amount and reason.');
 required(uuid(input.requestId),'A refund request ID is required.');let intent,already=false;
 await retry(async()=>{const s=await store(),r=await order(id),o=r.payload;
 const previous=o.refunds?.find(f=>f.id===input.requestId);if(previous){intent=previous;already=true;return;}
 required(o.paidPaise>0&&o.paymentId,'No captured payment to refund.');
 required(amount<=o.paidPaise-o.refundedPaise-o.pendingRefundPaise,'Refund exceeds available captured amount.');
 required(!o.refunds?.some(f=>f.state==='submitting'||f.state==='review'),'Reconcile the uncertain refund before another request.');
 intent={id:input.requestId,amountPaise:amount,reason:input.reason.slice(0,300),state:'submitting',at:new Date().toISOString()};
 o.refunds??=[];o.refunds.push(intent);o.pendingRefundPaise+=amount;o.refund='Refund submission pending';
 await commit(s,r,[event(o,'Admin','Refund requested: ₹'+amount/100)]);
 });
 if(already)return intent;
 const current=(await order(id)).payload;
 try{const f=await razor('payments/'+current.paymentId+'/refund',{method:'POST',body:{amount,notes:{requestId:intent.id,orderId:id},receipt:intent.id}});await refundEvidence(f);return f;}
 catch(e){await retry(async()=>{const s=await store(),r=await order(id),f=r.payload.refunds.find(x=>x.id===intent.id);if(f.state==='submitting'){f.state='review';r.payload.refund='Refund outcome uncertain — reconcile before retry';await commit(s,r,[event(r.payload,'System',r.payload.refund)]);}});throw Error('Refund outcome requires reconciliation. Do not submit again.');}
}
export async function reconcileRefunds(id){const o=(await order(id)).payload;required(o.paymentId,'No payment recorded.');const result=await razor('payments/'+o.paymentId+'/refunds?count=100');for(const f of result.items||[])await refundEvidence(f);return (await order(id)).payload;}
