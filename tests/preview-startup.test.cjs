// A lightweight DOM contract harness, NOT a browser/layout test.
// Runs the actual preview entry script and click handlers against controlled nodes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.join(__dirname,'..','dist'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
function run(saved=null){
 const listeners={},nodes={},storage=new Map(saved?[['racharla-preview-v2',JSON.stringify(saved)]]:[]);
 const node=(name)=>nodes[name]||=( {innerHTML:'',textContent:'',hidden:true,value:'',classList:{toggle(){}},addEventListener(){},querySelector(sel){return select(sel);},querySelectorAll(){return [];},after(n){nodes['#'+n.id]=n;},insertAdjacentHTML(where,text){this.innerHTML+=text;},matches(){return false;},contains(){return false;},focus(){},remove(){}} );
 function select(sel){
  // Honor the HTML contract that caused the real startup crash.
  if(sel==='.ribbon span:last-child')return /<span[^>]*>[^<]*<\/span><\/div>\s*<header>/.test(html)?node(sel):null;
  if(sel==='#preview-tagline')return html.includes('id="preview-tagline"')?node(sel):null;
  if(sel==='#service-notice')return nodes[sel]||null;
  if(sel==='.hero')return nodes['#screen']?.innerHTML.includes('class="hero"')?node(sel):null;
  if(sel==='#products')return nodes['#screen']?.innerHTML.includes('id="products"')?node(sel):null;
  return node(sel);
 }
 const root=node('#ra-shop');root.addEventListener=(name,fn)=>(listeners[name]||=[]).push(fn);
 const context=vm.createContext({console,Date,Intl,Math,JSON,Number,String,Object,Array,Set,Map,Error,Promise,URL,crypto:require('node:crypto').webcrypto,structuredClone,
 document:{title:'',hidden:false,getElementById:id=>select('#'+id),createElement:()=>node('new-'+Object.keys(nodes).length),body:{append(){}},activeElement:null},
 navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval:()=>1,clearInterval(){},queueMicrotask:fn=>fn(),location:{reload(){}},confirm:()=>false});
 context.window=context;context.addEventListener=()=>{};context.matchMedia=()=>({matches:true});
 for(const file of ['retail-rules.js','inventory-rules.js','content-rules.js','commerce-rules.js','order-rules.js','app.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
 function click(dataset){const button={dataset,disabled:false};const event={target:{closest:()=>button}};for(const fn of listeners.click||[])fn(event);}
 return {nodes,click,state:()=>JSON.parse(storage.get('racharla-preview-v2')),context};
}
const app=run();const shop=app.nodes['#screen'].innerHTML;
assert.ok(shop.includes('category-widgets'),'Startup must reach category rendering');
for(const name of ['Ebooks','Groceries','Vegetables','Footwear','Belts &amp; Wallets','Handbags &amp; Purses','Bangles &amp; Jewellery','Bindis &amp; Ticklies','Beauty &amp; Personal Care','Clothing','Snacks','Food','Homemade Food','Pickles','Home &amp; plastic'])assert.ok(shop.includes('data-cat="'+name+'"'),'Missing widget '+name);
assert.ok(app.nodes['#products'].innerHTML.includes('Homestyle mango pickle'));
app.click({cat:'Vegetables'});assert.ok(app.nodes['#products'].innerHTML.includes('Fresh vegetables'));assert.ok(!app.nodes['#products'].innerHTML.includes('Cotton everyday tee'));
app.click({cat:'All'});app.click({add:'1'});let state=app.state();assert.equal(Object.values(state.cart).reduce((a,b)=>a+b,0),1);const key=Object.keys(state.cart)[0];app.click({qty:key,delta:'1'});assert.equal(app.state().cart[key],2);app.click({view:'cart'});assert.ok(app.nodes['#screen'].innerHTML.includes('Your shopping bag'));assert.ok(app.nodes['#screen'].innerHTML.includes('Order summary'));
state=app.state();const reloaded=run(state);assert.ok(reloaded.nodes['#screen'].innerHTML.includes('category-widgets'));assert.equal(reloaded.state().cart[key],2);
console.log('PASS: actual preview startup + category/product rendering, category filtering, Add and quantity handlers, cart rendering and saved-state reload under a DOM contract harness. Not browser visual QA.');
