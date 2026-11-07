import {animate} from 'motion/mini';

// One illustrated conversation: books -> question -> original passage.
export function mountSkillDemo(){
 const root=document.querySelector<HTMLElement>('[data-agent-demo]');if(!root)return;
 const conversation=root.querySelector<HTMLElement>('[data-demo-conversation]')!;
 const scroller=root.querySelector<HTMLElement>('[data-demo-scroll]')!;
 const readingUI=root.dataset.demoUi==='reading';
 const runState=root.querySelector<HTMLElement>('[data-demo-run-state]')!;
 const callLabel=root.querySelector<HTMLElement>('[data-demo-call-label]')!;
 const matchedLabel=callLabel.textContent!;
 const catalogLabel=root.querySelector<HTMLElement>('[data-demo-catalog-label]')!;
 const catalogCount=catalogLabel.textContent!;
 const catalogTool=root.querySelector<HTMLElement>('[data-demo-tool="catalog"]')!;
 const askTool=root.querySelector<HTMLElement>('[data-demo-tool="ask"]')!;
 const reveals=[...root.querySelectorAll<HTMLElement>('[data-demo-reveal]')];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const starts=readingUI?[0,900,3000,5500,8500,10500,11700,13000,14500,16000]:[0,750,2100,4500,6600,7900,8350,8950,9550,10200];
 const duration=starts[9]+700;
 let elapsed=0,last=0,frame=0,visible=false,manualScroll=false,finished=false;
 let animations:ReturnType<typeof animate>[]=[];
 const canPlay=()=>visible&&!document.hidden&&!finished&&!reduced.matches;
 function stopAnimations(){animations.forEach(a=>a.stop());animations=[];}
 function settleReveals(){
  stopAnimations();
  reveals.filter(el=>el.dataset.visible==='true').forEach(el=>el.removeAttribute('style'));
 }
 function playback(){
  root!.dataset.demoPaused=String(!canPlay());
  runState.textContent=readingUI?(finished?'Ready to read':elapsed<starts[3]?'Choosing books':elapsed<starts[5]?'Connecting passages':'Opening your reading'):(finished?'Ready to use':elapsed<starts[3]?'Listing books':elapsed<starts[5]?'Asking the books':'Opening the reading');
 }
 function paint(instant=false){
  const follow=!instant&&!manualScroll;
  let revealed=false;
  const step=elapsed<starts[3]?0:elapsed<starts[5]?1:2;
  finished=elapsed>=duration;
  root!.dataset.demoPhase=['catalog','ask','apply'][step];
  root!.dataset.demoMatched=String(elapsed>=starts[4]);
  catalogTool.dataset.loading=String(elapsed>=starts[1]&&elapsed<starts[2]);
  askTool.dataset.loading=String(elapsed>=starts[3]&&elapsed<starts[4]);
  catalogLabel.textContent=elapsed<starts[2]?(readingUI?'Finding perspectives…':'Listing…'):catalogCount;
  callLabel.textContent=elapsed<starts[4]?(readingUI?'Finding the connection…':'Finding a match…'):matchedLabel;
  reveals.forEach(el=>{
   if(el.dataset.visible==='true'||elapsed<starts[Number(el.dataset.demoReveal)])return;
   revealed=true;el.dataset.visible='true';el.removeAttribute('aria-hidden');el.inert=false;
   if(!instant&&!reduced.matches){
    const animation=animate(el,{opacity:[0,1],transform:['translateY(7px)','translateY(0)']},{duration:.34,ease:[.2,.7,.2,1]});
    animations.push(animation);
    // Finished native animations are cancelled internally. Playing or pausing
    // those controls again can restore their initial, invisible keyframe.
    animation.then(()=>{animations=animations.filter(active=>active!==animation);});
   }
  });
  if(finished)settleReveals();
  if(revealed&&follow)requestAnimationFrame(()=>{
   if(manualScroll)return;
   const card=conversation.querySelector<HTMLElement>('[data-demo-reading],.demo-answer')!;
   // Keep the start of the reading in view as its paragraphs arrive.
   const top=elapsed>=starts[5]?scroller.scrollTop+card.getBoundingClientRect().top-scroller.getBoundingClientRect().top-20:scroller.scrollHeight;
   scroller.scrollTo({top,behavior:'smooth'});
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
  if(frame)cancelAnimationFrame(frame);frame=0;stopAnimations();elapsed=instant?duration:0;finished=false;
  conversation.removeAttribute('style');scroller.scrollTop=0;
  conversation.querySelectorAll('details').forEach(el=>el.open=false);
  reveals.forEach(el=>{el.removeAttribute('style');el.dataset.visible='false';el.setAttribute('aria-hidden','true');el.inert=true;});
  paint(instant);sync();
 }
 // Reader input only disables scroll-following. The timed reveals keep playing.
 function stopFollowing(){
  manualScroll=true;
  scroller.scrollTo({top:scroller.scrollTop,behavior:'instant'});
 }
 root.dataset.demoEnhanced='true';reset(reduced.matches);
 conversation.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)stopFollowing();}));
 conversation.addEventListener('focusin',stopFollowing);
 scroller.addEventListener('pointerdown',stopFollowing,{passive:true});
 scroller.addEventListener('wheel',stopFollowing,{passive:true});
 scroller.addEventListener('touchstart',stopFollowing,{passive:true});
 scroller.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))stopFollowing();});
 const observer=new IntersectionObserver(entries=>{const entry=entries[0];visible=entry.isIntersecting&&entry.intersectionRatio>=.25;sync();},{threshold:[0,.25]});observer.observe(root.querySelector('[data-demo-window]')!);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches){manualScroll=false;reset(true);}else sync();});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;animations.forEach(a=>a.pause());});
 window.addEventListener('pageshow',sync);
}
