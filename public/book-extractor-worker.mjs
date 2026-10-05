import {loadPyodide} from './book-runtime/pyodide.mjs';
const ready=(async()=>{
 const python=await loadPyodide({indexURL:new URL('./book-runtime/',import.meta.url).href,stdout:()=>{},stderr:()=>{}});
 const response=await fetch(new URL('./book-runtime/upstream.json',import.meta.url));if(!response.ok)throw new Error('Book extractor could not load.');
 const bundle=await response.json();
 for(const [name,content] of Object.entries(bundle.files)) {const path='/awb/'+name;python.FS.mkdirTree(path.slice(0,path.lastIndexOf('/')));python.FS.writeFile(path,content);}
 python.runPython("import sys; sys.path.insert(0, '/awb/scripts/book-adapter'); import adapter");
 return python;
})();
self.onmessage=async({data})=>{
 try {
  const python=await ready;
  let result;
  if(data.operation==='extract') {
   const ext=String(data.extension).toLowerCase();if(!/^\.[a-z]+$/.test(ext))throw new Error('Unsupported file extension.');
   const path='/tmp/source'+ext;python.FS.writeFile(path,new Uint8Array(data.bytes));
   python.globals.set('awb_path',path);
   try {result=python.runPython('import json; json.dumps(adapter.extract(awb_path, browser=True), ensure_ascii=False)');}
   finally {python.FS.unlink(path);python.globals.delete('awb_path');}
  }else if(data.operation==='analyze') {
   python.globals.set('awb_text',data.text);
   try{result=python.runPython('import json; json.dumps(adapter.analyze(awb_text), ensure_ascii=False)');}
   finally{python.globals.delete('awb_text');}
  }else if(data.operation==='validate') {
   python.globals.set('awb_files',JSON.stringify(data.files));
   try{result=python.runPython('import json; json.dumps(adapter.validate(json.loads(awb_files)))');}
   finally{python.globals.delete('awb_files');}
  }else throw new Error('Unknown operation.');
  self.postMessage({result:JSON.parse(result)});
 }catch(error){self.postMessage({error:String(error.message||error).split('\n').filter(Boolean).at(-1)});}
};
