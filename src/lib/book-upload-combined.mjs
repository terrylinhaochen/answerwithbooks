import {zipSync,strToU8} from 'fflate';
import {buildSourceCollection} from '../../supabase/functions/_shared/book-collections.mjs';
import limits from '../../supabase/functions/_shared/book-upload-limits.json' with {type:'json'};
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function uploadCombinedSources(files,title,options,{call,extract,put,progress=()=>{}}){
 if(typeof title!=='string'||!title.trim()||title.length>200||/[\r\n]/.test(title))throw Error('Enter a one-line title for your guide.');
 if(files.length<2||files.length>10)throw Error('Choose two to ten sources for one guide.');
 if(files.some(f=>!f.size||!/\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(f.name)))throw Error('Combined guides need readable sources. Process Kindle files separately or convert them to EPUB first.');
 if(files.reduce((n,f)=>n+f.size,0)>limits.maxFileBytes)throw Error('Choose sources totalling no more than 50 MB for one guide.');
 const health=await call({action:'health'});if(!health.available||!health.combined_sources)throw Error('Combined-guide uploads are not enabled on this server yet. Your sources have not been uploaded.');
 const parts=[],entries=Object.create(null);
 for(const [i,file]of files.entries()){
  const bytes=new Uint8Array(await file.arrayBuffer()),sha256=await hash(bytes),report=await extract(file,message=>progress(i,message));
  if(!report)throw Error(`${file.name} needs structured processing. Process it separately; none of this guide has been uploaded.`);
  if(report.text.trim().length<100)throw Error(`${file.name} does not have enough readable text. None of this guide has been uploaded.`);
  parts.push({name:file.name,sha256,text:report.text});entries[`sources/${i+1}-${file.name}`]=[bytes,{mtime:new Date(1980,0,1)}];
 }
 const collection=buildSourceCollection(parts,title),text=strToU8(collection.text);
 if(collection.text.length>limits.maxTextCharacters||text.length>limits.maxTextBytes)throw Error('The combined guide exceeds the text capacity. Choose fewer sources.');
 entries['collection.txt']=[text,{mtime:new Date(1980,0,1)}];entries['manifest.json']=[strToU8(JSON.stringify({title,sources:collection.sources},null,2)),{mtime:new Date(1980,0,1)}];
 const bytes=zipSync(entries);if(bytes.length>limits.maxFileBytes)throw Error('The combined source archive exceeds 50 MB.');
 const sha=await hash(bytes),cached=await call({action:'lookup',sha});if(cached.reused)return cached;
 const result=await call({action:'prepare',name:title+'.collection.zip',size:bytes.length,sha,textSha:await hash(text),textBytes:text.length,extraction:{method:'combined-collection',sources:collection.sources,headings:collection.headings},options});
 if(!result.reused){if(!result.upload||!result.textUpload)throw Error('This guide upload is already in progress. Try again shortly.');await put(result.upload,bytes);await put(result.textUpload,text);await call({action:'finalize',id:result.job.id});}
 return result; // Review/accept-price remains a separate, explicitly authorized operation.
}
