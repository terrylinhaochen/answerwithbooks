import {animate} from 'motion/mini';

// Authored, local-only illustration. See docs/SKILL_CHAT_DEMO.md for references.
export function mountSkillDemo(){
 const root=document.querySelector<HTMLElement>('[data-agent-demo]');if(!root)return;
 const panels=[...root.querySelectorAll<HTMLElement>('[data-demo-scene-panel]')];
 const control=root.querySelector<HTMLButtonElement>('[data-demo-playback]')!;
 const controlLabel=root.querySelector<HTMLElement>('[data-demo-playback-label]')!;
 const controlPath=root.querySelector<SVGPathElement>('[data-demo-playback-icon] path')!;
 const runState=root.querySelector<HTMLElement>('[data-demo-run-state]')!;
 const announce=root.querySelector<HTMLElement>('[data-demo-announcement]')!;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const starts=[0,1150,2450,2850,3400,3950,4550],duration=5200,fadeAt=11600,cycle=12000;
 let scene=0,elapsed=0,last=0,frame=0,visible=false,userPaused=false,finished=false,fading=false;
 let animations:ReturnType<typeof animate>[]=[];
 const current=()=>panels[scene];
 const canPlay=()=>visible&&!document.hidden&&!userPaused&&!reduced.matches;
 function stopAnimations(){animations.forEach(a=>a.stop());animations=[];}
 function playback(){
  const label=reduced.matches?'Next example':userPaused?'Play demo':'Pause demo';
  controlLabel.textContent=reduced.matches?'Next':userPaused?'Play':'Pause';control.setAttribute('aria-label',label);
  controlPath.setAttribute('d',reduced.matches?'M5 12h14m-6-6 6 6-6 6':userPaused?'m8 5 11 7-11 7z':'M8 5v14M16 5v14');
  root!.dataset.demoPaused=String(!canPlay());
  runState.textContent=userPaused?'Paused':finished?'Example complete':elapsed<1150?'Your task':elapsed<2450?'Reading the skill':'Applying the methods';
 }
 function paint(instant=false){
  const phase=elapsed<1150?'task':elapsed<2450?'reading':'answer';root!.dataset.demoPhase=phase;
  current().querySelector<HTMLElement>('[data-demo-call-label]')!.textContent=phase==='reading'?'Reading skill':'Read skill';
  current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>{
   if(el.dataset.visible==='true'||elapsed<starts[Number(el.dataset.demoReveal)])return;
   el.dataset.visible='true';el.removeAttribute('aria-hidden');el.inert=false;
   if(!instant&&!reduced.matches)animations.push(animate(el,{opacity:[0,1],transform:['translateY(7px)','translateY(0)']},{duration:.34,ease:[.2,.7,.2,1]}));
  });
  finished=elapsed>=duration;
  if(elapsed>=fadeAt&&!fading&&!reduced.matches){fading=true;animations.push(animate(current(),{opacity:[1,0]},{duration:.4}));}
  playback();
 }
 function tick(now:number){
  frame=0;if(!canPlay())return;
  const before=elapsed;elapsed+=Math.min(now-last,80);last=now;
  if(elapsed>=cycle){reset((scene+1)%panels.length);return;}
  if([...starts,duration,fadeAt].some(time=>before<time&&elapsed>=time))paint();
  frame=requestAnimationFrame(tick);
 }
 function sync(){
  animations.forEach(a=>canPlay()?a.play():a.pause());
  if(canPlay()&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  else if(!canPlay()&&frame){cancelAnimationFrame(frame);frame=0;}
  playback();
 }
 function reset(index:number,instant=false){
  if(frame)cancelAnimationFrame(frame);frame=0;stopAnimations();scene=index;elapsed=instant?duration:0;finished=false;fading=false;userPaused=false;
  panels.forEach((panel,i)=>{panel.dataset.demoActive=String(i===index);panel.inert=i!==index;panel.setAttribute('aria-hidden',String(i!==index));panel.removeAttribute('style');panel.querySelectorAll('details').forEach(el=>el.open=false);});
  current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>{el.removeAttribute('style');el.dataset.visible='false';el.setAttribute('aria-hidden','true');el.inert=true;});
  if(!instant&&!reduced.matches)animations.push(animate(current(),{opacity:[0,1]},{duration:.4}));
  paint(instant);sync();
 }
 function inspect(){
  elapsed=duration;userPaused=true;stopAnimations();current().removeAttribute('style');current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>el.removeAttribute('style'));paint(true);sync();
 }
 root.dataset.demoEnhanced='true';control.hidden=false;reset(0,reduced.matches);
 control.addEventListener('click',()=>{
  if(reduced.matches){reset((scene+1)%panels.length,true);announce.textContent=current().getAttribute('aria-label')||'Next example';return;}
  if(userPaused){current().querySelectorAll('details').forEach(el=>el.open=false);userPaused=false;}else userPaused=true;
  sync();
 });
 panels.forEach(panel=>panel.querySelector('details')!.addEventListener('toggle',event=>{if((event.target as HTMLDetailsElement).open)inspect();}));
 // Never swap out a book link or disclosure while a keyboard reader is using it.
 root.addEventListener('focusin',event=>{if(current().contains(event.target as Node)){userPaused=true;sync();}});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15});observer.observe(root.querySelector('[data-demo-window]')!);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches)reset(scene,true);else sync();});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;animations.forEach(a=>a.pause());});
 window.addEventListener('pageshow',sync);
}
