import assert from 'node:assert/strict';
import {getQuote,newOrder,publicOrder,canRead,handover,exception,validateStore,downloadPath,code,publicStore} from '../supabase/functions/_shared/engine.mjs';
const customer={id:crypto.randomUUID(),email:'buyer@example.com',role:'customer'},rider={id:crypto.randomUUID(),role:'rider'},admin={id:crypto.randomUUID(),role:'admin'};
const state=()=>({storeMode:'open',branding:{name:'Test store'},categories:[{name:'Vegetables',enabled:true},{name:'Ebooks',enabled:true}],products:[{id:1,name:'Tomatoes',cat:'Vegetables',kind:'physical',variants:[{id:'500g',label:'500 g',price:40,stock:10,enabled:true}]},{id:2,name:'Recipe ebook',cat:'Ebooks',kind:'ebook',ebookPath:'test/recipes.pdf',variants:[{id:'pdf',label:'PDF',price:100,stock:100,enabled:true}]}],billOffer:{enabled:true,name:'Launch',percent:5},policy:{freeMinutes:10},storePin:{lat:17.385,lng:78.4867},radius:5,freeKm:1,rate:10,free:false,deliveryEnabled:true,allowedPincodes:['500001']});
const address={name:'Test Buyer',phone:'9876543210',address:'Test address for automated tests',pincode:'500001',lat:17.4,lng:78.4867};
const s=validateStore(state());
const q=getQuote(s,{'1:500g':3},address).q;assert.equal(q.subtotal,12000);assert.equal(q.savings,600);assert.equal(q.deliveryPaise,1000);assert.equal(q.total,12400);assert.equal(s.products[0].variants[0].stock,10,'Quoting must not reserve stock');
const o=newOrder(s,{cart:{'1:500g':3},address,requestKey:crypto.randomUUID(),expectedTotal:12400},customer);assert.equal(s.products[0].variants[0].stock,7);assert.equal(o.status,'Awaiting payment');assert.equal(o.paidPaise,0);assert.equal(o.physical,true);
assert.throws(()=>newOrder(state(),{cart:{'1:500g':1},address,requestKey:crypto.randomUUID(),expectedTotal:1},customer),/changed/);
assert.throws(()=>getQuote(state(),{'1:500g':11},address),/stock/);assert.throws(()=>getQuote(state(),{'1:500g':1},{...address,lat:18}),/Outside/);
assert.throws(()=>getQuote({...state(),storeMode:'closed'},{'1:500g':1},address),/not accepting/);
// Repricing a product invalidates an earlier reviewed total.
const repriced=state(),oldTotal=getQuote(repriced,{'1:500g':1},address).q.total;
repriced.products[0].variants[0].price=45;
assert.throws(()=>newOrder(repriced,{cart:{'1:500g':1},address,requestKey:crypto.randomUUID(),expectedTotal:oldTotal},customer),/changed/);
assert.equal(repriced.products[0].variants[0].stock,10);
// Disabled variants cannot be quoted or newly reserved after hide/archive.
for(const flag of ['hidden','archived']){
 const unavailable=state();unavailable.products[0][flag]=true;unavailable.products[0].variants[0].enabled=false;
 assert.throws(()=>getQuote(unavailable,{'1:500g':1},address),/not for sale|unavailable|variant/i);
 assert.throws(()=>newOrder(unavailable,{cart:{'1:500g':1},address,requestKey:crypto.randomUUID(),expectedTotal:4200},customer),/not for sale|unavailable|variant/i);
 assert.equal(unavailable.products[0].variants[0].stock,10);
}
const digital=getQuote(state(),{'2:pdf':1},null);assert.equal(digital.q.deliveryPaise,0);assert.equal(digital.q.total,9500);assert.equal(digital.address,null);assert.throws(()=>getQuote(state(),{'2:pdf':2},null),/one copy/);
const mixed=getQuote(state(),{'1:500g':2,'2:pdf':1},address);assert.equal(mixed.q.total,18100);assert.equal(mixed.q.deliveryPaise,1000);
const ebook=newOrder(state(),{cart:{'2:pdf':1},address:null,requestKey:crypto.randomUUID(),expectedTotal:9500},customer);assert.equal(ebook.physical,false);assert.throws(()=>downloadPath(ebook,customer,'2:pdf'),/captured/);ebook.paidPaise=9500;ebook.status='Delivered';assert.equal(downloadPath(ebook,customer,'2:pdf'),'test/recipes.pdf');assert.throws(()=>downloadPath(ebook,admin,'2:pdf'),/purchasing/);ebook.pendingRefundPaise=100;assert.throws(()=>downloadPath(ebook,customer,'2:pdf'),/refund/);ebook.pendingRefundPaise=0;
assert.equal(publicStore(state()).products[1].ebookPath,undefined);assert.equal(publicOrder(ebook,customer).lineItems[0].assetPath,undefined);
o.riderId=rider.id;o.status='Out for delivery';o.handoverCode='123456';o.handoverExpiresAt=new Date(Date.now()+60000).toISOString();
assert.equal(publicOrder(o,rider).handoverCode,undefined);assert.equal(publicOrder(o,admin).handoverCode,undefined);assert.equal(publicOrder(o,customer).handoverCode,'123456');assert.equal(canRead(o,{id:crypto.randomUUID(),role:'customer'}),false);
assert.throws(()=>handover(o,admin,{code:'123456',receiver:'Buyer',checked:true}),/assigned rider/);
for(let i=0;i<5;i++)assert.equal(handover(o,rider,{code:'999999',receiver:'Buyer',checked:true}),false);
assert.throws(()=>handover(o,rider,{code:'123456',receiver:'Buyer',checked:true}),/Too many/);o.handoverAttempts=0;
assert.throws(()=>handover(o,rider,{code:'123456',receiver:'Buyer',checked:false}),/check items/);assert.equal(handover(o,rider,{code:'123456',receiver:'Buyer',checked:true}),true);assert.equal(o.status,'Delivered');assert.equal(o.handoverCode,undefined);assert.throws(()=>handover(o,rider,{code:'123456',receiver:'Buyer',checked:true}),/not out/);
const ex={...o,status:'Out for delivery'};assert.throws(()=>exception(ex,rider,{}),/Admin/);assert.throws(()=>exception(ex,admin,{reason:'Phone unavailable',receiver:'Buyer',confirmationMethod:'Called customer',customerConfirmed:false}),/confirmation/);exception(ex,admin,{reason:'Phone unavailable',receiver:'Buyer',confirmationMethod:'Called customer',customerConfirmed:true});assert.equal(ex.handoverException.adminId,admin.id);
for(let i=0;i<100;i++)assert.match(code(),/^\d{6}$/);
console.log('PASS: server quantity/offer/delivery totals, stock reservations, mixed/digital-only orders, paid-only ebook access, refund access lock, customer isolation, no-SMS handover attempts and audited exceptions.');
