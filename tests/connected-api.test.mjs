// Executes the actual Edge handler with a deterministic in-memory database/provider mock.
// This is NOT a PostgreSQL, RLS, browser or live-provider test.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const uid=crypto.randomUUID(),other=crypto.randomUUID(),adminId=crypto.randomUUID();
const users={buyer:{id:uid,email:'buyer@example.com',email_confirmed_at:new Date().toISOString()},other:{id:other,email:'other@example.com',email_confirmed_at:new Date().toISOString()},admin:{id:adminId,email:'admin@example.com',email_confirmed_at:new Date().toISOString()}};
let s={id:true,version:0,state:{storeMode:'open',branding:{name:'Test store'},categories:[{name:'Ebooks',enabled:true}],products:[{id:1,name:'Test ebook',cat:'Ebooks',kind:'ebook',ebookPath:'test/book.pdf',variants:[{id:'pdf',label:'PDF',price:100,stock:3,enabled:true}]}],billOffer:{enabled:true,name:'Launch',percent:5},policy:{},radius:5,freeKm:1,rate:10,free:true,deliveryEnabled:true,allowedPincodes:[]}},saved=[],mails=[],paymentPosts=0,refundPosts=0,handler;
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-server-secret',STORE_ORIGIN:'https://store.example.com',RAZORPAY_KEY_ID:'test-key-id',RAZORPAY_KEY_SECRET:'test-key-secret'};
globalThis.Deno={env:{get:k=>env[k]},serve:h=>{handler=h;}};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url),body=options.body?JSON.parse(options.body):null;
 if(u.pathname==='/auth/v1/user'){const token=options.headers.Authorization.replace('Bearer ','');return users[token]?response(users[token]):response({},401);}
 if(u.host==='api.razorpay.com'&&u.pathname==='/v1/orders'&&options.method==='POST'){paymentPosts++;return response({id:'order_123',amount:9500,currency:'INR'});}
 if(u.host==='api.razorpay.com'&&u.pathname==='/v1/payments/pay_123')return response({id:'pay_123',order_id:'order_123',amount:9500,currency:'INR',status:'captured',captured:true});
 if(u.host==='api.razorpay.com'&&u.pathname==='/v1/payments/pay_123/refund'){refundPosts++;return response({id:'rfnd_test',payment_id:'pay_123',amount:body.amount,notes:body.notes,status:'processed'});}
 if(u.pathname.includes('/storage/v1/object/sign/'))return response({signedURL:'/object/sign/ebooks/test/book.pdf?token=test'});
 const path=u.pathname.replace('/rest/v1/','');
 if(path==='rm_store')return response([structuredClone(s)]);
 if(path==='rm_roles')return response(u.searchParams.get('user_id')==='eq.'+adminId?[{user_id:adminId,role:'admin',display_name:'Admin',enabled:true}]:[]);
 if(path==='rm_orders'){let list=saved;if(u.searchParams.has('id'))list=list.filter(r=>r.id===u.searchParams.get('id').slice(3));if(u.searchParams.has('customer_id'))list=list.filter(r=>r.customer_id===u.searchParams.get('customer_id').slice(3));if(u.searchParams.has('request_key'))list=list.filter(r=>r.request_key===u.searchParams.get('request_key').slice(3));return response(structuredClone(list));}
 if(path==='rm_outbox')return response(mails);
 if(path==='rpc/rm_throttle')return response(true);
 if(path==='rpc/rm_commit'){
  if(s.version!==body.p_version)return response({message:'VERSION_CONFLICT'},409);
  const o=body.p_order;if(o){let row=saved.find(r=>r.id===o.id);if(row){assert.equal(row.version,body.p_order_version);row.payload=structuredClone(o);row.version++;}else saved.push({id:o.id,customer_id:o.customerId,request_key:o.requestKey,version:0,payload:structuredClone(o)});}
  s.state=structuredClone(body.p_state);s.version++;mails.push(...body.p_mail);return response({version:s.version});
 }
 throw Error('Unexpected mock fetch: '+url);
};
await import('../supabase/functions/store-api/index.ts');
async function call(action,body={},token='buyer',origin='https://store.example.com'){const r=await handler(new Request('https://example.supabase.co/functions/v1/store-api',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...body})}));return {status:r.status,data:await r.json()};}
assert.equal((await call('bootstrap',{},'bad')).status,400);assert.equal((await call('catalog',{},'buyer','https://attacker.example')).status,400);
const publicCatalog=await call('catalog');assert.equal(publicCatalog.data.state.products[0].ebookPath,undefined);
const quoted=await call('quote',{cart:{'1:pdf':1},address:null});assert.equal(quoted.data.total,9500);assert.equal(quoted.data.lines[0].assetPath,undefined);
const requestKey=crypto.randomUUID();const first=await call('checkout',{requestKey,cart:{'1:pdf':1},address:null,expectedTotal:9500});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(paymentPosts,1);assert.equal(saved.length,1);assert.equal(s.state.products[0].variants[0].stock,2);assert.equal(first.data.order.status,'Awaiting payment');
const again=await call('checkout',{requestKey,cart:{'1:pdf':1},address:null,expectedTotal:9500});assert.equal(again.status,200);assert.equal(paymentPosts,1);assert.equal(saved.length,1);assert.equal(s.state.products[0].variants[0].stock,2);
const id=saved[0].id;assert.equal((await call('resumePayment',{id},'other')).status,400);assert.equal((await call('download',{id,lineId:'1:pdf'})).status,400);assert.equal((await call('saveStore',{state:s.state,version:s.version})).status,400);
assert.equal((await call('verifyPayment',{id,result:{razorpay_order_id:'order_123',razorpay_payment_id:'pay_123',razorpay_signature:'0'.repeat(64)}})).status,400);
const validResult={razorpay_order_id:'order_123',razorpay_payment_id:'pay_123',razorpay_signature:createHmac('sha256',env.RAZORPAY_KEY_SECRET).update('order_123|pay_123').digest('hex')};assert.equal((await call('verifyPayment',{id,result:validResult})).status,200);const mailCount=mails.length;assert.equal((await call('verifyPayment',{id,result:validResult})).status,200);assert.equal(mails.length,mailCount,'Repeated capture must not emit duplicate confirmation');assert.equal(saved[0].payload.status,'Delivered');assert.equal((await call('download',{id,lineId:'1:pdf'})).status,200);assert.equal((await call('download',{id,lineId:'1:pdf'},'other')).status,400);
saved[0].payload.pendingRefundPaise=100;assert.equal((await call('download',{id,lineId:'1:pdf'})).status,400);
const history=await call('bootstrap');assert.equal(history.data.orders.length,1);assert.equal(history.data.orders[0].lineItems[0].assetPath,undefined);assert.equal((await call('bootstrap',{},'other')).data.orders.length,0);
saved[0].payload.pendingRefundPaise=0;const requestId=crypto.randomUUID();const refundInput={id,requestId,amountPaise:9500,reason:'Approved test return'};assert.equal((await call('refund',refundInput,'admin')).status,200);assert.equal(saved[0].payload.refundedPaise,9500);assert.equal(saved[0].payload.pendingRefundPaise,0);assert.equal((await call('refund',refundInput,'admin')).status,200);assert.equal(refundPosts,1,'Duplicate refund intent must not call provider twice');assert.equal((await call('download',{id,lineId:'1:pdf'})).status,400);
console.log('PASS: actual Edge handler under mocked services: origin/auth checks, server quote, repeat checkout idempotency, stock once, signature rejection/verified capture, duplicate capture/refund handling, order ownership, private ebook download gate and refund lock.');
