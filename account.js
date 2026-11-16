import {getStoreClient,storeConfigured,explainError} from './store-client.js';

const authPane=document.getElementById('auth-pane');
const accountPane=document.getElementById('account-pane');
const notice=document.getElementById('portal-notice');
const authForm=document.getElementById('auth-form');
const profileForm=document.getElementById('profile-form');
const submit=document.getElementById('auth-submit');
const buttons=[...document.querySelectorAll('[data-auth-mode]')];
let client=null,mode='login',currentUser=null;

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
 authPane.hidden=Boolean(user);
 accountPane.hidden=!user;
 // Never show a privileged navigation link until the database confirms it.
 const adminLink=document.getElementById('owner-panel-link');
 const adminNav=document.getElementById('portal-admin-nav');
 adminLink.hidden=true;
 adminNav.hidden=true;
 if(!user)return;
 document.getElementById('account-email').textContent=user.email||'';
 const [
  {data:profile,error:profileError},
  {data:orders,error:ordersError},
  {data:ledger,error:ledgerError},
  {data:owner,error:ownerError},
  {data:loyalty}
 ]=await Promise.all([
  client.from('homly_profiles').select('full_name,phone,birthday').eq('user_id',user.id).maybeSingle(),
  client.from('homly_orders').select('id,status,total_kopeks,created_at').order('created_at',{ascending:false}).limit(30),
  client.from('homly_points_ledger').select('points').eq('user_id',user.id).limit(500),
  client.from('homly_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
  client.from('homly_loyalty_settings').select('enabled,earn_percent').eq('id',1).maybeSingle()
 ]);
 if(currentUser?.id!==user.id)return;
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
  ?'За оплачені замовлення нараховуємо бонуси за чинними правилами. Використання балів для оплати поки недоступне.'
  :'Бонусна програма готується до запуску. Тут з’являтимуться твої нарахування.';
 if(profileError||ordersError||ledgerError){
  inform('Дані облікового запису ще не налаштовані. Перевір підключення бази HOMLY.');
  return;
 }
 profileForm.elements.full_name.value=profile?.full_name||'';
 profileForm.elements.phone.value=profile?.phone||'';
 profileForm.elements.birthday.value=profile?.birthday||'';
 const points=(ledger||[]).reduce((sum,item)=>sum+Number(item.points||0),0);
 document.getElementById('points-balance').textContent=String(Math.max(0,points));
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
