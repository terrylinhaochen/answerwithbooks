import {supabase} from './supabase';
// Cross-page reminder only. Never reopen a modal or start generation automatically.
export async function mountGuideInputNotice(){
 const notice=document.querySelector<HTMLElement>('[data-guide-input-notice]');if(!notice)return;
 const link=notice.querySelector<HTMLAnchorElement>('[data-guide-input-link]')!,label=notice.querySelector<HTMLElement>('[data-guide-input-count]')!;
 let owner:string|undefined,count=0,guideId='',version=0,stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
 const render=()=>{notice.hidden=!owner||!count||!!document.querySelector('dialog[open]');label.textContent=count>1?`${count} guides require input`:'Requires input';link.href=count===1&&guideId?`/guides/?id=${encodeURIComponent(guideId)}`:'/guides/#your-guides';};
 const refresh=async()=>{
  clearTimeout(timer);if(stopped||!owner||document.hidden)return;const request=++version,currentOwner=owner;
  try{const {data,error}=await supabase.functions.invoke('reading-guides',{body:{action:'input-status'}});
   if(stopped||request!==version||currentOwner!==owner)return;
   if(error||!data||!Number.isSafeInteger(data.count)||data.count<0)throw Error('Unavailable');
   count=data.count;guideId=typeof data.guideId==='string'?data.guideId:'';render();
  }catch{if(request===version){count=0;guideId='';render();}}
  finally{if(!stopped&&request===version&&owner)timer=setTimeout(refresh,30000);}
 };
 const sync=(id:string|undefined)=>{if(id===owner)return;owner=id;version++;count=0;guideId='';clearTimeout(timer);render();if(owner)void refresh();};
 const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>setTimeout(()=>sync(session?.user.id),0));
 const {data}=await supabase.auth.getSession();sync(data.session?.user.id);
 const changed=()=>void refresh(),visible=()=>{if(!document.hidden)void refresh();else clearTimeout(timer);};
 document.addEventListener('awb:guide-state-changed',changed);document.addEventListener('visibilitychange',visible);window.addEventListener('focus',changed);
 const observer=new MutationObserver(render);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 window.addEventListener('pagehide',()=>{stopped=true;version++;clearTimeout(timer);observer.disconnect();auth.subscription.unsubscribe();document.removeEventListener('awb:guide-state-changed',changed);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',changed);},{once:true});
}
