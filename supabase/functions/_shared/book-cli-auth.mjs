export const validCliToken = value => /^awb_cli_[a-f0-9]{64}$/.test(value || '');
export async function tokenHash(value) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function bookUser(db,bearer) {
 if(bearer.startsWith('awb_live_')) {
  if(!/^awb_live_[A-Za-z0-9_-]{43}$/.test(bearer))return null;
  const {data,error}=await db.rpc('awb_skills_store',{p_namespace:'awb-production',p_operation:'resolve_key',p_args:{digest:await tokenHash(bearer)}});
  return !error&&typeof data==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data)?{id:data}:null;
 }
 if(bearer.startsWith('awb_cli_')) {
  if(!validCliToken(bearer))return null;
  const {data,error}=await db.from('book_cli_sessions').select('user_id').eq('token_hash',await tokenHash(bearer)).gt('expires_at',new Date().toISOString()).maybeSingle();
  return error||!data?null:{id:data.user_id};
 }
 const {data,error}=await db.auth.getUser(bearer);
 return error?null:data.user;
}
