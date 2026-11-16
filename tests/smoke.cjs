const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app.js'),'utf8');
const pages=['index','catalog','product','favorites','cart','about','contacts'];
const validLinks=new Set([...pages,'account','admin']);
for(const name of pages)assert.ok(fs.existsSync(path.join(root,name+'.html')),'missing '+name);
for(const asset of ['bag.webp','cat.webp','candles.webp','snow.webp','box.webp','process.webp','logo.png'])assert.ok(fs.statSync(path.join(root,'assets',asset)).size>500,'missing asset '+asset);
const storage={};
function make(page,search=''){
 const m=new Map();
 const get=id=>{if(!m.has(id))m.set(id,{innerHTML:'',textContent:'',value:id==='sort'?'default':'',classList:{add(){},remove(){}},addEventListener(){},querySelectorAll(){return []}});return m.get(id)};
 const doc={body:{dataset:{page}},documentElement:{classList:{add(){}}},getElementById:get,querySelectorAll(){return []},querySelector(){return null},addEventListener(){}};
 const ctx={document:doc,window:{},location:{search},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},URLSearchParams,Intl,Number,Image:class{},setTimeout(){},clearTimeout(){},matchMedia(){return {matches:true}},console};
 vm.runInNewContext(code,ctx,{filename:'app.js',timeout:3000});
 return m;
}
for(const page of pages){
 const m=make(page,page==='product'?'?id=bag':'');
 const html=m.get('app').innerHTML;
 assert.ok(html.includes('<main'),page+' main absent');
 assert.ok(html.includes('<header'),page+' header absent');
 assert.ok(html.includes('<footer'),page+' footer absent');
 for(const [,link] of html.matchAll(/href="([a-z]+\.html)/g))assert.ok(validLinks.has(link.replace('.html','')),'broken link '+link);
 console.log('✓ '+page);
}
const cat=make('catalog').get('catalog-grid').innerHTML;
assert.equal((cat.match(/class="product-card"/g)||[]).length,4);
const f=make('favorites').get('favorites-content').innerHTML;
assert.match(f,/ПОКИ ПУСТО/);
const c=make('cart').get('cart-content').innerHTML;
assert.match(c,/КОШИК ЧЕКАЄ/);
console.log('✓ catalog, empty states, media and links');

for(const name of ['account','admin']){
 assert.ok(fs.existsSync(path.join(root,name+'.html')),'new account/admin page missing '+name);
}
for(const filename of ['store-config.js','store-client.js','storefront.js','account.js','admin.js','store-portal.css']){
 assert.ok(fs.statSync(path.join(root,filename)).size>100,filename+' module empty');
}
for(const file of ['storefront.js','account.js','admin.js']){
 const src=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .* from '.*';\s*/m,'');
 new vm.Script(src,{filename:file});
}
const config=fs.readFileSync(path.join(root,'store-config.js'),'utf8');
assert.ok(/paymentsEnabled:\s*false/.test(config),'payments must default disabled until merchant keys installed');
const publishedConfig=config.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
assert.ok(!/service_role|SUPABASE_SERVICE_ROLE_KEY|MONOBANK_TOKEN/i.test(publishedConfig),
 'no private keys in the browser config');
console.log('✓ account/admin static entry points, JS syntax and safe payment defaults');
