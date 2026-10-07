export const validCliToken = value => /^awb_cli_[a-f0-9]{64}$/.test(value || '');
export async function tokenHash(value) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function bookUser(db,bearer) {
 if(bearer.startsWith('awb_cli_')) {
  if(!validCliToken(bearer))return null;
  const {data,error}=await db.from('book_cli_sessions').select('user_id').eq('token_hash',await tokenHash(bearer)).gt('expires_at',new Date().toISOString()).maybeSingle();
  return error||!data?null:{id:data.user_id};
 }
 const {data,error}=await db.auth.getUser(bearer);
 return error?null:data.user;
}
