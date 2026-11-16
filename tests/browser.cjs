const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

(async()=>{
  fs.mkdirSync('screenshots',{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const errors=[];
    const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'no-preference'});
    desktop.on('pageerror',e=>errors.push(String(e)));
    await desktop.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await desktop.locator('.wow-showcase').waitFor();
    await desktop.waitForTimeout(900);
    const heroTitle=await desktop.locator('.wow-title').innerText();
    assert.match(heroTitle,/РОБИ/);
    const anim=await desktop.locator('.wow-word > span').first().evaluate(el=>getComputedStyle(el).animationName);
    assert.ok(anim.includes('wordRise'),'Headline entrance motion should be active');
    const scrollAnim=await desktop.locator('.wow-ticker-track').evaluate(el=>getComputedStyle(el).animationName);
    assert.ok(scrollAnim.includes('marqueeV2'),'Moving ticker should be active');
    const before=await desktop.locator('#showcase-title').innerText();
    await desktop.locator('[data-showcase-dir="1"]').click();
    await desktop.waitForTimeout(600);
    const after=await desktop.locator('#showcase-title').innerText();
    assert.notEqual(before,after,'Product showcase should switch on click');
    await desktop.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'})});
    await desktop.waitForTimeout(400);
    await desktop.screenshot({path:'screenshots/desktop.png',animations:'disabled'});
    await desktop.evaluate(()=>{
      const section=document.getElementById('motion');
      const rect=section.getBoundingClientRect();
      const top=rect.top+scrollY;
      const total=Math.max(1,section.offsetHeight-innerHeight+69);
      scrollTo({top:top+total*.53,behavior:'instant'});
    });
    await desktop.waitForTimeout(700);
    const scene=await desktop.locator('#motion-stage').getAttribute('data-scene');
    assert.equal(scene,'1','Scroll should switch the sticky stage to scene 2');
    await desktop.screenshot({path:'screenshots/desktop-scene.png',animations:'disabled'});
    await desktop.goto('http://127.0.0.1:4173/catalog.html',{waitUntil:'domcontentloaded'});
    await desktop.locator('[data-add="bag"]').click();
    await desktop.goto('http://127.0.0.1:4173/cart.html',{waitUntil:'domcontentloaded'});
    assert.ok(await desktop.locator('.cart-row').count()>=1,'Cart state should persist across pages');
    assert.deepEqual(errors,[],'No unhandled browser JavaScript errors');
    console.log('PASS: desktop entrance, ticker, carousel, scroll scene, cart');

    const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference',isMobile:true,hasTouch:true});
    const mobileErrors=[];
    mobile.on('pageerror',e=>mobileErrors.push(String(e)));
    await mobile.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await mobile.waitForTimeout(900);
    assert.ok(await mobile.locator('#showcase-photo').isVisible(),'Mobile showcase visible');
    await mobile.screenshot({path:'screenshots/mobile.png',fullPage:false,animations:'disabled'});
    const width=await mobile.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    assert.ok(width.sw<=width.cw+6,'No horizontal mobile overflow: '+JSON.stringify(width));
    await mobile.evaluate(()=>{
      const section=document.getElementById('motion');
      const top=section.getBoundingClientRect().top+scrollY;
      const total=Math.max(1,section.offsetHeight-innerHeight+60);
      scrollTo({top:top+total*.58,behavior:'instant'});
    });
    await mobile.waitForTimeout(650);
    assert.equal(await mobile.locator('#motion-stage').getAttribute('data-scene'),'1','Mobile stage changes on scroll');
    assert.deepEqual(mobileErrors,[],'No mobile JavaScript errors');
    console.log('PASS: mobile layout, first-screen motion and scroll scene');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
