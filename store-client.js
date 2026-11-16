/* HOMLY Supabase browser SDK. PINNED to an audited immutable version. */
let cached=null;
export function storeConfigured(){
 const c=window.HOMLY_CONFIG||{};
 return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c.supabaseUrl||'')
   && typeof c.publishableKey==='string' && c.publishableKey.length>20;
}
export async function getStoreClient(){
 if(!storeConfigured())throw new Error('HOMLY_BACKEND_NOT_CONFIGURED');
 if(!cached){
   cached=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm')
     .then(({createClient})=>createClient(
       window.HOMLY_CONFIG.supabaseUrl,
       window.HOMLY_CONFIG.publishableKey,{
         auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
       }))
     .catch(error=>{cached=null;throw error});
 }
 return cached;
}
export function explainError(error){
 if(error?.message==='HOMLY_BACKEND_NOT_CONFIGURED')
   return 'Підключення магазину ще налаштовується. Дані облікових записів поки не зберігаються.';
 const text=error?.message||'Невідома помилка';
 if(/Invalid login credentials/i.test(text))return 'Невірна пошта або пароль.';
 if(/Email not confirmed/i.test(text))return 'Спочатку підтверди електронну пошту.';
 if(/User already registered/i.test(text))return 'Користувач із такою поштою вже зареєстрований.';
 if(/Password should be/i.test(text))return 'Пароль має бути довшим і надійнішим.';
 return text;
}
