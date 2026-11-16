import {getStoreClient,storeConfigured,explainError} from './store-client.js';

const status=document.getElementById('admin-status');
const content=document.getElementById('admin-content');
const list=document.getElementById('admin-product-list');
const form=document.getElementById('admin-product-form');
const files=document.getElementById('product-photos');
const previews=document.getElementById('product-photos-preview');
let client=null,allProducts=[],currentImages=[];
function say(value){status.textContent=value||''}
function safe(value){return String(value??'').replace(/[&<>"']/g,ch=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function slugify(name){
 const map={'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ie',
 'ж':'zh','з':'z','и':'y','і':'i','ї':'i','й':'i','к':'k','л':'l','м':'m','н':'n',
 'о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
 'ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'iu','я':'ia'};
 return [...String(name).toLowerCase()].map(c=>map[c]??c).join('')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
}
function showPhotos(){
 previews.replaceChildren();
 currentImages.forEach((url,i)=>{
  const div=document.createElement('div');div.className='portal-image-preview';
  const img=document.createElement('img');img.src=url;img.alt='Фото '+(i+1);
  const del=document.createElement('button');del.type='button';del.textContent='×';
  del.setAttribute('aria-label','Прибрати фото '+(i+1));
  del.addEventListener('click',()=>{currentImages.splice(i,1);showPhotos()});
  div.append(img,del);previews.append(div);
 });
}
function formOpen(product=null){
 form.hidden=false;form.reset();files.value='';
 currentImages=[...(product?.image_urls||[])];
 const get=name=>form.elements.namedItem(name);
 get('id').value=product?.id||'';
 get('title').value=product?.title||'';
 get('slug').value=product?.slug||'';
 get('category').value=product?.category||'beads';
 get('description').value=product?.description||'';
 get('price').value=product?(product.price_kopeks/100).toFixed(2):'';
 get('stock').value=product?.stock??0;
 get('published').checked=Boolean(product?.published);
 get('featured').checked=Boolean(product?.featured);
 document.getElementById('form-title').textContent=product?'Редагувати товар':'Новий товар';
 showPhotos();
 form.scrollIntoView({behavior:'smooth',block:'start'});
}
document.getElementById('new-product').addEventListener('click',()=>formOpen());
document.getElementById('cancel-product').addEventListener('click',()=>{
 form.hidden=true;form.reset();currentImages=[];files.value='';
});
function productRow(product){
 const div=document.createElement('article');div.className='portal-product-item';
 if(product.image_urls?.[0]){
  const photo=document.createElement('img');photo.src=product.image_urls[0];photo.alt=product.title;
  div.append(photo);
 }else{
  const blank=document.createElement('div');blank.className='portal-photo-placeholder';blank.textContent='HOMLY';
  div.append(blank);
 }
 const text=document.createElement('div');
 const title=document.createElement('h3');title.textContent=product.title;
 const p=document.createElement('p');p.textContent=(product.price_kopeks/100).toLocaleString('uk-UA')+' грн · '+product.stock+' шт.';
 const small=document.createElement('small');small.textContent=product.published?'Опубліковано':'Чернетка / не на сайті';
 const edit=document.createElement('button');edit.textContent='Редагувати';
 edit.addEventListener('click',()=>formOpen(product));
 text.append(title,p,small,edit);div.append(text);
 return div;
}
async function loadProducts(){
 const {data,error}=await client.from('homly_products').select('id,slug,title,category,description,price_kopeks,stock,image_urls,published,featured,created_at').order('created_at',{ascending:false});
 if(error)throw error;
 allProducts=data||[];
 list.replaceChildren();
 if(!allProducts.length){
  const note=document.createElement('p');note.className='portal-muted';
  note.textContent='Поки немає товарів. Натисни «Новий товар», щоб додати перший.';
  list.append(note);
 }else allProducts.forEach(product=>list.append(productRow(product)));
}
async function uploadPhotos(){
 const selected=[...files.files];
 if(currentImages.length+selected.length>12)throw new Error('Максимум 12 фотографій на товар.');
 for(const file of selected){
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))
   throw new Error('Дозволено тільки JPEG, PNG, WebP та AVIF.');
  if(file.size>5*1024*1024)throw new Error('Фото має бути до 5 МБ.');
  const ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];
  const path='products/'+crypto.randomUUID()+'.'+ext;
  const {error}=await client.storage.from('homly-products').upload(path,file,{
    contentType:file.type,cacheControl:'3600',upsert:false
  });
  if(error)throw error;
  const {data:publicData}=client.storage.from('homly-products').getPublicUrl(path);
  currentImages.push(publicData.publicUrl);
 }
 files.value='';
 showPhotos();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=document.getElementById('save-product');button.disabled=true;
 say('Завантажуємо фото й зберігаємо товар…');
 try{
  await uploadPhotos();
  const f=new FormData(form);
  const title=String(f.get('title')||'').trim();
  const slug=String(f.get('slug')||'').trim()||
    (slugify(title)+'-'+crypto.randomUUID().slice(0,5));
  const price=Number(f.get('price'));
  const stock=Number(f.get('stock'));
  if(title.length<2||!Number.isFinite(price)||price<1||price>1000000||
     !Number.isInteger(stock)||stock<0)throw new Error('Перевір назву, ціну й залишок.');
  if(!/^[a-z0-9][a-z0-9-]{1,70}$/.test(slug))throw new Error('Артикул має бути латиницею, без пробілів.');
  const value={
   slug,title,category:String(f.get('category')),
   description:String(f.get('description')||'').trim(),
   price_kopeks:Math.round(price*100),stock,
   image_urls:currentImages,
   published:f.get('published')==='on',
   featured:f.get('featured')==='on',
   updated_at:new Date().toISOString()
  };
  const id=String(f.get('id')||'');
  const req=id
    ?client.from('homly_products').update(value).eq('id',id)
    :client.from('homly_products').insert(value);
  const {error}=await req.select('id');
  if(error)throw error;
  form.hidden=true;
  await loadProducts();
  say('Товар збережено. '+(value.published?'Він уже доступний у каталозі.':'Чернетка не видима покупцям.'));
 }catch(error){say(explainError(error))}
 finally{button.disabled=false}
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
 const tab=button.dataset.tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 for(const area of ['products','orders','loyalty','analytics']){
  document.getElementById('admin-'+area).hidden=area!==tab;
 }
}));
async function loadOrders(){
 const root=document.getElementById('admin-orders-list');
 const {data,error}=await client.from('homly_orders').select('id,customer_email,status,total_kopeks,created_at,invoice_id').order('created_at',{ascending:false}).limit(100);
 if(error){root.textContent=explainError(error);return}
 root.replaceChildren();
 if(!data?.length){root.textContent='Поки немає замовлень.';return}
 for(const order of data){
  const row=document.createElement('div');row.className='portal-list-row';
  const a=document.createElement('div');const h=document.createElement('strong');
  h.textContent='№ '+order.id.slice(0,8)+' — '+(order.total_kopeks/100).toLocaleString('uk-UA')+' грн';
  const small=document.createElement('small');small.textContent=order.customer_email+' · '+new Date(order.created_at).toLocaleString('uk-UA');
  a.append(h,small);
  const badge=document.createElement('em');badge.textContent=order.status;
  row.append(a,badge);root.append(row);
 }
}
async function loadLoyalty(){
 const {data,error}=await client.from('homly_loyalty_settings').select('earn_percent,enabled').eq('id',1).single();
 if(error){say(explainError(error));return}
 const lf=document.getElementById('loyalty-form');
 lf.elements.earn_percent.value=data.earn_percent||0;
 lf.elements.enabled.checked=Boolean(data.enabled);
}
document.getElementById('loyalty-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const f=new FormData(event.currentTarget);
 const percent=Number(f.get('earn_percent'));
 if(!Number.isFinite(percent)||percent<0||percent>25){say('Вкажи відсоток від 0 до 25.');return}
 const {error}=await client.from('homly_loyalty_settings')
  .update({earn_percent:percent,enabled:f.get('enabled')==='on',updated_at:new Date().toISOString()})
  .eq('id',1);
 say(error?explainError(error):'Бонусні налаштування збережено.');
});
async function loadTracking(){
 const {data,error}=await client.from('homly_tracking_settings')
   .select('clarity_id,meta_pixel_id').eq('id',1).single();
 if(error){say(explainError(error));return}
 const form=document.getElementById('tracking-settings-form');
 form.elements.clarity_id.value=data.clarity_id||'';
 form.elements.meta_pixel_id.value=data.meta_pixel_id||'';
}
document.getElementById('tracking-settings-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget;
 const clarity_id=form.elements.clarity_id.value.trim();
 const meta_pixel_id=form.elements.meta_pixel_id.value.trim();
 if(clarity_id&&!/^[A-Za-z0-9]{7,24}$/.test(clarity_id)){
  say('ID Clarity має містити 7–24 літери або цифри.');return;
 }
 if(meta_pixel_id&&!/^[0-9]{10,25}$/.test(meta_pixel_id)){
  say('Meta Pixel ID має містити лише 10–25 цифр.');return;
 }
 const submit=document.getElementById('save-tracking-settings');
 submit.disabled=true;
 try{
  const {error}=await client.from('homly_tracking_settings').update({
   clarity_id,meta_pixel_id,updated_at:new Date().toISOString()
  }).eq('id',1);
  if(error)throw error;
  say('ID збережено. Після оновлення сайту інструменти працюватимуть за згодою відвідувачів.');
 }catch(error){say(explainError(error))}
 finally{submit.disabled=false}
});
async function boot(){
 if(!storeConfigured()){
  say('Адмінка підготовлена. Потрібно підключити окремий Supabase-проєкт HOMLY, після цього увійти як власниця.');
  return;
 }
 try{
  client=await getStoreClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user){say('Увійди у свій акаунт HOMLY перед відкриттям адмінки.');return}
  const {data:membership,error:membershipError}=await client.from('homly_admins')
     .select('user_id').eq('user_id',user.id).maybeSingle();
  if(membershipError)throw membershipError;
  if(!membership){say('Доступ лише для власниці HOMLY. Для захисту даних адміністратора призначаємо у Supabase, а не через сайт.');return}
  content.hidden=false;
  say('');
  await Promise.all([loadProducts(),loadOrders(),loadLoyalty(),loadTracking()]);
 }catch(error){say(explainError(error))}
}
boot();
