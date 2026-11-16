// HOMLY: authenticated, server-priced monobank checkout.
// Deploy only to HOMLY's OWN Supabase project. Never store merchant token in Git.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const originAllowed = (origin: string | null) =>
 !!origin && [
  Deno.env.get('HOMLY_SITE_ORIGIN') || 'https://anastasia2627.github.io',
  'http://127.0.0.1:4173','http://localhost:4173'
 ].includes(origin);
function respond(req: Request, body: unknown, status=200){
 const origin=req.headers.get('origin');
 return new Response(JSON.stringify(body),{
  status,headers:{
   'content-type':'application/json',
   'access-control-allow-origin':originAllowed(origin)?origin!:'https://anastasia2627.github.io',
   'access-control-allow-headers':'authorization, apikey, content-type, x-client-info',
   'access-control-allow-methods':'POST, OPTIONS',
   'vary':'origin'
  }
 });
}
const validString=(value: unknown,max:number,min=2)=>
 typeof value==='string' && value.trim().length>=min&&value.trim().length<=max;

Deno.serve(async req=>{
 if(req.method==='OPTIONS')
  return new Response(null,{status:204,headers:{
   'access-control-allow-origin':originAllowed(req.headers.get('origin'))
      ?req.headers.get('origin')!:'https://anastasia2627.github.io',
   'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
   'access-control-allow-methods':'POST,OPTIONS','vary':'origin'
  }});
 if(req.method!=='POST')return respond(req,{error:'Method not allowed'},405);
 if(!originAllowed(req.headers.get('origin')))return respond(req,{error:'Origin denied'},403);
 const url=Deno.env.get('SUPABASE_URL');
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const mono=Deno.env.get('MONOBANK_TOKEN');
 const callback=Deno.env.get('HOMLY_MONO_WEBHOOK_URL');
 const site=Deno.env.get('HOMLY_SITE_URL')||'https://anastasia2627.github.io/homly';
 if(!url||!secret||!mono||!callback)
  return respond(req,{error:'Payment gateway not configured'},503);
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(bearer))
  return respond(req,{error:'Sign in required'},401);
 const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const jwt=bearer.replace(/^Bearer\s+/i,'');
 const {data:{user},error:authError}=await client.auth.getUser(jwt);
 if(authError||!user||!user.email_confirmed_at)
  return respond(req,{error:'Verified account required'},401);
 let input:Record<string,unknown>;
 try{input=await req.json()}catch{return respond(req,{error:'Invalid JSON'},400)}
 const items=input.items;
 const delivery=input.delivery as Record<string,unknown>|null;
 if(!Array.isArray(items)||items.length<1||items.length>15 ||
    !delivery||typeof delivery!=='object'||
    !validString(delivery.name,120,3)||!validString(delivery.phone,30,9)||
    !validString(delivery.city,120)||!validString(delivery.branch,160))
  return respond(req,{error:'Invalid basket or delivery data'},400);
 const quantities=new Map<string,number>();
 for(const raw of items){
  if(!raw||typeof raw!=='object')return respond(req,{error:'Invalid item'},400);
  const slug=(raw as Record<string,unknown>).slug;
  const qty=(raw as Record<string,unknown>).quantity;
  if(typeof slug!=='string'|| !/^[a-z0-9][a-z0-9-]{1,70}$/.test(slug)||
     !Number.isInteger(qty)||Number(qty)<1||Number(qty)>20||
     quantities.has(slug))return respond(req,{error:'Invalid quantity or product ID'},400);
  quantities.set(slug,Number(qty));
 }
 const tenMinutesAgo=new Date(Date.now()-10*60*1000).toISOString();
 const {count:recent,error:limitError}=await client.from('homly_orders')
  .select('id',{count:'exact',head:true})
  .eq('customer_id',user.id).eq('status','pending')
  .gte('created_at',tenMinutesAgo);
 if(limitError)return respond(req,{error:'Please retry later'},503);
 if((recent||0)>=6)return respond(req,{error:'Too many pending checkouts'},429);
 const {data:products,error:productsError}=await client.from('homly_products')
  .select('id,slug,title,price_kopeks,stock,published')
  .in('slug',[...quantities.keys()]).eq('published',true);
 if(productsError)return respond(req,{error:'Product lookup unavailable'},503);
 if(!products||products.length!==quantities.size)
  return respond(req,{error:'Some products are no longer available'},409);
 let total=0;
 const basket=[];
 for(const p of products){
  const quantity=quantities.get(p.slug)!;
  if(p.stock<quantity||!Number.isSafeInteger(p.price_kopeks)||p.price_kopeks<=0)
   return respond(req,{error:'Stock or price changed'},409);
  const subtotal=p.price_kopeks*quantity;
  total+=subtotal;
  basket.push({id:p.id,title:p.title,quantity,unit:p.price_kopeks,total:subtotal});
 }
 if(total<100||total>100000000||!Number.isSafeInteger(total))
  return respond(req,{error:'Order total is invalid'},400);
 // Delivery fee is NOT included in this checkout; customers pay carrier tariffs.
 const deliverySafe={
  name:String(delivery.name).trim(),phone:String(delivery.phone).trim(),
  city:String(delivery.city).trim(),branch:String(delivery.branch).trim(),
  delivery_fee:'paid_separately_to_carrier'
 };
 const {data:order,error:orderError}=await client.from('homly_orders').insert({
  customer_id:user.id,customer_email:user.email,
  status:'pending',subtotal_kopeks:total,total_kopeks:total,delivery:deliverySafe
 }).select('id').single();
 if(orderError||!order)return respond(req,{error:'Could not create order'},500);
 try{
  const {error:itemError}=await client.from('homly_order_items').insert(
   basket.map(p=>({
    order_id:order.id,product_id:p.id,title:p.title,quantity:p.quantity,
    price_kopeks:p.unit,total_kopeks:p.total
   }))
  );
  if(itemError)throw itemError;
  const resp=await fetch('https://api.monobank.ua/api/merchant/invoice/create',{
   method:'POST',headers:{'content-type':'application/json','X-Token':mono},
   body:JSON.stringify({
    amount:total,ccy:980,paymentType:'debit',
    merchantPaymInfo:{
     reference:order.id,destination:'HOMLY — творчі набори',
     customerEmails:[user.email],
     basketOrder:basket.map(item=>({
      name:item.title,qty:item.quantity,
      sum:item.unit,total:item.total,unit:'шт.'
     }))
    },
    redirectUrl:site+'/account.html',
    webHookUrl:callback
   })
  });
  const result=await resp.json();
  if(!resp.ok||typeof result.invoiceId!=='string'||typeof result.pageUrl!=='string')
   throw new Error('Merchant invoice unavailable');
  const payUrl=new URL(result.pageUrl);
  if(payUrl.protocol!=='https:' ||
     (payUrl.hostname!=='monobank.ua'&&!payUrl.hostname.endsWith('.monobank.ua')))
   throw new Error('Unsafe payment URL');
  const {error:invoiceError}=await client.from('homly_orders')
   .update({invoice_id:result.invoiceId}).eq('id',order.id).eq('status','pending');
  if(invoiceError)throw invoiceError;
  return respond(req,{orderId:order.id,pageUrl:payUrl.href});
 }catch(error){
  console.error('HOMLY checkout initialization failed',String(error));
  await client.from('homly_orders').update({status:'failed'}).eq('id',order.id).eq('status','pending');
  return respond(req,{error:'Payment temporarily unavailable; no charge was made here'},502);
 }
});
