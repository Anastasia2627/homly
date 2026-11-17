// HOMLY — private scheduled order email dispatcher.
// Resend secrets never appear in public source or client JavaScript.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const asJson=(code:number,body:unknown)=>new Response(JSON.stringify(body),{
 status:code,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const serviceKey=()=>Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
const htmlSafe=(s:unknown)=>String(s??"").replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]||c));
type MailTask={id:string;order_id:string;template:"buyer_paid"|"owner_paid"|"buyer_refunded";attempts:number};
const formatMoney=(n:number)=>new Intl.NumberFormat("uk-UA",{style:"currency",currency:"UAH"}).format(n/100);
function contentFor(task:MailTask,order:{id:string;customer_email:string;total_kopeks:number},ownerEmail:string){
 const reference=htmlSafe(order.id.slice(0,8).toUpperCase());
 const total=formatMoney(Number(order.total_kopeks)||0);
 const store="https://anastasia2627.github.io/homly/";
 const buyer=task.template!=="owner_paid";
 const to=buyer?order.customer_email:ownerEmail;
 const title=task.template==="buyer_paid"?"Оплату підтверджено ♡":
    task.template==="buyer_refunded"?"Повернення коштів":"Нове оплачене замовлення";
 const text=task.template==="buyer_paid"
  ?`Оплату замовлення #${reference} на суму ${total} підтверджено. Переглянути замовлення: ${store}account.html`
  :task.template==="buyer_refunded"
   ?`Замовлення #${reference}: повне повернення підтверджено. Якщо є запитання, звернись до HOMLY.`
   :`Нове оплачене замовлення HOMLY #${reference} на суму ${total}. Відкрий панель керування: ${store}admin.html`;
 const url=store+(buyer?"account.html":"admin.html");
 const message=task.template==="buyer_paid"
  ?"Дякуємо за покупку! Готуємо твоє творче замовлення."
  :task.template==="buyer_refunded"
   ?"Ми зафіксували повернення оплати за замовленням."
   :"У магазині є нове оплачене замовлення.";
 const html=`<!doctype html><html lang="uk"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f1f6;color:#231923;font-family:Arial,sans-serif">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f5f1f6"><tr><td align="center">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
 <tr><td style="padding:28px;background:#a8174e;color:white;font-size:23px;font-weight:bold;letter-spacing:2px">HOMLY ♡</td></tr>
 <tr><td style="padding:32px 28px"><h1 style="font-size:25px;line-height:1.2;margin:0 0 14px">${htmlSafe(title)}</h1>
 <p style="font-size:15px;line-height:1.55;color:#5d4c5d">${htmlSafe(message)}</p>
 <p style="padding:16px;background:#f7edf3;border-radius:12px;font-size:15px"><b>Замовлення:</b> #${reference}<br><b>Сума:</b> ${htmlSafe(total)}</p>
 <a href="${url}" style="display:inline-block;padding:13px 23px;background:#a8174e;border-radius:24px;color:white;text-decoration:none;font-size:14px;font-weight:bold">Переглянути замовлення</a>
 </td></tr><tr><td style="padding:20px 28px;background:#fbf8fa;color:#776576;font-size:12px">HOMLY · Творчі набори з любов’ю</td></tr></table>
 </td></tr></table></body></html>`;
 return {to,title,text,html};
}
Deno.serve(async req=>{
 if(req.method!=="POST")return asJson(405,{error:"METHOD_NOT_ALLOWED"});
 const token=req.headers.get("x-homly-cron")||"";
 if(!/^[0-9a-f]{64}$/.test(token))return asJson(401,{error:"UNAUTHORIZED"});
 const url=Deno.env.get("SUPABASE_URL")||"";
 const service=serviceKey();
 if(!url||!service)return asJson(503,{error:"BACKEND_NOT_CONFIGURED"});
 const client=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:valid,error:verifyError}=await client.rpc("homly_verify_cron_token",{p_token:token});
 if(verifyError||valid!==true)return asJson(401,{error:"UNAUTHORIZED"});
 const apiKey=Deno.env.get("RESEND_API_KEY")||"";
 const from=Deno.env.get("HOMLY_EMAIL_FROM")||"";
 const ownerEmail=Deno.env.get("HOMLY_OWNER_EMAIL")||"";
 if(!apiKey||!from||!from.includes("@"))return asJson(503,{error:"EMAIL_NOT_CONFIGURED"});
 const {data:jobs,error:queueError}=await client.rpc("homly_claim_email_batch");
 if(queueError)return asJson(503,{error:"QUEUE_UNAVAILABLE"});
 let sent=0,requeued=0,failed=0,skipped=0;
 const tasks=(jobs||[]) as MailTask[];
 await Promise.all(tasks.map(async task=>{
  try{
   if(task.template==="owner_paid"&&!ownerEmail){
    await client.from("homly_email_outbox").update({
     state:"pending",lease_until:null,next_attempt_at:new Date(Date.now()+24*60*60_000).toISOString(),
     last_error:"OWNER_EMAIL_NOT_CONFIGURED"
    }).eq("id",task.id).eq("state","sending");
    skipped++;return;
   }
   const {data:order,error:orderError}=await client.from("homly_orders")
    .select("id,customer_email,total_kopeks,status").eq("id",task.order_id).maybeSingle();
   if(orderError||!order)throw new Error("ORDER_LOOKUP_FAILED");
   if((task.template==="buyer_refunded"&&order.status!=="refunded")||
     (task.template!=="buyer_refunded"&&!["paid","refunded"].includes(order.status)))
    throw new Error("ORDER_NOT_ELIGIBLE");
   const mail=contentFor(task,order,ownerEmail);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.to))throw new Error("INVALID_RECIPIENT");
   const response=await fetch("https://api.resend.com/emails",{
    method:"POST",signal:AbortSignal.timeout(10000),
    headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json",
     "Idempotency-Key":"homly-"+task.order_id+"-"+task.template},
    body:JSON.stringify({
      from,to:[mail.to],subject:"HOMLY · "+mail.title,text:mail.text,html:mail.html
    })
   });
   const raw=await response.text();
   let responseId="";
   try{responseId=String(JSON.parse(raw)?.id||"")}catch{}
   if(!response.ok||!responseId)throw new Error("RESEND_HTTP_"+response.status);
   const {error:saveError}=await client.from("homly_email_outbox").update({
    state:"sent",sent_at:new Date().toISOString(),lease_until:null,
    provider_message_id:responseId,last_error:null
   }).eq("id",task.id).eq("state","sending");
   if(saveError)throw saveError;sent++;
  }catch(error){
   const attempts=Number(task.attempts)||1;
   const permanent=attempts>=12||/INVALID_RECIPIENT|ORDER_NOT_ELIGIBLE/.test(String(error));
   const retryMinutes=Math.min(360,Math.pow(2,Math.min(8,attempts)));
   await client.from("homly_email_outbox").update({
    state:permanent?"failed":"pending",lease_until:null,
    last_error:String(error).slice(0,160),
    next_attempt_at:new Date(Date.now()+retryMinutes*60_000).toISOString()
   }).eq("id",task.id).eq("state","sending");
   if(permanent)failed++;else requeued++;
   console.warn("HOMLY mail dispatch failure",task.order_id,task.template,String(error));
  }
 }));
 return asJson(200,{processed:tasks.length,sent,requeued,failed,skipped});
});
