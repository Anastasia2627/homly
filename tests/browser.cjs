const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const URL='http://127.0.0.1:4173/';
(async()=>{
 fs.mkdirSync('screenshots',{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const screen of [{width:1440,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
   const pg=await browser.newPage({viewport:{width:screen.width,height:screen.height},reducedMotion:'no-preference',isMobile:screen.name==='mobile',hasTouch:screen.name==='mobile'});
   const errors=[];pg.on('pageerror',e=>errors.push(String(e)));
   await pg.goto(URL+'index.html',{waitUntil:'domcontentloaded'});
   await pg.locator('.hero-photo-main img').waitFor();
   await pg.waitForTimeout(1000);
   const h=pg.locator('.hero-line').first();
   assert.ok((await h.getAttribute('class')).includes('is-visible'),screen.name+' hero title did not reveal on entry');
   assert.ok(await pg.locator('.hero-photo-main img').evaluate(el=>el.naturalWidth>0),screen.name+' image missing');
   const unbox=pg.locator('.unbox-heading h2');
   assert.equal((await unbox.getAttribute('class')||'').includes('is-visible'),false,screen.name+' reveal triggered too early');
   await pg.screenshot({path:'screenshots/'+screen.name+'-hero.png',animations:'disabled'});
   await unbox.scrollIntoViewIfNeeded();await pg.waitForTimeout(900);
   assert.ok((await unbox.getAttribute('class')).includes('is-visible'),screen.name+' unbox did not reveal upon entering viewport');
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox.png',animations:'disabled'});
   const product=pg.locator('.best .product-card').first();
   await product.scrollIntoViewIfNeeded();await pg.waitForTimeout(900);
   assert.ok((await product.getAttribute('class')).includes('is-visible'),screen.name+' product did not reveal on scroll');
   const overflow=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth}));
   assert.ok(overflow.sw<=overflow.vw+2,screen.name+' horizontal overflow '+JSON.stringify(overflow));
   await pg.goto(URL+'catalog.html',{waitUntil:'domcontentloaded'});
   assert.equal(await pg.locator('.product-card').count(),4);
   await pg.locator('[data-add="bag"]').click();
   await pg.goto(URL+'cart.html',{waitUntil:'domcontentloaded'});
   assert.equal(await pg.locator('.cart-row').count(),1,screen.name+' cart failed');
   assert.deepEqual(errors,[],screen.name+' console errors');
   await pg.close();
   console.log('PASS '+screen.name+': viewport reveal, scroll reveal, product reveal, layout, cart');
  }
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
