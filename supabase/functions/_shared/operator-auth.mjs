/** Validate project operator authority with Auth; never authorize from decoded JWT claims. */
export async function verifyOperator(bearer,{url,serviceKey,fetchImpl=fetch}) {
 if(typeof bearer!=='string'||!bearer||bearer.length>4096)return false;
 // Project service credentials can differ from the Edge Function's injected key.
 // A project Auth admin request verifies both token validity and operator privileges.
 try {
  const response=await fetchImpl(`${url}/auth/v1/admin/users?page=1&per_page=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${bearer}`},signal:AbortSignal.timeout(10000)});
  await response.body?.cancel();return response.status===200;
 }catch{return false;}
}
