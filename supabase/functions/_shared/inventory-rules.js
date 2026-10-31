(function(host){
 'use strict';
 const MAX_LINE=99;
 function price(value){const n=Number(value);if(!Number.isFinite(n)||n<=0||n>1000000||Math.abs(n*100-Math.round(n*100))>0.000001)throw Error('Price must be positive, at most ₹10,00,000, with up to two decimal places.');return Math.round(n*100)/100;}
 function stock(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Stock must be a whole number from 0 to 10,00,000.');return n;}
 function validate(variants){
  if(!Array.isArray(variants)||!variants.length||variants.length>30)throw Error('Keep between 1 and 30 variants per product.');
  const ids=new Set(),labels=new Set();
  return variants.map(v=>{if(!/^[a-zA-Z0-9_-]{1,64}$/.test(v.id||'')||ids.has(v.id))throw Error('Variant IDs must be unique.');ids.add(v.id);
   const label=String(v.label||'').trim();if(!label||label.length>60||labels.has(label.toLowerCase()))throw Error('Each variant needs a unique label, up to 60 characters.');labels.add(label.toLowerCase());
   const selling=price(v.price),mrp=v.mrp==null||v.mrp===''?null:price(v.mrp);if(mrp!==null&&mrp<selling)throw Error('MRP cannot be below the selling price.');return {id:v.id,label,price:selling,...(mrp!==null?{mrp}:{}),stock:stock(v.stock),enabled:v.enabled!==false};
  });
 }
 function sync(p){p.variants=validate(p.variants);const active=p.variants.filter(v=>v.enabled);p.stock=active.reduce((s,v)=>s+v.stock,0);p.price=Math.min(...(active.length?active:p.variants).map(v=>v.price));return p;}
 function migrate(p){
  if(p.variants?.length)return sync(p);
  const amount=price(p.price),available=stock(p.stock);
  if(p.hasSizes)p.variants=['M','L','XL'].map((label,i)=>({id:'size-'+label.toLowerCase(),label,price:amount,stock:i?0:available,enabled:true}));
  else if(p.cat==='Pickles')p.variants=[{id:'weight-100g',label:'100 g',price:Math.max(.01,Math.round(amount*40)/100),stock:0},{id:'weight-250g',label:'250 g',price:amount,stock:available},{id:'weight-500g',label:'500 g',price:Math.round(amount*200)/100,stock:0},{id:'weight-1kg',label:'1 kg',price:Math.round(amount*400)/100,stock:0}];
  else p.variants=[{id:'standard',label:String(p.unit||'Standard pack').split('·')[0].trim().slice(0,60)||'Standard pack',price:amount,stock:available}];
  return sync(p);
 }
 function key(productId,variantId){return productId+':'+variantId;}
 function decode(raw){const m=/^([1-9]\d*):([A-Za-z0-9_-]{1,64})$/.exec(raw);if(!m||!Number.isSafeInteger(Number(m[1])))throw Error('Invalid cart item.');return {productId:Number(m[1]),variantId:m[2]};}
 function rows(products,cart){return Object.entries(cart).map(([raw,qty])=>{const d=decode(raw);if(!Number.isInteger(qty)||qty<1||qty>MAX_LINE)throw Error('Cart quantities must be from 1 to '+MAX_LINE+'.');const found=products.find(p=>p.id===d.productId),v=found?.variants?.find(v=>v.id===d.variantId);return {key:raw,qty,p:found||{id:d.productId,name:'Unavailable product',cat:'',emoji:'📦'},v:v||null,size:v?.label||'Unavailable variant',price:v?.price||0,stock:v?.stock||0,issue:!found?'Product no longer available':!v?'Variant no longer available':!v.enabled?'Variant is not for sale':qty>v.stock?'Not enough stock':''};});}
 function add(products,cart,productId,variantId,delta=1){if(![-1,1].includes(delta))throw Error('Invalid quantity change.');const k=key(productId,variantId),current=cart[k]||0;
  if(!Number.isInteger(current)||current<0)throw Error('Invalid cart quantity.');
  if(delta<0){if(current<=1)delete cart[k];else cart[k]=current-1;return;}
  const p=products.find(p=>p.id===productId),v=p?.variants?.find(v=>v.id===variantId);
  if(!v||!v.enabled)throw Error('This variant is unavailable.');if(current+1>v.stock)throw Error('No more stock of '+v.label+' is available.');if(current+1>MAX_LINE)throw Error('Maximum '+MAX_LINE+' packs per variant.');cart[k]=current+1;
 }
 function consume(products,cart,isCategoryVisible=()=>true){const lines=rows(products,cart);if(!lines.length)throw Error('Your bag is empty.');
  for(const e of lines){if(e.issue)throw Error(e.p.name+' · '+e.size+': '+e.issue);if(!isCategoryVisible(e.p.cat))throw Error('This category is unavailable.');}
  // Validate the whole cart before any mutation. Production needs a DB transaction.
  for(const e of lines)e.v.stock-=e.qty;for(const p of products)sync(p);return lines;
 }
 function migrateCart(products,cart){const next=Object.create(null);let dropped=0;
  for(const [old,qty] of Object.entries(cart||{})){if(!Number.isInteger(qty)||qty<1||qty>MAX_LINE){dropped++;continue;}const parts=old.split(':'),p=products.find(p=>String(p.id)===parts[0]);if(!p){dropped++;continue;}const v=p.variants.find(v=>v.id===parts[1]||v.label===parts[1])||(!parts[1]?(p.variants.find(v=>v.stock>0)||p.variants[0]):null);if(!v){dropped++;continue;}const k=key(p.id,v.id);next[k]=Math.min(MAX_LINE,(next[k]||0)+qty);}
  return {cart:next,dropped};
 }
 const api={MAX_LINE,price,stock,validate,sync,migrate,key,decode,rows,add,consume,migrateCart};host.InventoryRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
