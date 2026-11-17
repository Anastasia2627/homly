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
 return reply(req,200,{services:{
  monobank:env("MONOBANK_TOKEN"),
  novaPoshta:env("NOVA_POSHTA_API_KEY"),
  resend:env("RESEND_API_KEY")&&env("HOMLY_EMAIL_FROM"),
  ownerEmail:env("HOMLY_OWNER_EMAIL"),
  telegram:env("HOMLY_TELEGRAM_BOT_TOKEN")&&env("HOMLY_TELEGRAM_CHAT_ID")
 }});
});
