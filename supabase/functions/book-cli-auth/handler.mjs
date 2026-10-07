import {tokenHash,validCliToken} from '../_shared/book-cli-auth.mjs';
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);
export function cliAuthHandler(db) {
 return async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
  try {
   const raw=await req.text();if(raw.length>2048)return reply({error:'Request too large'},413);
   let input;try{input=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
   if(!input||typeof input!=='object')return reply({error:'Invalid request'},400);
   const bearer=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');
   if(input.action==='start') {
    if(!/^[a-f0-9]{64}$/.test(input.tokenHash||''))return reply({error:'Invalid sign-in request'},400);
    const code=crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
    // Supabase's gateway supplies the client IP. Only a hash is retained for rate limiting.
    const requester=await tokenHash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown');
    const {data,error}=await db.rpc('start_book_cli_login',{p_hash:input.tokenHash,p_code:code,p_requester:requester});
    if(error)return reply({error:error.message.includes('Too many')?'Too many sign-in attempts. Try again in ten minutes.':'Could not start sign-in. Please retry.'},error.message.includes('Too many')?429:400);
    return reply({user_code:code.match(/.{4}/g).join('-'),expires_at:data,verification_url:'https://answerwithbooks.com/connect-agent/',interval:3});
   }
   if(input.action==='approve') {
    const code=String(input.code||'').replace(/[-\s]/g,'').toUpperCase();
    if(!/^[A-F0-9]{12}$/.test(code))return reply({error:'Enter the code shown in your terminal.'},400);
    // CLI sessions cannot authorize another session.
    if(validCliToken(bearer))return reply({error:'Sign in on the website to connect an agent.'},401);
    const {data:auth,error}=await db.auth.getUser(bearer);if(error||!auth.user)return reply({error:'Sign in first.'},401);
    const result=await db.rpc('approve_book_cli_login',{p_code:code,p_user:auth.user.id});
    if(result.error)return reply({error:'Could not connect the agent.'},500);
    if(!result.data)return reply({error:'This code expired or has already been used. Run login again.'},400);
    return reply({connected:true});
   }
   if(['poll','logout'].includes(input.action)) {
    if(!validCliToken(bearer))return reply({error:'Invalid agent session.'},401);
    const hash=await tokenHash(bearer);
    if(input.action==='logout') {
     const result=await db.rpc('revoke_book_cli_login',{p_hash:hash});
     if(result.error)return reply({error:'Could not revoke this session. Try again.'},500);
     return reply({revoked:true});
    }
    const {data,error}=await db.rpc('poll_book_cli_login',{p_hash:hash});
    return error?reply({error:'Could not check sign-in.'},500):reply(data);
   }
   return reply({error:'Unknown action'},400);
  }catch{return reply({error:'Agent sign-in is temporarily unavailable.'},500);}
 };
}
