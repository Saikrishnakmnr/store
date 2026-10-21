import './commerce-rules.js';
import './inventory-rules.js';
import './order-rules.js';
import './retail-rules.js';
const C=globalThis.CommerceRules,I=globalThis.InventoryRules;
export function required(ok,message){if(!ok)throw Error(message);}
export function uuid(v){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);}
export function visible(s,cat){return s.categories.some(c=>c.name===cat&&c.enabled);}
export function customerAddress(a){
 required(a&&typeof a==='object','Add receiver details.');
 const contact=globalThis.RetailRules.contact(a);
 required(/^(?:\+91|91)?[6-9]\d{9}$/.test(contact.phone),'Enter a valid Indian mobile format. This number is not SMS-verified.');
 required(C.point(a)&&typeof a.address==='string'&&a.address.trim().length>=5&&a.address.length<=500&&/^\d{6}$/.test(a.pincode||''),'Add a complete address, PIN code and valid map pin.');
 const alternate=a.alternateName?globalThis.RetailRules.contact({name:a.alternateName,phone:a.alternatePhone}):null;
 return {...contact,address:a.address.trim(),pincode:a.pincode,lat:a.lat,lng:a.lng,alternateName:alternate?.name||'',alternatePhone:alternate?.phone||'',phoneVerified:false};
}
export function getQuote(s,cart,address,now=Date.now()){
 required(s.storeMode==='open','Store is not accepting new orders.');
 const n=s.serviceNotice,delay=n?.enabled&&(!n.expiresAt||Date.parse(n.expiresAt)>now);
 required(!(delay&&n.pauseOrders),'Orders are paused due to a service delay.');
 const preliminary=I.rows(s.products,cart||{});
 const hasPhysical=preliminary.some(e=>e.p.kind!=='ebook');
 const a=hasPhysical?customerAddress(address):null;
 const d=hasPhysical?C.delivery({enabled:s.deliveryEnabled,store:s.storePin,radius:s.radius,freeKm:s.freeKm,extraKmPaise:Math.round(s.rate*100),free:s.free,pincodes:s.allowedPincodes},a):{eligible:true,feePaise:0,reason:'Digital delivery — no delivery charge'};
 required(d.eligible,d.reason);
 required(cart&&typeof cart==='object'&&!Array.isArray(cart)&&Object.keys(cart).length>0&&Object.keys(cart).length<=50,'Use 1–50 basket lines.');
 for(const qty of Object.values(cart))required(Number.isInteger(qty)&&qty>=1&&qty<=99,'Use quantities from 1 to 99.');
 const copy=structuredClone(s.products);I.consume(copy,cart,cat=>visible(s,cat));
 const rows=I.rows(s.products,cart);
 for(const e of rows)if(e.p.kind==='ebook'){required(e.qty===1,'Buy one copy per ebook per order.');required(typeof e.p.ebookPath==='string'&&/^[A-Za-z0-9_/-]+\.(pdf|epub)$/.test(e.p.ebookPath)&&!e.p.ebookPath.includes('..'),'Ebook file is not ready.');}
 const q=C.quote(rows.map(e=>({id:e.key,productId:e.p.id,variantId:e.v.id,name:e.p.name,category:e.p.cat,kind:e.p.kind||'physical',assetPath:e.p.kind==='ebook'?e.p.ebookPath:undefined,size:e.size,quantity:e.qty,pricePaise:Math.round(e.price*100),offer:e.p.discount})),s.billOffer,d.feePaise,now);
 required(q.total>0&&q.total<=10000000,'Order total must be between ₹0.01 and ₹1,00,000.');
 return {q,d,address:a,products:copy};
}
export function newOrder(s,{cart,address,requestKey,expectedTotal},user,now=Date.now()){
 required(uuid(requestKey),'A checkout request key is required.');
 const {q,d,address:a,products}=getQuote(s,cart,address,now);
 required(expectedTotal===q.total,'Prices or delivery charges changed. Review the new quote.');
 s.products=products;
 return {id:crypto.randomUUID(),requestKey,customerId:user.id,customerEmail:user.email,total:q.total/100,status:'Awaiting payment',createdAt:new Date(now).toISOString(),driver:'Unassigned',riderId:null,refund:'None',paidPaise:0,refundedPaise:0,pendingRefundPaise:0,refunds:[],notifications:[],history:[],policy:{...s.policy,demoFeesEnabled:false},brandSnapshot:s.branding.name,businessSnapshot:structuredClone(s.branding),pricingSnapshot:q,lineItems:q.lines,items:q.lines.map(l=>l.name+' ('+l.size+') × '+l.quantity).join(' · '),deliverySnapshot:{...d,store:s.storePin,customer:a,basis:'straight-line'},paymentState:'creating',reserved:true,physical:q.lines.some(l=>l.kind!=='ebook')};
}
export function publicOrder(order,actor){
 const o=structuredClone(order);delete o.requestKey;delete o.customerEmail;delete o.paymentAttempt;delete o.checkoutClaim;
 for(const l of o.lineItems||[])delete l.assetPath;for(const l of o.pricingSnapshot?.lines||[])delete l.assetPath;
 if(actor.id!==o.customerId)delete o.handoverCode;
 if(actor.role==='rider'){
  return {id:o.id,status:o.status,driver:o.driver,items:o.items,deliverySnapshot:o.deliverySnapshot,history:o.history,receiver:o.receiver,handoverAttempts:o.handoverAttempts||0,handoverException:o.handoverException};
 }
 return o;
}
export function canRead(o,u){return u.role==='admin'||o.customerId===u.id||(u.role==='rider'&&o.riderId===u.id);}
export function code(){const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=4294000000);return String(a[0]%1000000).padStart(6,'0');}
export function event(o,actor,message,now=Date.now()){
 const id=crypto.randomUUID(),at=new Date(now).toISOString();o.history??=[];o.history.push({id,actor,message,at});
 o.notifications??=[];o.notifications.push({id,subject:message,state:'Queued',at});
 return {id,recipient:o.customerEmail,subject:('Order '+o.id.slice(0,8)+' · '+message).slice(0,200),body:message+'\nOrder ID: '+o.id+'\nStatus: '+o.status+'\nOpen My orders for details. Never share your delivery code before receiving and checking your order.'};
}
export function handover(o,u,{code:entered,receiver,checked},now=Date.now()){
 required(u.role==='rider'&&o.riderId===u.id,'Only the assigned rider can confirm this handover.');
 required(o.status==='Out for delivery','Order is not out for delivery.');
 required(checked===true,'Ask the receiver to check items and quantities first.');
 required(typeof receiver==='string'&&receiver.trim().length>=2&&receiver.length<=80,'Enter actual receiver name.');
 required((o.handoverAttempts||0)<5,'Too many attempts. Ask admin to review.');
 required(Date.parse(o.handoverExpiresAt)>now,'Code expired. Ask admin to reissue after contacting the customer.');
 if(!/^\d{6}$/.test(entered||'')||entered!==o.handoverCode){o.handoverAttempts=(o.handoverAttempts||0)+1;return false;}
 o.status='Delivered';o.receiver=receiver.trim();o.deliveredAt=new Date(now).toISOString();o.handoverMethod='customer-code';delete o.handoverCode;return true;
}
export function exception(o,u,input,now=Date.now()){
 required(u.role==='admin','Admin approval required.');required(o.status==='Out for delivery','Only dispatched orders can use this exception.');
 for(const key of ['reason','confirmationMethod','receiver'])required(typeof input[key]==='string'&&input[key].trim().length>=3&&input[key].length<=300,'Record reason, receiver and how the customer confirmed.');
 required(input.customerConfirmed===true,'Do not complete delivery without reliable customer confirmation.');
 o.status='Delivered';o.receiver=input.receiver;o.deliveredAt=new Date(now).toISOString();o.handoverMethod='admin-exception';o.handoverException={reason:input.reason,confirmationMethod:input.confirmationMethod,adminId:u.id,at:o.deliveredAt};delete o.handoverCode;
}
export function validateStore(s){
 required(s&&Array.isArray(s.products)&&s.products.length<=2000&&Array.isArray(s.categories)&&s.categories.length<=80,'Invalid catalog.');
 required(['open','closed','maintenance'].includes(s.storeMode),'Invalid store mode.');
 required(typeof s.branding?.name==='string'&&s.branding.name.length>=2&&s.branding.name.length<=80,'Store name required.');
 required(Number.isFinite(s.radius)&&s.radius>0&&s.radius<=50&&Number.isFinite(s.freeKm)&&s.freeKm>=0&&Number.isFinite(s.rate)&&s.rate>=0&&s.rate<=1000,'Invalid delivery rules.');
 required(!s.storePin||C.point(s.storePin),'Invalid store pin.');
 required(s.categories.every(c=>typeof c.name==='string'&&c.name.trim().length>0&&c.name.length<=80&&typeof c.enabled==='boolean')&&new Set(s.categories.map(c=>c.name.toLowerCase())).size===s.categories.length,'Invalid or duplicate categories.');
 required(Array.isArray(s.allowedPincodes)&&s.allowedPincodes.every(p=>/^\d{6}$/.test(p)),'PIN codes must have six digits.');
 const ids=new Set();for(const p of s.products){required(Number.isSafeInteger(p.id)&&p.id>0&&!ids.has(p.id),'Unique numeric product IDs required.');ids.add(p.id);required(typeof p.name==='string'&&p.name.length>0&&p.name.length<=160,'Invalid product name.');required(s.categories.some(c=>c.name===p.cat),'Unknown product category.');required(Array.isArray(p.variants)&&p.variants.length>0&&p.variants.length<=40,'Product options required.');const vids=new Set();for(const v of p.variants){required(typeof v.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v.id)&&!vids.has(v.id),'Invalid or duplicate variant ID.');vids.add(v.id);required(typeof v.label==='string'&&v.label.length>0&&v.label.length<=80&&Number.isFinite(v.price)&&v.price>=0&&v.price<=100000&&Number.isInteger(v.stock)&&v.stock>=0&&v.stock<=1000000,'Invalid variant price or stock.');}I.sync(p);}
 // Force all live cancellation deductions off until the accepted policy is reviewed.
 s.policy={...s.policy,demoFeesEnabled:false};
 required(JSON.stringify(s).length<2000000,'Catalog is too large. Use hosted image URLs.');return s;
}

export function downloadPath(o,u,lineId){required(o.customerId===u.id,'Only the purchasing customer can download.');required(o.paidPaise===o.pricingSnapshot.total&&o.paidPaise>0&&o.status!=='Cancelled'&&!(o.pendingRefundPaise||o.refundedPaise),'Payment must be captured and no refund pending or completed.');const l=o.lineItems.find(l=>l.id===lineId&&l.kind==='ebook');required(l&&/^[A-Za-z0-9_/-]+\.(pdf|epub)$/.test(l.assetPath||'')&&!l.assetPath.includes('..'),'Ebook unavailable.');return l.assetPath;}
export function publicStore(s,admin=false){const out=structuredClone(s);if(!admin){out.products=out.products.filter(p=>visible(s,p.cat));for(const p of out.products)delete p.ebookPath;}return out;}
