// Agentric Local Business Facts API — Cloudflare Worker (free tier). KV binding: CREDITS.
// Secrets (optional until set): STRIPE_WEBHOOK_SECRET (whsec_...), STRIPE_API_KEY (rk_live_ read-only Checkout Sessions).
const PRICE_USD=0.03, PACK_CENTS=1000, PACK_CREDITS=500;
const PAY_LINK='https://buy.stripe.com/14A4gz0CEgg800Cdki0x200';
const PLINK_ID='plink_1UXCgNGfxoYz2IOsefapMVxC';
const CC={US:'1',CA:'1',GB:'44',UK:'44',IE:'353',FR:'33',DE:'49',AT:'43',CH:'41',IT:'39',ES:'34',PT:'351',NL:'31',BE:'32',DK:'45',SE:'46',NO:'47',FI:'358',PL:'48',AU:'61',NZ:'64',JP:'81',KR:'82',CN:'86',IN:'91',SG:'65',BR:'55',MX:'52',AR:'54',ZA:'27',AE:'971',TR:'90',IL:'972',NG:'234',KE:'254',PH:'63',ID:'62',TH:'66'};
const TLD={uk:'GB',fr:'FR',de:'DE',at:'AT',ch:'CH',it:'IT',es:'ES',pt:'PT',nl:'NL',be:'BE',dk:'DK',se:'SE',no:'NO',fi:'FI',pl:'PL',au:'AU',nz:'NZ',jp:'JP',kr:'KR',cn:'CN',in:'IN',sg:'SG',br:'BR',mx:'MX',ar:'AR',za:'ZA',ae:'AE',tr:'TR',il:'IL',ie:'IE',ca:'CA',ng:'NG',ke:'KE',ph:'PH',id:'ID',th:'TH'};
export function e164(raw,country){if(!raw)return null;let d=String(raw).replace(/[^\d+]/g,'');if(d.startsWith('00'))d='+'+d.slice(2);if(d.startsWith('+'))return d;const c=CC[country];if(!c)return null;if(c==='1')return d.length===10?'+1'+d:(d.length===11&&d[0]==='1'?'+'+d:null);return '+'+c+d.replace(/^0/,'');}
const CLOSED=/permanently closed|closed for good|we have closed|définitivement fermé|dauerhaft geschlossen|endgültig geschlossen|chiuso definitivamente|cerrado permanentemente|cerrado definitivamente|permanentemente fechado|definitief gesloten|閉店しました|已永久停业|폐업/i;
const PATHS=['/contact','/contact-us','/kontakt','/contacto','/contatti','/contato','/nous-contacter','/impressum','/mentions-legales','/aviso-legal','/about'];
const UA='LocalBizFactsBot/0.2 (+business facts only)';
const ENT={'&amp;':'&','&#39;':"'",'&#039;':"'",'&quot;':'"','&lt;':'<','&gt;':'>','&nbsp;':' ','&#8211;':'–','&#8217;':'’','&#x27;':"'"};
const dec=s=>s==null?s:String(s).replace(/&[#\w]+;/g,m=>ENT[m]??m).replace(/\s+/g,' ').trim();
// name fix: strip "Home | Brand", "Brand - tagline" -> keep the brand-like segment
export function cleanTitle(t){t=dec(t);if(!t)return t;const parts=t.split(/\s+[|–—·•:-]\s+/).map(s=>s.trim()).filter(Boolean);const junk=/^(home|homepage|welcome|startseite|accueil|inicio|official (web)?site|official|index)$/i;const keep=parts.filter(p=>!junk.test(p));return (keep.sort((a,b)=>a.length-b.length)[0]||parts[0]);}
async function get(u){const r=await fetch(u,{headers:{'user-agent':UA,'accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(8000)});const html=(await r.text()).slice(0,1500000);return {url:r.url,status:r.status,html};}
function jsonld(html){const out=[];for(const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)){try{const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(x['@graph'])walk(x['@graph']);out.push(x);}};walk(JSON.parse(m[1].trim()));}catch{}}return out;}
const isBiz=t=>[].concat(t||[]).some(s=>/Organization|LocalBusiness|Restaurant|Store|Corporation|Hotel|Dentist|Service|Shop|Cafe|Bar/i.test(s));
function fmtAddr(a){if(!a)return null;if(typeof a==='string')return dec(a);a=[].concat(a)[0];return [a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry?.name||a.addressCountry].filter(Boolean).map(dec).join(', ')||null;}
const okName=n=>typeof n==='string'&&dec(n).length>3&&!/^(en|home|index|untitled|welcome|homepage)$/i.test(dec(n));
export async function lookup(target,countryIn){
  const url=/^https?:\/\//.test(target)?target:'https://'+target; new URL(url);
  const p=await get(url);
  if(/Just a moment|Cloudflare Challenge|Attention Required|cf-chl/i.test(p.html))return {query:target,blocked:'bot_challenge',http_status:p.status,confidence:0,fields:{},note:'Site blocks automated fetch; not charged'};
  const src=p.url,host=new URL(src).hostname,lang=(p.html.match(/<html[^>]*lang=["']([\w-]+)/i)||[])[1]||null;let country=(countryIn||'').toUpperCase()||null;const f={};
  const set=(k,v,how,s=src)=>{if(v&&(!Array.isArray(v)||v.length)&&!f[k])f[k]={value:typeof v==='string'?dec(v):v,source:s,method:how,confidence:how==='schema.org'?0.9:how==='tel-link'?0.8:0.6};};
  set('official_site',new URL(src).origin,'fetched');f.official_site.confidence=0.95;
  for(const o of jsonld(p.html).filter(o=>isBiz(o['@type']))){
    if(okName(o.name))set('name',o.name,'schema.org');const ac=[].concat(o.address||[])[0]?.addressCountry;if(!country&&ac){const v=(ac.name||ac).toString().toUpperCase();if(v.length===2)country=v;}
    set('phone',o.telephone,'schema.org');set('address',fmtAddr(o.address),'schema.org');const h=o.openingHours||o.openingHoursSpecification;if(h)set('hours',h,'schema.org');if(o.sameAs)set('socials',[].concat(o.sameAs),'schema.org');}
  if(!country)country=TLD[host.split('.').pop()]||null;
  const og=(p.html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)/i)||p.html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name/i)||[])[1];
  if(okName(og))set('name',og,'og:site_name');const tt=cleanTitle((p.html.match(/<title[^>]*>([^<]+)/i)||[])[1]);if(okName(tt))set('name',tt,'html-title');
  set('phone',(p.html.match(/href=["']tel:([+\d\-(). %20]{7,})/i)||[])[1]?.replace(/%20/g,' ').trim(),'tel-link');
  const soc=[...new Set([...p.html.matchAll(/href=["'](https?:\/\/(?:www\.)?(?:facebook|instagram|twitter|x|linkedin|youtube|tiktok)\.com\/[^"'?#]+)/gi)].map(m=>m[1]))].filter(s=>!/\/(sharer|share|intent|dialog)/i.test(s)).slice(0,8);
  set('socials',soc,'html-links');
  if(!f.phone||!f.address){let tries=0;for(const path of PATHS){if(++tries>5)break;try{const c=await get(new URL(path,src).href);if(c.status>=400)continue;const ph=(c.html.match(/href=["']tel:([+\d\-(). ]{7,})/i)||[])[1];if(ph)set('phone',ph.trim(),'tel-link',c.url);for(const o of jsonld(c.html).filter(o=>isBiz(o['@type'])))if(o.address)set('address',fmtAddr(o.address),'schema.org',c.url);if(f.phone&&f.address)break;}catch{}}}
  if(!f.address){const pc=p.html.match(/itemprop=["']streetAddress["'][^>]*>([^<]+)/i);if(pc)set('address',pc[1],'microdata');}
  if(f.phone)f.phone.e164=e164(f.phone.value,country);
  f.open_signal={value:CLOSED.test(p.html)?'possibly_closed':(p.status<400?'site_live':'site_error'),source:src,method:'http+text',confidence:0.5};
  const n=['name','phone','address','hours','socials'].filter(k=>f[k]).length;
  return {query:target,country,page_language:lang,fetched_at:new Date().toISOString(),http_status:p.status,confidence:+(0.3+0.14*n).toFixed(2),fields:f,price_usd:PRICE_USD};
}
export const billable=r=>!!(r&&!r.blocked&&!r.error&&r.fields&&(r.fields.name||r.fields.phone||r.fields.address||r.fields.socials));

// ---- credits ----
const J=(o,s=200,h={})=>new Response(JSON.stringify(o,null,1),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*',...h}});
export function apiKeyOf(req){const k=req.headers.get('x-api-key');if(k)return k.trim();const a=req.headers.get('authorization')||'';const m=a.match(/^Bearer\s+(\S+)/i);return m?m[1]:null;}
async function getAcct(env,k){if(!k||!/^agf_[a-f0-9]{32}$/.test(k))return null;return await env.CREDITS.get('key:'+k,'json');}
async function charge(env,k,acct){acct.credits-=1;acct.used=(acct.used||0)+1;acct.last=Date.now();await env.CREDITS.put('key:'+k,JSON.stringify(acct));return acct.credits;}
function pay402(origin,msg){return J({x402Version:1,error:msg||'payment required',accepts:[],x402_note:'x402 (USDC) settlement is not enabled yet; use prepaid credits.',prepaid:{price:'$10 = 500 lookups',buy:PAY_LINK,after_payment:origin+'/thanks shows your API key',use:'header x-api-key: <key> or Authorization: Bearer <key>'}},402);}
const newKey=()=>'agf_'+[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function creditsFor(s){const sub=s.amount_subtotal??s.amount_total??0;return Math.max(0,Math.floor(sub/PACK_CENTS))*PACK_CREDITS;}
// Idempotent: one session id -> one key, credited once.
export async function fulfill(env,s){
  if(!s||!s.id)return {error:'no session'};
  const prev=await env.CREDITS.get('sess:'+s.id,'json');if(prev)return {...prev,repeat:true};
  if(s.payment_status!=='paid'&&s.payment_status!=='no_payment_required')return {error:'not paid',status:s.payment_status};
  if(s.currency&&s.currency!=='usd')return {error:'unexpected currency'};
  const credits=creditsFor(s);if(!credits)return {error:'amount too small'};
  const key=newKey();const rec={key,credits,session:s.id,email:s.customer_details?.email||null,livemode:!!s.livemode,created:Date.now()};
  await env.CREDITS.put('key:'+key,JSON.stringify({credits,used:0,session:s.id,created:rec.created}));
  await env.CREDITS.put('sess:'+s.id,JSON.stringify(rec));
  return rec;
}
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function verifyStripeSig(body,header,secret,tolSec=300,now=Date.now()){
  if(!header||!secret)return false;const parts=Object.fromEntries([]);let t=null;const v1=[];
  for(const kv of header.split(',')){const [k,v]=kv.split('=');if(k==='t')t=v;if(k==='v1')v1.push(v);}
  if(!t||!v1.length||Math.abs(now/1000-Number(t))>tolSec)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+body)));
  return v1.some(x=>x.length===sig.length&&[...x].reduce((a,c,i)=>a|(c.charCodeAt(0)^sig.charCodeAt(i)),0)===0);
}
async function stripeSession(env,id){const r=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(id),{headers:{authorization:'Bearer '+env.STRIPE_API_KEY}});if(!r.ok)return null;return r.json();}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const page=(body,extra='')=>new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Agentric · Local Business Facts API</title>${extra}<body style="font-family:system-ui;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5">${body}</body>`,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store'}});

const TOOLS=[{name:'lookup_business',description:'Source-cited facts (name, phone+E.164, address, hours, socials, open signal) for any business website URL, worldwide. Costs 1 prepaid credit when facts are found.',inputSchema:{type:'object',properties:{url:{type:'string'},country:{type:'string',description:'ISO 3166-1 alpha-2, optional'}},required:['url']}}];
async function mcp(req,env,origin){
  let m;try{m=await req.json();}catch{return J({jsonrpc:'2.0',id:null,error:{code:-32700,message:'parse error'}},400);}
  const one=async m=>{const r=x=>({jsonrpc:'2.0',id:m.id,result:x});
    if(m.method==='initialize')return r({protocolVersion:m.params?.protocolVersion||'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'local-business-facts',version:'0.2.0'}});
    if(m.method==='tools/list')return r({tools:TOOLS});
    if(m.method==='tools/call'){const k=apiKeyOf(req),acct=await getAcct(env,k);
      if(!acct||acct.credits<=0)return r({isError:true,content:[{type:'text',text:`Payment required: send header x-api-key with prepaid credits. Buy 500 lookups for $10: ${PAY_LINK}`}]});
      const a=m.params?.arguments||{};const out=await lookup(a.url,a.country).catch(e=>({error:String(e.message)}));
      if(billable(out))out.credits_remaining=await charge(env,k,acct);else out.charged=false;
      return r({content:[{type:'text',text:JSON.stringify(out)}]});}
    if(m.id==null)return null;
    if(m.method==='ping')return r({});
    return {jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'method not found'}};};
  if(Array.isArray(m)){const out=(await Promise.all(m.map(one))).filter(Boolean);return out.length?J(out):new Response(null,{status:202});}
  const o=await one(m);return o?J(o):new Response(null,{status:202});
}

export default {async fetch(req,env){
  const u=new URL(req.url),origin=u.origin,P=u.pathname;
  if(req.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-headers':'x-api-key,authorization,content-type,mcp-protocol-version,mcp-session-id','access-control-allow-methods':'GET,POST,OPTIONS'}});
  if(P==='/v1/lookup'){const q=u.searchParams.get('url');if(!q)return J({error:'url required'},400);
    const k=apiKeyOf(req),acct=await getAcct(env,k);
    if(!acct)return pay402(origin,k?'unknown api key':'payment required');if(acct.credits<=0)return pay402(origin,'no credits left');
    let out;try{out=await lookup(q,u.searchParams.get('country'));}catch(e){return J({error:String(e.message),charged:false},502);}
    if(billable(out))out.credits_remaining=await charge(env,k,acct);else{out.charged=false;out.credits_remaining=acct.credits;}
    return J(out);}
  if(P==='/balance'){const k=apiKeyOf(req)||u.searchParams.get('key');const a=await getAcct(env,k);return a?J({credits_remaining:a.credits,used:a.used||0}):J({error:'unknown api key'},404);}
  if(P==='/mcp'){if(req.method==='GET')return new Response('Use POST (streamable HTTP, JSON responses)',{status:405});return mcp(req,env,origin);}
  if(P==='/stripe/webhook'&&req.method==='POST'){
    if(!env.STRIPE_WEBHOOK_SECRET)return J({error:'webhook not configured'},503);
    const body=await req.text();if(!await verifyStripeSig(body,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))return J({error:'bad signature'},400);
    const ev=JSON.parse(body);
    if(ev.type==='checkout.session.completed'||ev.type==='checkout.session.async_payment_succeeded'){const s=ev.data.object;if(s.payment_link&&s.payment_link!==PLINK_ID)return J({ignored:'other link'});const r=await fulfill(env,s);return J({ok:!r.error,repeat:!!r.repeat,error:r.error});}
    return J({ignored:ev.type});}
  if(P==='/thanks'){const sid=u.searchParams.get('session_id')||'';
    if(!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid))return page('<h1>Missing checkout session</h1><p>Open this page from the Stripe receipt redirect.</p>');
    let rec=await env.CREDITS.get('sess:'+sid,'json');
    if(!rec&&env.STRIPE_API_KEY){const s=await stripeSession(env,sid);if(s&&(!s.payment_link||s.payment_link===PLINK_ID)){const r=await fulfill(env,s);if(!r.error)rec=r;}}
    if(!rec)return page('<h1>Payment received — issuing your key…</h1><p>This page refreshes automatically. If nothing appears in 2 minutes, reply to your Stripe receipt with your session id: <code>'+esc(sid)+'</code></p>','<meta http-equiv=refresh content=5>');
    return page(`<h1>Your API key</h1><p><code style="font-size:1.2em;background:#eee;padding:6px">${esc(rec.key)}</code></p><p><b>${rec.credits}</b> lookups loaded. Save this key now; this page always shows the same key for this purchase.</p><pre>curl "${origin}/v1/lookup?url=https://www.sacher.com" -H "x-api-key: ${esc(rec.key)}"</pre><p>Balance: <code>${origin}/balance</code> with the same header. MCP: POST <code>${origin}/mcp</code>.</p>`);}
  if(P==='/openapi.json')return J(OPENAPI(origin));
  if(P==='/llms.txt')return new Response(LLMS(origin),{headers:{'content-type':'text/plain;charset=utf-8'}});
  if(P==='/.well-known/mcp.json')return J({name:'local-business-facts',transport:'streamable-http',url:origin+'/mcp',auth:'x-api-key header'});
  if(P==='/')return page(`<h1>Local Business Facts API</h1><p>Worldwide, any language. Send a business website URL, get source-cited facts as JSON: name, phone (raw + E.164), address, hours, socials, open/closed signal. Each field has its source URL, method and confidence. Business information only, no personal data.</p><p><b>$10 = 500 lookups</b> (2¢ each). Only successful lookups use a credit. <a href="${PAY_LINK}">Buy credits</a>; your key appears right after checkout.</p><pre>curl "${origin}/v1/lookup?url=https://www.sacher.com&country=AT" -H "x-api-key: YOUR_KEY"</pre><p><a href=/openapi.json>OpenAPI</a> · <a href=/llms.txt>llms.txt</a> · MCP: POST ${origin}/mcp (tool lookup_business)</p>`);
  return J({error:'not found'},404);
}};
const LLMS=o=>`# Local Business Facts API (worldwide)
> Send any business's website URL (any country, any language). Get JSON facts: name, phone (raw + E.164), postal address, opening hours, socials, open/closed signal, page language, country. Each field has source URL, extraction method and confidence. Business info only, no personal data.
- GET ${o}/v1/lookup?url=<site>&country=<ISO2 optional>  (header x-api-key or Authorization: Bearer)
- Price: $10 = 500 lookups prepaid: ${PAY_LINK} (key shown after checkout). 1 credit only when facts are found; bot-blocked or failed lookups are free.
- Without a key: HTTP 402 with purchase info. x402/USDC not enabled yet.
- GET ${o}/balance · OpenAPI: ${o}/openapi.json · MCP (streamable HTTP): POST ${o}/mcp, tool lookup_business {url, country?}
`;
const OPENAPI=o=>({openapi:'3.1.0',info:{title:'Local Business Facts API',version:'0.2.0',description:'Worldwide, any page language. Business information only; no personal data. $10 = 500 lookups: '+PAY_LINK},servers:[{url:o}],components:{securitySchemes:{apiKey:{type:'apiKey',in:'header',name:'x-api-key'}}},security:[{apiKey:[]}],paths:{'/v1/lookup':{get:{summary:'Source-cited business facts from a URL',parameters:[{name:'url',in:'query',required:true,schema:{type:'string'}},{name:'country',in:'query',schema:{type:'string'},description:'Optional ISO 3166-1 alpha-2'}],responses:{200:{description:'Facts JSON'},402:{description:'Payment required'}}}},'/balance':{get:{summary:'Remaining credits',responses:{200:{description:'ok'}}}}}});
