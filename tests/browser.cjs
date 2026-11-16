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
   assert.equal(await pg.locator('.ref-hero-bag').getAttribute('src'),'assets/hero-bag.webp',
     screen.name+' live hero should load the optimized WebP');
   assert.equal(await pg.locator('link[rel="preload"][as="image"]').getAttribute('href'),'assets/hero-bag.webp',
     screen.name+' preload should request the optimized image before JS');
   const bagBytes=await pg.evaluate(async()=>{
     const response=await fetch('assets/hero-bag.webp');
     if(!response.ok)throw new Error('WebP unavailable: '+response.status);
     return (await response.arrayBuffer()).byteLength;
   });
   assert.ok(bagBytes<450000,screen.name+' hero asset too large: '+bagBytes);

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
   assert.equal(await unbox.locator('.ub-tip,.ub-showroom-note').count(),0,
     screen.name+' remove both unboxing service labels');
   const unboxHeight=await unbox.evaluate(e=>e.getBoundingClientRect().height);
   assert.ok(unboxHeight>screen.height*(screen.name==='mobile'?2.0:2.7),
     screen.name+' scroll runway too short to show 3D stages: '+unboxHeight);
   assert.ok(unboxHeight<screen.height*(screen.name==='mobile'?3.35:4.1),
     screen.name+' opening remains too slow: '+unboxHeight);
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

   const cats=pg.locator('#categories-home');
   assert.equal(await pg.locator('.home > section').nth(3).getAttribute('id'),'categories-home','Categories should be section 04');
   assert.equal(await cats.locator('.cat-card').count(),4,'Four category cards missing');
   assert.equal(await cats.locator('.cat-card-arrow svg').count(),4,
     screen.name+' all card links should use consistent arrow SVGs');
   const expectedIds=['beads','textile','decor','candles'];
   for(let i=0;i<4;i++){
     const item=cats.locator('.cat-card').nth(i);
     assert.equal(await item.getAttribute('href'),'catalog.html?category='+expectedIds[i],
       screen.name+' category destination incorrect');
     const photoReady=await item.locator('img').evaluate(async img=>{
       // Later carousel items load lazily until they approach the viewport.
       // Force this one image only for QA without penalizing site visitors.
       img.loading='eager';
       try{await img.decode()}catch{}
       return img.complete&&img.naturalWidth>0;
     });
     assert.ok(photoReady,screen.name+' category photograph missing '+expectedIds[i]);
   }
   await pg.waitForTimeout(180);
   if(screen.name==='desktop'){
     const catScroll=async(p)=>{
       await pg.evaluate(amount=>{
         const section=document.getElementById('categories-home');
         const pin=section.querySelector('.cat-sticky');
         const offset=parseFloat(getComputedStyle(pin).top)||0;
         const travel=Math.max(1,section.offsetHeight-pin.getBoundingClientRect().height);
         scrollTo({top:scrollY+section.getBoundingClientRect().top-offset+travel*amount,behavior:'instant'});
       },p);
       await pg.waitForTimeout(160);
     };
     await catScroll(.07);
     const firstX=(await cats.locator('.cat-card').first().boundingBox()).x;
     await catScroll(.92);
     const lastX=(await cats.locator('.cat-card').first().boundingBox()).x;
     assert.ok(firstX-lastX>130,screen.name+' horizontal motion absent: '+firstX+' → '+lastX);
     assert.equal(await cats.getAttribute('data-cat-index'),'4');
     await catScroll(.18);
     // Dragging from the section heading (not from a photo) should move rail.
     const dragFrom=await cats.locator('.cat-heading').boundingBox();
     const beforeDrag=(await cats.locator('.cat-card').first().boundingBox()).x;
     await pg.mouse.move(dragFrom.x+Math.min(230,dragFrom.width*.40),dragFrom.y+26);
     await pg.mouse.down();
     await pg.mouse.move(dragFrom.x+Math.min(230,dragFrom.width*.40)-140,dragFrom.y+29,{steps:9});
     await pg.mouse.up();
     await pg.waitForTimeout(200);
     const afterDrag=(await cats.locator('.cat-card').first().boundingBox()).x;
     assert.ok(beforeDrag-afterDrag>55,
       screen.name+' dragging outside cards should move category gallery: '+beforeDrag+'→'+afterDrag);
   }else{
     await cats.locator('.cat-heading').scrollIntoViewIfNeeded();
     assert.equal(await cats.locator('.cat-window').evaluate(el=>getComputedStyle(el).overflowX),'auto',
       'Mobile categories should swipe natively');
     const initialLeft=await cats.locator('.cat-window').evaluate(el=>el.scrollLeft);
     await cats.locator('#cat-next').click();
     await pg.waitForTimeout(700);
     const currentLeft=await cats.locator('.cat-window').evaluate(el=>el.scrollLeft);
     assert.ok(currentLeft>initialLeft+60,screen.name+' mobile swipe controls are not moving');
     // Start horizontal touch from the heading, above the photo strip.
     const beforeHeaderSwipe=await cats.locator('.cat-window').evaluate(el=>el.scrollLeft);
     await cats.locator('.cat-heading').evaluate(el=>{
       const rect=el.getBoundingClientRect();
       const y=rect.top+25,x=rect.left+Math.min(210,rect.width*.8);
       const send=(type,pos)=>{
         const finger=new Touch({identifier:1,target:el,clientX:pos,clientY:y});
         el.dispatchEvent(new TouchEvent(type,{
           bubbles:true,cancelable:true,
           touches:type==='touchend'?[]:[finger],changedTouches:[finger]
         }));
       };
       send('touchstart',x);send('touchmove',x-280);send('touchend',x-280);
     });
     await pg.waitForTimeout(200);
     const afterHeaderSwipe=await cats.locator('.cat-window').evaluate(el=>el.scrollLeft);
     assert.ok(afterHeaderSwipe>beforeHeaderSwipe+30,
       screen.name+' touching heading should also swipe gallery: '+beforeHeaderSwipe+' → '+afterHeaderSwipe);
   }
   if(screen.name==='desktop'){
     const heading=await cats.locator('.cat-heading h2').getAttribute('class');
     assert.ok(heading.includes('is-visible'),'Desktop category heading is hidden instead of revealed');
   }else{
     await pg.evaluate(()=>{
       const sec=document.getElementById('categories-home');
       const target=scrollY+sec.getBoundingClientRect().top-68;
       scrollTo({top:target,behavior:'instant'});
     });
     await pg.waitForTimeout(700);
     const heading=await cats.locator('.cat-heading h2').getAttribute('class');
     assert.ok(heading.includes('is-visible'),'Mobile category heading is hidden');
   }
   await pg.screenshot({path:'screenshots/'+screen.name+'-categories.png',animations:'disabled'});
   const corners=await pg.evaluate(()=>['.ub-pin','.cat-sticky','.atmosphere-section','.homly-finale']
     .map(sel=>({sel,radius:getComputedStyle(document.querySelector(sel)).borderTopLeftRadius})));
   assert.ok(corners.every(item=>parseFloat(item.radius)===0),
     screen.name+' unwanted white corner wedges: '+JSON.stringify(corners));
   const atmosphere=pg.locator('#atmosphere');
   assert.equal(await pg.locator('.home > section').nth(4).getAttribute('id'),'atmosphere',
     screen.name+' HOMLY atmosphere must be fifth section');
   assert.equal(await atmosphere.locator('.atmosphere-sticker').count(),5,
     screen.name+' five creative atmosphere phrases required');
   assert.equal(await atmosphere.locator('.atmosphere-photo').getAttribute('src'),'assets/atmosphere.webp',
     screen.name+' user-uploaded image should load as optimized WebP');
   await atmosphere.locator('.atmosphere-photo').evaluate(async image=>{
     image.loading='eager';
     try{await image.decode()}catch{}
   });
   assert.ok(await atmosphere.locator('.atmosphere-photo').evaluate(image=>image.complete&&image.naturalWidth>0),
     screen.name+' atmosphere photo unavailable');
   await pg.evaluate(()=>{
     const sec=document.getElementById('atmosphere');
     scrollTo({top:scrollY+sec.getBoundingClientRect().top-(innerWidth<=760?68:72),behavior:'instant'});
   });
   await pg.waitForFunction(()=>
      document.getElementById('atmosphere')?.dataset.atmosphereRevealed==='true',
      {timeout:4000});
   await pg.waitForTimeout(1650);
   assert.ok(await atmosphere.evaluate(el=>getComputedStyle(el.querySelector('.atmosphere-sticker--e')).opacity)>.95,
     screen.name+' atmosphere stickers should appear after viewport entry');
   await pg.screenshot({path:'screenshots/'+screen.name+'-atmosphere.png',animations:'disabled'});
   const finale=pg.locator('#final');
   assert.equal(await pg.locator('.home > section').nth(5).getAttribute('id'),'final',
     screen.name+' Final should be the sixth and last homepage section');
   assert.equal(await pg.locator('.home > section').count(),6,
     screen.name+' homepage should have exactly six main sections');
   assert.equal(await pg.locator('.home .best,.home .final-cta').count(),0,
     screen.name+' old duplicate finale and extra bestsellers should be removed');
   assert.match(await finale.locator('#final-title').innerText(),/Ну що,[\s\S]*потворимо\?/);
   assert.equal(await finale.locator('.finale-link').getAttribute('href'),'catalog.html',
     screen.name+' final CTA must link to catalog');
   assert.equal(await finale.locator('.finale-product img').getAttribute('src'),'assets/hero-bag.webp',
     screen.name+' should reuse already-optimized transparent product picture');
   await finale.locator('.finale-product img').evaluate(async img=>{
     img.loading='eager';
     try{await img.decode()}catch{}
   });
   assert.ok(await finale.locator('.finale-product img').evaluate(img=>img.complete&&img.naturalWidth>0),
     screen.name+' final product image did not load');
   await pg.evaluate(()=>{
     const section=document.getElementById('final');
     const top=scrollY+section.getBoundingClientRect().top-(innerWidth<=720?68:72);
     scrollTo({top,behavior:'instant'});
   });
   await pg.waitForFunction(()=>document.getElementById('final')?.dataset.finaleRevealed==='true',
     {timeout:4500});
   await pg.waitForTimeout(2350);
   const finaleVisibility=await finale.evaluate(el=>({
     heading:Number(getComputedStyle(el.querySelector('.finale-title>span')).opacity),
     bag:Number(getComputedStyle(el.querySelector('.finale-product')).opacity),
     link:Number(getComputedStyle(el.querySelector('.finale-link')).opacity)
   }));
   assert.ok(finaleVisibility.heading>.97&&finaleVisibility.bag>.97&&finaleVisibility.link>.97,
     screen.name+' finale content missing after entrance: '+JSON.stringify(finaleVisibility));
   await finale.locator('.finale-link').click({trial:true});
   await pg.screenshot({path:'screenshots/'+screen.name+'-finale.png',animations:'disabled'});
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

  // Wide desktop regression: reading width stays constrained on large monitors.
  const wide=await browser.newPage({viewport:{width:2280,height:1180},reducedMotion:'no-preference'});
  try{
    for(const pageName of ['catalog','product','favorites','cart','about','contacts']){
      await wide.goto(URL+pageName+'.html',{waitUntil:'domcontentloaded'});
      const designSheet=await wide.locator('link[href^="site-polish.css"]').count();
      assert.equal(designSheet,1,pageName+' missing common HOMLY design language');
      const sizes=await wide.evaluate(()=>{
        const wrap=document.querySelector('main .wrap');
        const title=document.querySelector('main h1');
        return {content:wrap?.getBoundingClientRect().width||0,
          title:title?parseFloat(getComputedStyle(title).fontSize):0,
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
      });
      assert.ok(sizes.content>0&&sizes.content<=1230,
        pageName+' content too wide on 2280px screen: '+JSON.stringify(sizes));
      assert.ok(sizes.title<=100,
        pageName+' heading oversized: '+JSON.stringify(sizes));
      assert.ok(sizes.overflow<=3,
        pageName+' horizontal page overflow: '+JSON.stringify(sizes));
      await wide.screenshot({path:'screenshots/wide-'+pageName+'.png',animations:'disabled'});
    }
    await wide.goto(URL+'index.html',{waitUntil:'domcontentloaded'});
    await wide.locator('.ref-hero-bag').waitFor();
    const wideWrap=await wide.locator('.ref-hero-layout').evaluate(el=>el.getBoundingClientRect().width);
    assert.ok(wideWrap<=1230,'Wide HOMLY homepage exceeds readable width: '+wideWrap);
    await wide.screenshot({path:'screenshots/wide-home.png',animations:'disabled'});
    console.log('PASS 2280px wide layout and all six store pages');
  }finally{await wide.close()}

  // Store infrastructure regression: account and owner admin are real pages,
  // but do not accept credentials/payments until a dedicated backend is linked.
  for(const screen of [{width:1280,height:800,name:'laptop'},{width:390,height:844,name:'phone'}]){
    const portal=await browser.newPage({viewport:screen});
    const problems=[];
    portal.on('pageerror',error=>problems.push(String(error)));
    await portal.goto(URL+'account.html',{waitUntil:'domcontentloaded'});
    await portal.waitForTimeout(350);
    assert.equal(await portal.locator('#auth-form').count(),1,'Buyer auth form missing');
    assert.equal(await portal.locator('#auth-form input[name="password"]').getAttribute('type'),'password');
    assert.equal(await portal.locator('#auth-form input[name="email"]').isDisabled(),false,
      'HOMLY Auth form should be active after connecting Supabase');
    assert.equal(await portal.evaluate(()=>window.HOMLY_CONFIG?.paymentsEnabled),false,
      'Live card charges must remain disabled');
    assert.equal(await portal.evaluate(()=>window.HOMLY_CONFIG?.supabaseUrl),
      'https://rdwcymfjktxbyoidyhax.supabase.co',
      'HOMLY must be connected to the dedicated Supabase project');
    await portal.screenshot({path:'screenshots/'+screen.name+'-account.png',animations:'disabled'});
    await portal.goto(URL+'admin.html',{waitUntil:'domcontentloaded'});
    await portal.waitForTimeout(350);
    assert.equal(await portal.locator('#admin-content').isHidden(),true,'Admin must be gated');
    assert.equal(await portal.locator('#product-photos').getAttribute('multiple'),'',
      'Admin must support multiple photos');
    assert.equal(await portal.locator('#admin-product-form [name="price"]').count(),1);
    assert.equal(await portal.locator('#admin-product-form [name="stock"]').count(),1);
    await portal.screenshot({path:'screenshots/'+screen.name+'-admin.png',animations:'disabled'});
    assert.deepEqual(problems,[],'Portal JS errors: '+problems.join(' / '));
    await portal.close();
  }
  console.log('PASS buyer auth Supabase connection / gated admin screens; payments disabled');

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
