export const CONSENT_VERSION = 'awb-newsletter-v1';
const allowedOrigins = new Set(['https://answerwithbooks.com', 'https://www.answerwithbooks.com', 'http://127.0.0.1:4321', 'http://localhost:4321']);

export async function handleSignup(request, config, fetcher = fetch) {
  const origin = request.headers.get('origin') || '';
  const headers = {'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin'};
  if (allowedOrigins.has(origin)) Object.assign(headers, {'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods':'POST, OPTIONS'});
  const reply = (status, body) => new Response(JSON.stringify(body), {status,headers});
  if (!allowedOrigins.has(origin)) return reply(403,{error:'This signup origin is not allowed.'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return reply(405,{error:'Use POST to subscribe.'});
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415,{error:'Expected JSON.'});
  if (!config.url || !config.serviceKey) return reply(503,{error:'Signup is temporarily unavailable. Please try again.'});
  // The hosted gateway also validates the public anon JWT. No service key is
  // ever accepted from the browser or returned in this response.
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) return reply(401,{error:'Missing authorization.'});
  let input;
  try {
    if (Number(request.headers.get('content-length') || 0) > 2048) return reply(413,{error:'Request is too large.'});
    const reader = request.body?.getReader();
    if (!reader) return reply(400,{error:'Missing signup details.'});
    const chunks=[]; let total=0;
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      total+=value.byteLength;
      if(total>2048){await reader.cancel();return reply(413,{error:'Request is too large.'});}
      chunks.push(value);
    }
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    input=JSON.parse(new TextDecoder().decode(bytes));
  } catch {return reply(400,{error:'Invalid signup details.'});}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400,{error:'Invalid signup details.'});
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400,{error:'Enter a valid email address.'});
  if (input.consent !== true || input.consentVersion !== CONSENT_VERSION) return reply(400,{error:'Please agree to receive the newsletter.'});
  if (input.website) return reply(202,{accepted:true}); // Honeypot; do not store bots.
  const sourcePath = typeof input.sourcePath === 'string' && /^\/[a-zA-Z0-9/_-]*$/.test(input.sourcePath) && input.sourcePath.length<=200 ? input.sourcePath : '/';
  // Best-effort abuse protection, not an identity claim. Only a daily salted
  // hash is persisted; never log or store raw IPs or the submitted email.
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(config.serviceKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${new Date().toISOString().slice(0,10)}:${ip}`));
  const rateKey = Array.from(new Uint8Array(signature), b=>b.toString(16).padStart(2,'0')).join('');
  try {
    const response = await fetcher(`${config.url}/rest/v1/rpc/record_newsletter_signup`,{
      method:'POST',headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({p_email:email,p_source_path:sourcePath,p_source_origin:origin,p_rate_key:rateKey,p_consent_version:CONSENT_VERSION}),
      signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) return reply(503,{error:'We could not save your signup. Please try again.'});
    const result=await response.json();
    if(result==='rate_limited') return reply(429,{error:'Too many attempts. Please try again in an hour.'});
    if(result!=='accepted') return reply(503,{error:'We could not save your signup. Please try again.'});
    // Same response for new/duplicate addresses; do not expose list membership.
    return reply(202,{accepted:true});
  } catch {return reply(503,{error:'We could not save your signup. Please try again.'});}
}
