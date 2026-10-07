from pathlib import Path
import json,sys,tempfile,subprocess
web=Path('/private/tmp/awb-deploy-20261005-Evx7Y8/web')
sys.path.insert(0,str(web/'scripts/book-adapter'))
from adapter import validate,analyze
b=Path('/private/tmp/awb-delta-20261007'); python=sys.executable
up=Path('/Users/terry/.agents/skills/book-to-skill')
base={'skill/SKILL.md':'---\nname: delta-fixture\ndescription: Use these notes for document planning and review.\n---\n# Fixture\n\nReference notes.\n'}
rows=[]
for name,files in [('small-control',{**base,'skill/source.txt':'text\n'*100}),('source-500001',{**base,'skill/source.txt':'a'*500001}),('files-101',{**base,**{f'skill/chapters/ch{i:03d}.md':'# Reference\n\nNotes.\n' for i in range(100)}})]:
 row={'case':name,'total_files':len(files)}
 try:
  result=validate(files);row.update(awb_adapter_accepted=True,errors=result['errors'])
 except Exception as e: row.update(awb_adapter_accepted=False,error=str(e))
 with tempfile.TemporaryDirectory(dir=b) as folder:
  root=Path(folder)
  for name2,text in files.items():
   path=root/name2;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
  scanner=subprocess.run([python,str(up/'tools/scan_generated_skill.py'),str(root/'skill')],capture_output=True,text=True)
  row['upstream_scanner_exit']=scanner.returncode
  row['upstream_scanner_output']=scanner.stdout.strip()
 rows.append(row)
book=Path('/private/tmp/awb-upstream-eval-20261007/bennett-source.txt').read_text()
r=analyze(book);(b/'bennett-adapter-result.json').write_text(json.dumps({'text':r['text'],'headings':r['headings']}))
rows.append({'case':'awb-bennet-chapters','chars':len(r['text']),'detected_chapters':r['structure']['chapters_detected'],'heading_positions':len(r['headings']),'expected_original_chapters':12})
(b/'reproductions.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(rows,indent=2))
