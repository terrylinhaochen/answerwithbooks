import limits from './book-upload-limits.json' with {type:'json'};
export function splitSource(text, headings = []) {
 if(typeof text!=='string'||text.length>limits.maxTextCharacters)throw new Error('This source exceeds the current processing capacity.');
 const lines = text.replace(/\r\n?/g,'\n').split('\n').flatMap(line => line.match(/.{1,1000}/gu) || ['']);
 const boundaries=new Map();
 if(!Array.isArray(headings)||headings.length>limits.maxSourceHeadings)throw new Error('Invalid source structure.');
 for(const heading of headings)if(Number.isInteger(heading.line)&&heading.line>=1&&heading.line<=lines.length&&typeof heading.title==='string'&&heading.title===lines[heading.line-1].trim()&&heading.title.length<=200)boundaries.set(heading.line,heading.title);
 const minHeadingSection=text.length>300000?Math.max(12000,Math.ceil(text.length/(limits.maxProcessingSections*.8))):0;
 const chunks = []; let start=1, part=[] , size=0, title='';
 for(let i=0;i<lines.length;i++) {
  if((size+lines[i].length>24000 || (boundaries.has(i+1)&&size>=minHeadingSection)) && part.length) { chunks.push({start,end:i,text:part.join('\n'),title});start=i+1;part=[];size=0; }
  if(boundaries.has(i+1)&&!part.length)title=boundaries.get(i+1);
  part.push(`${i+1}: ${lines[i]}`);size+=lines[i].length+12;
 }
 if(part.length) chunks.push({start,end:lines.length,text:part.join('\n'),title});
 // Dense headings must not turn a readable book into thousands of tiny jobs.
 // Fall back to size-bounded sections, retaining every line and its citation position.
 if(chunks.length>limits.maxProcessingSections){if(headings.length)return splitSource(text,[]);throw new Error('This source exceeds the current processing capacity.');}
 return {text:lines.join('\n'),chunks,lineCount:lines.length};
}
export function validateSection(data,chunk,index) {
 const nonempty=v=>typeof v==='string'&&v.trim().length>0;
 if(!data||!nonempty(data.summary)||!Array.isArray(data.ideas)||data.ideas.length>8) throw new Error('The model returned incomplete section notes. Retry this section.');
 const refs=items=>Array.isArray(items)&&items.length>0&&items.every(r=>Number.isInteger(r.startLine)&&Number.isInteger(r.endLine)&&r.startLine>=chunk.start&&r.endLine<=chunk.end&&r.endLine>=r.startLine);
 if(!refs(data.sourceRefs)) throw new Error('The section references did not match its source.');
 for(const idea of data.ideas) if(!['name','explanation','whenToUse','limits'].every(k=>nonempty(idea[k]))||!Array.isArray(idea.steps)||!idea.steps.length||!idea.steps.every(nonempty)||!refs(idea.sourceRefs)||(idea.decisionRule!=null&&!nonempty(idea.decisionRule))) throw new Error('The generated idea lacked grounded evidence or application steps.');
 const extras={};
 for(const [key,fields] of [['antiPatterns',['name','why','instead']],['workedExamples',['title','scenario','application']]]){
  const values=data[key]??[];
  if(!Array.isArray(values)||values.length>5||values.some(value=>!value||!fields.every(field=>nonempty(value[field]))||!refs(value.sourceRefs)))throw new Error('The generated example or anti-pattern lacked source support.');
  extras[key]=values;
 }
 return {id:`ch${String(index+1).padStart(2,'0')}`,title:chunk.title||`Source section ${index+1}`,summary:data.summary,sourceRefs:data.sourceRefs,ideas:data.ideas,...extras};
}
