/* HOMLY: public tracker IDs are read from owner-managed Supabase settings.
   No bank credentials or private keys. We do not load analytics scripts here. */
(function(){
 'use strict';
 window.HOMLY_ANALYTICS={clarityId:'',metaPixelId:'',ga4Id:'',sentryDsn:''};
 const store=window.HOMLY_CONFIG||{};
 const ok=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(store.supabaseUrl||'')&&
  typeof store.publishableKey==='string'&&store.publishableKey.length>20;
 window.HOMLY_ANALYTICS_READY=(async()=>{
  if(!ok)return window.HOMLY_ANALYTICS;
  const root=store.supabaseUrl.replace(/\/$/,'');
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),5000);
  try{
   const url=root+'/rest/v1/homly_tracking_settings?select=clarity_id,meta_pixel_id,ga4_id,sentry_dsn&id=eq.1';
   // Only a published, RLS-protected config row is accessed anonymously.
   // No login cookies, personal identifiers or customer information.
   const response=await fetch(url,{
    method:'GET',mode:'cors',credentials:'omit',
    headers:{'apikey':store.publishableKey,'accept':'application/json'},
    signal:ctrl.signal
   });
   if(!response.ok)throw new Error('HOMLY analytics config '+response.status);
   const items=await response.json();
   const row=Array.isArray(items)?items[0]:null;
   if(row){
    window.HOMLY_ANALYTICS={
     clarityId:typeof row.clarity_id==='string'?row.clarity_id:'',
     metaPixelId:typeof row.meta_pixel_id==='string'?row.meta_pixel_id:'',
     ga4Id:typeof row.ga4_id==='string'?row.ga4_id:'',
     sentryDsn:typeof row.sentry_dsn==='string'?row.sentry_dsn:''
    };
   }
  }catch(error){
   // Fail closed: trackers never load if the configuration is unavailable.
   console.info('HOMLY tracking IDs are unavailable; analytics remains off.');
  }finally{clearTimeout(timer)}
  return window.HOMLY_ANALYTICS;
 })();
})();
