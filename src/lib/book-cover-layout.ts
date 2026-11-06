// Measure the illustration against its background, then fit it inside the art cell.
// The title panel remains a separate, protected 40% of the cover.
export function mountBookCoverLayout(){
 const seen=new WeakSet<HTMLImageElement>();
 function prepare(img:HTMLImageElement){
  if(seen.has(img)||img.closest('.jacket--composed'))return;seen.add(img);
  const art=img.closest<HTMLElement>('.jacket-art');if(!art)return;
  const fit=()=>{
   if(!img.naturalWidth)return;
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=Math.round(128*img.naturalHeight/img.naturalWidth);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
   try{
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height),w=canvas.width,h=canvas.height;
    const bg=[data[0],data[1],data[2]],transparent=data[3]<32;
    let left=w,top=h,right=-1,bottom=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const i=(y*w+x)*4;
     if(data[i+3]<64)continue;
     if(!transparent&&Math.max(...bg.map((c,k)=>Math.abs(data[i+k]-c)))<55)continue;
     left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left||bottom<top)return;
    // Add a small source margin around the detected outline.
    left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(w-1,right+2);bottom=Math.min(h-1,bottom+2);
    if(!transparent)art.style.backgroundColor=`rgb(${bg.join(',')})`;
    const layout=()=>{
     const width=art.clientWidth,height=art.clientHeight;if(!width||!height)return;
     const scale=Math.min(width*.84/(right-left+1),height*.84/(bottom-top+1));
     img.style.width=`${w*scale}px`;img.style.height=`${h*scale}px`;
     img.style.left=`${(width-(right-left+1)*scale)/2-left*scale}px`;
     // Set the emblem slightly below center while keeping 4% clearance above the title panel.
     img.style.top=`${(height-(bottom-top+1)*scale)/2+height*.04-top*scale}px`;
     img.dataset.coverFitted='true';
    };
    layout();const resize=new ResizeObserver(()=>{if(img.isConnected)layout();else resize.disconnect();});resize.observe(art);
   }catch{/* Cross-origin or unusual artwork keeps the safe contain fallback. */}
  };
  if(img.complete)fit();else img.addEventListener('load',fit,{once:true});
 }
 function scan(node:Element){if(node.matches('.jacket-art img'))prepare(node as HTMLImageElement);node.querySelectorAll<HTMLImageElement>('.jacket-art img').forEach(prepare);}
 scan(document.documentElement);
 const observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node instanceof Element)scan(node);});
 observer.observe(document.body,{childList:true,subtree:true});
}
