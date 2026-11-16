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
   await pg.locator('.ref-hero-bag').waitFor();
   await pg.waitForTimeout(1000);
   await pg.waitForFunction(() => Boolean(document.documentElement.dataset.motionEngine), {timeout:15000});
   const engine = await pg.evaluate(() => document.documentElement.dataset.motionEngine);
   assert.equal(engine, 'motion', screen.name+' should load the actual Motion JavaScript library, not only fallback CSS');
   assert.equal(await pg.locator('.homly-scroll-progress').count(), 1, 'Scroll indicator missing');

   const h=pg.locator('.ref-hero-title-line').first();
   assert.ok((await h.getAttribute('class')).includes('is-visible'),screen.name+' hero title did not reveal on entry');
   assert.ok(await pg.locator('.ref-hero-bag').evaluate(el=>el.complete && el.naturalWidth>0),screen.name+' user-uploaded pink bag did not load');
   const heroBounds=await pg.locator('.ref-hero-title').boundingBox();
   const productBounds=await pg.locator('.ref-hero-product').boundingBox();
   assert.ok(heroBounds&&productBounds,screen.name+' hero elements missing');
   assert.ok(productBounds.width>170,screen.name+' product image too small');
   assert.ok(await pg.locator('.ref-hero-top-decoration').count()===1,'Reference top shape missing');
   assert.ok(await pg.locator('.ref-hero-waves').count()===1,'Reference waves missing');
   await pg.screenshot({path:'screenshots/'+screen.name+'-hero.png',animations:'disabled'});
   const how=pg.locator('#how-it-works');
   assert.equal(await how.locator('.how-card').count(),4,screen.name+' four how-it-works steps missing');
   assert.equal(await pg.locator('.home > section').nth(1).getAttribute('id'),'how-it-works','How-it-works must be second section');
   const radius=await how.evaluate(el=>getComputedStyle(el).borderTopLeftRadius);
   assert.ok(parseFloat(radius)>=35,screen.name+' top corners are not rounded');
   const firstCard=how.locator('.how-card-entry').first();
   await firstCard.scrollIntoViewIfNeeded();
   await pg.waitForTimeout(900);
   assert.ok((await firstCard.getAttribute('class')).includes('is-visible'),screen.name+' first step has no viewport reveal');
   await pg.screenshot({path:'screenshots/'+screen.name+'-how.png',animations:'disabled'});
   const unbox=pg.locator('.unbox-heading h2');
   assert.equal((await unbox.getAttribute('class')||'').includes('is-visible'),false,screen.name+' reveal triggered too early');
   await unbox.scrollIntoViewIfNeeded();await pg.waitForTimeout(900);
   assert.equal(await pg.locator('.unbox-heading').getAttribute('data-motion-seen'), 'true', 'Motion inView should trigger for the unbox heading');
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
