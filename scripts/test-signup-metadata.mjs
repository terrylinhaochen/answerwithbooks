import test from 'node:test';
import assert from 'node:assert/strict';
import {signupMetadata} from '../src/lib/signup-metadata.mjs';
test('signup attribution contains only a fixed product and known entrypoint',()=>{
  assert.equal(signupMetadata('agent').awb_signup.entrypoint,'agent');
  for(const input of [undefined,'reader@example.com','https://outside.test/?token=secret',{email:'private'}]){
    assert.deepEqual(signupMetadata(input),{awb_signup:{version:1,product:'answerwithbooks',entrypoint:'website'}});
  }
});
