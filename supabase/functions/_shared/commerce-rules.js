(function(host){
  'use strict';
  function integer(n,name){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid '+name);return n;}
  function percent(n){if(!Number.isFinite(n)||n<0||n>100)throw Error('Discount must be from 0 to 100%.');return n;}
  function active(offer,now=Date.now()){
    if(!offer?.enabled)return false;
    const start=offer.start?Date.parse(offer.start):-Infinity,end=offer.end?Date.parse(offer.end):Infinity;
    return !Number.isNaN(start)&&!Number.isNaN(end)&&start<end&&now>=start&&now<end;
  }
  function allocation(amount,bases){
    const total=bases.reduce((a,b)=>a+b,0);if(!total||!amount)return bases.map(()=>0);
    const rows=bases.map((v,i)=>({i,value:Math.floor(amount*v/total),remainder:(amount*v)%total}));
    let left=amount-rows.reduce((s,r)=>s+r.value,0);
    for(const r of [...rows].sort((a,b)=>b.remainder-a.remainder||a.i-b.i)){if(left<=0)break;r.value++;left--;}
    return rows.map(r=>r.value);
  }
  function quote(items,bill={},deliveryPaise=0,now=Date.now()){
    integer(deliveryPaise,'delivery charge');
    const lines=items.map(item=>{
      integer(item.pricePaise,'price');integer(item.quantity,'quantity');if(!item.quantity)throw Error('Quantity must be positive.');
      const gross=integer(item.pricePaise*item.quantity,'line total');
      const discount=active(item.offer,now)?Math.round(gross*percent(item.offer.percent)/100):0;
      return {...item,gross,productDiscount:discount};
    });
    const subtotal=integer(lines.reduce((s,l)=>s+l.gross,0),'subtotal');
    const candidateProducts=lines.reduce((s,l)=>s+l.productDiscount,0);
    const base=bill.stack?subtotal-candidateProducts:subtotal;
    const eligible=active(bill,now)&&base>=integer(bill.minimumPaise||0,'minimum');
    let billDiscount=eligible?Math.round(base*percent(bill.percent)/100):0;
    if(bill.capPaise)billDiscount=Math.min(billDiscount,integer(bill.capPaise,'discount cap'));
    const useProducts=bill.stack||candidateProducts>=billDiscount;
    if(!bill.stack&&useProducts)billDiscount=0;
    const productDiscount=useProducts?candidateProducts:0;
    const weights=lines.map(l=>l.gross-(useProducts?l.productDiscount:0));
    const distributed=allocation(billDiscount,weights);
    const result=lines.map((l,i)=>({...l,productDiscount:useProducts?l.productDiscount:0,billDiscount:distributed[i],net:weights[i]-distributed[i]}));
    const savings=productDiscount+billDiscount;
    return {lines:result,subtotal,productDiscount,billDiscount,savings,deliveryPaise,total:subtotal-savings+deliveryPaise,
      applied:billDiscount?(productDiscount?'Product offers + '+bill.name:bill.name):productDiscount?'Product offers':'No offer',
      billEligible:eligible,minimumPaise:bill.minimumPaise||0,stacking:!!bill.stack};
  }
  function point(p){return p&&typeof p.lat==='number'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&typeof p.lng==='number'&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;}
  function km(a,b){if(!point(a)||!point(b))throw Error('Choose valid map coordinates.');const rad=x=>x*Math.PI/180;
    const dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;
    return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
  function delivery(config,customer){
    if(!config.enabled)return {eligible:false,reason:'Delivery is paused by the store.',feePaise:0};
    if(!point(config.store))return {eligible:false,reason:'Admin must set the store location first.',feePaise:0};
    if(!point(customer))return {eligible:false,reason:'Choose your delivery pin.',feePaise:0};
    if(!Number.isFinite(config.radius)||config.radius<=0||!Number.isFinite(config.freeKm)||config.freeKm<0)throw Error('Invalid delivery radius.');
    integer(config.extraKmPaise,'delivery rate');
    const distance=km(config.store,customer);
    if(distance>config.radius)return {eligible:false,reason:'Outside the '+config.radius+' km service radius.',distance,feePaise:0};
    if(config.pincodes?.length&&!config.pincodes.includes(customer.pincode))return {eligible:false,reason:'This PIN code is not in the delivery area.',distance,feePaise:0};
    const feePaise=config.free?0:Math.max(0,Math.ceil(distance-config.freeKm-1e-9))*config.extraKmPaise;
    return {eligible:true,reason:'Within the delivery area',distance,feePaise};
  }
  const api={active,quote,allocation,point,km,delivery};host.CommerceRules=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
