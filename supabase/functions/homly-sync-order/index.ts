// HOMLY: authenticated buyer may reconcile ONLY their own bank invoice.
// Useful when monobank's limited webhook retries were missed.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const origins=new Set([Deno.env.get("HOMLY_SITE_ORIGIN")||"https://anastasia2627.github.io",
 "http://127.0.0.1:4173","http://localhost:4173"]);
function reply(req:Request,status:number,body:unknown){
 const origin=req.headers.get("origin");
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",
  ...(origin&&origins.has(origin)?{"access-control-allow-origin":origin}:{}),
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS","vary":"origin"}});
}
const secret=()=>Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return reply(req,204,{});
 if(req.method!=="POST")return reply(req,405,{error:"METHOD_NOT_ALLOWED"});
 if(!origins.has(req.headers.get("origin")||""))return reply(req,403,{error:"ORIGIN_DENIED"});
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=secret(),token=Deno.env.get("MONOBANK_TOKEN")||"";
 if(!url||!key||!token)return reply(req,503,{error:"PAYMENTS_NOT_CONFIGURED"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return reply(req,401,{error:"AUTH_REQUIRED"});
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await client.auth.getUser(bearer.replace(/^Bearer\s+/i,""));
 if(userError||!user||!user.email_confirmed_at)return reply(req,401,{error:"AUTH_REQUIRED"});
 let input:Record<string,unknown>;
 try{input=await req.json()}catch{return reply(req,400,{error:"BAD_JSON"})}
 if(typeof input?.orderId!=="string"||
 !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId))
  return reply(req,400,{error:"BAD_ORDER"});
 const {data:order,error:lookupError}=await client.from("homly_orders")
  .select("id,customer_id,status,invoice_id,total_kopeks,created_at")
  .eq("id",input.orderId).eq("customer_id",user.id).maybeSingle();
 if(lookupError)return reply(req,503,{error:"LOOKUP_UNAVAILABLE"});
 if(!order)return reply(req,404,{error:"ORDER_NOT_FOUND"});
 if(!order.invoice_id)return reply(req,200,{status:order.status,needs_review:order.status==="pending"});
 if(order.status!=="pending"&&order.status!=="paid")
  return reply(req,200,{status:order.status});
 try{
  const bank=await fetch("https://api.monobank.ua/api/merchant/invoice/status?invoiceId="+encodeURIComponent(order.invoice_id),{
   headers:{"X-Token":token}
  });
  if(!bank.ok)return reply(req,502,{error:"BANK_UNAVAILABLE"});
  const state=await bank.json();
  if(state.invoiceId!==order.invoice_id||Number(state.ccy)!==980||
     !Number.isSafeInteger(state.amount)||state.amount!==Number(order.total_kopeks))
   return reply(req,409,{error:"INVOICE_MISMATCH"});
  let rpc="";
  let args:Record<string,unknown>={p_order_id:order.id};
  if(state.status==="success"){
   rpc="homly_complete_order";
   args={...args,p_invoice_id:order.invoice_id,p_amount_kopeks:state.amount};
  }else if(["failure","expired","cancelled"].includes(state.status)){
   rpc="homly_cancel_checkout";args={...args,p_state:"failed"};
  }else if(state.status==="reversed"){
   rpc=order.status==="paid"?"homly_reverse_paid_order":"homly_cancel_checkout";
   if(rpc==="homly_cancel_checkout")args={...args,p_state:"cancelled"};
  }
  if(!rpc)return reply(req,200,{status:order.status,bank_status:state.status});
  const {data:ok,error:rpcError}=await client.rpc(rpc,args);
  if(rpcError||ok!==true)return reply(req,503,{error:"SETTLEMENT_UNAVAILABLE"});
  const next=state.status==="success"?"paid":state.status==="reversed"?"refunded":"failed";
  return reply(req,200,{status:next});
 }catch(error){console.error("HOMLY sync",order.id,String(error));
  return reply(req,503,{error:"BANK_SYNC_FAILED"});}
});
