const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  try{
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#unbox').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.getElementById('unbox')?.dataset.ubEngine==='webgl',{timeout:20000});
    fs.mkdirSync('screenshots/animation',{recursive:true});
    for(let i=0;i<=20;i++){
      const progress=Math.round(100*i/20);
      await page.locator('#ub-range').evaluate((e,p)=>{
        e.value=String(p);
        e.dispatchEvent(new Event('input',{bubbles:true}));
      },progress);
      await page.waitForTimeout(120);
      const filename='screenshots/animation/'+String(i).padStart(2,'0')+'.png';
      await page.locator('#ub-pin').screenshot({path:filename,animations:'disabled'});
    }
    console.log('Recorded 21 actual Three.js unboxing frames');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
