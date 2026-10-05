export function splitSource(text) {
 const lines = text.replace(/\r\n?/g,'\n').split('\n').flatMap(line => line.match(/.{1,1000}/gu) || ['']);
 const chunks = []; let start=1, part=[] , size=0;
 for(let i=0;i<lines.length;i++) {
  if(size+lines[i].length>24000 && part.length) { chunks.push({start,end:i,text:part.join('\n')});start=i+1;part=[];size=0; }
  part.push(`${i+1}: ${lines[i]}`);size+=lines[i].length+12;
 }
 if(part.length) chunks.push({start,end:lines.length,text:part.join('\n')});
 if(chunks.length>60) throw new Error('This book exceeds the current processing limit.');
 return {text:lines.join('\n'),chunks,lineCount:lines.length};
}
export function validateSection(data,chunk,index) {
 const nonempty=v=>typeof v==='string'&&v.trim().length>0;
 if(!data||!nonempty(data.summary)||!Array.isArray(data.ideas)||data.ideas.length>8) throw new Error('The model returned incomplete section notes. Retry this section.');
 const refs=items=>Array.isArray(items)&&items.length>0&&items.every(r=>Number.isInteger(r.startLine)&&Number.isInteger(r.endLine)&&r.startLine>=chunk.start&&r.endLine<=chunk.end&&r.endLine>=r.startLine);
 if(!refs(data.sourceRefs)) throw new Error('The section references did not match its source.');
 for(const idea of data.ideas) if(!['name','explanation','whenToUse','limits'].every(k=>nonempty(idea[k]))||!Array.isArray(idea.steps)||!idea.steps.length||!idea.steps.every(nonempty)||!refs(idea.sourceRefs)) throw new Error('The generated idea lacked grounded evidence or application steps.');
 return {id:`ch${String(index+1).padStart(2,'0')}`,title:`Source section ${index+1}`,summary:data.summary,sourceRefs:data.sourceRefs,ideas:data.ideas};
}
