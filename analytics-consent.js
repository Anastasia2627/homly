/* HOMLY consent-based analytics loader.
   Loads no third-party analytics until explicitly opted in. Does not run on
   account/admin/private profile pages to avoid replaying personal data.
   Never claims a purchase from a browser redirect. */
(function(){
 'use strict';
 Promise.resolve(window.HOMLY_ANALYTICS_READY).catch(()=>{}).then(()=>{
 const config=window.HOMLY_ANALYTICS||{};
 const clarityId=/^[a-z0-9]{7,24}$/i.test(config.clarityId||'')?String(config.clarityId):'';
 const pixelId=/^\d{10,25}$/.test(config.metaPixelId||'')?String(config.metaPixelId):'';
 const ga4Id=/^G-[A-Z0-9]{6,20}$/.test(config.ga4Id||'')?String(config.ga4Id):'';
 const hasProviders=Boolean(clarityId||pixelId||ga4Id);
 const route=location.pathname.split('/').pop();
 const protectedPage=['account.html','admin.html'].includes(route);
 // Scripts are intentionally excluded from pages containing account PII.
 if(protectedPage||!hasProviders)return;
 const key='homly_tracking_consent_v1';
 let preference=null, clarityLoaded=false,pixelLoaded=false,ga4Loaded=false,productViewTracked=false;
 function getPreference(){
  try{
   const stored=JSON.parse(localStorage.getItem(key)||'null');
   if(stored&&typeof stored.analytics==='boolean'&&typeof stored.marketing==='boolean')
    return {analytics:stored.analytics,marketing:stored.marketing};
  }catch{}
  return null;
 }
 function savePreference(prefs){
  const old=preference;
  preference={analytics:Boolean(prefs.analytics),marketing:Boolean(prefs.marketing)};
  try{localStorage.setItem(key,JSON.stringify({...preference,date:new Date().toISOString()}))}catch{}
  // A loaded tracker cannot be completely unloaded. Revoke consent and
  // reload so no tracking code remains active in the current JS environment.
  const reduced=(old?.analytics&&!preference.analytics)||(old?.marketing&&!preference.marketing);
  if(reduced){
   try{if(typeof window.clarity==='function'){
    window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});
    window.clarity('consent',false);
   }}catch{}
   try{if(typeof window.fbq==='function')window.fbq('consent','revoke')}catch{}
   location.reload();
   return;
  }
  applyConsent();
  document.querySelector('.homly-consent-panel')?.remove();
 }
 function clarityLoad(){
  if(clarityLoaded||!clarityId)return;
  clarityLoaded=true;
  window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};
  // Newer Clarity consent V2 API: analytically granted, advertising denied
  // unless marketing was specifically selected.
  window.clarity('consentv2',{
   // Meta Pixel consent is not consent to Microsoft Ads sharing.
   ad_Storage:'denied',analytics_Storage:'granted'
  });
  const script=document.createElement('script');
  script.async=true;script.src='https://www.clarity.ms/tag/'+encodeURIComponent(clarityId);
  script.referrerPolicy='strict-origin-when-cross-origin';
  document.head.appendChild(script);
 }
 function ga4Load(){
  if(ga4Loaded||!ga4Id)return;
  ga4Loaded=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  // Analytics is fetched only after explicit analytics consent.
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied'});
  window.gtag('js',new Date());
  window.gtag('config',ga4Id,{send_page_view:true,anonymize_ip:true});
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ga4Id);
  document.head.appendChild(script);
 }
 function fireProductView(){
  if(route!=='product.html')return;
  const id=new URLSearchParams(location.search).get('id');
  if(!id||!(/^[a-z0-9][a-z0-9-]{0,70}$/.test(id)))return;
  track('ViewContent',{content_ids:[id],content_type:'product'});
 }
 function pixelLoad(){
  if(pixelLoaded||!pixelId)return;
  pixelLoaded=true;
  // Standard Meta Pixel queue, initialized only AFTER marketing consent.
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init',pixelId);
  window.fbq('track','PageView');
 }
 function applyConsent(){
  if(preference?.analytics){clarityLoad();ga4Load();}
  if(preference?.marketing)pixelLoad();
  if((clarityLoaded||pixelLoaded||ga4Loaded)&&!productViewTracked){
   productViewTracked=true;
   fireProductView();
  }
 }
 const allowed=new Set(['ViewContent','AddToCart','AddToWishlist','InitiateCheckout']);
 function track(event,params={}){
  if(!allowed.has(event))return;
  // Clarity event names follow analytics consent, independently of Meta Pixel.
  if(preference?.analytics&&clarityLoaded&&typeof window.clarity==='function')
   window.clarity('event',event);
  if(preference?.analytics&&ga4Loaded&&typeof window.gtag==='function'){
   const names={ViewContent:'view_item',AddToCart:'add_to_cart',
    AddToWishlist:'add_to_wishlist',InitiateCheckout:'begin_checkout'};
   const ids=Array.isArray(params.content_ids)
    ?params.content_ids.filter(x=>/^[a-z0-9][a-z0-9-]{0,70}$/.test(String(x))).slice(0,20):[];
   const payload={items:ids.map(item_id=>({item_id})),currency:'UAH'};
   if(Number.isFinite(params.value)&&params.value>=0)
    payload.value=Math.round(params.value*100)/100;
   window.gtag('event',names[event],payload);
  }
  if(!preference?.marketing||!pixelLoaded||typeof window.fbq!=='function')return;
  const payload={};
  if(Array.isArray(params.content_ids)){
    payload.content_ids=params.content_ids.filter(x=>/^[a-z0-9][a-z0-9-]{0,70}$/.test(String(x))).slice(0,20);
    payload.content_type='product';
  }
  if(Number.isFinite(params.value)&&params.value>=0){
   payload.value=Math.round(params.value*100)/100;
   payload.currency='UAH';
  }
  if(Number.isInteger(params.num_items)&&params.num_items>0)payload.num_items=params.num_items;
  window.fbq('track',event,payload);
 }
 window.HOMLY_TRACK=track;
 function createButton(label,action,cls){
  const btn=document.createElement('button');btn.type='button';btn.className=cls||'';
  btn.textContent=label;btn.addEventListener('click',action);
  return btn;
 }
 function createChoice(label,checked,id){
  const row=document.createElement('label');row.className='homly-consent-choice';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=id;
  checkbox.checked=checked;row.append(checkbox,document.createTextNode(label));
  return row;
 }
 function showPanel(){
  document.querySelector('.homly-consent-panel')?.remove();
  const wrap=document.createElement('section');
  wrap.className='homly-consent-panel';wrap.setAttribute('role','dialog');
  wrap.setAttribute('aria-label','Налаштування cookies');
  const intro=document.createElement('div');intro.className='homly-consent-copy';
  const badge=document.createElement('span');badge.textContent='HOMLY / PRIVACY';
  const h=document.createElement('h2');h.textContent='Трохи про cookies ♡';
  const p=document.createElement('p');
  p.textContent='Аналітика допомагає робити магазин зручнішим, а рекламні cookies — показувати доречні пропозиції. Вмикаємо їх лише з твого дозволу.';
  const link=document.createElement('a');link.href='cookies.html';link.textContent='Як це працює';
  intro.append(badge,h,p,link);
  const actions=document.createElement('div');actions.className='homly-consent-actions';
  const detail=document.createElement('div');detail.className='homly-consent-detail';detail.hidden=true;
  const analytics=createChoice('Аналітика · Clarity та Google Analytics',Boolean(preference?.analytics),'homly-allow-analytics');
  const marketing=createChoice('Реклама · Meta Pixel',Boolean(preference?.marketing),'homly-allow-marketing');
  if(!clarityId&&!ga4Id)analytics.hidden=true;
  if(!pixelId)marketing.hidden=true;
  detail.append(analytics,marketing);
  const settings=createButton('Налаштувати',()=>{detail.hidden=!detail.hidden},'homly-consent-settings');
  const refuse=createButton('Лише необхідні',()=>savePreference({analytics:false,marketing:false}),'homly-consent-reject');
  const accept=createButton('Прийняти всі',()=>savePreference({analytics:Boolean(clarityId||ga4Id),marketing:Boolean(pixelId)}),'homly-consent-accept');
  const save=createButton('Зберегти вибір',()=>savePreference({
   analytics:Boolean((clarityId||ga4Id)&&analytics.querySelector('input').checked),
   marketing:Boolean(pixelId&&marketing.querySelector('input').checked)
  }),'homly-consent-save');
  detail.append(save);
  actions.append(settings,refuse,accept);
  wrap.append(intro,detail,actions);document.body.append(wrap);
 }
 function addSettingsLink(){
  // Footer link is always available after providers are configured:
  const footer=document.querySelector('.footer-bottom')||document.querySelector('.portal-footer');
  if(footer&&!footer.querySelector('.homly-cookie-settings')){
    const a=document.createElement('button');a.type='button';
    a.className='homly-cookie-settings';a.textContent='Налаштування cookies';
    a.addEventListener('click',showPanel);footer.append(a);
  }
 }
 preference=getPreference();
 applyConsent();
 if(document.readyState==='loading'){
   document.addEventListener('DOMContentLoaded',()=>{addSettingsLink();if(!preference)showPanel()},{once:true});
 }else{addSettingsLink();if(!preference)showPanel()}
 });
})();
