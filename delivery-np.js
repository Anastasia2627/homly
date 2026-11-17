// HOMLY checkout location suggestions: never exposes Nova Poshta API credentials.
// Manual input stays available if the provider or login is unavailable.
import {getStoreClient,storeConfigured} from './store-client.js';
let currentForm=null;
async function bindDeliverySuggestions(){
 const form=document.getElementById('homly-checkout-form');
 if(!form||form===currentForm||!storeConfigured())return;
 currentForm=form;
 const city=form.elements.namedItem('city');
 const branch=form.elements.namedItem('branch');
 if(!city||!branch)return;
 const cities=document.createElement('datalist');cities.id='homly-np-cities';
 const warehouses=document.createElement('datalist');warehouses.id='homly-np-warehouses';
 city.setAttribute('list',cities.id);
 branch.setAttribute('list',warehouses.id);
 form.append(cities,warehouses);
 let client;
 try{
  client=await getStoreClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
 }catch{return}
 const hint=document.createElement('small');
 hint.className='homly-delivery-help';
 hint.textContent='Почни вводити місто. Якщо підказки недоступні, введи місто та відділення вручну.';
 branch.closest('label')?.after(hint);
 let suggestedCities=[],suggestedWarehouses=[],cityRef='',sequence=0;
 const debounce=(callback,delay)=>{let timer;return (...args)=>{
  clearTimeout(timer);timer=setTimeout(()=>callback(...args),delay);
 }};
 async function lookup(mode,query,ref=''){
  const {data,error}=await client.functions.invoke('homly-np-locations',{
   body:{mode,query,cityRef:ref}
  });
  if(error||!Array.isArray(data?.items))throw error||new Error('Location search failed');
  return data.items;
 }
 function makeOptions(node,values){
  node.replaceChildren();
  for(const item of values){
   const option=document.createElement('option');
   option.value=item.name;
   node.appendChild(option);
  }
 }
 function matchCity(){
  const found=suggestedCities.find(item=>item.name===city.value);
  const next=found?.ref||'';
  if(cityRef!==next){
   cityRef=next;branch.value='';suggestedWarehouses=[];warehouses.replaceChildren();
  }
  if(cityRef)loadWarehouses('');
 }
 const loadCities=debounce(async()=>{
  const input=city.value.trim();
  const run=++sequence;
  if(input.length<2){cities.replaceChildren();return}
  try{
   const result=await lookup('cities',input);
   if(run!==sequence||!city.isConnected)return;
   suggestedCities=result;
   makeOptions(cities,result);
   // If exactly one value matches, make the link immediately available.
   const found=result.find(item=>item.name===city.value);
   if(found)cityRef=found.ref;
  }catch{cities.replaceChildren()}
 },350);
 let branchSeq=0;
 const loadWarehouses=debounce(async(q)=>{
  if(!cityRef)return;
  const run=++branchSeq;
  try{
   const result=await lookup('warehouses',q,cityRef);
   if(run!==branchSeq||!branch.isConnected)return;
   suggestedWarehouses=result;
   makeOptions(warehouses,result);
  }catch{warehouses.replaceChildren()}
 },350);
 city.addEventListener('input',()=>{
  cityRef='';
  cities.replaceChildren();warehouses.replaceChildren();
  branch.value='';loadCities();
 });
 city.addEventListener('change',matchCity);
 city.addEventListener('blur',()=>{if(suggestedCities.some(item=>item.name===city.value))matchCity()});
 branch.addEventListener('input',()=>loadWarehouses(branch.value.trim()));
}
window.addEventListener('homly:cart-rendered',()=>{void bindDeliverySuggestions()});
window.addEventListener('DOMContentLoaded',()=>{void bindDeliverySuggestions()});
