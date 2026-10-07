import {animate} from 'motion/mini';

// One local illustration: question -> source retrieval -> applied response.
export function mountSkillDemo(){
 const root=document.querySelector<HTMLElement>('[data-agent-demo]');if(!root)return;
 const conversation=root.querySelector<HTMLElement>('[data-demo-conversation]')!;
 const control=root.querySelector<HTMLButtonElement>('[data-demo-playback]')!;
 const controlLabel=root.querySelector<HTMLElement>('[data-demo-playback-label]')!;
 const controlPath=root.querySelector<SVGPathElement>('[data-demo-playback-icon] path')!;
 const runState=root.querySelector<HTMLElement>('[data-demo-run-state]')!;
 const callLabel=root.querySelector<HTMLElement>('[data-demo-call-label]')!;
 const progress=[...root.querySelectorAll<HTMLElement>('[data-demo-step]')];
 const reveals=[...root.querySelectorAll<HTMLElement>('[data-demo-reveal]')];
 const announce=root.querySelector<HTMLElement>('[data-demo-announcement]')!;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const starts=[0,1400,3000,3900,4350,4950,5550,6200],duration=6700;
 let elapsed=0,last=0,frame=0,visible=false,userPaused=false,finished=false;
 let animations:ReturnType<typeof animate>[]=[];
 const canPlay=()=>visible&&!document.hidden&&!userPaused&&!reduced.matches&&!finished;
 function stopAnimations(){animations.forEach(a=>a.stop());animations=[];}
 function playback(){
  const label=finished?'Replay':userPaused?'Play':'Pause';
  controlLabel.textContent=label;control.setAttribute('aria-label',`${label} demo`);
  controlPath.setAttribute('d',finished?'M4 10a8 8 0 1 1 1.7 7M4 4v6h6':userPaused?'m8 5 11 7-11 7z':'M8 5v14M16 5v14');
  root!.dataset.demoPaused=String(!canPlay());
  runState.textContent=finished?'Ready to use':userPaused?'Paused':elapsed<1400?'Your question':elapsed<3900?'Finding sources':'Applying the book';
 }
 function paint(instant=false){
  const step=elapsed<1400?0:elapsed<3900?1:2;
  finished=elapsed>=duration;
  root!.dataset.demoPhase=['question','sources','answer'][step];
  root!.dataset.demoRetrieving=String(elapsed>=1400&&elapsed<3000);
  progress.forEach((item,index)=>{
   item.dataset.state=finished||index<step?'complete':index===step?'current':'upcoming';
   if(index===step&&!finished)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  });
  callLabel.textContent=elapsed<3000?'Finding a book…':'The Mom Test';
  reveals.forEach(el=>{
   if(el.dataset.visible==='true'||elapsed<starts[Number(el.dataset.demoReveal)])return;
   el.dataset.visible='true';el.removeAttribute('aria-hidden');el.inert=false;
   if(!instant&&!reduced.matches)animations.push(animate(el,{opacity:[0,1],transform:['translateY(7px)','translateY(0)']},{duration:.34,ease:[.2,.7,.2,1]}));
  });
  playback();
 }
 function tick(now:number){
  frame=0;if(!canPlay())return;
  const before=elapsed;elapsed+=Math.min(now-last,80);last=now;
  if([...starts,duration].some(time=>before<time&&elapsed>=time))paint();
  if(canPlay())frame=requestAnimationFrame(tick);
 }
 function sync(){
  animations.forEach(a=>canPlay()?a.play():a.pause());
  if(canPlay()&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  else if(!canPlay()&&frame){cancelAnimationFrame(frame);frame=0;}
  playback();
 }
 function reset(instant=false){
  if(frame)cancelAnimationFrame(frame);frame=0;stopAnimations();elapsed=instant?duration:0;finished=false;userPaused=false;
  conversation.querySelectorAll('details').forEach(el=>el.open=false);
  reveals.forEach(el=>{el.removeAttribute('style');el.dataset.visible='false';el.setAttribute('aria-hidden','true');el.inert=true;});
  paint(instant);sync();
 }
 function complete(){
  elapsed=duration;stopAnimations();reveals.forEach(el=>el.removeAttribute('style'));paint(true);sync();
 }
 root.dataset.demoEnhanced='true';control.hidden=reduced.matches;reset(reduced.matches);
 control.addEventListener('click',()=>{
  if(finished){reset();announce.textContent='Replaying the question, book sources, and answer.';return;}
  userPaused=!userPaused;sync();
 });
 conversation.querySelector('details')!.addEventListener('toggle',event=>{if((event.target as HTMLDetailsElement).open)complete();});
 // Keep the conversation still while a keyboard reader inspects a source.
 conversation.addEventListener('focusin',()=>{if(!finished){userPaused=true;sync();}});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15});observer.observe(root.querySelector('[data-demo-window]')!);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{control.hidden=reduced.matches;if(reduced.matches)complete();else sync();});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;animations.forEach(a=>a.pause());});
 window.addEventListener('pageshow',sync);
}
