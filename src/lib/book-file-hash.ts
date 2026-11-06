import {createSHA256} from 'hash-wasm';
// Only fingerprint locally. Text extraction and all book processing stay hosted.
export async function hashBookFile(file:Blob){
 const hash=await createSHA256();
 for(let offset=0;offset<file.size;offset+=4*1024*1024)hash.update(new Uint8Array(await file.slice(offset,offset+4*1024*1024).arrayBuffer()));
 return hash.digest('hex');
}
