const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:4173/';
(async()=>{
 fs.mkdirSync('screenshots',{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const owner of [true,false]){
   const page=await browser.newPage({viewport:{width:1280,height:800}});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   const fake=[
    'const owner='+owner+';',
    "const user={id:'00000000-0000-4000-8000-000000000123',email:'buyer@example.invalid'};",
    'export const storeConfigured=()=>true;',
    'export const explainError=e=>e.message;',
    'export async function getStoreClient(){return {',
    'auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},',
    'from(table){return {',
    'select(){return this},eq(){return this},',
    "maybeSingle:async()=>({data:table==='homly_admins'?(owner?{user_id:user.id}:null):table==='homly_profiles'?{full_name:'Марія',phone:'',birthday:null}:table==='homly_loyalty_settings'?{enabled:false,earn_percent:0}:null,error:null}),",
    "order(){return table==='homly_products'?Promise.resolve({data:[],error:null}):this},",
    'limit:async()=>({data:[],error:null})',
    '}}',
    '}}'
   ].join('\n');
   await page.route('**/store-client.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:fake}));
   await page.goto(base+'account.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('account-pane').hidden,{timeout:6000});
   assert.match(await page.locator('#account-welcome-name').innerText(),/Марія/);
   assert.equal(await page.locator('#owner-panel-link').isVisible(),owner,
      'Owner shortcut must reflect DB membership');
   assert.equal(await page.locator('#portal-admin-nav').isVisible(),owner,
      'Owner header link must reflect DB membership');
   await page.screenshot({path:'screenshots/store-'+(owner?'owner':'customer')+'-account.png',animations:'disabled'});
   await page.goto(base+'catalog.html',{waitUntil:'domcontentloaded'});
   if(owner){
    await page.locator('#nav .homly-owner-nav').waitFor({state:'visible',timeout:6000});
    assert.equal(await page.locator('#nav .homly-owner-nav').getAttribute('href'),'admin.html');
   }else{
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#nav .homly-owner-nav').count(),0,'Buyer must not see owner navigation');
   }
   assert.deepEqual(errors,[],'Account/nav errors: '+errors.join(' / '));
   await page.close();
  }
  const analytics=await browser.newPage({viewport:{width:1180,height:800}});
  const requests=[];
  analytics.on('request',req=>{
   const url=req.url();
   if(url.includes('clarity.ms/tag/')||url.includes('facebook.net/en_US/fbevents.js'))requests.push(url);
  });
  await analytics.route('**/analytics-config.js',route=>route.fulfill({
   status:200,contentType:'text/javascript',
   body:"window.HOMLY_ANALYTICS={clarityId:'ab12cd34ef',metaPixelId:'123456789012345'};"
  }));
  await analytics.route('**/fbevents.js',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:'/* mocked Pixel */'
  }));
  await analytics.route('**/clarity.ms/tag/**',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:'/* mocked Clarity */'
  }));
  await analytics.goto(base+'catalog.html',{waitUntil:'domcontentloaded'});
  await analytics.locator('.homly-consent-panel').waitFor({state:'visible'});
  assert.deepEqual(requests,[],'Marketing scripts loaded BEFORE consent');
  await analytics.getByRole('button',{name:'Лише необхідні'}).click();
  assert.equal(await analytics.locator('.homly-consent-panel').count(),0);
  await analytics.reload({waitUntil:'domcontentloaded'});
  assert.equal(await analytics.locator('.homly-consent-panel').count(),0,'Denied choice not remembered');
  assert.deepEqual(requests,[],'Scripts loaded after denial');
  await analytics.getByRole('button',{name:'Налаштування cookies'}).click();
  await analytics.getByRole('button',{name:'Налаштувати'}).click();
  await analytics.locator('#homly-allow-marketing').check();
  await analytics.getByRole('button',{name:'Зберегти вибір'}).click();
  await analytics.waitForFunction(()=>typeof window.fbq==='function',{timeout:3500});
  assert.equal(requests.filter(x=>x.includes('clarity.ms')).length,0,'Clarity loaded without analytics consent');
  assert.equal(requests.filter(x=>x.includes('facebook.net')).length,1,'Pixel loads only after consent');
  assert.ok(await analytics.evaluate(()=>window.fbq.queue.some(x=>x[0]==='track'&&x[1]==='PageView')),'PageView not fired');
  await analytics.locator('[data-add]').first().click();
  assert.ok(await analytics.evaluate(()=>window.fbq.queue.some(x=>x[0]==='track'&&x[1]==='AddToCart')),'AddToCart not fired');
  await analytics.screenshot({path:'screenshots/store-cookies-selected.png',animations:'disabled'});
  await analytics.close();
  console.log('PASS owner-only links and consent-gated Clarity/Meta events');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
