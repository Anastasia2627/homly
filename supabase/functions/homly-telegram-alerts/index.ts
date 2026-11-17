// Private Telegram owner notifications. Bot token and chat ID stay in Edge secrets.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const secret=()=>Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
type Task={id:string;order_id:string;event:"order_paid"|"order_refunded";attempts:number};
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c));
Deno.serve(async req=>{
 if(req.method!=="POST")return respond(405,{error:"METHOD_NOT_ALLOWED"});
 const credential=req.headers.get("x-homly-cron")||"";
 if(!/^[0-9a-f]{64}$/.test(credential))return respond(401,{error:"UNAUTHORIZED"});
 const url=Deno.env.get("SUPABASE_URL")||"",key=secret();
 if(!url||!key)return respond(503,{error:"BACKEND_UNAVAILABLE"});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:valid,error:authError}=await db.rpc("homly_verify_cron_token",{p_token:credential});
 if(authError||valid!==true)return respond(401,{error:"UNAUTHORIZED"});
 const bot=Deno.env.get("HOMLY_TELEGRAM_BOT_TOKEN")||"";
 const chat=Deno.env.get("HOMLY_TELEGRAM_CHAT_ID")||"";
 if(!/^\d{5,15}:[A-Za-z0-9_-]{30,90}$/.test(bot)||
    !/^-?\d{6,20}$/.test(chat))
  return respond(200,{status:"configuration_required",sent:0});
 const {data:tasks,error:claimError}=await db.rpc("homly_claim_telegram_batch");
 if(claimError)return respond(503,{error:"QUEUE_UNAVAILABLE"});
 let sent=0,requeued=0,failed=0;
 await Promise.all(((tasks||[]) as Task[]).map(async task=>{
  try{
   const {data:order,error:lookError}=await db.from("homly_orders")
    .select("id,status,total_kopeks").eq("id",task.order_id).maybeSingle();
   if(lookError||!order)throw Error("ORDER_NOT_FOUND");
   if((task.event==="order_paid"&&!["paid","refunded"].includes(order.status))||
      (task.event==="order_refunded"&&order.status!=="refunded"))
    throw Error("INELIGIBLE_STATUS");
   const sum=new Intl.NumberFormat("uk-UA",{minimumFractionDigits:2,maximumFractionDigits:2})
    .format(Number(order.total_kopeks)/100);
   const label=task.event==="order_paid"?"🛍 Нове оплачене замовлення":"↩️ Повернення коштів";
   const msg=esc(label)+"\n<b>HOMLY · #"+esc(order.id.slice(0,8).toUpperCase())+
    "</b>\nСума: "+esc(sum)+" грн\n"+
    '<a href="https://anastasia2627.github.io/homly/admin.html">Відкрити адмінку</a>';
   const response=await fetch("https://api.telegram.org/bot"+bot+"/sendMessage",{
    method:"POST",signal:AbortSignal.timeout(9000),
    headers:{"content-type":"application/json"},
    body:JSON.stringify({chat_id:chat,text:msg,parse_mode:"HTML",
     disable_web_page_preview:true})
   });
   const body=await response.json();
   if(!response.ok||body.ok!==true||!body.result?.message_id)
    throw Error("TELEGRAM_HTTP_"+response.status);
   const {error:saveError}=await db.from("homly_telegram_outbox").update({
    state:"sent",lease_until:null,sent_at:new Date().toISOString(),
    last_error:null,provider_message_id:String(body.result.message_id)
   }).eq("id",task.id).eq("state","sending");
   if(saveError)throw saveError;
   sent++;
  }catch(error){
   const attempts=Number(task.attempts)||1;
   const permanent=attempts>=12||String(error).includes("INELIGIBLE_STATUS");
   const delay=Math.min(360,Math.pow(2,Math.min(8,attempts)));
   await db.from("homly_telegram_outbox").update({
    state:permanent?"failed":"pending",lease_until:null,
    next_attempt_at:new Date(Date.now()+delay*60_000).toISOString(),
    last_error:String(error).slice(0,140)
   }).eq("id",task.id).eq("state","sending");
   if(permanent)failed++;else requeued++;
   console.warn("HOMLY Telegram alert needs retry",task.order_id,task.event);
  }
 }));
 return respond(200,{processed:(tasks||[]).length,sent,requeued,failed});
});
