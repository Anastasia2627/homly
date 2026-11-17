import {getStoreClient,storeConfigured,explainError} from './store-client.js';
import {productTemplates,missingForPublication,parseCSV,exportCSV,parseImportRow,productCategories,productLevels,csvHeaders} from './product-workflow.js';

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

const searchInput=document.getElementById('product-search');
const filterInput=document.getElementById('product-status-filter');
const csvImport=document.getElementById('product-csv-import');
const preview=document.getElementById('product-preview');
const previewBody=document.getElementById('product-preview-content');
const readiness=document.getElementById('product-readiness');
let previewObjectUrl=null;

function previewClear(){
 if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}
 preview.hidden=true;previewBody.replaceChildren();
}
function productFormValue(){
 const f=new FormData(form);
 const priceString=String(f.get('price')||'').trim();
 const timeString=String(f.get('time_minutes')||'').trim();
 const price=priceString===''?null:Number(priceString);
 const time=timeString===''?null:Number(timeString);
 return {
  slug:String(f.get('slug')||'').trim().toLowerCase(),
  title:String(f.get('title')||'').trim(),
  category:String(f.get('category')||'beads'),
  description:String(f.get('description')||'').trim(),
  kit_contents:String(f.get('kit_contents')||'').trim(),
  skill_level:String(f.get('skill_level')||'beginner'),
  time_minutes:time,
  price_kopeks:price===null?null:Math.round(price*100),
  stock:Number(f.get('stock')),
  image_urls:currentImages.slice(),
  published:f.get('published')==='on',
  featured:f.get('featured')==='on'
 };
}
function publicationMissing(product,pendingImages=0){
 const id=String(form.elements.id.value||'');
 const original=allProducts.find(p=>p.id===id);
 return missingForPublication(product,{
  pendingImages,newPublication:!original?.published
 });
}
function showReadiness(){
 if(form.hidden)return;
 const data=productFormValue();
 const missing=publicationMissing(data,files.files.length);
 const archived=allProducts.some(p=>p.id===form.elements.id.value&&p.archived);
 if(archived){
  readiness.textContent='Товар в архіві. Для публікації спочатку натисни «Відновити» у списку.';
  readiness.dataset.ready='false';return;
 }
 readiness.dataset.ready=String(missing.length===0);
 readiness.textContent=missing.length
  ?'Ще потрібно для публікації: '+missing.join(' · ')+'. Чернетку можна зберегти вже зараз.'
  :'Усі обов’язкові поля готові. Публікація потребує підтвердження.';
}
function showPhotos(){
 previews.replaceChildren();
 currentImages.forEach((url,i)=>{
  const div=document.createElement('div');div.className='portal-image-preview';
  const img=document.createElement('img');img.src=url;img.alt='Фото '+(i+1);
  img.loading='lazy';
  const controls=document.createElement('div');controls.className='homly-photo-controls';
  const makeButton=(label,action,disabled=false)=>{
   const button=document.createElement('button');button.type='button';
   button.textContent=label;button.disabled=disabled;
   button.setAttribute('aria-label',label+' фото '+(i+1));
   button.addEventListener('click',action);return button;
  };
  const move=(to)=>{
   [currentImages[i],currentImages[to]]=[currentImages[to],currentImages[i]];
   showPhotos();
  };
  controls.append(
   makeButton('←',()=>move(i-1),i===0),
   makeButton('→',()=>move(i+1),i===currentImages.length-1),
   makeButton('×',()=>{currentImages.splice(i,1);showPhotos()})
  );
  const number=document.createElement('small');number.textContent=i===0?'Обкладинка':String(i+1);
  div.append(img,number,controls);previews.append(div);
 });
 showReadiness();
}
function applyTemplate(category){
 const preset=productTemplates[category];
 if(!preset)return;
 form.elements.category.value=preset.category;
 form.elements.title.placeholder=preset.title;
 form.elements.description.placeholder=preset.description;
 form.elements.kit_contents.placeholder=preset.kit;
 showReadiness();
}
function formOpen(product=null){
 form.hidden=false;form.reset();files.value='';previewClear();
 currentImages=[...(product?.image_urls||[])];
 const get=name=>form.elements.namedItem(name);
 get('id').value=product?.id||'';
 get('title').value=product?.title||'';
 get('slug').value=product?.slug||'';
 get('category').value=product?.category||'beads';
 get('description').value=product?.description||'';
 get('kit_contents').value=product?.kit_contents||'';
 get('skill_level').value=product?.skill_level||'beginner';
 get('time_minutes').value=product?.time_minutes??'';
 get('price').value=product?.price_kopeks!=null?(product.price_kopeks/100).toFixed(2):'';
 get('stock').value=product?.stock??0;
 get('published').checked=Boolean(product?.published);
 get('featured').checked=Boolean(product?.featured);
 document.getElementById('form-title').textContent=product?.id?'Редагувати товар':'Нова чернетка';
 document.getElementById('save-product').textContent=product?.id?'Зберегти зміни':'Створити чернетку';
 applyTemplate(get('category').value);
 showPhotos();
 form.scrollIntoView({behavior:'smooth',block:'start'});
}
function copyDraft(product){
 formOpen({...product,id:'',slug:'',title:product.title+' — копія',stock:0,
  published:false,featured:false,archived:false});
 say('Створено копію в редакторі. Вона не потрапить на сайт, поки ти не заповниш дані й не опублікуєш.');
}
async function toggleArchive(product){
 const destination=!product.archived;
 if(destination&&!confirm('Перемістити «'+product.title+'» до архіву? На сайті товар зникне, але в базі та старих замовленнях залишиться.'))return;
 const data=destination?{archived:true,published:false,featured:false}:{archived:false};
 const {data:updated,error}=await client.from('homly_products').update(data)
  .eq('id',product.id).select('id');
 if(error)throw error;
 if(!updated?.length)throw new Error('Сервер не підтвердив зміну статусу.');
 await loadProducts();
 say(destination?'Товар переміщено в архів.':'Товар відновлено як чернетку.');
}
function productRow(product){
 const div=document.createElement('article');div.className='portal-product-item';
 if(product.image_urls?.[0]){
  const photo=document.createElement('img');photo.src=product.image_urls[0];photo.alt=product.title;
  div.append(photo);
 }else{
  const blank=document.createElement('div');blank.className='portal-photo-placeholder';
  blank.textContent='HOMLY';div.append(blank);
 }
 const body=document.createElement('div');
 const title=document.createElement('h3');title.textContent=product.title;
 const cost=product.price_kopeks==null?'Ціна не вказана':(product.price_kopeks/100).toLocaleString('uk-UA')+' грн';
 const desc=document.createElement('p');desc.textContent=cost+' · '+product.stock+' шт.';
 const state=document.createElement('small');
 state.textContent=product.archived?'В архіві':product.published?'Опубліковано'+(product.stock===0?' · немає в наявності':''):
  missingForPublication(product).length?'Чернетка · потрібні дані':'Чернетка · готова до публікації';
 const actions=document.createElement('div');actions.className='homly-item-actions';
 const button=(label,fn)=>{
  const el=document.createElement('button');el.type='button';el.textContent=label;
  el.addEventListener('click',async()=>{
   el.disabled=true;try{await fn()}catch(error){say(explainError(error))}finally{el.disabled=false}
  });
  return el;
 };
 actions.append(
  button('Редагувати',()=>formOpen(product)),
  button('Дублювати',()=>copyDraft(product)),
  button(product.archived?'Відновити':'В архів',()=>toggleArchive(product))
 );
 body.append(title,desc,state,actions);div.append(body);
 return div;
}
function renderProductList(){
 const term=String(searchInput.value||'').trim().toLocaleLowerCase('uk-UA');
 const mode=filterInput.value;
 const matching=allProducts.filter(product=>{
  if(mode==='archived'&&!product.archived)return false;
  if(mode!=='archived'&&product.archived)return false;
  if(mode==='draft'&&product.published)return false;
  if(mode==='ready'&&!product.published)return false;
  const text=(product.title+' '+product.slug).toLocaleLowerCase('uk-UA');
  return !term||text.includes(term);
 });
 const count=document.getElementById('product-count-status');
 const active=allProducts.filter(p=>!p.archived);
 count.textContent='Активних: '+active.length+' · чернеток: '+active.filter(p=>!p.published).length+
  ' · опубліковано: '+active.filter(p=>p.published).length+
  ' · архів: '+allProducts.filter(p=>p.archived).length;
 list.replaceChildren();
 if(!matching.length){
  const note=document.createElement('p');note.className='portal-muted';
  note.textContent=allProducts.length?'За цим фільтром товарів немає.':
   'Поки немає реальних товарів. Коли вони з’являться, створи чернетки або імпортуй CSV. Демонстраційні товари не будуть записані в базу.';
  list.append(note);return;
 }
 matching.forEach(p=>list.append(productRow(p)));
}
async function loadProducts(){
 const {data,error}=await client.from('homly_products')
  .select('id,slug,title,category,description,kit_contents,skill_level,time_minutes,price_kopeks,stock,image_urls,published,featured,archived,created_at')
  .order('created_at',{ascending:false});
 if(error)throw error;
 allProducts=data||[];
 renderProductList();
}
searchInput.addEventListener('input',renderProductList);
filterInput.addEventListener('change',renderProductList);
document.getElementById('new-product').addEventListener('click',()=>formOpen());
document.getElementById('product-template').addEventListener('change',event=>{
 const category=event.target.value;
 if(!category)return;
 if(!form.hidden&&form.elements.id.value){
  if(!confirm('Новий шаблон відкриє чисту чернетку. Незбережені зміни поточної картки буде втрачено.')){
   event.target.value='';return;
  }
 }
 if(form.hidden||form.elements.id.value)formOpen();
 applyTemplate(category);
 event.target.value='';
});
document.getElementById('cancel-product').addEventListener('click',()=>{
 previewClear();form.hidden=true;form.reset();currentImages=[];files.value='';
});
document.getElementById('close-product-preview').addEventListener('click',previewClear);
form.addEventListener('input',showReadiness);
form.addEventListener('change',showReadiness);
files.addEventListener('change',showReadiness);
document.getElementById('save-product-draft').addEventListener('click',()=>{
 form.elements.published.checked=false;
 form.requestSubmit();
});
document.getElementById('preview-product').addEventListener('click',()=>{
 previewClear();
 const data=productFormValue();
 const card=document.createElement('article');card.className='homly-preview-card';
 const photo=document.createElement('div');photo.className='homly-preview-image';
 if(currentImages.length||files.files.length){
  const image=document.createElement('img');
  if(currentImages.length){image.src=currentImages[0]}
  else{previewObjectUrl=URL.createObjectURL(files.files[0]);image.src=previewObjectUrl}
  image.alt='Обкладинка товару';photo.append(image);
 }else photo.textContent='Фото ще немає';
 const details=document.createElement('div');
 const subtitle=document.createElement('small');subtitle.textContent='ПРИВАТНИЙ ПЕРЕГЛЯД · НЕ НА САЙТІ';
 const h=document.createElement('h3');h.textContent=data.title||'Назва набору';
 const price=document.createElement('strong');price.textContent=data.price_kopeks==null
  ?'Ціну не вказано':(data.price_kopeks/100).toLocaleString('uk-UA')+' грн';
 const description=document.createElement('p');description.textContent=data.description||'Опис ще не додано';
 const contents=document.createElement('p');contents.textContent='У наборі: '+(data.kit_contents||'комплектація ще не затверджена');
 details.append(subtitle,h,price,description,contents);card.append(photo,details);
 previewBody.append(card);preview.hidden=false;
 preview.scrollIntoView({behavior:'smooth',block:'nearest'});
});
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
 files.value='';showPhotos();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=document.getElementById('save-product');
 button.disabled=true;
 const draftButton=document.getElementById('save-product-draft');
 draftButton.disabled=true;
 try{
  const data=productFormValue();
  const id=String(form.elements.id.value||'');
  const original=allProducts.find(p=>p.id===id);
  if(data.title.length<2||data.title.length>180||!productCategories.has(data.category)||
     !Number.isInteger(data.stock)||data.stock<0||data.stock>100000||
     (data.price_kopeks!==null&&(!Number.isSafeInteger(data.price_kopeks)||data.price_kopeks<100||data.price_kopeks>100000000))||
     !productLevels.has(data.skill_level)||
     (data.time_minutes!==null&&(!Number.isInteger(data.time_minutes)||data.time_minutes<10||data.time_minutes>1440)))
   throw new Error('Перевір назву, категорію, ціну, час і залишок.');
  if(data.description.length>5000||data.kit_contents.length>5000)
   throw new Error('Опис і комплектація мають бути до 5000 символів.');
  const pending=[...files.files];
  if(currentImages.length+pending.length>12)throw new Error('Дозволено не більше 12 фото.');
  for(const image of pending){
   if(!['image/jpeg','image/png','image/webp','image/avif'].includes(image.type)||
      image.size>5*1024*1024)throw new Error('Фото: JPEG/PNG/WebP/AVIF, до 5 МБ кожне.');
  }
  if(data.published){
   if(original?.archived)throw new Error('Спочатку віднови товар з архіву.');
   const missing=publicationMissing(data,pending.length);
   if(missing.length)throw new Error('Ще не готово до публікації: '+missing.join(', '));
   if(!original?.published&&!confirm('Опублікувати «'+data.title+'» для покупців HOMLY? Дані стануть публічними.'))return;
  }
  const slug=data.slug||(slugify(data.title)+'-'+crypto.randomUUID().slice(0,6));
  if(!/^[a-z0-9][a-z0-9-]{1,70}$/.test(slug))
   throw new Error('Артикул має бути латиницею, без пробілів.');
  say('Зберігаємо товар у Supabase…');
  await uploadPhotos();
  const value={...data,slug,image_urls:currentImages.slice(),
   archived:Boolean(original?.archived),updated_at:new Date().toISOString()};
  if(data.published&&publicationMissing(value).length)
   throw new Error('Після завантаження фото картка не готова до публікації.');
  const request=id
   ?client.from('homly_products').update(value).eq('id',id)
   :client.from('homly_products').insert(value);
  const {data:saved,error}=await request.select('id');
  if(error)throw error;
  if(!saved?.length)throw new Error('Сервер не підтвердив збереження товару.');
  form.hidden=true;previewClear();
  await loadProducts();
  say(data.published?'Опубліковано. Товар відображатиметься в каталозі після оновлення сторінки.':
   'Чернетку збережено. Покупці її не бачать.');
 }catch(error){say(explainError(error))}
 finally{button.disabled=false;draftButton.disabled=false}
});
function downloadCSV(content,filename){
 const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
document.getElementById('product-csv-template').addEventListener('click',()=>{
 downloadCSV('\uFEFF'+csvHeaders.join(',')+'\r\n','homly-product-template.csv');
});
document.getElementById('product-csv-export').addEventListener('click',()=>{
 if(!allProducts.length){say('Експортувати поки нічого. Завантаж шаблон CSV.');return}
 downloadCSV(exportCSV(allProducts),'homly-products-'+new Date().toISOString().slice(0,10)+'.csv');
 say('Експортовано '+allProducts.length+' карток. Фото й статус публікації з CSV не імпортуються.');
});
csvImport.addEventListener('change',async event=>{
 const file=event.currentTarget.files?.[0];if(!file)return;
 try{
  if(file.size>1000000)throw new Error('CSV має бути до 1 МБ.');
  const raw=await file.text();
  const rows=parseCSV(raw);
  if(!rows.length)throw new Error('У CSV немає рядків з товарами.');
  if(rows.length>100)throw new Error('За раз можна імпортувати до 100 чернеток.');
  const existing=new Set(allProducts.map(p=>p.slug));
  const seen=new Set();
  const values=rows.map(item=>{
   let row;try{row=parseImportRow(item)}
   catch(error){throw new Error('Рядок '+item.row+': '+error.message)}
   if(!row.slug)row.slug=slugify(row.title)+'-'+crypto.randomUUID().slice(0,6);
   if(existing.has(row.slug)||seen.has(row.slug))
    throw new Error('Повторюється артикул '+row.slug+' (рядок '+item.row+').');
   seen.add(row.slug);return row;
  });
  if(!confirm('Імпортувати '+values.length+' карток у HOMLY як ЧЕРНЕТКИ? Жодна з них не буде опублікована.'))return;
  const button=event.currentTarget;button.disabled=true;
  let imported=0;
  try{
   for(let start=0;start<values.length;start+=20){
    const batch=values.slice(start,start+20);
    const {data:saved,error}=await client.from('homly_products').insert(batch).select('id');
    if(error)throw new Error('Після '+imported+' карток: '+explainError(error));
    imported+=saved?.length||0;
   }
  }finally{button.disabled=false}
  await loadProducts();say('Імпортовано '+imported+' чернеток. Додай фото, ціни та перевір дані перед публікацією.');
 }catch(error){say('Імпорт не завершено: '+explainError(error))}
 finally{event.currentTarget.value=''}
});

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
 const tab=button.dataset.tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 for(const area of ['products','orders','loyalty','analytics','integrations']){
  document.getElementById('admin-'+area).hidden=area!==tab;
 }
}));
async function loadOrders(){
 const root=document.getElementById('admin-orders-list');
 const {data,error}=await client.from('homly_orders').select('id,customer_email,status,total_kopeks,created_at,invoice_id,bank_review_reason').order('created_at',{ascending:false}).limit(100);
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
  if(order.bank_review_reason){
   const warning=document.createElement('small');
   warning.style.color='#9B1743';
   const messages={
    NO_INVOICE_ID:'Потребує перевірки: рахунок банку не збережено',
    BANK_INVOICE_MISMATCH:'Потребує перевірки: дані рахунку не збігаються',
    BANK_RECONCILE_ERROR:'Потребує перевірки: банк не підтвердив статус'
   };
   warning.textContent=messages[order.bank_review_reason]||'Потребує перевірки оплати';
   a.append(warning);
  }
  row.append(a,badge);root.append(row);
 }
}
document.getElementById('reconcile-orders').addEventListener('click',async event=>{
 if(!client)return;
 const button=event.currentTarget;
 button.disabled=true;say('Перевіряємо статуси оплати в банку…');
 try{
  const {data,error}=await client.from('homly_orders')
   .select('id,invoice_id,status').in('status',['pending','paid'])
   .not('invoice_id','is',null).order('created_at',{ascending:false}).limit(15);
  if(error)throw error;
  if(!data?.length){say('Немає платежів для перевірки.');return;}
  let checked=0,failed=0;
  for(const order of data){
   const {error:syncError}=await client.functions.invoke('homly-sync-order',{
    body:{orderId:order.id}
   });
   if(syncError)failed++;else checked++;
  }
  await loadOrders();
  say(failed?'Перевірено '+checked+'; помилки у '+failed+'. Перевір підключення monobank.':
    'Звірено з банком '+checked+' замовлень.');
 }catch(error){say(explainError(error))}
 finally{button.disabled=false}
});
async function loadLoyalty(){
 const {data,error}=await client.from('homly_loyalty_settings').select('earn_percent,enabled,redeem_enabled,redeem_kopeks_per_point,redeem_max_percent,signup_points,birthday_points').eq('id',1).single();
 if(error){say(explainError(error));return}
 const lf=document.getElementById('loyalty-form');
 lf.elements.earn_percent.value=data.earn_percent||0;
 lf.elements.enabled.checked=Boolean(data.enabled);
 lf.elements.redeem_enabled.checked=Boolean(data.redeem_enabled);
 lf.elements.redeem_uah.value=(Number(data.redeem_kopeks_per_point||100)/100).toFixed(2);
 lf.elements.redeem_max_percent.value=Number(data.redeem_max_percent??20);
 lf.elements.signup_points.value=Number(data.signup_points||0);
 lf.elements.birthday_points.value=Number(data.birthday_points||0);
}
document.getElementById('loyalty-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const f=new FormData(event.currentTarget);
 const percent=Number(f.get('earn_percent'));
 const uah=Number(f.get('redeem_uah'));
 const kop=Math.round(uah*100);
 const maxPercent=Number(f.get('redeem_max_percent'));
 const signup=Number(f.get('signup_points'));
 const birthday=Number(f.get('birthday_points'));
 if(!Number.isFinite(percent)||percent<0||percent>25||
    !Number.isFinite(uah)||kop<1||kop>10000||
    !Number.isInteger(maxPercent)||maxPercent<0||maxPercent>90||
    !Number.isInteger(signup)||signup<0||signup>10000||
    !Number.isInteger(birthday)||birthday<0||birthday>10000){
   say('Перевір значення бонусної програми.');return;
 }
 const {error}=await client.from('homly_loyalty_settings')
  .update({earn_percent:percent,enabled:f.get('enabled')==='on',
    redeem_enabled:f.get('redeem_enabled')==='on',
    redeem_kopeks_per_point:kop,redeem_max_percent:maxPercent,
    signup_points:signup,birthday_points:birthday,
    updated_at:new Date().toISOString()})
  .eq('id',1);
 say(error?explainError(error):'Бонусні налаштування збережено на сервері.');
});

async function loadIntegrationStatus(){
 const root=document.getElementById('integrations-state');
 if(!client||!root)return;
 root.textContent='Перевіряємо підключення сервісів…';
 try{
  const {data,error}=await client.functions.invoke('homly-integration-status',{body:{}});
  if(error||!data?.services)throw error||new Error('Немає відповіді сервера');
  const names={
   monobank:'plata by mono — платіжний токен',
   novaPoshta:'Нова пошта — довідники відділень',
   resend:'Resend — транзакційні листи',
   ownerEmail:'Email для сповіщень власниці',
   telegram:'Telegram — повідомлення про замовлення'
  };
  root.replaceChildren();
  for(const [id,label] of Object.entries(names)){
   const row=document.createElement('div');row.className='portal-list-row';
   const a=document.createElement('div');const name=document.createElement('strong');name.textContent=label;
   const hint=document.createElement('small');
   const ready=Boolean(data.services[id]);
   hint.textContent=ready?'Ключ додано · перевірка реальної роботи ще потрібна':'Потрібно додати налаштування в Supabase';
   a.append(name,hint);
   const badge=document.createElement('em');
   badge.textContent=ready?'Налаштовано':'Не підключено';
   row.append(a,badge);root.append(row);
  }
 }catch(error){root.textContent='Не вдалося перевірити статуси. '+explainError(error)}
}
document.getElementById('refresh-integrations').addEventListener('click',loadIntegrationStatus);
async function loadTracking(){
 const {data,error}=await client.from('homly_tracking_settings')
   .select('clarity_id,meta_pixel_id,ga4_id,sentry_dsn').eq('id',1).single();
 if(error){say(explainError(error));return}
 const form=document.getElementById('tracking-settings-form');
 form.elements.clarity_id.value=data.clarity_id||'';
 form.elements.meta_pixel_id.value=data.meta_pixel_id||'';
 form.elements.ga4_id.value=data.ga4_id||'';
 form.elements.sentry_dsn.value=data.sentry_dsn||'';
 const state=document.getElementById('clarity-connection-status');
 state.textContent=data.clarity_id
  ?'Clarity ID збережено. Аналітика завантажуватиметься лише після згоди відвідувача; кабінет і адмінка виключені.'
  :'Clarity ще не активовано: додай Project ID із кабінету Microsoft Clarity та натисни «Зберегти ID».';
}
document.getElementById('tracking-settings-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget;
 const clarity_id=form.elements.clarity_id.value.trim();
 const meta_pixel_id=form.elements.meta_pixel_id.value.trim();
 const ga4_id=form.elements.ga4_id.value.trim().toUpperCase();
 const sentry_dsn=form.elements.sentry_dsn.value.trim();
 if(clarity_id&&!/^[A-Za-z0-9]{7,24}$/.test(clarity_id)){
  say('ID Clarity має містити 7–24 літери або цифри.');return;
 }
 if(meta_pixel_id&&!/^[0-9]{10,25}$/.test(meta_pixel_id)){
  say('Meta Pixel ID має містити лише 10–25 цифр.');return;
 }
 if(ga4_id&&!/^G-[A-Z0-9]{6,20}$/.test(ga4_id)){
  say('GA4 Measurement ID повинен починатися на G-.');return;
 }
 if(sentry_dsn&&!/^https:\/\/[0-9a-f]{16,64}@[a-z0-9.-]+\.sentry\.io\/\d+$/i.test(sentry_dsn)){
  say('Вкажи публічний Browser DSN з Sentry, без секретного токена.');return;
 }
 const submit=document.getElementById('save-tracking-settings');
 submit.disabled=true;
 try{
  const {data:saved,error}=await client.from('homly_tracking_settings').update({
   clarity_id,meta_pixel_id,ga4_id,sentry_dsn,updated_at:new Date().toISOString()
  }).eq('id',1).select('clarity_id,meta_pixel_id,ga4_id,sentry_dsn').single();
  if(error)throw error;
  if(saved.clarity_id!==clarity_id||saved.meta_pixel_id!==meta_pixel_id||saved.ga4_id!==ga4_id||saved.sentry_dsn!==sentry_dsn)
   throw new Error('Налаштування не підтверджено сервером.');
  document.getElementById('clarity-connection-status').textContent=clarity_id
   ?'Clarity ID збережено на сервері. Збір сесій — лише за згодою відвідувача.'
   :'Clarity вимкнено: Project ID не вказано.';
  say('Налаштування збережено. Перевір відвідування у Microsoft Clarity після згоди на cookies.');
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
  await Promise.all([loadProducts(),loadOrders(),loadLoyalty(),loadTracking(),loadIntegrationStatus()]);
 }catch(error){say(explainError(error))}
}
boot();
