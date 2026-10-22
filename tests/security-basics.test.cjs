const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);assert.ok(match,'CSP must be present');
const csp=match[1];assert.ok(csp.includes("object-src 'none'"));assert.ok(csp.includes("base-uri 'none'"));
const scripts=csp.match(/script-src ([^;]+)/)[1];assert.ok(!scripts.includes('unsafe-inline'));assert.ok(!scripts.includes('unsafe-eval'));assert.ok(!scripts.includes('*'));
assert.equal((html.match(/<script\b/g)||[]).length,(html.match(/<script src="\//g)||[]).length,'Entry HTML must use local external scripts only');
assert.ok(!/\son[a-z]+\s*=/i.test(html),'No inline event handlers');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.ok(app.includes('safeProductImage(p.image)'));assert.ok(app.includes('InventoryRules.consume(products,cart,categoryVisible)'));
const files=fs.readdirSync(root).filter(f=>/\.(js|html|css)$/.test(f));
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:sk_live_|rzp_live_)[A-Za-z0-9]{16,}/,/\bsb_secret_[A-Za-z0-9_-]{20,}/,/\bre_[A-Za-z0-9]{30,}/];
for(const name of files){const text=fs.readFileSync(path.join(root,name),'utf8');for(const p of patterns)assert.ok(!p.test(text),'Potential credential material in '+name);}
console.log('PASS: CSP restrictions, external script entrypoints, absence of inline handlers and limited credential-pattern check. Not a complete secret scan or penetration test.');
