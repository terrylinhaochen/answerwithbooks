import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveGuideDraft,readGuideDraft,clearGuideDraft,guideAuthPaths} from '../src/lib/guide-draft.mjs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const book='00000000-0000-4000-8000-000000000001';
const value={question:'What makes work worthwhile?',bookIds:[book],length:'short'};
test('email tabs restore the exact draft and clearing one preserves another',()=>{
 const local=storage(),tab={local,session:storage()},other={local,session:storage()};
 const first=saveGuideDraft(value,null,tab),second=saveGuideDraft({...value,question:'A different question'},null,tab);
 assert.equal(readGuideDraft(first.id,other).question,value.question);
 assert.equal(readGuideDraft(second.id,other).question,'A different question');
 clearGuideDraft(first.id,other);assert.equal(readGuideDraft(first.id,other),null);assert.ok(readGuideDraft(second.id,other));
});
test('auth paths preserve resume without accepting external destinations',()=>{
 const s={local:storage(),session:storage()},d=saveGuideDraft(value,null,s);
 const p=guideAuthPaths(`?from=guides&resume=${d.id}`,s);
 for(const path of Object.values(p))assert.ok(path.includes(d.id));
 assert.equal(guideAuthPaths('?from=tools',s),null);
 assert.equal(guideAuthPaths('?from=guides&resume=https://evil.example',s).destination,'/guides/');
 assert.equal(readGuideDraft('https://evil.example',s),null);
});
test('legacy drafts migrate, expired drafts and malformed choices are rejected',()=>{
 const s={local:storage(),session:storage()};s.session.setItem('awb:guide-book-review',JSON.stringify(value));
 const d=readGuideDraft(null,s);assert.ok(d.id);assert.equal(readGuideDraft(d.id,{local:s.local,session:storage()}).question,value.question);
 s.local.setItem('awb:guide-review:v1:'+d.id,JSON.stringify({...d,savedAt:Date.now()-86400001}));
 assert.equal(readGuideDraft(d.id,s),null);
 assert.throws(()=>saveGuideDraft({...value,bookIds:['bad']},null,s));
});

test('completed drafts cannot reappear from an older tab session',()=>{
 const local=storage(),tab={local,session:storage()},other={local,session:storage()};
 const draft=saveGuideDraft(value,null,tab);clearGuideDraft(draft.id,other);assert.equal(readGuideDraft(null,tab),null);
});

test('same-tab fallback works when localStorage is blocked',()=>{
 const s={local:null,session:storage()},d=saveGuideDraft(value,null,s);
 assert.equal(readGuideDraft(d.id,s).question,value.question);
});
