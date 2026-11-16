const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 try{
   await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.getElementById('unbox')?.querySelector('.ub-pin'),{timeout:15000});
   await page.waitForFunction(()=>document.getElementById('unbox')?.dataset.ubEngine==='webgl',{timeout:20000})
     .catch(async()=>{await page.evaluate(()=>document.getElementById('unbox').scrollIntoView())});
   fs.mkdirSync('screenshots/animation',{recursive:true});
   for(let i=0;i<=12;i++){
     await page.evaluate(i=>{
       const e=document.getElementById('unbox'),sticky=parseFloat(getComputedStyle(e.querySelector('.ub-pin')).top)||0;
       const travel=Math.max(1,e.offsetHeight-(innerHeight-sticky));
       scrollTo({top:scrollY+e.getBoundingClientRect().top-sticky+travel*i/12,behavior:'instant'});
     },i);
     await page.waitForTimeout(i===0?1700:1250);
     await page.locator('#ub-pin').screenshot({
       path:'screenshots/animation/'+String(i).padStart(2,'0')+'.png',animations:'disabled'
     });
   }
   console.log('Captured 13 scroll-linked frames without using manual scrub controls');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
