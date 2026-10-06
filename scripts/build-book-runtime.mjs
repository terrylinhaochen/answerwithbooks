import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const vendor=new URL('../vendor/book-to-skill/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('UPSTREAM.json',vendor),'utf8'));
const files={};
for(const [name,hash] of Object.entries(manifest.files)) {
 const bytes=await readFile(new URL(name,vendor));
 if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error(`Pinned upstream file changed: ${name}`);
 if(name.endsWith('.py'))files[`vendor/book-to-skill/${name}`]=bytes.toString('utf8');
}
files['scripts/book-adapter/adapter.py']=await readFile(new URL('book-adapter/adapter.py',import.meta.url),'utf8');
files['supabase/functions/_shared/book-upload-limits.json']=await readFile(new URL('../supabase/functions/_shared/book-upload-limits.json',import.meta.url),'utf8');
const output=new URL('../public/book-runtime/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('upstream.json',output),JSON.stringify({commit:manifest.commit,files}));
const runtime=new URL('../node_modules/pyodide/',import.meta.url);
for(const name of await readdir(runtime))if(/\.(mjs|js|wasm|zip|json)$/.test(name)||name.startsWith('LICENSE'))await cp(new URL(name,runtime),new URL(name,output));
await cp(new URL('LICENSE.md',vendor),new URL('BOOK-TO-SKILL-LICENSE.txt',output));
console.log(`Prepared pinned Python runtime and ${Object.keys(files).length} upstream/adapter modules.`);
