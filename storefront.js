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
async function initLiveCatalog(){
 if(!storeConfigured()){
  document.documentElement.dataset.homlyStore='demo';
  return;
 }
 try{
  const client=await getStoreClient();
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
  if(typeof window.HOMLY_UPDATE_PRODUCTS==='function')
    window.HOMLY_UPDATE_PRODUCTS(data.map(productOf));
  document.documentElement.dataset.homlyStore='live';
 }catch(error){
  console.warn('HOMLY product sync unavailable:',explainError(error));
  document.documentElement.dataset.homlyStore='offline';
 }
}
async function checkout(items,delivery){
 if(!storeConfigured())throw new Error('HOMLY_BACKEND_NOT_CONFIGURED');
 if(!window.HOMLY_CONFIG.paymentsEnabled)
   throw new Error('Онлайн-оплата ще не активована. Зараз можна переглядати товари, але не оплатити замовлення.');
 const client=await getStoreClient();
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){
   location.href='account.html?next=checkout';
   throw new Error('Для оплати увійди або зареєструйся в HOMLY.');
 }
 const {data,error}=await client.functions.invoke('homly-create-checkout',{body:{items,delivery}});
 if(error)throw error;
 if(!data?.pageUrl||!(/^https:\/\//.test(data.pageUrl)
    && ((new URL(data.pageUrl)).hostname==='monobank.ua'
       ||(new URL(data.pageUrl)).hostname.endsWith('.monobank.ua'))))
   throw new Error('Платіжна сторінка недоступна. Спробуй пізніше.');
 location.assign(data.pageUrl);
}
window.HOMLY_CHECKOUT=checkout;
initLiveCatalog();
