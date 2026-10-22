import {settings,db,rpc,user,store,order,commit,throttle,razor,cors,json,retry} from '../_shared/runtime.mjs';
import {required,uuid,getQuote,newOrder,publicOrder,canRead,event,code,handover,exception,validateStore,downloadPath,publicStore} from '../_shared/engine.mjs';
import {verifyCheckoutSignature} from '../_shared/provider-contracts.mjs';
import {capture,reconcile,submitRefund,reconcileRefunds} from '../_shared/payments.mjs';
const admin=u=>required(u.role==='admin','Admin permission required.');
async function route(req,input){
 const action=input.action,s=await store();required(s,'Run the connected-store setup SQL first.');
 if(action==='catalog')return {state:publicStore(s.state),version:s.version};
 const u=await user(req);await throttle('api:'+u.id,120,60);
 if(action==='bootstrap'){
  const filter=u.role==='admin'?'':u.role==='rider'?'&payload->>riderId=eq.'+u.id:'&customer_id=eq.'+u.id;
  const rows=await db('rm_orders?select=*&order=created_at.desc&limit=500'+filter);
  if(rows.length&&u.role!=='rider'){const mail=await db('rm_outbox?select=id,state,provider_id&order_id=in.('+rows.map(r=>r.id).join(',')+')&limit=5000');for(const row of rows)for(const n of row.payload.notifications||[]){const m=mail.find(x=>x.id===n.id);if(m)n.state=m.state==='sent'?'Accepted by email provider':m.state;}}
  const staff=u.role==='admin'?await db('rm_roles?enabled=eq.true'):[];
  return {state:publicStore(s.state,u.role==='admin'),version:s.version,user:u,orders:rows.map(r=>publicOrder(r.payload,u)),staff};
 }
 if(action==='saveStore'){admin(u);required(input.version===s.version,'Catalog changed in another session. Refresh before editing again.');const state=validateStore(input.state);await commit(s,null,[],state);return {ok:true};}
 if(action==='quote'){await throttle('quote:'+u.id,30,60);const q=getQuote(s.state,input.cart,input.address).q;for(const l of q.lines)delete l.assetPath;return q;}
 if(action==='checkout'){
  await throttle('checkout:'+u.id,5,600);required(uuid(input.requestKey),'Invalid checkout request.');
  const existing=await db('rm_orders?customer_id=eq.'+u.id+'&request_key=eq.'+input.requestKey);
  let o;if(existing.length)o=existing[0].payload;
  else {await retry(async()=>{const current=await store();o=newOrder(current.state,input,u);await commit(current,{payload:o,version:null},[event(o,'System','Order reserved — payment pending')]);});}
  // Exactly one call creates the provider order. An ambiguous result is held for review.
  // Never create a second provider order after an uncertain network response.
  if(!o.paymentOrderId){
   let claimed=false;
   await retry(async()=>{const current=await store(),r=await order(o.id);if(!r.payload.checkoutClaim){r.payload.checkoutClaim=crypto.randomUUID();claimed=true;await commit(current,r);}else claimed=false;});
   if(claimed){try{const p=await razor('orders',{method:'POST',body:{amount:o.pricingSnapshot.total,currency:'INR',receipt:o.id,notes:{storeOrderId:o.id}}});
    await retry(async()=>{const current=await store(),r=await order(o.id);r.payload.paymentOrderId=p.id;r.payload.paymentState='pending';await commit(current,r);});
   }catch{throw Error('Payment setup is uncertain. Your order is saved; ask admin to reconcile it before retrying payment.');}}
  }
  o=(await order(o.id)).payload;required(o.paymentOrderId,'Payment setup needs admin reconciliation.');required(o.status==='Awaiting payment','This order is no longer awaiting payment.');
  return {order:publicOrder(o,u),keyId:settings().rzpId,providerOrderId:o.paymentOrderId,amount:o.pricingSnapshot.total};
 }
 if(action==='assignRole'){admin(u);required(uuid(input.userId)&&['rider','customer'].includes(input.role)&&typeof input.name==='string'&&input.name.length<=80,'Use a registered user ID and name.');required(input.userId!==u.id,'Do not change your own role here.');const old=await db('rm_roles?user_id=eq.'+input.userId);required(old[0]?.role!=='admin','Manage admin access through the protected SQL setup.');if(old.length)await db('rm_roles?user_id=eq.'+input.userId,{method:'PATCH',body:{role:'rider',enabled:input.role==='rider',display_name:input.name}});else if(input.role==='rider')await db('rm_roles',{method:'POST',body:{user_id:input.userId,role:'rider',enabled:true,display_name:input.name}});return {ok:true};}
 const row=await order(input.id),o=row.payload;required(canRead(o,u),'Order not found or access denied.');
 if(action==='download'){await throttle('download:'+u.id,10,60);const path=downloadPath(o,u,input.lineId),cfg=settings();const response=await fetch(cfg.url+'/storage/v1/object/sign/ebooks/'+path,{method:'POST',headers:{apikey:cfg.service,Authorization:'Bearer '+cfg.service,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:60})});const result=await response.json();required(response.ok&&result.signedURL,'Download unavailable. Ask store support.');return {url:cfg.url+'/storage/v1'+result.signedURL};}
 if(action==='resumePayment'){required(o.customerId===u.id&&o.status==='Awaiting payment'&&o.paymentOrderId,'This order cannot resume payment.');return {order:publicOrder(o,u),keyId:settings().rzpId,providerOrderId:o.paymentOrderId,amount:o.pricingSnapshot.total};}
 if(action==='verifyPayment'){required(o.customerId===u.id||u.role==='admin','Not your payment.');required(await verifyCheckoutSignature(input.result,o.paymentOrderId,settings().rzpSecret),'Invalid checkout signature.');const p=await razor('payments/'+input.result.razorpay_payment_id);return publicOrder(await capture(o.id,p),u);}
 if(action==='reconcilePayment'){required(u.role==='admin'||o.customerId===u.id,'Permission denied.');await throttle('reconcile:'+u.id,10,60);return publicOrder(await reconcile(o.id),u);}
 if(action==='linkPaymentOrder'){admin(u);required(!o.paymentOrderId&&/^order_[A-Za-z0-9]+$/.test(input.providerId),'Invalid provider order or already linked.');const p=await razor('orders/'+input.providerId);required(p.receipt===o.id&&p.amount===o.pricingSnapshot.total&&p.currency==='INR','Provider receipt, amount or currency does not match.');await retry(async()=>{const cs=await store(),r=await order(o.id);required(!r.payload.paymentOrderId,'Already linked.');r.payload.paymentOrderId=p.id;await commit(cs,r);});return {ok:true};}
 if(action==='refund'){admin(u);return submitRefund(o.id,u,input);}
 if(action==='reconcileRefunds'){admin(u);return publicOrder(await reconcileRefunds(o.id),u);}
 return retry(async()=>{
 const cs=await store(),r=await order(o.id),v=r.payload;required(canRead(v,u),'Access denied.');let message='',ok=true;
 if(action==='assign'){admin(u);const staff=await db('rm_roles?user_id=eq.'+encodeURIComponent(input.riderId)+'&role=eq.rider&enabled=eq.true');required(staff.length===1,'Choose an enabled rider account.');required(!['Delivered','Cancelled'].includes(v.status),'Order already closed.');v.riderId=input.riderId;v.driver=staff[0].display_name;message='Delivery person assigned';}
 else if(action==='status'){
  admin(u);const transitions={'Preparing':['Ready for pickup'],'Ready for pickup':['Out for delivery'],'Failed delivery':['Out for delivery']};required(transitions[v.status]?.includes(input.status),'Invalid transition. Delivery completion requires a code or reviewed exception.');
  if(input.status==='Out for delivery'){required(v.riderId,'Assign a rider first.');v.dispatchedAt=new Date().toISOString();v.handoverCode=code();v.handoverAttempts=0;v.handoverExpiresAt=new Date(Date.now()+86400000).toISOString();}
  v.status=input.status;message='Order '+v.status;
 }
 else if(action==='handover'){ok=handover(v,u,input);message=ok?'Order delivered to '+v.receiver:'Incorrect delivery code attempt';}
 else if(action==='handoverException'){exception(v,u,input);message='Order delivered — admin-confirmed exception';}
 else if(action==='reissueCode'){admin(u);required(v.status==='Out for delivery'&&input.customerConfirmed===true,'Contact and confirm the customer before reissuing.');v.handoverCode=code();v.handoverAttempts=0;v.handoverExpiresAt=new Date(Date.now()+86400000).toISOString();message='Delivery code reissued after admin review';}
 else if(action==='failure'){required(u.role==='admin'||v.riderId===u.id,'Only assigned delivery staff can report failure.');required(v.status==='Out for delivery'&&typeof input.reason==='string'&&input.reason.length>=3,'A dispatched order and reason are required.');v.status='Failed delivery';message='Delivery needs review: '+input.reason.slice(0,300);}
 else if(action==='cancel'){
  required(u.role==='admin'||v.customerId===u.id,'Only customer or admin may cancel.');required(!['Delivered','Cancelled'].includes(v.status),'Order cannot be cancelled.');required(typeof input.reason==='string'&&input.reason.length>=3,'Enter a cancellation reason.');
  // Stock is held until admin inspection/reconciliation, never restored blindly.
  v.status='Cancelled';delete v.handoverCode;v.cancellation={reason:input.reason.slice(0,300),chargePaise:0,refundPaise:v.paidPaise-v.refundedPaise-v.pendingRefundPaise};v.refund=v.paidPaise?'Cancellation refund requires admin submission':'No captured payment recorded';message='Order cancelled without deduction: '+input.reason.slice(0,150);
 }
 else if(action==='restock'){admin(u);required(['Cancelled','Failed delivery'].includes(v.status)&&!v.restocked&&input.inspected===true,'Inspect returned goods first; only one restoration is allowed.');required(v.paymentState!=='creating'&&v.status!=='Awaiting payment','Resolve payment setup first.');for(const l of v.lineItems){const p=cs.state.products.find(p=>p.id===l.productId),variant=p?.variants.find(x=>x.id===l.variantId);required(variant,'Original variant is missing. Restore manually with an audit note.');variant.stock+=l.quantity;globalThis.InventoryRules.sync(p);}v.restocked=true;message='Returned goods inspected and stock restored';}
 else if(action==='resend'){required(u.role==='admin'||v.customerId===u.id,'Permission denied.');await throttle('resend:'+u.id,1,60);message='Requested order update: '+v.status;}
 else throw Error('Unknown action.');
 const mail=action==='handover'&&!ok?[]:[event(v,u.role,message)];await commit(cs,r,mail);return {ok,order:publicOrder(v,u),message};
 });
}
Deno.serve(async req=>{let headers={};try{headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});required(req.method==='POST','Use POST.');required(Number(req.headers.get('content-length')||0)<=2500000,'Request too large.');const raw=await req.text();required(raw.length<=2500000,'Request too large.');const result=await route(req,JSON.parse(raw));return json(result,200,headers);}catch(e){const msg=String(e.message);const safe=msg.includes('relation')||msg.includes('permission denied')?'Database setup or permissions are incomplete. Admin: run the setup diagnostics; do not disable RLS.':msg;return json({error:safe},400,headers);}});
