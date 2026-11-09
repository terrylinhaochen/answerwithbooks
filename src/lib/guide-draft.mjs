// Temporary browser continuity only: never authentication or authority to create a guide.
const PREFIX = 'awb:guide-review:v1:';
const PENDING = 'awb:pending-guide-review';
const LEGACY = 'awb:guide-book-review';
const TTL = 24 * 60 * 60 * 1000;
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const valid = value => value && typeof value.question === 'string' && value.question.trim().length >= 3 && value.question.length <= 2000 && Array.isArray(value.bookIds) && (value.bookIds.length >= 1 || value.mode === 'automatic') && value.bookIds.length <= 4 && value.bookIds.every(uuid) && new Set(value.bookIds).size === value.bookIds.length && ['short','standard','long'].includes(value.length);
const get = (storage,key) => { try { return storage.getItem(key); } catch { return null; } };
const set = (storage,key,value) => { try { storage.setItem(key,value); return true; } catch { return false; } };
const remove = (storage,key) => { try { storage.removeItem(key); } catch {} };
const stores = () => { let local,session; try { local=window.localStorage; } catch {} try { session=window.sessionStorage; } catch {} return {local,session}; };
export function saveGuideDraft(value, id, storage=stores()) {
 if(!valid(value))throw Error('Please review your question and books before signing in.');
 if(!uuid(id))id=crypto.randomUUID();
 const draft={id,question:value.question,bookIds:value.bookIds,length:value.length,...(value.mode==='automatic'?{mode:'automatic'}:{}),savedAt:Date.now(),...(uuid(value.guideId)?{guideId:value.guideId}:{})};
 // Remove expired drafts so browser storage does not become a permanent question history.
 try { for(const key of Object.keys(storage.local))if(key.startsWith(PREFIX)){const old=JSON.parse(get(storage.local,key)||'null');if(!old||Date.now()-old.savedAt>=TTL)remove(storage.local,key);} } catch {}
 const shared=set(storage.local,PREFIX+id,JSON.stringify(draft));
 const tab=set(storage.session,LEGACY,JSON.stringify({...draft,tabOnly:!shared}));
 if(!shared&&!tab)throw Error('Your browser could not save this draft. Allow site storage before signing in.');
 if(shared)set(storage.local,PENDING,id);
 return draft;
}
export function readGuideDraft(id, storage=stores()) {
 // An explicit resume link must never pick up a different tab's guide.
 const explicit=id!=null;
 if(explicit&&!uuid(id))return null;
 if(!explicit)id=get(storage.local,PENDING);
 try {
  const shared=uuid(id)?JSON.parse(get(storage.local,PREFIX+id)||'null'):null;
  if(shared&&valid(shared)&&shared.id===id&&Number.isFinite(shared.savedAt)&&shared.savedAt<=Date.now()&&Date.now()-shared.savedAt<TTL)return shared;
  if(uuid(id)&&shared)clearGuideDraft(id,storage);
  const legacy=JSON.parse(get(storage.session,LEGACY)||'null');
  if(legacy?.id&&!legacy.tabOnly){remove(storage.session,LEGACY);return null;}
  if(valid(legacy)&&(!explicit||legacy.id===id)&&(!legacy.savedAt||(legacy.savedAt<=Date.now()&&Date.now()-legacy.savedAt<TTL)))return saveGuideDraft(legacy,legacy.id,storage);
 }catch{}
 return null;
}
export function clearGuideDraft(id, storage=stores()) {
 if(!uuid(id))return;
 remove(storage.local,PREFIX+id);
 if(get(storage.local,PENDING)===id)remove(storage.local,PENDING);
 try {if(JSON.parse(get(storage.session,LEGACY)||'null')?.id===id)remove(storage.session,LEGACY);}catch{}
}
export function guideAuthPaths(search, storage=stores()) {
 const query=new URLSearchParams(search);
 if(query.get('from')!=='guides')return null;
 const requested=query.get('resume'),draft=readGuideDraft(requested,storage);
 const id=draft?.id||(uuid(requested)?requested:null);
 const suffix=id?`&resume=${encodeURIComponent(id)}`:'';
 return {login:`/login/?from=guides${suffix}`,signup:`/signup/?from=guides${suffix}`,callback:`/auth/confirm/?from=guides${suffix}`,destination:id?`/guides/?resume=${encodeURIComponent(id)}`:'/guides/'};
}
