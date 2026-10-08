import limits from './book-upload-limits.json' with {type:'json'};
export function splitSource(text, headings = []) {
 if(typeof text!=='string'||text.length>limits.maxTextCharacters)throw new Error('This source exceeds the current processing capacity.');
 const lines = text.replace(/\r\n?/g,'\n').split('\n').flatMap(line => line.match(/.{1,1000}/gu) || ['']);
 const boundaries=new Map();
 if(!Array.isArray(headings)||headings.length>limits.maxSourceHeadings)throw new Error('Invalid source structure.');
 for(const heading of headings)if(Number.isInteger(heading.line)&&heading.line>=1&&heading.line<=lines.length&&typeof heading.title==='string'&&heading.title===lines[heading.line-1].trim()&&heading.title.length<=200)boundaries.set(heading.line,{title:typeof heading.displayTitle==='string'?heading.displayTitle.slice(0,200):heading.title,method:heading.method==='inferred-roman-title'?heading.method:'upstream-detected'});
 const chapterMap=[...boundaries].sort(([a],[b])=>a-b).map(([start,value],i,all)=>({id:`chapter-${i+1}`,title:value.title,startLine:start,endLine:all[i+1]?.[0]-1||lines.length,method:value.method,verified:false}));
 const minHeadingSection=text.length>300000?Math.max(12000,Math.ceil(text.length/(limits.maxProcessingSections*.8))):0;
 let chunks = []; let start=1, part=[] , size=0, title='';
 for(let i=0;i<lines.length;i++) {
  if((size+lines[i].length>24000 || (boundaries.has(i+1)&&size>=minHeadingSection)) && part.length) { chunks.push({start,end:i,text:part.join('\n'),title});start=i+1;part=[];size=0; }
  if(boundaries.has(i+1)&&!part.length)title=boundaries.get(i+1).title;
  part.push(`${i+1}: ${lines[i]}`);size+=lines[i].length+12;
 }
 if(part.length) chunks.push({start,end:lines.length,text:part.join('\n'),title});
 // A short title/provenance preface must not become an isolated AI chapter.
 // Keep every citation line and attach it to the first substantive section.
 if(chunks.length>1 && !chunks[0].title && chunks[0].text.length<2000 && chunks[0].text.length+chunks[1].text.length+1<=24000){
  const prefix=chunks.shift();chunks[0]={...chunks[0],start:prefix.start,text:prefix.text+'\n'+chunks[0].text};
 }
 // Dense headings must not turn a readable book into thousands of tiny jobs.
 // Fall back to size-bounded sections, retaining every line and its citation position.
 if(chunks.length>limits.maxProcessingSections){if(headings.length)chunks=splitSource(text,[]).chunks;else throw new Error('This source exceeds the current processing capacity.');}
 const technical=technicalReferences(lines);
 for(const chunk of chunks){
  chunk.sourceChapters=chapterMap.filter(ch=>ch.startLine<=chunk.end&&ch.endLine>=chunk.start);
  chunk.technicalReferences=technical.filter(ref=>ref.startLine>=chunk.start&&ref.startLine<=chunk.end);
 }
 return {text:lines.join('\n'),chunks,lineCount:lines.length,chapterMap};
}
export function validateSection(data,chunk,index) {
 const nonempty=v=>typeof v==='string'&&v.trim().length>0;
 if(!data||!nonempty(data.summary)||!Array.isArray(data.ideas)||data.ideas.length>8) throw new Error('The model returned incomplete section notes. Retry this section.');
 const refs=items=>Array.isArray(items)&&items.length>0&&items.every(r=>Number.isInteger(r.startLine)&&Number.isInteger(r.endLine)&&r.startLine>=chunk.start&&r.endLine<=chunk.end&&r.endLine>=r.startLine);
 if(!refs(data.sourceRefs)) throw new Error('The section references did not match its source.');
 for(const idea of data.ideas) if(!['name','explanation','whenToUse','limits'].every(k=>nonempty(idea[k]))||!Array.isArray(idea.steps)||!idea.steps.length||!idea.steps.every(nonempty)||!refs(idea.sourceRefs)||(idea.decisionRule!=null&&!nonempty(idea.decisionRule))) throw new Error('The generated idea lacked grounded evidence or application steps.');
 for(const idea of data.ideas) if(idea.applicationBasis!=null&&!['source-instruction','derived-application'].includes(idea.applicationBasis))throw new Error('The generated application basis was invalid.');
 const extras={};
 for(const [key,fields] of [['antiPatterns',['name','why','instead']],['workedExamples',['title','scenario','application']]]){
  const values=data[key]??[];
  if(!Array.isArray(values)||values.length>5||values.some(value=>!value||!fields.every(field=>nonempty(value[field]))||!refs(value.sourceRefs)))throw new Error('The generated example or anti-pattern lacked source support.');
  extras[key]=values;
 }
 return {id:`ch${String(index+1).padStart(2,'0')}`,title:chunk.title||`Source section ${index+1}`,summary:data.summary,sourceRefs:data.sourceRefs,ideas:data.ideas,sourceChapters:chunk.sourceChapters||[],technicalReferences:chunk.technicalReferences||[],...extras};
}

// Preserve exact structured source blocks independently of model paraphrases.
// These remain inert evidence; no generated command or code is executed.
function technicalReferences(lines){
 const refs=[];
 for(let i=0;i<lines.length;i++){
  const start=i,line=lines[i],fence=line.match(/^\s*(`{3,}|~{3,})/);
  let kind;
  if(fence){kind='code';const closing=new RegExp('^\\s*'+fence[1][0]+'{'+fence[1].length+',}\\s*$');let end=i+1;while(end<lines.length&&!closing.test(lines[end]))end++;if(end===lines.length)continue;i=end;}
  else if(/^\s*\$\$/.test(line)){kind='equation';if(!/\$\$.+\$\$\s*$/.test(line)){let end=i+1;while(end<lines.length&&!/\$\$\s*$/.test(lines[end]))end++;if(end===lines.length)continue;i=end;}}
  else if(line.includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]||'')){kind='table';i++;while(i+1<lines.length&&lines[i+1].includes('|')&&lines[i+1].trim())i++;}
  else continue;
  const text=lines.slice(start,i+1).join('\n');
  if(text.length<=48000&&refs.length<2000)refs.push({kind,startLine:start+1,endLine:i+1,text});
 }
 return refs;
}
