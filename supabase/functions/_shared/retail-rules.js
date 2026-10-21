(function(host){
 'use strict';
 const additionalCategories=[
  {name:'Vegetables',emoji:'🥬',product:'Fresh vegetables · sample',variants:[['250 g',25],['500 g',45],['1 kg',85]]},
  {name:'Footwear',emoji:'👟',product:'Everyday shoes · sample',variants:[['UK 6',599],['UK 7',599],['UK 8',599],['UK 9',599]]},
  {name:'Belts & Wallets',emoji:'👝',product:'Everyday belt · sample',variants:[['Small',199],['Medium',199],['Large',219]]},
  {name:'Handbags & Purses',emoji:'👜',product:'Daily-use handbag · sample',variants:[['Standard',399]]},
  {name:'Bangles & Jewellery',emoji:'💍',product:'Bangle set · sample',variants:[['Size 2.4',149],['Size 2.6',149],['Size 2.8',149]]},
  {name:'Bindis & Ticklies',emoji:'🌸',product:'Bindi collection · sample',variants:[['One card',25],['Pack of 5',99]]},
  {name:'Beauty & Personal Care',emoji:'🧴',product:'Personal-care item · sample',variants:[['100 ml',99],['200 ml',179]]}
 ];
 function day(at){const date=new Date(at);if(!Number.isFinite(+date))throw Error('Invalid reporting date.');const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const val=k=>parts.find(p=>p.type===k).value;return val('year')+'-'+val('month')+'-'+val('day');}
 function paise(n){const p=Math.round(Number(n)*100);if(!Number.isSafeInteger(p)||p<0)throw Error('Invalid receipt amount.');return p;}
 function receipt(order,copy='customer',duplicate=false){
  if(!['customer','shop'].includes(copy))throw Error('Unknown receipt copy.');
  const q=order.pricingSnapshot,total=paise(order.total);
  if(q){if(q.total!==total||q.subtotal-q.savings+q.deliveryPaise!==total||q.lines.reduce((s,l)=>s+l.net,0)+q.deliveryPaise!==total)throw Error('Receipt totals do not reconcile. Admin review is required.');}
  const business=order.businessSnapshot||{name:order.brandSnapshot||'Store · older sample',phone:'',email:'',address:''};
  return {orderId:order.id,receiptNumber:order.receiptNumber||order.id,placedAt:order.createdAt,business,copy,duplicate,
    customer:order.deliverySnapshot?.customer||null,status:order.status,
    lines:q?.lines.map(l=>({name:l.name,variant:l.size||'Standard',quantity:l.quantity,unitPricePaise:l.pricePaise,grossPaise:l.gross,discountPaise:l.productDiscount+l.billDiscount,netPaise:l.net}))||null,
    legacyItems:q?null:order.items,subtotalPaise:q?.subtotal??null,savingsPaise:q?.savings??null,deliveryPaise:q?.deliveryPaise??null,totalPaise:total,
    refundPendingPaise:order.pendingRefundPaise||0,refundedPaise:order.refundedPaise||0,cancellationFeePaise:order.cancellation?.chargePaise||0,
    paymentLabel:'DEMO — no payment collected',taxLabel:'Order receipt · not a tax invoice'};
 }
 function stats(orders,products,{from='',to=''}={}){
  if(from&&to&&from>to)throw Error('Start date must be before end date.');
  const selected=orders.filter(o=>{const d=day(o.createdAt);return (!from||d>=from)&&(!to||d<=to);});
  const delivered=selected.filter(o=>o.status==='Delivered');
  const deliveredPaise=delivered.reduce((n,o)=>n+paise(o.total),0),completedRefundPaise=selected.reduce((n,o)=>n+(o.refundedPaise||0),0),pendingRefundPaise=selected.reduce((n,o)=>n+(o.pendingRefundPaise||0),0);
  const counts={};for(const o of selected)counts[o.status]=(counts[o.status]||0)+1;
  const byCategory={};for(const o of delivered){for(const l of o.pricingSnapshot?.lines||[]){const cat=l.category||'Older orders · category not captured';byCategory[cat] ||= {packs:0,salesPaise:0};byCategory[cat].packs+=l.quantity;byCategory[cat].salesPaise+=l.net;}}
  const stockRows=products.flatMap(p=>p.variants.map(v=>({productId:p.id,product:p.name,category:p.cat,variantId:v.id,label:v.label,pricePaise:paise(v.price),stock:v.stock,enabled:v.enabled})));
  const sellable=stockRows.filter(v=>v.enabled);
  return {orders:selected.length,orderedPaise:selected.reduce((n,o)=>n+paise(o.total),0),deliveredOrders:delivered.length,deliveredPaise,
    completedRefundPaise,pendingRefundPaise,deliveredNetPaise:deliveredPaise-delivered.reduce((n,o)=>n+(o.refundedPaise||0),0),counts,byCategory,
    stockRows,stockPacks:sellable.reduce((n,v)=>n+v.stock,0),stockSellingValuePaise:sellable.reduce((n,v)=>n+v.stock*v.pricePaise,0),soldOut:sellable.filter(v=>v.stock===0).length};
 }
 function contact({name='',phone=''}={}){name=name.trim();const digits=phone.replace(/[\s()+-]/g,'');if(name.length<2||name.length>80)throw Error('Enter the recipient’s name.');if(!/^\d{10,15}$/.test(digits))throw Error('Enter a phone number with 10–15 digits.');return {name,phone:digits};}
 const api={additionalCategories,day,receipt,stats,contact};host.RetailRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
