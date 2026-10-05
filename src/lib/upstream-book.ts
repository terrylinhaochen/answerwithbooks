export type SourceReport = {text:string;extractor:string;upstreamCommit:string;headings:Array<{line:number;title:string}>;structure:{chapters_detected:number;chapters_method:string;has_toc:boolean};estimatedTokens:number;removedInvisible:number};
export type SkillAudit = {errors:string[];warnings:string[];findings:Array<{path:string;line:number;rule_id:string;message:string}>};
// A fresh worker gives each source its own Python filesystem and a hard timeout.
export function runBookAdapter<T>(request:Record<string,unknown>,transfer:Transferable[]=[]):Promise<T> {
 return new Promise((resolve,reject)=>{
  const worker=new Worker('/book-extractor-worker.mjs',{type:'module'});
  const finish=()=>{clearTimeout(timer);worker.terminate();};
  const timer=setTimeout(()=>{finish();reject(new Error('Document processing timed out. Try a smaller source.'));},90000);
  worker.onmessage=({data})=>{finish();data.error?reject(new Error(data.error)):resolve(data.result);};
  worker.onerror=()=>{finish();reject(new Error('The book extractor could not load. Please retry.'));};
  worker.postMessage(request,transfer);
 });
}
export async function extractUpstream(file:File):Promise<SourceReport> {
 const bytes=await file.arrayBuffer();return runBookAdapter({operation:'extract',extension:file.name.slice(file.name.lastIndexOf('.')).toLowerCase(),bytes},[bytes]);
}
export const analyzeUpstream=(text:string)=>runBookAdapter<SourceReport>({operation:'analyze',text});
export const auditUpstream=(files:Record<string,string>)=>runBookAdapter<SkillAudit>({operation:'validate',files});
