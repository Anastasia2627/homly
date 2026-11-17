import {getStoreClient,storeConfigured,explainError} from './store-client.js';

/* HOMLY live catalog. Admin changes appear on refresh; local sample data remain
 * visible until a separate HOMLY Supabase project is configured and seeded. */
const categories={
 beads:{type:'Бусини',shade:'#D7DCFA'},
 textile:{type:'Вишивка',shade:'#F7C6DE'},
 candles:{type:'Свічки',shade:'#FFD9C0'},
 decor:{type:'Декор',shade:'#E8DBF5'}
};
const escaped=s=>String(s||'').replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function productOf(row){
 const fallback=categories[row.category]||categories.decor;
 const image=(row.image_urls||[])[0]||'assets/box.webp';
 const safePhoto=/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/homly-products\//.test(image)
   ?escaped(image):'assets/box.webp';
 return {
  id:escaped(row.slug),name:escaped(row.title),
  desc:escaped(row.description),
  category:row.category,type:fallback.type,
  price:Math.round(Number(row.price_kopeks))/100,
  photo:safePhoto,shade:fallback.shade,
  stock:Math.max(0,Number(row.stock)||0)
 };
}
async function attachOwnerNavigation(client){
 try{
   const {data:{user},error}=await client.auth.getUser();
   if(error||!user)return;
   const {data:member,error:memberError}=await client.from('homly_admins')
     .select('user_id').eq('user_id',user.id).maybeSingle();
   if(memberError||member?.user_id!==user.id)return;
   const nav=document.getElementById('nav');
   if(nav&&!nav.querySelector('.homly-owner-nav')){
     const link=document.createElement('a');
     link.href='admin.html';
     link.className='homly-owner-nav';
     link.textContent='Панель власниці';
     nav.append(link);
   }
 }catch(error){
   // No owner link for unauthenticated customers or network errors.
   console.info('HOMLY studio link unavailable',error);
 }
}
async function initLiveCatalog(){
 if(!storeConfigured()){
  document.documentElement.dataset.homlyStore='demo';
  return;
 }
 try{
  const client=await getStoreClient();
  void attachOwnerNavigation(client);
  const {data,error}=await client.from('homly_products')
   .select('slug,title,category,description,price_kopeks,stock,image_urls,published')
   .eq('published',true).order('created_at',{ascending:false});
  if(error)throw error;
  // Keep existing visual demo until the owner publishes the first real kit.
  // Payment remains disabled; no sample product can be ordered.
  if(!data?.length){
    document.documentElement.dataset.homlyStore='awaiting-products';
    return;
  }
  document.documentElement.dataset.homlyStore='live';
  if(typeof window.HOMLY_UPDATE_PRODUCTS==='function')
    window.HOMLY_UPDATE_PRODUCTS(data.map(productOf));
 }catch(error){
  console.warn('HOMLY product sync unavailable:',explainError(error));
  document.documentElement.dataset.homlyStore='offline';
 }
}
async function checkout(items,delivery,redeemPoints=0){
 if(!storeConfigured())throw new Error('HOMLY_BACKEND_NOT_CONFIGURED');
 if(!window.HOMLY_CONFIG.paymentsEnabled)
   throw new Error('Онлайн-оплата ще не активована. Зараз можна переглядати товари, але не оплатити замовлення.');
 if(document.documentElement.dataset.homlyStore!=='live')
   throw new Error('Перед оплатою дочекайся завантаження актуального каталогу HOMLY.');
 const client=await getStoreClient();
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){
   location.href='account.html?next=checkout';
   throw new Error('Для оплати увійди або зареєструйся в HOMLY.');
 }
 const {data,error}=await client.functions.invoke('homly-create-checkout',{body:{items,delivery,redeemPoints}});
 if(error)throw error;
 if(!data?.pageUrl||typeof data.orderId!=='string')
   throw new Error('Платіжна сторінка недоступна. Спробуй пізніше.');
 const payUrl=new URL(data.pageUrl);
 if(payUrl.protocol!=='https:'||payUrl.username||payUrl.password||
    !['pay.mbnk.biz','monobank.ua','pay.monobank.ua'].includes(payUrl.hostname))
   throw new Error('Невідома адреса платіжної сторінки. Звернись до HOMLY.');
 // Retain only this basket snapshot: delete purchased quantities when the bank
 // confirms success, not when a visitor merely follows an external redirect.
 try{
  sessionStorage.setItem('homly_checkout_'+data.orderId,JSON.stringify({
    items:items.map(i=>({slug:i.slug,quantity:i.quantity}))
  }));
 }catch{}
 location.assign(payUrl.href);
}
window.HOMLY_CHECKOUT=checkout;
initLiveCatalog();


// Personalised, read-only preview. Actual wallet/price limits are enforced in
// a single database transaction when the order is reserved on the server.
async function prepareLoyaltyCheckout(){
 if(!window.HOMLY_CONFIG?.paymentsEnabled||!storeConfigured())return;
 const form=document.getElementById('homly-checkout-form');
 const area=document.getElementById('homly-redeem-area');
 const input=document.getElementById('homly-redeem-points');
 const hint=document.getElementById('homly-redeem-hint');
 const preview=document.getElementById('homly-redeem-preview');
 if(!form||!area||!input||!hint||!preview)return;
 try{
  const client=await getStoreClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
  const [{data:settings,error:rulesError},{data:balance,error:walletError}]=await Promise.all([
   client.from('homly_loyalty_settings').select('redeem_enabled,redeem_kopeks_per_point,redeem_max_percent').eq('id',1).single(),
   client.rpc('homly_my_points')
  ]);
  if(rulesError||walletError||!settings?.redeem_enabled)return;
  const value=Number(settings.redeem_kopeks_per_point);
  const percent=Number(settings.redeem_max_percent);
  const gross=Number(form.dataset.subtotalKopeks);
  if(!Number.isInteger(value)||value<1||!Number.isFinite(gross))return;
  const available=Math.max(0,Number(balance)||0);
  const max=Math.max(0,Math.min(available,
    Math.floor((gross*percent/100)/value),Math.floor((gross-100)/value)));
  area.hidden=false;
  input.disabled=max===0;input.max=String(max);
  const money=n=>(n/100).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2})+' грн';
  hint.textContent='На балансі '+available+' бонусів · максимум '+max+' · 1 бонус = '+money(value);
  const update=()=>{
   const count=Math.max(0,Math.min(max,Math.floor(Number(input.value)||0)));
   input.value=String(count);
   preview.textContent=count?'Знижка бонусами: −'+money(count*value):'';
  };
  input.addEventListener('input',update);update();
 }catch(error){console.warn('HOMLY loyalty preview unavailable',error)}
}
window.addEventListener('DOMContentLoaded',prepareLoyaltyCheckout);
window.addEventListener('homly:cart-rendered',prepareLoyaltyCheckout);
