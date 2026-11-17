// Read-only HOMLY integration readiness. Never reveal credentials to the browser.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const origins=new Set([Deno.env.get("HOMLY_SITE_ORIGIN")||"https://anastasia2627.github.io",
 "http://127.0.0.1:4173","http://localhost:4173"]);
const reply=(req:Request,status:number,data:unknown)=>{
 const origin=req.headers.get("origin");
 return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",
  ...(origin&&origins.has(origin)?{"access-control-allow-origin":origin}:{}),
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS","vary":"origin","cache-control":"no-store"}});
};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return reply(req,204,{});
 if(req.method!=="POST")return reply(req,405,{error:"METHOD_NOT_ALLOWED"});
 if(!origins.has(req.headers.get("origin")||""))return reply(req,403,{error:"ORIGIN_DENIED"});
 const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_ANON_KEY")||"";
 if(!url||!key)return reply(req,503,{error:"AUTH_NOT_CONFIGURED"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return reply(req,401,{error:"AUTH_REQUIRED"});
 const client=createClient(url,key,{global:{headers:{Authorization:bearer}},
   auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(bearer.replace(/^Bearer\s+/i,""));
 if(authError||!user||!user.email_confirmed_at)return reply(req,401,{error:"AUTH_REQUIRED"});
 const {data:member,error:memberError}=await client.from("homly_admins")
  .select("user_id").eq("user_id",user.id).maybeSingle();
 if(memberError||member?.user_id!==user.id)return reply(req,403,{error:"OWNER_ONLY"});
 const env=(key:string)=>Boolean(Deno.env.get(key)?.trim());
 let command="";
 try{
  const body=await req.json();
  command=typeof body?.check==="string"?body.check:"";
 }catch{return reply(req,400,{error:"BAD_JSON"})}
 if(command){
  if(!["monobank","novaPoshta","telegram","resend"].includes(command))
   return reply(req,400,{error:"UNKNOWN_CHECK"});
  try{
   if(command==="monobank"){
    const token=Deno.env.get("MONOBANK_TOKEN")||"";
    if(!token)return reply(req,200,{check:command,status:"missing"});
    const result=await fetch("https://api.monobank.ua/api/merchant/details",{
     headers:{"X-Token":token},signal:AbortSignal.timeout(9000)
    });
    return reply(req,200,{check:command,status:result.ok?"ok":"failed"});
   }
   if(command==="novaPoshta"){
    const apiKey=Deno.env.get("NOVA_POSHTA_API_KEY")||"";
    if(!apiKey)return reply(req,200,{check:command,status:"missing"});
    const response=await fetch("https://api.novaposhta.ua/v2.0/json/",{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({apiKey,modelName:"Address",calledMethod:"getCities",
      methodProperties:{FindByString:"Київ",Limit:1,Page:1}}),
     signal:AbortSignal.timeout(9000)
    });
    if(!response.ok)return reply(req,200,{check:command,status:"failed"});
    const result=await response.json();
    return reply(req,200,{check:command,
     status:result?.success===true&&Array.isArray(result.data)&&result.data.length>0?"ok":"failed"});
   }
   if(command==="telegram"){
    const bot=Deno.env.get("HOMLY_TELEGRAM_BOT_TOKEN")||"";
    const chat=Deno.env.get("HOMLY_TELEGRAM_CHAT_ID")||"";
    if(!/^\d{5,15}:[A-Za-z0-9_-]{30,90}$/.test(bot)||!/^[-]?\d{6,20}$/.test(chat))
     return reply(req,200,{check:command,status:"missing"});
    const base="https://api.telegram.org/bot"+bot;
    const botResponse=await fetch(base+"/getMe",{signal:AbortSignal.timeout(8000)});
    const botResult=await botResponse.json();
    if(!botResponse.ok||botResult.ok!==true)
     return reply(req,200,{check:command,status:"failed"});
    const chatResponse=await fetch(base+"/getChat?chat_id="+encodeURIComponent(chat),
     {signal:AbortSignal.timeout(8000)});
    const chatResult=await chatResponse.json();
    return reply(req,200,{check:command,status:chatResponse.ok&&chatResult.ok===true?"ok":"failed"});
   }
   if(command==="resend"){
    const apiKey=Deno.env.get("RESEND_API_KEY")||"";
    const from=Deno.env.get("HOMLY_EMAIL_FROM")||"";
    if(!apiKey||!from.includes("@")||!user.email)
     return reply(req,200,{check:command,status:"missing"});
    // Only a signed-in verified owner can explicitly trigger this one-time test
    // email, and it is always addressed to their verified account email.
    const sent=await fetch("https://api.resend.com/emails",{
     method:"POST",signal:AbortSignal.timeout(9000),
     headers:{"authorization":"Bearer "+apiKey,"content-type":"application/json"},
     body:JSON.stringify({
      from,to:[user.email],
      subject:"HOMLY ♡ Перевірка поштової інтеграції",
      text:"Тестове повідомлення HOMLY. Інтеграція Resend прийняла запит. Перевір, чи лист надійшов.",
      html:'<div style="font:16px Arial,sans-serif;padding:28px;color:#2c1830;background:#fff6fb"><h2 style="color:#a8174e">HOMLY ♡</h2><p>Це тестовий лист. Якщо він надійшов, надсилання через Resend працює.</p></div>'
     })
    });
    let result:any;
    try{result=await sent.json()}catch{}
    return reply(req,200,{check:command,status:sent.ok&&Boolean(result?.id)?"ok":"failed",
     note:sent.ok?"accepted_not_delivered":undefined});
   }
  }catch{
   return reply(req,200,{check:command,status:"unreachable"});
  }
 }
 return reply(req,200,{services:{
  monobank:env("MONOBANK_TOKEN"),
  novaPoshta:env("NOVA_POSHTA_API_KEY"),
  resend:env("RESEND_API_KEY")&&env("HOMLY_EMAIL_FROM"),
  ownerEmail:env("HOMLY_OWNER_EMAIL"),
  telegram:env("HOMLY_TELEGRAM_BOT_TOKEN")&&env("HOMLY_TELEGRAM_CHAT_ID")
 }});
});
