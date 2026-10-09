import test from 'node:test';import assert from 'node:assert/strict';
import {bookUser,tokenHash} from '../supabase/functions/_shared/book-cli-auth.mjs';
test('personal API keys resolve to the same owner and cannot use native workspace identities or revoked keys',async()=>{
 const key='awb_live_'+'a'.repeat(43),owner='10000000-0000-4000-8000-000000000001';let calls=0;
 const db={rpc:async(name,args)=>{calls++;assert.equal(name,'awb_skills_store');assert.equal(args.p_namespace,'awb-production');assert.equal(args.p_args.digest,await tokenHash(key));return {data:owner};}};
 assert.deepEqual(await bookUser(db,key),{id:owner});assert.equal(calls,1);
 assert.equal(await bookUser(db,'awb_live_bad'),null);assert.equal(calls,1);
 for(const data of [null,'cl:'+owner,'awb:'+owner,'malformed'])assert.equal(await bookUser({rpc:async()=>({data})},key),null);
 assert.equal(await bookUser({rpc:async()=>({data:owner,error:{message:'revoked'}})},key),null);
});
