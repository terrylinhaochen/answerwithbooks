import {animate} from 'motion/mini';

// Original Astro controller using Motion. Sequencing references: Magic UI's
// Terminal; segmented text reveals: Motion Primitives. See docs/SKILL_CHAT_DEMO.md.
// This is a fixed illustration. It never invokes a model or a processing worker.
export function mountSkillDemo(){
 const root=document.querySelector<HTMLElement>('[data-agent-demo]');if(!root)return;
 const panels=[...root.querySelectorAll<HTMLElement>('[data-demo-scene-panel]')];
 const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-demo-scene]')];
 const control=root.querySelector<HTMLButtonElement>('[data-demo-playback]')!;
 const controlLabel=root.querySelector<HTMLElement>('[data-demo-playback-label]')!;
 const controlPath=root.querySelector<SVGPathElement>('[data-demo-playback-icon] path')!;
 const runState=root.querySelector<HTMLElement>('[data-demo-run-state]')!;
 const announce=root.querySelector<HTMLElement>('[data-demo-announcement]')!;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const starts=[0,1150,2450,2850,3400,3950,4550],duration=5200;
 let scene=0,elapsed=0,last=0,frame=0,visible=false,userPaused=false,started=false,finished=false;
 let animations:ReturnType<typeof animate>[]=[];
 const current=()=>panels[scene];
 function stopAnimations(){animations.forEach(a=>a.stop());animations=[];}
 function playback(){
  const playing=!finished&&!userPaused;
  controlLabel.textContent=finished?'Replay':playing?'Pause':'Play';
  control.setAttribute('aria-label',`${finished?'Replay':playing?'Pause':'Play'} demo`);
  controlPath.setAttribute('d',finished?'M4 10a8 8 0 1 1 1.7 7M4 4v6h6':playing?'M8 5v14M16 5v14':'m8 5 11 7-11 7z');
  root!.dataset.demoPaused=String(!visible||userPaused);
  runState.textContent=finished?'Example complete':userPaused?'Paused':elapsed<1150?'Your task':elapsed<2450?'Reading the skill':'Applying the methods';
 }
 function paint(instant=false){
  const phase=elapsed<1150?'task':elapsed<2450?'reading':'answer';root!.dataset.demoPhase=phase;
  current().querySelector<HTMLElement>('[data-demo-call-label]')!.textContent=phase==='reading'?'Reading skill':'Read skill';
  current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>{
   if(el.dataset.visible==='true'||elapsed<starts[Number(el.dataset.demoReveal)])return;
   el.dataset.visible='true';el.removeAttribute('aria-hidden');el.inert=false;
   if(!instant&&!reduced.matches){animations.push(animate(el,{opacity:[0,1],transform:['translateY(7px)','translateY(0)']},{duration:.34,ease:[.2,.7,.2,1]}));}
  });
  if(elapsed>=duration){finished=true;announce.textContent=`${tabs[scene].getAttribute('aria-label')}: example complete. Expand Read skill to see its methods.`;}
  playback();
 }
 function tick(now:number){
  frame=0;if(!visible||document.hidden||userPaused||finished)return;
  elapsed=Math.min(duration,elapsed+Math.min(now-last,80));last=now;paint();
  if(!finished)frame=requestAnimationFrame(tick);
 }
 function sync(){
  const canPlay=visible&&!document.hidden&&!userPaused&&!finished;
  root!.dataset.demoPaused=String(!canPlay);
  animations.forEach(a=>canPlay?a.play():a.pause());
  if(canPlay&&!frame){started=true;last=performance.now();frame=requestAnimationFrame(tick);}
  else if(!canPlay&&frame){cancelAnimationFrame(frame);frame=0;}
  playback();
 }
 function reset(index:number,instant=false){
  if(frame)cancelAnimationFrame(frame);frame=0;stopAnimations();scene=index;elapsed=instant?duration:0;finished=false;userPaused=false;announce.textContent='';
  panels.forEach((panel,i)=>{panel.hidden=i!==index;panel.querySelectorAll('details').forEach(el=>el.open=false);});
  tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
  current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>{el.removeAttribute('style');el.dataset.visible='false';el.setAttribute('aria-hidden','true');el.inert=true;});
  paint(instant);sync();
 }
 function complete(){elapsed=duration;stopAnimations();current().querySelectorAll<HTMLElement>('[data-demo-reveal]').forEach(el=>el.removeAttribute('style'));paint(true);sync();}
 root.dataset.demoEnhanced='true';control.hidden=false;
 // Without JS the first transcript is fully readable; reduced-motion readers
 // also get the complete example immediately, including when switching scenes.
 reset(0,reduced.matches);
 tabs.forEach((tab,index)=>tab.addEventListener('click',()=>{if(index===scene)return;started=true;reset(index,reduced.matches);}));
 control.addEventListener('click',()=>{if(finished){started=true;reset(scene,reduced.matches);}else{userPaused=!userPaused;sync();}});
 panels.forEach(panel=>panel.querySelector('details')!.addEventListener('toggle',event=>{if((event.target as HTMLDetailsElement).open&&!finished)complete();}));
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15});
 observer.observe(root.querySelector('[data-demo-window]')!);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches)complete();else if(!started)reset(scene);});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;animations.forEach(a=>a.pause());});
 window.addEventListener('pageshow',()=>sync());
}
