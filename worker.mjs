// Agentric Local Business Facts API — Cloudflare Worker (free tier). KV binding: CREDITS.
// Secrets (optional until set): STRIPE_WEBHOOK_SECRET (whsec_...), STRIPE_API_KEY (rk_live_ read-only Checkout Sessions).
const PRICE_USD=0.03, PACK_CENTS=1000, PACK_CREDITS=500;
const PAY_LINK='https://buy.stripe.com/14A4gz0CEgg800Cdki0x200';
const SUB_LINKS={starter:'https://buy.stripe.com/28EcN599a1le00C6VU0x201',pro:'https://buy.stripe.com/6oU14n5WYgg814G9420x202'};// filled after delivery is verified
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

// ---- Local Lead Lists (OpenStreetMap via Nominatim + Overpass; ODbL attribution required) ----
const OSM_UA='AgentricLeadLists/0.1 (+https://agentric-facts.agentric.workers.dev/leads)';
export const OSM_ATTR='Data © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright';
export const LEADS_LINKS=new Set(['plink_1UXPZPGfxoYz2IOsyldLMfCu']);
export const CREDIT_LINKS=new Set(['plink_1UXCgNGfxoYz2IOsefapMVxC','plink_1UXPPjGfxoYz2IOsi8a4ZD54','plink_1UXPPpGfxoYz2IOsnGo2IZii']);
export const LEADS_PRICE_CENTS=1900;export const LEADS_MIN=20;
const D=(f,x)=>f.map(s=>s.replace('X',x));
export const CATS={
 'auto-detailing':['nwr["amenity"="car_wash"]X','nwr["name"~"detail",i]["shop"]X','nwr["name"~"detail",i]["craft"]X','nwr["shop"="car_repair"]["name"~"detail|ceramic|tint",i]X'],
 'auto-repair':['nwr["shop"="car_repair"]X','nwr["shop"="tyres"]X'],
 'restaurants':['nwr["amenity"="restaurant"]X','nwr["amenity"="fast_food"]X'],
 'cafes':['nwr["amenity"="cafe"]X'],'bars':['nwr["amenity"~"^(bar|pub)$"]X'],
 'hair-salons-barbers':['nwr["shop"="hairdresser"]X'],'beauty-nail-salons':['nwr["shop"~"^(beauty|cosmetics)$"]X'],
 'dentists':['nwr["amenity"="dentist"]X','nwr["healthcare"="dentist"]X'],'doctors-clinics':['nwr["amenity"~"^(doctors|clinic)$"]X'],
 'gyms':['nwr["leisure"="fitness_centre"]X'],'plumbers':['nwr["craft"="plumber"]X'],'electricians':['nwr["craft"="electrician"]X'],
 'hvac':['nwr["craft"="hvac"]X'],'roofers':['nwr["craft"="roofer"]X'],'real-estate':['nwr["office"="estate_agent"]X'],
 'lawyers':['nwr["office"="lawyer"]X'],'accountants':['nwr["office"~"^(accountant|tax_advisor)$"]X'],'hotels':['nwr["tourism"~"^(hotel|motel)$"]X'],
 'florists':['nwr["shop"="florist"]X'],'vets-pet-grooming':['nwr["amenity"="veterinary"]X','nwr["shop"="pet_grooming"]X'],
 'landscaping':['nwr["craft"="gardener"]X','nwr["shop"="garden_centre"]X'],'insurance':['nwr["office"="insurance"]X']};
async function geocode(city){const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(city),{headers:{'user-agent':OSM_UA,'accept-language':'en'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('geocoder '+r.status);const j=await r.json();if(!j[0])return null;
 let [s,n,w,e]=j[0].boundingbox.map(Number);const lat=+j[0].lat,lon=+j[0].lon;const cap=0.35;if(n-s>cap){s=lat-cap/2;n=lat+cap/2;}if(e-w>cap){w=lon-cap/2;e=lon+cap/2;}return {display:j[0].display_name,bbox:[s,w,n,e]};}
async function overpass(sel,bbox){const b='('+bbox.map(x=>x.toFixed(4)).join(',')+')';const q='[out:json][timeout:25];('+sel.map(x=>x.replace('X',b)).join(';')+';);out center tags 400;';
 const errs=[];for(const ep of ['https://overpass.openstreetmap.fr/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']){try{const r=await fetch(ep+'?data='+encodeURIComponent(q),{headers:{'user-agent':OSM_UA,'accept':'application/json'},signal:AbortSignal.timeout(30000)});if(r.ok)return (await r.json()).elements||[];errs.push(new URL(ep).host+':'+r.status);}catch(e){errs.push(new URL(ep).host+':'+String(e.message).slice(0,40));}}throw new Error('map data service busy, try again in a minute ('+errs.join('; ')+')');}
export function osmItem(e){const t=e.tags||{};const src=`https://www.openstreetmap.org/${e.type}/${e.id}`;const addr=[[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' '),t['addr:city'],t['addr:state'],t['addr:postcode']].filter(Boolean).join(', ')||null;
 let web=t.website||t['contact:website']||t.url||null;if(web&&!/^https?:/i.test(web))web='https://'+web;
 return {name:t.name||null,phone:t.phone||t['contact:phone']||null,website:web,address:addr,hours:t.opening_hours||null,email:t.email||t['contact:email']||null,category:t.shop||t.amenity||t.craft||t.office||t.leisure||t.tourism||t.healthcare||null,lat:e.lat??e.center?.lat,lon:e.lon??e.center?.lon,osm_source:src};}
export async function buildQuote(env,city,cat){if(!CATS[cat])return {error:'unknown category'};city=String(city||'').trim().slice(0,120);if(city.length<2)return {error:'city required'};
 const g=await geocode(city);if(!g)return {error:'city not found'};const els=await overpass(CATS[cat],g.bbox);
 const seen=new Set();const items=[];for(const e of els){const it=osmItem(e);if(!it.name)continue;const k=(it.name+'|'+(it.address||'')).toLowerCase();if(seen.has(k))continue;seen.add(k);items.push(it);if(items.length>=300)break;}
 const id=[...crypto.getRandomValues(new Uint8Array(12))].map(b=>b.toString(16).padStart(2,'0')).join('');
 const q={id,city,cat,display:g.display,bbox:g.bbox,items,created:Date.now()};if(items.length)await env.CREDITS.put('quote:'+id,JSON.stringify(q),{expirationTtl:14*86400});
 return {quote_id:items.length>=LEADS_MIN?id:null,min_to_buy:LEADS_MIN,city:g.display,category:cat,count:items.length,with_phone:items.filter(i=>i.phone).length,with_website:items.filter(i=>i.website).length,with_address:items.filter(i=>i.address).length,with_hours:items.filter(i=>i.hours).length,sample:items.slice(0,3).map(i=>i.name)};}
export async function fulfillLeads(env,s){if(!s?.id)return {error:'no session'};const prev=await env.CREDITS.get('order:'+s.id);if(prev)return {repeat:true};
 if(s.payment_status!=='paid'&&s.payment_status!=='no_payment_required')return {error:'not paid'};if((s.amount_subtotal||0)<LEADS_PRICE_CENTS)return {error:'amount too small'};
 const q=s.client_reference_id&&await env.CREDITS.get('quote:'+s.client_reference_id,'json');if(!q||q.items.length<LEADS_MIN){await env.CREDITS.put('leadissue:'+s.id,JSON.stringify({ref:s.client_reference_id||null,email:s.customer_details?.email||null,at:Date.now()}));return {error:'quote not found',needs_manual:true};}
 await env.CREDITS.put('order:'+s.id,JSON.stringify({...q,session:s.id,email:s.customer_details?.email||null,paid_at:Date.now()}));return {ok:true,count:q.items.length};}

const LEADS_URL='https://buy.stripe.com/8x214n99a3tmaFg1BA0x203';
// ---- credits ----
const J=(o,s=200,h={})=>new Response(JSON.stringify(o,null,1),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*',...h}});
export function apiKeyOf(req){const k=req.headers.get('x-api-key');if(k)return k.trim();const a=req.headers.get('authorization')||'';const m=a.match(/^Bearer\s+(\S+)/i);return m?m[1]:null;}
async function dobj(env,name,body){const st=env.COUNTER.get(env.COUNTER.idFromName(name));return (await st.fetch('https://do/',{method:'POST',body:JSON.stringify(body)})).json();}
async function getAcct(env,k){if(!k||!/^agf_[a-f0-9]{32}$/.test(k))return null;const a=await env.CREDITS.get('key:'+k,'json');if(!a)return null;if(env.COUNTER){const r=await dobj(env,'key:'+k,{op:'get',init:a.credits});a.credits=r.credits;a.used=r.used;}return a;}
async function charge(env,k,acct){if(env.COUNTER){const r=await dobj(env,'key:'+k,{op:'dec',init:acct.credits});return r.credits;}acct.credits-=1;acct.used=(acct.used||0)+1;acct.last=Date.now();await env.CREDITS.put('key:'+k,JSON.stringify(acct));return acct.credits;}
function pay402(origin,msg){return J({error:msg||'payment required',free_trial:'5 free lookups per IP per day without a key (used up)',prepaid:{price:'$10 = 500 lookups',monthly:{starter:'$19/mo = 2,000: '+SUB_LINKS.starter,pro:'$49/mo = 10,000: '+SUB_LINKS.pro},buy:PAY_LINK,after_payment:origin+'/thanks shows your API key',use:'header x-api-key: <key> or Authorization: Bearer <key>'}},402);}
const TRIAL_PER_DAY=5;
// Free trial: no key -> up to 5 lookups/IP/UTC day. One KV write per trial request (expires in 2 days).
export const ipBucket=ip=>ip.includes(':')?ip.split(':').slice(0,3).join(':')+'::/48':ip;
const TRIAL_GLOBAL_PER_DAY=500;
export async function rateLimit(env,req,tag,limit){if(!env.COUNTER)return true;const ip=ipBucket(req.headers.get('cf-connecting-ip')||'unknown');return (await dobj(env,tag+':'+new Date().toISOString().slice(0,10)+':'+ip,{op:'trial',limit})).left>=0;}
export async function trialUse(env,req){const ip=ipBucket(req.headers.get('cf-connecting-ip')||'unknown');const day=new Date().toISOString().slice(0,10);const name='trial:'+day+':'+ip;if(env.COUNTER){const r=await dobj(env,name,{op:'trial',limit:TRIAL_PER_DAY});if(r.left<0)return -1;const g=await dobj(env,'trialglobal:'+day,{op:'trial',limit:TRIAL_GLOBAL_PER_DAY});return g.left<0?-1:r.left;}const n=Number(await env.CREDITS.get(name)||0);if(n>=TRIAL_PER_DAY)return -1;await env.CREDITS.put(name,String(n+1),{expirationTtl:172800});return TRIAL_PER_DAY-n-1;}
// Durable Object (SQLite-backed, free plan): strongly consistent counters for trial use and key credits.
export class Counter{constructor(state){this.s=state.storage;}
  async fetch(req){const b=await req.json();
    if(b.op==='trial'){const n=(await this.s.get('n'))||0;if(n>=b.limit)return Response.json({left:-1});await this.s.put('n',n+1);if(n===0)await this.s.setAlarm(Date.now()+172800000);return Response.json({left:b.limit-n-1});}
    let c=await this.s.get('credits');if(c===undefined){c=b.init||0;await this.s.put('credits',c);}let used=(await this.s.get('used'))||0;
    if(b.op==='set'){c=b.credits;await this.s.put('credits',c);}
    if(b.op==='dec'&&c>0){c--;used++;await this.s.put({credits:c,used});}
    return Response.json({credits:c,used});}
  async alarm(){await this.s.deleteAll();}}
const newKey=()=>'agf_'+[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
export const PLANS={1900:2000,4900:10000};// monthly subscription: subtotal cents -> credits per month
export function creditsFor(s){if(s.mode==='subscription')return PLANS[s.amount_subtotal]||0;const sub=s.amount_subtotal??s.amount_total??0;return Math.max(0,Math.floor(sub/PACK_CENTS))*PACK_CREDITS;}
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
  if(s.mode==='subscription'&&s.subscription){rec.plan_monthly=credits;await env.CREDITS.put('sub:'+s.subscription,JSON.stringify({key,credits}));await env.CREDITS.put('sess:'+s.id,JSON.stringify(rec));}
  const day='stat:'+new Date().toISOString().slice(0,10);const st=(await env.CREDITS.get(day,'json'))||{purchases:0,credits_sold:0,subtotal_cents:0};st.purchases++;st.credits_sold+=credits;st.subtotal_cents+=(s.amount_subtotal||0);await env.CREDITS.put(day,JSON.stringify(st));
  return rec;
}
async function setCredits(env,key,credits){if(env.COUNTER)return dobj(env,'key:'+key,{op:'set',credits});const a=await env.CREDITS.get('key:'+key,'json');a.credits=credits;await env.CREDITS.put('key:'+key,JSON.stringify(a));}
export async function onSubEvent(env,ev){const o=ev.data.object;
  if(ev.type==='invoice.paid'){const sid=o.subscription||o.parent?.subscription_details?.subscription;if(!sid||o.billing_reason==='subscription_create')return {ignored:'first invoice handled by checkout'};
    const done=await env.CREDITS.get('inv:'+o.id);if(done)return {repeat:true};const sub=await env.CREDITS.get('sub:'+sid,'json');if(!sub)return {error:'unknown subscription'};
    await setCredits(env,sub.key,sub.credits);await env.CREDITS.put('inv:'+o.id,'1',{expirationTtl:5184000});return {ok:true,renewed:sub.credits};}
  if(ev.type==='customer.subscription.deleted'){const sub=await env.CREDITS.get('sub:'+o.id,'json');if(!sub)return {error:'unknown subscription'};await setCredits(env,sub.key,0);return {ok:true,cancelled:true};}
  return {ignored:ev.type};}
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
      if(!k){const left=await trialUse(env,req);if(left>=0){const a=m.params?.arguments||{};const out=await lookup(a.url,a.country).catch(e=>({error:String(e.message)}));out.free_trial_remaining_today=left;out.buy=PAY_LINK;return r({content:[{type:'text',text:JSON.stringify(out)}]});}}
      if(!acct||acct.credits<=0)return r({isError:true,content:[{type:'text',text:`Free trial used up for today (5/day). Send header x-api-key with prepaid credits. Buy 500 lookups for $10: ${PAY_LINK}`}]});
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
    if(!k){const left=await trialUse(env,req);if(left<0)return pay402(origin,'free trial used up for today');let out;try{out=await lookup(q,u.searchParams.get('country'));}catch(e){return J({error:String(e.message)},502);}out.free_trial_remaining_today=left;out.buy='$10 = 500 lookups: '+PAY_LINK;return J(out);}
    if(!acct)return pay402(origin,'unknown api key');if(acct.credits<=0)return pay402(origin,'no credits left');
    let out;try{out=await lookup(q,u.searchParams.get('country'));}catch(e){return J({error:String(e.message),charged:false},502);}
    if(billable(out))out.credits_remaining=await charge(env,k,acct);else{out.charged=false;out.credits_remaining=acct.credits;}
    return J(out);}
  if(P==='/balance'){const k=apiKeyOf(req)||u.searchParams.get('key');const a=await getAcct(env,k);return a?J({credits_remaining:a.credits,used:a.used||0}):J({error:'unknown api key'},404);}
  if(P==='/mcp'){if(req.method==='GET')return new Response('Use POST (streamable HTTP, JSON responses)',{status:405});return mcp(req,env,origin);}
  if(P==='/stripe/webhook'&&req.method==='POST'){
    if(!env.STRIPE_WEBHOOK_SECRET)return J({error:'webhook not configured'},503);
    const body=await req.text();if(!await verifyStripeSig(body,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))return J({error:'bad signature'},400);
    const ev=JSON.parse(body);
    if(ev.type==='checkout.session.completed'||ev.type==='checkout.session.async_payment_succeeded'){const s=ev.data.object;if(LEADS_LINKS.has(s.payment_link)){const r=await fulfillLeads(env,s);return J({ok:!r.error,repeat:!!r.repeat,error:r.error,product:'leads'});}if(!CREDIT_LINKS.has(s.payment_link))return J({ignored:'unknown product'});const r=await fulfill(env,s);return J({ok:!r.error,repeat:!!r.repeat,error:r.error});}
    if(ev.type==='invoice.paid'||ev.type==='customer.subscription.deleted')return J(await onSubEvent(env,ev));
    return J({ignored:ev.type});}
  if(P==='/thanks'){const sid=u.searchParams.get('session_id')||'';
    if(!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid))return page('<h1>Missing checkout session</h1><p>Open this page from the Stripe receipt redirect.</p>');
    if(await env.CREDITS.get('leadissue:'+sid))return page('<h1>Payment received, but we could not match your list</h1><p>This happens if checkout was opened without picking a city and category first on <a href=/leads>/leads</a>. Reply to your Stripe receipt with the city and business type you want, or ask for a full refund. Your reference: <code>'+esc(sid)+'</code></p>');
    if(await env.CREDITS.get('order:'+sid))return Response.redirect(origin+'/leads/order?session_id='+sid,302);
    let rec=await env.CREDITS.get('sess:'+sid,'json');
    if(!rec&&env.STRIPE_API_KEY){const s=await stripeSession(env,sid);if(s&&LEADS_LINKS.has(s.payment_link)){const r=await fulfillLeads(env,s);if(r.ok||r.repeat)return Response.redirect(origin+'/leads/order?session_id='+sid,302);}if(s&&CREDIT_LINKS.has(s.payment_link)){const r=await fulfill(env,s);if(!r.error)rec=r;}}
    if(!rec)return page('<h1>Payment received — issuing your key…</h1><p>This page refreshes automatically. If nothing appears in 2 minutes, reply to your Stripe receipt with your session id: <code>'+esc(sid)+'</code></p>','<meta http-equiv=refresh content=5>');
    return page(`<h1>Your API key</h1><p><code style="font-size:1.2em;background:#eee;padding:6px">${esc(rec.key)}</code></p><p><b>${rec.credits}</b> lookups loaded. Save this key now; this page always shows the same key for this purchase.</p><pre>curl "${origin}/v1/lookup?url=https://www.sacher.com" -H "x-api-key: ${esc(rec.key)}"</pre><p>Balance: <code>${origin}/balance</code> with the same header. MCP: POST <code>${origin}/mcp</code>.</p>`);}

  if(P==='/leads')return page(LEADS_HTML(origin));
  if(P==='/v1/leads/preview'){const ok=await rateLimit(env,req,'leadprev',15);if(!ok)return J({error:'preview limit reached for today'},429);
    try{return J(await buildQuote(env,u.searchParams.get('city'),u.searchParams.get('category')));}catch(e){return J({error:String(e.message)},502);}}
  if(P==='/v1/leads/order'||P==='/v1/leads/enrich'){const sid=u.searchParams.get('session_id')||'';const o=/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid)&&await env.CREDITS.get('order:'+sid,'json');if(!o)return J({error:'order not found'},404);
    if(P==='/v1/leads/order')return J({city:o.display,category:o.cat,count:o.items.length,items:o.items,attribution:OSM_ATTR,license:'OSM-derived fields are ODbL 1.0'});
    const i=Number(u.searchParams.get('i'));const it=o.items[i];if(!it||!it.website)return J({error:'no website for row'},400);
    const left=env.COUNTER?(await dobj(env,'enrich:'+sid,{op:'trial',limit:o.items.length*2+10})).left:1;if(left<0)return J({error:'enrichment limit reached for this order'},429);
    try{return J(await lookup(it.website));}catch(e){return J({error:String(e.message)},502);}}
  if(P==='/leads/order')return page(ORDER_HTML(origin));
  if(P==='/bulk')return page(BULK_HTML(origin));
  if(P==='/openapi.json')return J(OPENAPI(origin));
  if(P==='/llms.txt')return new Response(LLMS(origin),{headers:{'content-type':'text/plain;charset=utf-8'}});
  if(P==='/.well-known/mcp.json')return J({name:'local-business-facts',description:'Source-cited business facts from any website, worldwide.',transport:'streamable-http',url:origin+'/mcp',auth:{type:'api_key',header:'x-api-key',optional_for_trial:true},free_trial:'5 lookups/IP/day',pricing:'$10 per 500 lookups',buy:PAY_LINK,registry:'io.github.thepecanpie69-art/agentric-local-business-facts',tools:TOOLS.map(t=>t.name)});
  if(P==='/.well-known/ai-plugin.json')return J({schema_version:'v1',name_for_human:'Local Business Facts',name_for_model:'local_business_facts',description_for_human:'Source-cited facts (phone, address, hours, socials) from any business website, worldwide.',description_for_model:'Given a business website URL, returns JSON facts (name, phone raw+E.164, address, hours, socials, open/closed signal), each with source URL and confidence. Coverage is partial: only what the site publishes. 5 free lookups/IP/day, then x-api-key ($10/500).',auth:{type:'none'},api:{type:'openapi',url:origin+'/openapi.json'},logo_url:'https://github.com/thepecanpie69-art.png',contact_email:'',legal_info_url:'https://github.com/thepecanpie69-art/agentric-local-business-facts'});
  if(P==='/.well-known/agent.json'||P==='/.well-known/agent-card.json')return J({name:'Local Business Facts',description:'Source-cited business facts from any business website URL, worldwide, any language.',url:origin,version:'0.3.0',provider:{organization:'Agentric',url:origin},capabilities:{streaming:false},defaultInputModes:['text/plain'],defaultOutputModes:['application/json'],interfaces:{rest:origin+'/openapi.json',mcp:origin+'/mcp',llms_txt:origin+'/llms.txt'},skills:[{id:'lookup_business',name:'Business facts lookup',description:'URL in, JSON facts out (name, phone, address, hours, socials), each with source URL and confidence.',tags:['local-business','enrichment','e164'],examples:['https://www.sacher.com']}],pricing:{free_trial:'5 lookups/IP/day',paid:'$10 per 500 lookups',buy:PAY_LINK}});
  if(P==='/')return page(`<h1>Local Business Facts API</h1><p>Worldwide, any language. Send a business website URL, get source-cited facts as JSON: name, phone (raw + E.164), address, hours, socials, open/closed signal. Each field has its source URL, method and confidence. Business information only, no personal data.</p><p><b>$10 = 500 lookups</b> (2¢ each). Try 5 free lookups a day with no key. Only successful paid lookups use a credit. <a href="${PAY_LINK}">Buy credits</a>; your key appears right after checkout.</p><pre>curl "${origin}/v1/lookup?url=https://www.sacher.com&country=AT" -H "x-api-key: YOUR_KEY"</pre><p><a href=/leads><b>Local Lead Lists ($19)</b></a> (city + business type → CSV) · <a href=/bulk><b>Bulk CSV tool</b></a> (paste a list of websites, download a spreadsheet) · ${PRICING()} <a href=/openapi.json>OpenAPI</a> · <a href=/llms.txt>llms.txt</a> · MCP: POST ${origin}/mcp (tool lookup_business)</p>`);
  return J({error:'not found'},404);
}};

const BULK_HTML=o=>`<h1>Bulk lookup → CSV</h1><p>Paste business website URLs (one per line, up to 500). Each is looked up through the API and you can download a CSV with name, phone, E.164 phone, address, hours, socials and the source URL for each field. Uses your API key's credits (1 per successful row). No key? The first 5 a day are free.</p>
<p><input id=k placeholder="API key (agf_…), optional" style="width:100%;padding:6px"></p><textarea id=u rows=10 style="width:100%" placeholder="https://www.example-bakery.com"></textarea>
<p><button id=go>Run</button> <button id=dl disabled>Download CSV</button> <span id=st></span></p><pre id=log style="white-space:pre-wrap;max-height:300px;overflow:auto"></pre>
<script>
const F=['name','phone','address','hours','socials','official_site','open_signal'];let rows=[];
const q=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replace(/"/g,'""')+'"';
go.onclick=async()=>{const list=u.value.split(/\\s+/).filter(Boolean).slice(0,500);rows=[];dl.disabled=true;log.textContent='';
 for(let i=0;i<list.length;i++){st.textContent=(i+1)+'/'+list.length;const h=k.value.trim()?{'x-api-key':k.value.trim()}:{};
  const r=await fetch('/v1/lookup?url='+encodeURIComponent(list[i]),{headers:h});const d=await r.json().catch(()=>({error:'bad response'}));
  if(r.status===402){log.textContent+='Stopped: '+(d.error||'payment required')+'. Buy credits: '+(d.prepaid&&d.prepaid.buy||'')+'\\n';break;}
  const f=d.fields||{};rows.push([list[i],...F.map(x=>f[x]&&f[x].value),f.phone&&f.phone.e164,...F.map(x=>f[x]&&f[x].source),d.confidence,d.error||d.blocked||'']);
  log.textContent+=list[i]+' → '+((f.name&&f.name.value)||d.error||d.blocked||'no name')+'\\n';}
 st.textContent='done: '+rows.length+' rows';dl.disabled=!rows.length;};
dl.onclick=()=>{const head=['input',...F,'phone_e164',...F.map(x=>x+'_source'),'confidence','note'];const csv=[head,...rows].map(r=>r.map(q).join(',')).join('\\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='business-facts.csv';a.click();};
</script>`;
const PRICING=()=>SUB_LINKS.starter?`Monthly plans: <a href="${SUB_LINKS.starter}">$19/mo for 2,000 lookups</a> · <a href="${SUB_LINKS.pro}">$49/mo for 10,000</a> (cancel anytime) · `:'';

const CAT_OPTS=()=>Object.keys(CATS).map(c=>`<option value="${c}">${c.replace(/-/g,' ')}</option>`).join('');
const LEADS_HTML=o=>`<h1>Local Lead Lists: $19 per list</h1><p>Pick a city and a business type. You get a downloadable CSV of local businesses with name, phone, address, website and hours where findable. Every row links to its source: the OpenStreetMap record, plus the business's own website when we could read it.</p>
<p><b>Honest coverage note:</b> the list comes from OpenStreetMap. It's strong for some places and categories and thin for others, and small home-based businesses are often missing. Preview the count for free before you buy.</p>
<p><input id=c placeholder="City, e.g. Keller, TX" style="width:60%;padding:6px"> <select id=t>${CAT_OPTS()}</select> <button id=p>Preview (free)</button></p><div id=r></div>
<p style="font-size:.85em;color:#555">${OSM_ATTR}</p>
<script>p.onclick=async()=>{r.textContent='Searching map data…';const d=await (await fetch('/v1/leads/preview?city='+encodeURIComponent(c.value)+'&category='+t.value)).json();
if(d.error){r.textContent='Error: '+d.error;return;}if(d.count&&!d.quote_id){r.innerHTML='Only <b>'+d.count+'</b> found in <b>'+d.city+'</b>. That is too few to be worth $19, so it is not for sale. Try a larger nearby city or another category.';return;}if(!d.count){r.innerHTML='No businesses of that type found in OpenStreetMap for <b>'+d.city+'</b>. Try a nearby larger city or another category.';return;}
r.innerHTML='<p><b>'+d.count+'</b> businesses found in <b>'+d.city+'</b>. In the map data, '+d.with_phone+' have a phone, '+d.with_website+' a website, '+d.with_address+' an address and '+d.with_hours+' hours. After purchase we also read each website for more contact details. Examples: '+d.sample.join(', ')+'.</p><p><a href="${LEADS_URL}?client_reference_id='+d.quote_id+'" style="font-size:1.2em"><b>Buy this list: $19</b></a> (the CSV is generated right after checkout)</p>';};</script>`;
const ORDER_HTML=o=>`<h1>Your lead list</h1><p id=st>Loading…</p><p><button id=dl disabled>Download CSV</button></p><pre id=log style="white-space:pre-wrap;max-height:300px;overflow:auto"></pre><p style="font-size:.85em;color:#555">${OSM_ATTR}. Bookmark this page; you can come back and download again.</p>
<script>const sid=new URLSearchParams(location.search).get('session_id');let rows=[];
const q=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replace(/"/g,'""')+'"';
(async()=>{const o=await (await fetch('/v1/leads/order?session_id='+encodeURIComponent(sid))).json();if(o.error){st.textContent='Order not found yet. If you just paid, refresh in a few seconds.';setTimeout(()=>location.reload(),5000);return;}
for(let i=0;i<o.items.length;i++){const it=o.items[i];st.textContent='Building '+o.category+' list for '+o.city+': '+(i+1)+'/'+o.items.length;let f={};
 if(it.website){try{const d=await (await fetch('/v1/leads/enrich?session_id='+encodeURIComponent(sid)+'&i='+i)).json();f=d.fields||{};}catch(e){}}
 const pick=(a,k)=>a?[a,it.osm_source]:(f[k]?[f[k].value,f[k].source]:['','']);const ph=pick(it.phone,'phone'),ad=pick(it.address,'address'),hr=pick(it.hours,'hours');
 rows.push([it.name,ph[0],(f.phone&&f.phone.e164)||'',ph[1],ad[0],ad[1],it.website||'',hr[0],hr[1],it.email||'',(f.socials&&f.socials.value)||'',it.category,it.lat,it.lon,it.osm_source,(f.open_signal&&f.open_signal.value)||'']);
 log.textContent+=it.name+(ph[0]?' · '+ph[0]:'')+'\\n';}
st.textContent='Done: '+rows.length+' businesses ('+o.category+', '+o.city+').';dl.disabled=false;
dl.onclick=()=>{const head=['name','phone','phone_e164','phone_source','address','address_source','website','hours','hours_source','email','socials','category','lat','lon','osm_source','website_status'];
const csv=[head,...rows].map(r=>r.map(q).join(',')).join('\\n')+'\\n'+q(o.attribution+'. '+o.license);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='leads-'+o.category+'.csv';a.click();};})();</script>`;
const LLMS=o=>`# Local Business Facts API (worldwide)
> Send any business's website URL (any country, any language). Get JSON facts: name, phone (raw + E.164), postal address, opening hours, socials, open/closed signal, page language, country. Each field has source URL, extraction method and confidence. Business info only, no personal data.
- GET ${o}/v1/lookup?url=<site>&country=<ISO2 optional>  (header x-api-key or Authorization: Bearer)
- Price: $10 = 500 lookups prepaid: ${PAY_LINK} (key shown after checkout). 1 credit only when facts are found; bot-blocked or failed lookups are free.
- Monthly: $19/mo = 2,000 lookups (${SUB_LINKS.starter}), $49/mo = 10,000 (${SUB_LINKS.pro}); credits reset each billing month.
- Bulk CSV tool for humans: ${o}/bulk
- Local Lead Lists: ${o}/leads ($19 per city + business type CSV from OpenStreetMap, enriched; free preview of the count)
- Free trial: 5 lookups per IP per day with no key. After that, HTTP 402 with the purchase link.
- GET ${o}/balance · OpenAPI: ${o}/openapi.json · MCP (streamable HTTP): POST ${o}/mcp, tool lookup_business {url, country?}
`;
const OPENAPI=o=>({openapi:'3.1.0',info:{title:'Local Business Facts API',version:'0.2.0',description:'Worldwide, any page language. Business information only; no personal data. $10 = 500 lookups: '+PAY_LINK},servers:[{url:o}],components:{securitySchemes:{apiKey:{type:'apiKey',in:'header',name:'x-api-key'}}},security:[{},{apiKey:[]}],paths:{'/v1/lookup':{get:{summary:'Source-cited business facts from a URL (5 free/IP/day without a key)',parameters:[{name:'url',in:'query',required:true,schema:{type:'string'}},{name:'country',in:'query',schema:{type:'string'},description:'Optional ISO 3166-1 alpha-2'}],responses:{200:{description:'Facts JSON'},402:{description:'Payment required'}}}},'/balance':{get:{summary:'Remaining credits',responses:{200:{description:'ok'}}}}}});
