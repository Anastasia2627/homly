// HOMLY: cron-only, bank-authoritative settlement of stale pending invoices.
// Expires inventory reservations ONLY after monobank confirms a terminal failure.
// Cron auth token is stored in Supabase Vault, never in public site JavaScript.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

function reply(status:number,body:unknown){
 return new Response(JSON.stringify(body),{status,headers:{
  "content-type":"application/json","cache-control":"no-store"
 }});
}
function serviceKey(){
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
}
Deno.serve(async (req:Request)=>{
 if(req.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"});
 const credential=req.headers.get("x-homly-cron")||"";
 if(!/^[0-9a-f]{64}$/.test(credential))return reply(401,{error:"UNAUTHORIZED"});
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=serviceKey();
 if(!url||!key)return reply(503,{error:"BACKEND_NOT_CONFIGURED"});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authorized,error:accessError}=await db.rpc("homly_verify_cron_token",{
  p_token:credential
 });
 if(accessError||authorized!==true)return reply(401,{error:"UNAUTHORIZED"});
 const token=Deno.env.get("MONOBANK_TOKEN")||"";
 if(!token)return reply(503,{error:"MERCHANT_NOT_CONFIGURED"});
 const hourAgo=new Date(Date.now()-60*60_000).toISOString();
 const fiveMinutesAgo=new Date(Date.now()-5*60_000).toISOString();
 const {data:missing,error:missingError}=await db.from("homly_orders")
  .select("id").eq("status","pending").is("invoice_id",null)
  .is("bank_review_reason",null).lt("created_at",hourAgo).limit(30);
 if(!missingError&&missing?.length){
  await db.from("homly_orders").update({bank_review_reason:"NO_INVOICE_ID"})
   .in("id",missing.map(o=>o.id)).eq("status","pending").is("invoice_id",null);
 }
 const {data:orders,error:listError}=await db.from("homly_orders")
  .select("id,invoice_id,total_kopeks,status,created_at")
  .eq("status","pending").not("invoice_id","is",null)
  .lt("created_at",fiveMinutesAgo)
  .order("last_bank_check_at",{ascending:true,nullsFirst:true}).limit(8);
 if(listError)return reply(503,{error:"ORDER_LOOKUP_FAILED"});
 let checked=0,settled=0,cancelled=0,review=0;
 for(const order of orders||[]){
  await db.from("homly_orders").update({last_bank_check_at:new Date().toISOString()})
   .eq("id",order.id).eq("status","pending");
  checked++;
  try{
   const bank=await fetch(
    "https://api.monobank.ua/api/merchant/invoice/status?invoiceId="+
    encodeURIComponent(order.invoice_id),
    {headers:{"X-Token":token},signal:AbortSignal.timeout(10_000)}
   );
   if(!bank.ok)throw new Error("BANK_HTTP_"+bank.status);
   const state=await bank.json();
   if(state.invoiceId!==order.invoice_id||state.ccy!==980||
     !Number.isSafeInteger(state.amount)||state.amount!==Number(order.total_kopeks)||
     (state.reference&&state.reference!==order.id)){
     await db.from("homly_orders").update({bank_review_reason:"BANK_INVOICE_MISMATCH"})
      .eq("id",order.id).eq("status","pending");
     review++;continue;
   }
   let procedure="";
   let args:Record<string,unknown>={p_order_id:order.id};
   if(state.status==="success"){
    procedure="homly_complete_order";
    args={...args,p_invoice_id:order.invoice_id,p_amount_kopeks:state.amount};
   }else if(["failure","expired","cancelled","reversed"].includes(state.status)){
    procedure="homly_cancel_checkout";
    args={...args,p_state:state.status==="reversed"?"cancelled":"failed"};
   }
   if(!procedure)continue; // created/processing/hold: keep inventory reserved.
   const {data:ok,error:rpcError}=await db.rpc(procedure,args);
   if(rpcError||ok!==true)throw new Error("SETTLEMENT_NOT_CONFIRMED");
   if(state.status==="success")settled++;else cancelled++;
   await db.from("homly_orders").update({bank_review_reason:null})
    .eq("id",order.id);
  }catch(error){
   if(new Date(order.created_at).getTime()<Date.now()-2*60*60_000){
    await db.from("homly_orders").update({bank_review_reason:"BANK_RECONCILE_ERROR"})
     .eq("id",order.id).eq("status","pending");
    review++;
   }
   console.warn("HOMLY bank reconciliation requires retry",order.id,String(error));
  }
 }
 return reply(200,{checked,settled,cancelled,review});
});
