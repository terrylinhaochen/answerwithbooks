export function bookStatus(job) {
 const native=job.source_import?.kind==='native'&&['queued','processing'].includes(job.source_import.state);
 if(native)return 'Reading your original file in the background';
 if(job.status==='ready') {
  if(job.cover_path&&job.cover_status==='ready')return 'Book, skill, and cover ready';
  if(job.cover_status==='failed')return 'Book and skill ready · Cover needs a retry';
  if(job.cover_status==='pending')return 'Book and skill ready · Creating cover';
  return 'Book and skill ready';
 }
 if(job.status==='analyzed')return 'Analysis ready';
 if(job.run_state==='failed')return job.error||'Needs a retry';
 if(job.run_state==='paused')return job.error||'Paused';
 if(job.run_state==='staging')return 'Source preparation or spending approval pending';
 if(job.run_state==='queued')return job.total_sections>0&&job.cursor>=job.total_sections
  ?'All source sections read · Assembling book and skill'
  :`Processing in the background · ${job.cursor||0}${job.total_sections?` of ${job.total_sections}`:''} sections read`;
 return 'Saved · Open to continue';
}
export function bookSourceLabel(job) {
 // Only label a chapter range when the uploaded filename explicitly names it.
 const chapters=job.source_name?.match(/chapters?[\s_-]+(\d+)[\s_-]+(?:to[\s_-]+)?(\d+)\b/i);
 const scope=chapters?`Excerpt · Chapters ${chapters[1]}–${chapters[2]}`:'Uploaded source';
 return `${scope}${job.total_sections?` · ${job.total_sections} processing sections`:''}${job.source_line_count?` · ${job.source_line_count.toLocaleString('en-US')} source lines`:''}`;
}
export function groupBookUploads(jobs) {
 const groups=new Map();
 for(const job of jobs) {
  // Append/replacement histories remain separate books; missing identities never group.
  const key=job.revision_kind==='base'&&job.source_text_sha?job.source_text_sha:job.id;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(job);
 }
 return [...groups.values()].map(copies=>{
  const ready=copies.find(job=>job.status==='ready');
  const primary=ready||copies[0];
  return {primary,copies:copies.filter(job=>job.id!==primary.id)};
 });
}
