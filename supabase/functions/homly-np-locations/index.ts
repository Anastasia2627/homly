// Safe authenticated Nova Poshta directory search. API key stays on server.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const origins=new Set([Deno.env.get("HOMLY_SITE_ORIGIN")||"https://anastasia2627.github.io",
 "http://127.0.0.1:4173","http://localhost:4173"]);
const respond=(req:Request,status:number,body:unknown)=>{
 const origin=req.headers.get("origin");
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",
  ...(origin&&origins.has(origin)?{"access-control-allow-origin":origin}:{}),
  "access-control-allow-methods":"POST,OPTIONS",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "vary":"origin","cache-control":"private,max-age=60"}});
};
Deno.serve(async (req:Request)=>{
 if(req.method==="OPTIONS")return respond(req,204,{});
 if(req.method!=="POST")return respond(req,405,{error:"METHOD_NOT_ALLOWED"});
 if(!origins.has(req.headers.get("origin")||""))return respond(req,403,{error:"ORIGIN_DENIED"});
 const key=Deno.env.get("NOVA_POSHTA_API_KEY")||"";
 if(!key)return respond(req,503,{error:"NOVA_POSHTA_NOT_CONFIGURED"});
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const anonKey=Deno.env.get("SUPABASE_ANON_KEY")||"";
 if(!supabaseUrl||!anonKey)return respond(req,503,{error:"AUTH_NOT_CONFIGURED"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return respond(req,401,{error:"LOGIN_REQUIRED"});
 const client=createClient(supabaseUrl,anonKey,{
  global:{headers:{Authorization:bearer}},
  auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data:{user},error:authError}=await client.auth.getUser(bearer.replace(/^Bearer\s+/i,""));
 if(authError||!user||!user.email_confirmed_at)return respond(req,401,{error:"VERIFIED_LOGIN_REQUIRED"});
 let input:{mode?:string;query?:string;cityRef?:string};
 try{input=await req.json()}catch{return respond(req,400,{error:"BAD_JSON"})}
 const mode=input?.mode;
 const query=String(input?.query||"").trim().slice(0,70);
 const cityRef=String(input?.cityRef||"").trim();
 if(!["cities","warehouses"].includes(String(mode))||query.length>70||
    (mode==="cities"&&query.length<2)||
    (mode==="warehouses"&&!/^[0-9a-f-]{36}$/i.test(cityRef)))
  return respond(req,400,{error:"BAD_SEARCH"});
 const modelName=mode==="cities"?"Address":"Address";
 const method=mode==="cities"?"getCities":"getWarehouses";
 const props=mode==="cities"
  ?{FindByString:query,Limit:15,Page:1}
  :{CityRef:cityRef,FindByString:query,Limit:30,Page:1,Language:"UA"};
 try{
  const upstream=await fetch("https://api.novaposhta.ua/v2.0/json/",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({apiKey:key,modelName,calledMethod:method,methodProperties:props}),
   signal:AbortSignal.timeout(8000)
  });
  if(!upstream.ok)return respond(req,503,{error:"DIRECTORY_UNAVAILABLE"});
  const result=await upstream.json();
  if(!result.success||!Array.isArray(result.data))
   return respond(req,503,{error:"DIRECTORY_UNAVAILABLE"});
  const items=result.data.slice(0,30).map((row:Record<string,unknown>)=>({
   ref:typeof row.Ref==="string"?row.Ref:"",
   name:typeof row.Description==="string"?row.Description:"",
   number:typeof row.Number==="string"?row.Number:""
  })).filter((i:{ref:string;name:string})=>i.ref.length===36&&i.name.length>0);
  return respond(req,200,{items});
 }catch(error){
  console.warn("HOMLY delivery directory unavailable",String(error));
  return respond(req,503,{error:"DIRECTORY_UNAVAILABLE"});
 }
});
