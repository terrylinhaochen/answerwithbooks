import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function runBookAdapter(request) {
 const python=process.env.AWB_PYTHON||'python3';
 const result=spawnSync(python,[fileURLToPath(new URL('../../scripts/book-adapter/adapter.py',import.meta.url))],{input:JSON.stringify(request),encoding:'utf8',timeout:request.extractionMode==='technical'?900000:180000,maxBuffer:64*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 if(result.error)throw new Error('Book extractor could not run: '+result.error.message);
 let report;try{report=JSON.parse(result.stdout);}catch{throw new Error('Book extractor did not return a valid report.');}
 if(result.status!==0||report.error)throw new Error(report.error||'Book extraction failed.');return report;
}
