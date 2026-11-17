import {getStoreClient,storeConfigured,explainError} from './store-client.js';

const authPane=document.getElementById('auth-pane');
const accountPane=document.getElementById('account-pane');
const notice=document.getElementById('portal-notice');
const authForm=document.getElementById('auth-form');
const profileForm=document.getElementById('profile-form');
const submit=document.getElementById('auth-submit');
const buttons=[...document.querySelectorAll('[data-auth-mode]')];
let client=null,mode='login',currentUser=null;
const syncedPendingOrders=new Set();
const paymentParams=new URLSearchParams(location.search);
const returnOrderId=paymentParams.get('payment')==='return'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentParams.get('order')||'')
 ?paymentParams.get('order'):null;
const paymentBanner=document.getElementById('account-payment-return');
const paymentTitle=document.getElementById('account-payment-title');
const paymentDescription=document.getElementById('account-payment-description');
const paymentRecheck=document.getElementById('account-payment-recheck');

function markPaidBasket(orderId){
 try{
  const key='homly_checkout_'+orderId;
  const done='homly_checkout_done_'+orderId;
  if(sessionStorage.getItem(done)==='yes')return;
  const snapshot=JSON.parse(sessionStorage.getItem(key)||'null');
  if(!Array.isArray(snapshot?.items))return;
  const cart=JSON.parse(localStorage.getItem('homly_cart')||'{}');
  if(!cart||typeof cart!=='object'||Array.isArray(cart))return;
  for(const item of snapshot.items){
   if(typeof item.slug!=='string'||!Number.isInteger(item.quantity)||item.quantity<=0)continue;
   if(!Number.isInteger(cart[item.slug])||cart[item.slug]<0)continue;
   const remaining=Math.max(0,cart[item.slug]-item.quantity);
   if(remaining===0)delete cart[item.slug];else cart[item.slug]=remaining;
  }
  localStorage.setItem('homly_cart',JSON.stringify(cart));
  sessionStorage.setItem(done,'yes');
  sessionStorage.removeItem(key);
 }catch(error){console.warn('HOMLY cart sync failed',error)}
}
function displayPaymentReturn(orders,user){
 if(!returnOrderId)return;
 paymentBanner.hidden=false;
 const order=(orders||[]).find(o=>o.id===returnOrderId);
 paymentRecheck.hidden=true;
 if(!order){
  paymentTitle.textContent='Перевіряємо замовлення';
  paymentDescription.textContent='Замовлення не знайдено в останніх записах. Якщо ти щойно сплатила, звернись до підтримки HOMLY із номером замовлення.';
  return;
 }
 if(order.status==='paid'){
  paymentTitle.textContent='Замовлення оплачено ♡';
  paymentDescription.textContent='Банк підтвердив платіж, а HOMLY отримав інформацію про оплату. Бонуси нараховуються за чинними правилами.';
  markPaidBasket(returnOrderId);
 }else if(order.status==='pending'){
  paymentTitle.textContent='Перевіряємо оплату';
  paymentDescription.textContent='Повернення з платіжної сторінки саме по собі не підтверджує оплату. Спробуй перевірити статус у банку.';
  paymentRecheck.hidden=!window.HOMLY_CONFIG?.paymentsEnabled;
 }else if(order.status==='refunded'){
  paymentTitle.textContent='Оплату повернено';
  paymentDescription.textContent='Статус повернення підтверджений у системі.';
 }else{
  paymentTitle.textContent='Оплату не підтверджено';
  paymentDescription.textContent='За цим замовленням немає підтвердженої оплати. Не оплачувуй його вдруге, поки не перевіриш платіж у своєму банку.';
 }
}
paymentRecheck.addEventListener('click',async()=>{
 if(!client||!currentUser||!returnOrderId)return;
 paymentRecheck.disabled=true;
 try{
  const {error}=await client.functions.invoke('homly-sync-order',{body:{orderId:returnOrderId}});
  if(error)throw error;
  syncedPendingOrders.add(returnOrderId);
  await loadAccount(currentUser);
 }catch{paymentDescription.textContent='Не вдалось отримати статус із банку. Перевір оплату пізніше або звернись у HOMLY.'}
 finally{paymentRecheck.disabled=false}
});
const historyToggle=document.getElementById('rewards-history-toggle');
const historyList=document.getElementById('rewards-history-list');
historyToggle.addEventListener('click',()=>{const open=historyToggle.getAttribute('aria-expanded')==='true';historyToggle.setAttribute('aria-expanded',String(!open));historyList.hidden=open;});

function inform(message){notice.textContent=message||''}
function safe(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function authView(next){
 mode=next;
 for(const b of buttons){
  b.setAttribute('aria-selected',String(b.dataset.authMode===mode));
 }
 submit.textContent=mode==='login'?'Увійти':'Зареєструватись';
 authForm.elements.password.autocomplete=mode==='login'?'current-password':'new-password';
 document.getElementById('forgot-password').hidden=mode!=='login';
 inform('');
}
buttons.forEach(button=>button.addEventListener('click',()=>authView(button.dataset.authMode)));
document.getElementById('show-auth-password').addEventListener('change',event=>{
 document.getElementById('auth-password').type=event.target.checked?'text':'password';
});

async function loadAccount(user){
 currentUser=user;
 document.body.classList.toggle('account-signed-in',Boolean(user));
 authPane.hidden=Boolean(user);
 accountPane.hidden=!user;
 // Never show a privileged navigation link until the database confirms it.
 const adminLink=document.getElementById('owner-panel-link');
 const adminNav=document.getElementById('portal-admin-nav');
 adminLink.hidden=true;
 adminNav.hidden=true;
 if(!user)return;
 // Claim only configured, eligible bonuses; server enforces one-time grants.
 const {data:claimed,error:claimError}=await client.rpc('homly_claim_my_rewards');
 if(claimError)console.warn('HOMLY reward claim unavailable',claimError.message);
 document.getElementById('account-email').textContent=user.email||'';
 const [
  {data:profile,error:profileError},
  {data:orders,error:ordersError},
  {data:ledger,error:ledgerError},
  {data:owner,error:ownerError},
  {data:loyalty},
  {data:wallet,error:walletError}
 ]=await Promise.all([
  client.from('homly_profiles').select('full_name,phone,birthday').eq('user_id',user.id).maybeSingle(),
  client.from('homly_orders').select('id,status,total_kopeks,invoice_id,created_at').eq('customer_id',user.id).order('created_at',{ascending:false}).limit(30),
  client.from('homly_points_ledger').select('points,reason,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(500),
  client.from('homly_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
  client.from('homly_loyalty_settings').select('enabled,earn_percent,redeem_enabled,redeem_kopeks_per_point,redeem_max_percent').eq('id',1).maybeSingle(),
  client.rpc('homly_my_points')
 ]);
 if(currentUser?.id!==user.id)return;
 // Bank redirects are not proof of payment. Re-query the provider server-side
 // for recent pending orders before showing refreshed bonus totals.
 if(window.HOMLY_CONFIG?.paymentsEnabled&&orders?.length){
  const candidates=orders.filter(o=>o.status==='pending'&&o.invoice_id&&!syncedPendingOrders.has(o.id)).slice(0,3);
  candidates.forEach(o=>syncedPendingOrders.add(o.id));
  if(candidates.length){
   const results=await Promise.all(candidates.map(async o=>{
    try{
     const {data,error}=await client.functions.invoke('homly-sync-order',{body:{orderId:o.id}});
     return !error&&['paid','failed','refunded','cancelled'].includes(data?.status);
    }catch{return false}
   }));
   if(results.some(Boolean)&&currentUser?.id===user.id)return loadAccount(user);
  }
 }
 if(!ownerError&&owner?.user_id===user.id){
   adminLink.hidden=false;
   adminNav.hidden=false;
 }
 const friendly=(profile?.full_name||'').trim().split(/\s+/)[0]||'творча людино';
 document.getElementById('account-welcome-name').textContent=friendly;
 document.getElementById('account-avatar').textContent=(profile?.full_name||'').trim()
   ?Array.from(friendly)[0].toUpperCase():'♡';
 const loyaltyInfo=document.getElementById('loyalty-status');
 loyaltyInfo.textContent=loyalty?.enabled
  ?('За оплачені замовлення нараховуємо '+Number(loyalty.earn_percent||0)+'% бонусів. '+
    (loyalty.redeem_enabled&&window.HOMLY_CONFIG?.paymentsEnabled
      ?'Бонуси можна використати при оплаті в кошику.'
      :'Списання бонусів під час оплати поки недоступне.'))
  :'Бонусна програма готується до запуску. Тут з’являтимуться твої нарахування.';
 if(profileError||ordersError||ledgerError||walletError){
  inform('Дані облікового запису ще не налаштовані. Перевір підключення бази HOMLY.');
  return;
 }
 profileForm.elements.full_name.value=profile?.full_name||'';
 profileForm.elements.phone.value=profile?.phone||'';
 profileForm.elements.birthday.value=profile?.birthday||'';
 const points=Number(wallet||0);
 document.getElementById('points-balance').textContent=String(points);
 const reasonLabels={purchase:'За покупку',refund:'Повернення замовлення',adjustment:'Коригування',redeem:'Використано',restore:'Повернення бонусів',signup:'За реєстрацію',birthday:'До дня народження'};
 historyList.innerHTML=(ledger||[]).length?(ledger||[]).map(item=>'<div class="rewards-history-row"><span>'+safe(reasonLabels[item.reason]||'Операція')+'<small>'+safe(new Date(item.created_at).toLocaleDateString('uk-UA'))+'</small></span><strong>'+ (Number(item.points)>0?'+':'')+Number(item.points)+'</strong></div>').join(''):'Нарахувань поки немає.';
 if((ledger||[]).length===500)historyList.insertAdjacentHTML('beforeend','<p>Показано останні 500 операцій. Баланс розраховано за всією історією на сервері.</p>');
 document.getElementById('orders-count').textContent=String(orders?.length||0);
 const list=document.getElementById('orders-list');
 if(!orders?.length){
  list.textContent='Тут з’являться твої замовлення після оплати.';
 }else{
  const labels={pending:'Очікує оплати',paid:'Оплачено',failed:'Помилка оплати',cancelled:'Скасовано',refunded:'Повернено'};
  list.innerHTML=orders.map(row=>
   '<div class="portal-list-row"><div><strong>Замовлення '+safe(row.id.slice(0,8))+'</strong>'+
   '<small>'+new Date(row.created_at).toLocaleDateString('uk-UA')+
   ' · '+(row.total_kopeks/100).toLocaleString('uk-UA')+' грн</small></div>'+
   '<em>'+safe(labels[row.status]||row.status)+'</em></div>'
  ).join('');
 }
 displayPaymentReturn(orders,user);
}
authForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!client){inform('Спочатку потрібно підключити окремий сервер HOMLY.');return}
 const data=new FormData(authForm);
 const email=String(data.get('email')||'').trim().toLowerCase();
 const password=String(data.get('password')||'');
 if(!email||password.length<8){inform('Вкажи пошту і пароль від 8 символів.');return}
 submit.disabled=true;
 try{
  const request=mode==='signup'
   ?client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}})
   :client.auth.signInWithPassword({email,password});
  const {data:result,error}=await request;
  if(error)throw error;
  authForm.reset();
  if(mode==='signup'&&!result?.session){
   inform('Перевір електронну пошту: ми надіслали посилання для підтвердження реєстрації.');
  }else{
   inform('Успішно!');
   if(result?.user)await loadAccount(result.user);
  }
 }catch(error){inform(explainError(error))}
 finally{submit.disabled=false}
});
document.getElementById('forgot-password').addEventListener('click',async()=>{
 if(!client){inform('Спочатку потрібно підключити сервер HOMLY.');return}
 const email=authForm.elements.email.value.trim();
 if(!email){inform('Спочатку введи електронну пошту.');return}
 const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 inform(error?explainError(error):'Якщо ця адреса існує, надішлемо посилання для відновлення пароля.');
});
profileForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!client||!currentUser)return;
 const form=new FormData(profileForm);
 const row={user_id:currentUser.id,
  full_name:String(form.get('full_name')||'').trim().slice(0,120),
  phone:String(form.get('phone')||'').trim().slice(0,30),
  birthday:form.get('birthday')||null,
  updated_at:new Date().toISOString()};
 const {error}=await client.from('homly_profiles').upsert(row,{onConflict:'user_id'});
 if(!error){
  const name=row.full_name.trim().split(/\s+/)[0]||'творча людино';
  document.getElementById('account-welcome-name').textContent=name;
  document.getElementById('account-avatar').textContent=row.full_name?Array.from(name)[0].toUpperCase():'♡';
 }
 inform(error?explainError(error):'Твої дані збережено ♡');
});
document.getElementById('logout-btn').addEventListener('click',async()=>{
 if(!client)return;
 const {error}=await client.auth.signOut();
 if(error)inform(explainError(error));
 else{currentUser=null;await loadAccount(null);inform('Ти вийшла з акаунта.')}
});
async function setup(){
 if(!storeConfigured()){
  inform('Реєстрація поки не активована. Підключаємо окрему базу HOMLY — до того паролі не приймаємо.');
  authForm.querySelectorAll('input,button').forEach(el=>el.disabled=true);
  document.getElementById('forgot-password').disabled=true;
  return;
 }
 try{
  client=await getStoreClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error&&!/Auth session missing/i.test(error.message))throw error;
  await loadAccount(user||null);
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){
      const password=prompt('Новий пароль (мінімум 8 символів):');
      if(password&&password.length>=8)
        client.auth.updateUser({password}).then(({error})=>inform(error?explainError(error):'Пароль змінено.'));
      else inform('Пароль має містити щонайменше 8 символів.');
    }
    if(event==='SIGNED_OUT'){loadAccount(null)}
    if(event==='SIGNED_IN'&&session?.user&&session.user.id!==currentUser?.id){
      queueMicrotask(()=>loadAccount(session.user));
    }
  });
 }catch(error){inform(explainError(error))}
}
setup();
