import {createHash} from 'node:crypto';
// Hash incrementally: a 500 MB source must never be buffered in an Edge isolate.
export async function verifySourceStream(response,expectedBytes,expectedSha,maxBytes){
 const error=()=>new Error('The original upload is incomplete or changed. Upload the same file to retry.');
 if(!response.ok||!response.body||!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>maxBytes)throw error();
 const declared=response.headers.get('content-length');
 if(declared!==null&&Number(declared)!==expectedBytes){await response.body.cancel();throw error();}
 const reader=response.body.getReader(),digest=createHash('sha256');let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>expectedBytes||size>maxBytes){await reader.cancel();throw error();}digest.update(value);}
 if(size!==expectedBytes||digest.digest('hex')!==expectedSha)throw error();
 }finally{reader.releaseLock();}
}
