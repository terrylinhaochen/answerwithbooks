// Conservative layout signals choose a processor, never generate source content.
// Inspect every page so an appendix can change the route of an otherwise prose PDF.
const taggedTechnical=node=>!!node&&(/^(Table|Formula|Code)$/i.test(node.role||'')||(node.children||[]).some(taggedTechnical));
export function needsStructuredPdf(content,structure=null){
 if(taggedTechnical(structure))return true;
 const items=(content.items||[]).filter(item=>typeof item.str==='string'&&item.str.trim()&&Array.isArray(item.transform));
 const rows=[];
 for(const item of items){
  const x=item.transform[4],y=item.transform[5],height=Math.abs(item.height||item.transform[3]||10);
  let row=rows.find(row=>Math.abs(row.y-y)<Math.max(2,Math.min(row.height,height)*.25));
  if(!row){row={y,height,items:[]};rows.push(row);}row.items.push({...item,x,height});
 }
 rows.sort((a,b)=>b.y-a.y);
 let codeLines=0;
 for(const row of rows){
  row.items.sort((a,b)=>a.x-b.x);
  const text=row.items.map(item=>item.str).join(' ').trim();
  const mono=row.items.some(item=>/mono|courier|consolas|menlo/i.test(content.styles?.[item.fontName]?.fontFamily||''));
  if((mono&&/\b(?:def|return|import|class|function|const|let|var|if|for|while|print)\b|[{};]|=>/.test(text))||/^\s*(?:def\s+\w+\(|(?:const|let|var)\s+\w+\s*=|function\s+\w*\(|(?:import|from)\s+[\w.]+\s+import)/.test(text))codeLines++;
  if(/[∫∑∏√∂≈≠≤≥]/u.test(text)||(/^[\w\s()[\]{}.,+*/^=−×÷²³α-ωΑ-Ω-]{3,100}$/u.test(text)&&/[a-zα-ω)\d²³]\s*=\s*[^=]/iu.test(text)))return true;
 }
 if(codeLines>=2)return true;
 // Three compact rows with repeated, well-separated column starts. Ordinary
 // single-column paragraphs and long two-column prose should not be tables.
 const candidates=[];
 for(const row of rows){
  const cells=[];
  for(const item of row.items){const previous=cells.at(-1);if(previous&&item.x-previous.end<Math.max(12,row.height*1.6)){previous.text+=' '+item.str;previous.end=Math.max(previous.end,item.x+(item.width||0));}else cells.push({x:item.x,end:item.x+(item.width||0),text:item.str});}
  if(cells.length<2||cells.length>8||cells.some(c=>c.text.trim().length>45)||cells.map(c=>c.text).join(' ').length>120)continue;
  candidates.push({y:row.y,height:row.height,cells});
 }
 for(let i=0;i<candidates.length;i++){
  const first=candidates[i];let matches=1,previous=first;
  for(const row of candidates.slice(i+1)){
   if(previous.y-row.y>Math.max(80,previous.height*5))break;
   if(row.cells.length===first.cells.length&&row.cells.every((cell,j)=>Math.abs(cell.x-first.cells[j].x)<8)){matches++;previous=row;if(matches>=3)return true;}
  }
 }
 return false;
}
