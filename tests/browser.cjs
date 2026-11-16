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
   assert.equal(await pg.locator('.home > section').nth(2).getAttribute('id'),'unbox','Unboxing must remain the third section');
   assert.equal(await unbox.locator('.ub-play,#ub-range,.ub-scrub').count(),0,screen.name+' replay/scrubber must be removed');
   assert.equal(await unbox.locator('.ub-step').count(),4,screen.name+' four passive stages missing');
   const unboxHeight=await unbox.evaluate(e=>e.getBoundingClientRect().height);
   assert.ok(unboxHeight>screen.height*5,screen.name+' scroll runway too short: '+unboxHeight);
   const scrollUnbox=async(progress)=>{
     await pg.evaluate(p=>{
       const sec=document.getElementById('unbox');
       const pin=sec.querySelector('.ub-pin');
       const sticky=parseFloat(getComputedStyle(pin).top)||0;
       const travel=Math.max(1,sec.offsetHeight-(innerHeight-sticky));
       scrollTo({top:scrollY+sec.getBoundingClientRect().top-sticky+travel*p,behavior:'instant'});
     },progress);
   };
   await scrollUnbox(.02);
   await pg.waitForFunction(()=>document.getElementById('unbox').dataset.ubEngine==='webgl',{timeout:20000});
   assert.equal(await unbox.locator('.ub-webgl canvas').count(),1,screen.name+' 3D canvas failed');
   await pg.waitForTimeout(450);
   const closed=Number(await unbox.locator('.ub-webgl').getAttribute('data-lid-angle'));
   assert.ok(closed>-.18,screen.name+' lid should begin closed, got '+closed);
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox-closed.png',animations:'disabled'});
   assert.equal(await pg.locator('.ribbon,.ribbon-track').count(),0,screen.name+' unwanted moving ticker remains');
   await scrollUnbox(.61);
   await pg.waitForTimeout(350);
   const progressEarly=Number(await unbox.getAttribute('data-ub-progress'));
   assert.ok(progressEarly>.15,screen.name+' animation appears frozen after scrolling: '+progressEarly);
   assert.ok(progressEarly<.85,screen.name+' animation jumped too far: '+progressEarly);
   await pg.waitForFunction(()=>Number(document.querySelector('#unbox').dataset.ubProgress)>.52,{timeout:3500});
   const openAngle=Number(await unbox.locator('.ub-webgl').getAttribute('data-lid-angle'));
   const materials=Number(await unbox.locator('.ub-webgl').getAttribute('data-materials-lift'));
   assert.ok(openAngle < -1.9,screen.name+' lid should be truly open, got '+openAngle);
   assert.ok(materials>.65,screen.name+' materials should rise, got '+materials);
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox.png',animations:'disabled'});
   await scrollUnbox(1);
   await pg.waitForFunction(()=>Number(document.querySelector('#unbox').dataset.ubProgress)>.989,{timeout:4500});
   const finalOpacity=Number(await unbox.locator('.ub-finished').evaluate(el=>getComputedStyle(el).opacity));
   assert.ok(finalOpacity>.97,screen.name+' completed pink bag must appear');
   await pg.screenshot({path:'screenshots/'+screen.name+'-unbox-finish.png',animations:'disabled'});
   await scrollUnbox(0);
   await pg.waitForFunction(()=>Number(document.querySelector('#unbox').dataset.ubProgress)<.015,{timeout:4500});
   const reclosed=Number(await unbox.locator('.ub-webgl').getAttribute('data-lid-angle'));
   assert.ok(reclosed>-.18,screen.name+' reverse scroll must close the box, got '+reclosed);
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

  // Regression: macOS/Chrome can have prefers-reduced-motion enabled.
  // Previously the UI froze at "03/04" without loading the real 3D scene.
  for(const mode of ['webgl','css-fallback']){
   const low=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
   const lowErrors=[];
   low.on('pageerror',e=>lowErrors.push(String(e)));
   if(mode==='css-fallback') await low.route(/three@0\.180\.0/,route=>route.abort());
   await low.goto(URL+'index.html',{waitUntil:'domcontentloaded'});
   await low.waitForFunction(()=>Boolean(document.getElementById('unbox')?.querySelector('.ub-pin')),{timeout:10000});
   assert.equal(await low.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true,'Should simulate macOS reduced motion');
   assert.equal(await low.locator('#unbox').getAttribute('data-ub-motion-preference'),'reduced');
   assert.equal(await low.locator('#unbox.ub-reduced').count(),0,'Reduced-motion preference must NOT freeze user-controlled scroll');
   const scrollLow=async(p)=>low.evaluate(value=>{
      const el=document.getElementById('unbox'),pin=el.querySelector('.ub-pin');
      const offset=parseFloat(getComputedStyle(pin).top)||0;
      const travel=Math.max(1,el.offsetHeight-(innerHeight-offset));
      scrollTo({top:scrollY+el.getBoundingClientRect().top-offset+travel*value,behavior:'instant'});
   },p);
   await scrollLow(.03);
   await low.waitForFunction(mode=>document.querySelector('#unbox').dataset.ubEngine===mode,mode,{timeout:18000});
   await low.waitForTimeout(320);
   const first=Number(await low.locator('#unbox').getAttribute('data-ub-progress'));
   assert.ok(first<.13,'Reduced-motion initial scene should be mostly closed, got '+first);
   if(mode==='webgl')assert.equal(await low.locator('.ub-webgl canvas').count(),1,'3D canvas missing with reduced motion');
   await scrollLow(.62);
   await low.waitForFunction(()=>Number(document.querySelector('#unbox').dataset.ubProgress)>.53,{timeout:4500});
   const middle=Number(await low.locator('#unbox').getAttribute('data-ub-progress'));
   assert.ok(middle>.53&&middle<.85,'Reduced-motion scroll must change progress: '+middle);
   if(mode==='webgl'){
      const opened=Number(await low.locator('.ub-webgl').getAttribute('data-lid-angle'));
      assert.ok(opened<-1.9,'3D box lid is not moving with reduced-motion enabled: '+opened);
   }else{
      const lid=await low.locator('.ub-fb-lid').evaluate(el=>getComputedStyle(el).transform);
      assert.ok(lid&&lid!=='none','CSS fallback lid did not transform: '+lid);
   }
   await low.screenshot({path:'screenshots/reduced-'+mode+'.png',animations:'disabled'});
   await scrollLow(.03);
   await low.waitForFunction(()=>Number(document.querySelector('#unbox').dataset.ubProgress)<.10,{timeout:4500});
   // Simulate a real mouse/trackpad wheel (not just programmatic scrollTo).
   // Catch cases where scripted tests pass while a human sees a frozen scene.
   const beforeWheel=Number(await low.locator('#unbox').getAttribute('data-ub-progress'));
   await low.mouse.move(780,460);
   await low.mouse.wheel(0,1050);
   await low.waitForFunction(before=>
     Number(document.querySelector('#unbox').dataset.ubProgress)>before+.035
   ,beforeWheel,{timeout:3000});
   const afterWheel=Number(await low.locator('#unbox').getAttribute('data-ub-progress'));
   assert.ok(afterWheel>beforeWheel+.035,'Real wheel failed to animate '+mode+': '+beforeWheel+' → '+afterWheel);
   assert.deepEqual(lowErrors,[],'Errors in reduced-motion '+mode);
   await low.close();
   console.log('PASS reduced-motion '+mode+': scroll-driven 3D/fallback can open and close');
  }

 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
