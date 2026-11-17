// HOMLY acquiring: authenticated checkout, atomic stock/points reservation.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const allowedOrigins=new Set([
 Deno.env.get("HOMLY_SITE_ORIGIN")||"https://anastasia2627.github.io",
 "http://127.0.0.1:4173","http://localhost:4173"
]);
function response(req:Request,body:unknown,status=200){
 const origin=req.headers.get("origin");
 return new Response(JSON.stringify(body),{status,headers:{
  "content-type":"application/json",
  ...(origin&&allowedOrigins.has(origin)?{"access-control-allow-origin":origin}:{}),
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS","vary":"origin"
 }});
}
function serviceKey():string{
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
   JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
}
const textField=(v:unknown,max:number,min:number)=>
 typeof v==="string"&&v.trim().length>=min&&v.trim().length<=max;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return response(req,{},204);
 if(req.method!=="POST")return response(req,{error:"METHOD_NOT_ALLOWED"},405);
 if(!allowedOrigins.has(req.headers.get("origin")||""))return response(req,{error:"ORIGIN_DENIED"},403);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const token=Deno.env.get("MONOBANK_TOKEN")||"";
 const callback=Deno.env.get("HOMLY_MONO_WEBHOOK_URL")||
   (url.replace(/\/$/,"")+"/functions/v1/homly-mono-webhook");
 const secret=serviceKey();
 const site=Deno.env.get("HOMLY_SITE_URL")||"https://anastasia2627.github.io/homly";
 // No checkout attempt or stock reservation while banking is unconfigured.
 if(!url||!secret||!token)return response(req,{error:"PAYMENTS_NOT_CONFIGURED"},503);
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return response(req,{error:"AUTH_REQUIRED"},401);
 const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(bearer.replace(/^Bearer\s+/i,""));
 if(authError||!user||!user.email||!user.email_confirmed_at)
  return response(req,{error:"VERIFIED_EMAIL_REQUIRED"},401);
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=="object")throw Error("json")}
 catch{return response(req,{error:"INVALID_JSON"},400)}
 const items=data.items;
 const delivery=data.delivery as Record<string,unknown>|null;
 const redeem=data.redeemPoints===undefined?0:data.redeemPoints;
 if(!Array.isArray(items)||items.length<1||items.length>15||
   !Number.isSafeInteger(redeem)||Number(redeem)<0||
   !delivery||typeof delivery!=="object"||Array.isArray(delivery)||
   !textField(delivery.name,120,3)||!textField(delivery.phone,30,9)||
   !textField(delivery.city,120,2)||!textField(delivery.branch,160,2))
  return response(req,{error:"INVALID_CHECKOUT"},400);
 if(items.some(item=>!item||typeof item!=="object"||
    typeof item.slug!=="string"||
    !/^[a-z0-9][a-z0-9-]{1,70}$/.test(item.slug)||
    !Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20))
  return response(req,{error:"INVALID_ITEMS"},400);
 const tenMinutesAgo=new Date(Date.now()-10*60_000).toISOString();
 const {count:recent,error:limitError}=await client.from("homly_orders")
  .select("id",{count:"exact",head:true}).eq("customer_id",user.id)
  .eq("status","pending").gte("created_at",tenMinutesAgo);
 if(limitError)return response(req,{error:"CHECKOUT_UNAVAILABLE"},503);
 if((recent||0)>=6)return response(req,{error:"TOO_MANY_ATTEMPTS"},429);
 const safeDelivery={name:String(delivery.name).trim(),phone:String(delivery.phone).trim(),
  city:String(delivery.city).trim(),branch:String(delivery.branch).trim(),
  delivery_fee:"paid_separately_to_carrier"};
 const {data:reserved,error:reserveError}=await client.rpc("homly_reserve_checkout",{
  p_customer:user.id,p_email:user.email,p_items:items,p_delivery:safeDelivery,p_redeem:redeem
 });
 if(reserveError||!reserved?.order_id){
  console.warn("HOMLY reserve rejected",reserveError?.message);
  return response(req,{error:"OUT_OF_STOCK_OR_POINTS_LIMIT"},409);
 }
 const orderId=reserved.order_id as string;
 const amount=Number(reserved.total_kopeks);
 const discount=Number(reserved.redeemed_kopeks);
 const basket=reserved.basket as Array<{title:string;quantity:number;price:number;total:number}>;
 const payInfo:Record<string,unknown>={
   reference:orderId,destination:"HOMLY — творчі набори",
   customerEmails:[user.email],basketOrder:basket.map(p=>({
    name:p.title,qty:p.quantity,sum:p.price,total:p.total,unit:"шт."
   }))
 };
 if(discount>0)payInfo.discounts=[{type:"DISCOUNT",mode:"VALUE",value:discount}];
 let invoiceId:string|null=null;
 try{
  const bank=await fetch("https://api.monobank.ua/api/merchant/invoice/create",{
   method:"POST",headers:{"content-type":"application/json","X-Token":token},
   body:JSON.stringify({amount,ccy:980,paymentType:"debit",validity:1800,
    merchantPaymInfo:payInfo,
    redirectUrl:site+"/account.html?payment=return&order="+encodeURIComponent(orderId),
    webHookUrl:callback})
  });
  if(!bank.ok){
    // Explicit validation/auth failures mean that an invoice was not accepted.
    // For 5xx/429 network uncertainty, DO NOT release reserved stock or points.
    if(bank.status>=400&&bank.status<500&&bank.status!==429){
      const {data:cancelled,error:cancelError}=await client.rpc("homly_cancel_checkout",{
        p_order_id:orderId,p_state:"failed"
      });
      if(cancelError||cancelled!==true)
        return response(req,{error:"CHECKOUT_NEEDS_RECONCILIATION",orderId},503);
      return response(req,{error:"BANK_DECLINED_INVOICE"},502);
    }
    throw new Error("BANK_RESPONSE_UNCERTAIN_"+bank.status);
  }
  const result=await bank.json();
  if(typeof result.invoiceId!=="string"||typeof result.pageUrl!=="string")
    throw new Error("BAD_BANK_RESPONSE");
  invoiceId=result.invoiceId;
  const paymentUrl=new URL(result.pageUrl);
  if(paymentUrl.protocol!=="https:"||paymentUrl.username||paymentUrl.password||
     !["pay.mbnk.biz","monobank.ua","pay.monobank.ua"].includes(paymentUrl.hostname))
    throw new Error("UNSAFE_BANK_URL");
  const {data:updated,error:invoiceError}=await client.from("homly_orders")
    .update({invoice_id:invoiceId}).eq("id",orderId).eq("status","pending")
    .select("id").single();
  if(invoiceError||!updated)throw new Error("INVOICE_ATTACH_FAILED");
  return response(req,{orderId,pageUrl:paymentUrl.href,
    amount_kopeks:amount,redeemed_points:Number(reserved.redeemed_points)});
 }catch(error){
  // Ambiguous bank failures must NOT release an order which may have been paid.
  // Ops can reconcile the bank invoice using the order reference.
  console.error("HOMLY acquiring error",orderId,invoiceId||"unknown",String(error));
  return response(req,{error:"CHECKOUT_NEEDS_RECONCILIATION",orderId},503);
 }
});
