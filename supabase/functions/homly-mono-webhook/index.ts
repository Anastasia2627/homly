// HOMLY monobank webhook: verify provider ECDSA signature AND re-check
// invoice status directly with bank. Supabase JWT must be disabled for this
// webhook ONLY. Do not trust redirect URLs or browser payment success claims.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const textEncoder=new TextEncoder();
function b64Bytes(value:string):Uint8Array{
 const s=atob(value.replace(/\s/g,''));
 return Uint8Array.from(s,c=>c.charCodeAt(0));
}
// WebCrypto ECDSA uses P1363 raw (r||s), whereas monobank X-Sign is DER.
function derToRaw(der:Uint8Array):Uint8Array{
 let offset=0;
 if(der[offset++]!==0x30)throw new Error('Invalid DER sequence');
 const len=der[offset++];
 if(len>0x80)offset+=(len&0x7f);
 if(der[offset++]!==0x02)throw new Error('Missing DER R');
 const rlen=der[offset++];
 const r=der.subarray(offset,offset+rlen);offset+=rlen;
 if(der[offset++]!==0x02)throw new Error('Missing DER S');
 const slen=der[offset++];
 const s=der.subarray(offset,offset+slen);
 if(!r.length||!s.length||r.length>33||s.length>33)throw new Error('Bad ECDSA size');
 const raw=new Uint8Array(64);
 raw.set(r.subarray(Math.max(0,r.length-32)),32-Math.min(32,r.length));
 raw.set(s.subarray(Math.max(0,s.length-32)),64-Math.min(32,s.length));
 return raw;
}
let cachedKey:CryptoKey|null=null;
let lastKey=0;
async function getProviderKey(token:string):Promise<CryptoKey>{
 if(cachedKey && Date.now()-lastKey<3600_000)return cachedKey;
 const response=await fetch('https://api.monobank.ua/api/merchant/pubkey',{
  headers:{'X-Token':token}
 });
 if(!response.ok)throw new Error('Provider public key unavailable');
 const result=await response.json();
 if(typeof result.key!=='string')throw new Error('Provider public key missing');
 const pem=atob(result.key);
 const base64=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');
 const spki=b64Bytes(base64);
 const key=await crypto.subtle.importKey('spki',spki,
  {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 cachedKey=key;lastKey=Date.now();
 return key;
}
const json=(status:number,text:string)=>
 new Response(JSON.stringify({status:text}),{status,headers:{'content-type':'application/json'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return json(405,'method_not_allowed');
 const token=Deno.env.get('MONOBANK_TOKEN');
 const url=Deno.env.get('SUPABASE_URL');
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||
   JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
 if(!token||!url||!secret)return json(503,'not_configured');
 const signature=req.headers.get('X-Sign');
 if(!signature)return json(401,'missing_signature');
 const raw=await req.text();
 if(raw.length>30_000)return json(413,'oversized_webhook');
 try{
  const publicKey=await getProviderKey(token);
  let verified=await crypto.subtle.verify(
   {name:'ECDSA',hash:'SHA-256'},publicKey,derToRaw(b64Bytes(signature)),
   textEncoder.encode(raw)
  );
  if(!verified){
   // Bank rotates its signing key. Re-fetch once, never trust unsigned payloads.
   cachedKey=null;
   const refreshed=await getProviderKey(token);
   verified=await crypto.subtle.verify(
    {name:'ECDSA',hash:'SHA-256'},refreshed,derToRaw(b64Bytes(signature)),
    textEncoder.encode(raw)
   );
  }
  if(!verified)return json(401,'invalid_signature');
  const incoming=JSON.parse(raw);
  const invoiceId=incoming.invoiceId;
  if(typeof invoiceId!=='string'||invoiceId.length>150)return json(400,'bad_invoice');
  // Re-fetch immutable/authoritative result using private merchant token.
  const bank=await fetch('https://api.monobank.ua/api/merchant/invoice/status?invoiceId='+encodeURIComponent(invoiceId),{
   headers:{'X-Token':token}
  });
  if(!bank.ok)return json(502,'bank_status_unavailable');
  const state=await bank.json();
  if(state.invoiceId!==invoiceId||state.ccy!==980||!Number.isSafeInteger(state.amount))
   return json(400,'invoice_mismatch');
  const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:order,error:orderError}=await client.from('homly_orders')
   .select('id,total_kopeks,status,invoice_id').eq('invoice_id',invoiceId).maybeSingle();
  if(orderError)return json(503,'order_lookup_unavailable');
  if(!order)return json(409,'unknown_invoice');
  if(Number(order.total_kopeks)!==state.amount)return json(409,'amount_mismatch');
  if(state.status==='success'){
   const {data,error}=await client.rpc('homly_complete_order',{
    p_order_id:order.id,p_invoice_id:invoiceId,p_amount_kopeks:state.amount
   });
   if(error||data!==true){
    console.error('HOMLY payment settlement failed',error?.message);
    return json(503,'settlement_failed');
   }
   return json(200,'paid');
  }
  if(state.status==='failure'||state.status==='expired'||state.status==='cancelled'){
   const {data,error}=await client.rpc('homly_cancel_checkout',{
    p_order_id:order.id,p_state:'failed'
   });
   if(error||data!==true)return json(503,'cancellation_failed');
   return json(200,'not_paid');
  }
  if(state.status==='reversed'){
   const rpc=order.status==='paid'||order.status==='refunded'
     ?'homly_reverse_paid_order':'homly_cancel_checkout';
   const params=rpc==='homly_reverse_paid_order'
     ?{p_order_id:order.id}:{p_order_id:order.id,p_state:'cancelled'};
   const {data,error}=await client.rpc(rpc,params);
   if(error||data!==true)return json(503,'reversal_failed');
   return json(200,'reversed');
  }
  // processing / hold / created: keep order pending. No credits issued.
  return json(200,'pending');
 }catch(error){
  console.error('HOMLY mono callback exception:',String(error));
  return json(503,'temporary_error');
 }
});
