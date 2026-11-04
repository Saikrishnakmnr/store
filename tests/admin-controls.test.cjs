// Regression contract for the connected Admin controls. Not a browser or live Supabase test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','dist','connected.js'),'utf8');
for(const id of ['delivery-shop-lat','delivery-shop-lng','delivery-pincodes','delivery-radius','delivery-free-km','delivery-rate','delivery-enabled','delivery-always-free']){
 assert.ok(src.includes(id),'Missing delivery editor field: '+id);
}
assert.ok(src.includes('storePin:latText?{lat,lng}:state.storePin'),'Saving an unset location must preserve the old pin');
assert.ok(src.includes('allowedPincodes:[...new Set(codes)]'),'PIN code list must be normalized');
assert.ok(src.includes('await api(\'saveStore\',{version,state:next})'),'Delivery settings must use versioned server save');
for(const id of ['info-phone','info-email','info-address','info-about','info-privacy','info-terms','info-returns']){
 assert.ok(src.includes(id),'Missing customer-visible shop info editor: '+id);
}
assert.ok(src.includes('branding:{...state.branding,phone,email,address:'),'Info edits must preserve other branding properties');
assert.ok(src.includes('policies:{...state.policies,privacy:'),'Info edits must preserve other policy properties');
assert.ok(src.includes('data-store-info'),'Admin dashboard must expose the information editor');
assert.ok(src.includes('data-save-store-info'),'Information editor must provide a save action');
for(const id of ['offer-enabled','offer-name','offer-percent','offer-minimum','offer-cap','offer-stack'])assert.ok(src.includes(id),'Missing bill offer editor: '+id);
assert.ok(src.includes('billOffer:{...state.billOffer,enabled,name,percent,minimumPaise:'),'Bill offer edits must preserve scheduling and other settings');
assert.ok(src.includes('data-bill-offer'),'Admin dashboard must expose the bill offer');
assert.ok(src.includes("https://tiles.openfreemap.org/styles/liberty"),'Labelled base map must use the approved style');
assert.ok(src.includes('https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'),'Use published browser adapter URL');
assert.ok(src.includes("if(d.mapStandard)"),'Standard map fallback switch missing');
assert.ok(src.includes("if(d.mapLabels)"),'Labelled map switch missing');
assert.ok(src.includes("marker.on('dragend',()=>setPin(marker.getLatLng()))"),'Pin drag must remain connected');
for(const page of ['index.html','connected.html']){const html=fs.readFileSync(path.join(__dirname,'..','dist',page),'utf8');assert.ok(html.includes("https://tiles.openfreemap.org"),'Map tiles must be allowed by '+page+' CSP');assert.ok(html.includes("worker-src 'self' blob:"),'MapLibre workers must be allowed by '+page+' CSP');}
console.log('PASS: connected Admin exposes store coordinates, delivery PIN codes, contact and customer policies, preserving unrelated state.');
