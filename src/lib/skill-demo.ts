import {animate} from 'motion/mini';

// One local conversation loops: list the catalog -> ask -> apply the matched book.
export function mountSkillDemo(){
 const root=document.querySelector<HTMLElement>('[data-agent-demo]');if(!root)return;
 const conversation=root.querySelector<HTMLElement>('[data-demo-conversation]')!;
 const control=root.querySelector<HTMLButtonElement>('[data-demo-playback]')!;
 const controlLabel=root.querySelector<HTMLElement>('[data-demo-playback-label]')!;
 const controlPath=root.querySelector<SVGPathElement>('[data-demo-playback-icon] path')!;
 const runState=root.querySelector<HTMLElement>('[data-demo-run-state]')!;
 const callLabel=root.querySelector<HTMLElement>('[data-demo-call-label]')!;
 const catalogLabel=root.querySelector<HTMLElement>('[data-demo-catalog-label]')!;
 const catalogCount=catalogLabel.textContent!;
 const catalogTool=root.querySelector<HTMLElement>('[data-demo-tool="catalog"]')!;
 const askTool=root.querySelector<HTMLElement>('[data-demo-tool="ask"]')!;
 const reveals=[...root.querySelectorAll<HTMLElement>('[data-demo-reveal]')];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const starts=[0,750,2100,4500,6600,7900,8350,8950,9550,10200],duration=10800,fadeAt=18500,cycle=19000;
 let elapsed=0,last=0,frame=0,visible=false,userPaused=false,finished=false,fading=false,iteration=0;
 let animations:ReturnType<typeof animate>[]=[];
 const canPlay=()=>visible&&!document.hidden&&!userPaused&&!reduced.matches;
 function stopAnimations(){animations.forEach(a=>a.stop());animations=[];}
 function playback(){
  const label=userPaused?'Play':'Pause';
  controlLabel.textContent=label;control.setAttribute('aria-label',`${label} demo`);
  controlPath.setAttribute('d',userPaused?'m8 5 11 7-11 7z':'M8 5v14M16 5v14');
  root!.dataset.demoPaused=String(!canPlay());
  runState.textContent=userPaused?'Paused':finished?'Ready to use':elapsed<4500?'Listing books':elapsed<7900?'Asking the books':'Applying the book';
 }
 function paint(instant=false){
  const step=elapsed<4500?0:elapsed<7900?1:2;
  finished=elapsed>=duration;
  root!.dataset.demoPhase=['catalog','ask','apply'][step];
  root!.dataset.demoMatched=String(elapsed>=6600);
  catalogTool.dataset.loading=String(elapsed>=750&&elapsed<2100);
  askTool.dataset.loading=String(elapsed>=4500&&elapsed<6600);
  catalogLabel.textContent=elapsed<2100?'Listing…':catalogCount;
  callLabel.textContent=elapsed<6600?'Finding a match…':'The Mom Test';
  reveals.forEach(el=>{
   if(el.dataset.visible==='true'||elapsed<starts[Number(el.dataset.demoReveal)])return;
   el.dataset.visible='true';el.removeAttribute('aria-hidden');el.inert=false;
   if(!instant&&!reduced.matches)animations.push(animate(el,{opacity:[0,1],transform:['translateY(7px)','translateY(0)']},{duration:.34,ease:[.2,.7,.2,1]}));
  });
  if(elapsed>=fadeAt&&!fading&&!reduced.matches){fading=true;animations.push(animate(conversation,{opacity:[1,0]},{duration:.5}));}
  playback();
 }
 function tick(now:number){
  frame=0;if(!canPlay())return;
  const before=elapsed;elapsed+=Math.min(now-last,80);last=now;
  if(elapsed>=cycle){iteration++;reset();return;}
  if([...starts,duration,fadeAt].some(time=>before<time&&elapsed>=time))paint();
  frame=requestAnimationFrame(tick);
 }
 function sync(){
  animations.forEach(a=>canPlay()?a.play():a.pause());
  if(canPlay()&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  else if(!canPlay()&&frame){cancelAnimationFrame(frame);frame=0;}
  playback();
 }
 function reset(instant=false){
  if(frame)cancelAnimationFrame(frame);frame=0;stopAnimations();elapsed=instant?duration:0;finished=false;fading=false;
  root!.dataset.demoIteration=String(iteration);conversation.removeAttribute('style');
  conversation.querySelectorAll('details').forEach(el=>el.open=false);
  reveals.forEach(el=>{el.removeAttribute('style');el.dataset.visible='false';el.setAttribute('aria-hidden','true');el.inert=true;});
  if(iteration&&!instant)animations.push(animate(conversation,{opacity:[0,1]},{duration:.35}));
  paint(instant);sync();
 }
 function pause(){
  userPaused=true;
  // Inspecting a tool must hold this step, rather than skip to the final reply.
  if(fading){stopAnimations();conversation.removeAttribute('style');elapsed=duration;fading=false;paint(true);}
  sync();
 }
 root.dataset.demoEnhanced='true';control.hidden=reduced.matches;reset(reduced.matches);
 control.addEventListener('click',()=>{
  if(userPaused){conversation.querySelectorAll('details').forEach(el=>el.open=false);userPaused=false;}else{pause();return;}
  sync();
 });
 conversation.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)pause();}));
 // Preserve the current stage while a keyboard reader inspects a source.
 conversation.addEventListener('focusin',pause);
 const observer=new IntersectionObserver(entries=>{const entry=entries[0];visible=entry.isIntersecting&&entry.intersectionRatio>=.25;sync();},{threshold:[0,.25]});observer.observe(root.querySelector('[data-demo-window]')!);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{control.hidden=reduced.matches;if(reduced.matches){userPaused=false;reset(true);}else sync();});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;animations.forEach(a=>a.pause());});
 window.addEventListener('pageshow',sync);
}
