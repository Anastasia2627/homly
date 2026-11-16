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
   const headerMode=await pg.locator('.header').evaluate(el=>getComputedStyle(el).position);
   assert.equal(headerMode,'fixed',screen.name+' navigation should remain visible, matching the reference');
   const how=pg.locator('#how-it-works');
   assert.equal(await how.locator('.how-card').count(),4,screen.name+' four how-it-works steps missing');
   assert.equal(await pg.locator('.home > section').nth(1).getAttribute('id'),'how-it-works','How-it-works must be second section');
   const secondNote=await how.locator('.how-note p').innerText();
   assert.match(secondNote,/Простий і приємний процес/);
   const cards=how.locator('.how-card-entry');
   const angles=await cards.evaluateAll(list=>list.map(el=>parseFloat(getComputedStyle(el).rotate)||0));
   assert.ok(angles[0]<-4 && angles[2]>5,screen.name+' reference tilt not applied: '+JSON.stringify(angles));
   const radius=await how.evaluate(el=>getComputedStyle(el).borderTopLeftRadius);
   assert.ok(parseFloat(radius)>=35,screen.name+' top corners are not rounded');
   const firstCard=how.locator('.how-card-entry').first();
   await firstCard.scrollIntoViewIfNeeded();
   await pg.waitForTimeout(900);
   assert.ok((await firstCard.getAttribute('class')).includes('is-visible'),screen.name+' first step has no viewport reveal');
   await pg.evaluate(()=>{
     const area=document.getElementById('how-it-works');
     const top=area.getBoundingClientRect().top+scrollY;
     scrollTo({top:Math.max(0,top-85),behavior:'instant'});
   });
   await pg.waitForTimeout(650);
   await pg.screenshot({path:'screenshots/'+screen.name+'-how.png',animations:'disabled'});
   const unbox=pg.locator('#unbox');
   assert.equal(await pg.locator('.home > section').nth(2).getAttribute('id'),'unbox','Unboxing must follow how-it-works as third section');
   assert.equal(await unbox.locator('.ub-package-lid').count(),1,'3D lid missing');
   assert.equal(await unbox.locator('.ub-object').count(),4,'Kit material objects missing');
   const scrollUnbox=async(progress)=>{
     await pg.evaluate(p=>{
       const sec=document.getElementById('unbox');
       const header=window.innerWidth<=720?68:72;
       const travel=Math.max(1,sec.offsetHeight-(innerHeight-header));
       const top=scrollY+sec.getBoundingClientRect().top;
       scrollTo({top:top-header+travel*p,behavior:'instant'});
     },progress);
     await pg.waitForTimeout(450);
   };
   await scrollUnbox(.05);
   const angleClosed=parseFloat(await unbox.evaluate(el=>getComputedStyle(el).getPropertyValue('--ub-lid-angle')));
   assert.ok(angleClosed>=-7,screen.name+' box should be closed at start: '+angleClosed);
   await scrollUnbox(.54);
   const angleOpened=parseFloat(await unbox.evaluate(el=>getComputedStyle(el).getPropertyValue('--ub-lid-angle')));
   assert.ok(angleOpened < -95,screen.name+' box lid must open via scroll: '+angleOpened);
   const beadOpacity=Number(await unbox.locator('.ub-object-pearls').evaluate(el=>getComputedStyle(el).opacity));
   assert.ok(beadOpacity>.7,screen.name+' pearl materials should emerge: '+beadOpacity);
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox.png',animations:'disabled'});
   await scrollUnbox(.93);
   assert.equal(await unbox.getAttribute('data-ub-phase'),'3',screen.name+' final scene should be active');
   const resultOpacity=Number(await unbox.locator('.ub-complete').evaluate(el=>getComputedStyle(el).opacity));
   assert.ok(resultOpacity>.93,screen.name+' finished bag should appear at final scene: '+resultOpacity);
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox-finish.png',animations:'disabled'});
   await scrollUnbox(.05);
   const angleReclosed=parseFloat(await unbox.evaluate(el=>getComputedStyle(el).getPropertyValue('--ub-lid-angle')));
   assert.ok(angleReclosed>=-7,screen.name+' the lid should close on reverse scroll');
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
