from pypdf import PdfReader
from pypdf.generic import DecodedStreamObject,NameObject
from pathlib import Path
import re,hashlib,collections,json,difflib
import argparse
parser=argparse.ArgumentParser(description='Reproduce verified, edition-specific PDF ligature repairs without changing stored text.')
parser.add_argument('pdf');parser.add_argument('stored_text');parser.add_argument('--repaired-text')
args=parser.parse_args()
source=Path(args.pdf)
sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert sha=='cb61b767c8cd576f2aab0b9769638f2d12bbd85a0ffbd800d50948d1a7dbbd94'
pdf=PdfReader(source);seen=set();lines=collections.defaultdict(set)
ligatures={0x3e6:'ff',0x3e9:'ffi',0x3ec:'ffl',0x3ef:'fi',0x3f2:'fl'}
normalize=lambda s:' '.join(s.split())
for page in pdf.pages:
 for ref in page['/Resources'].get('/Font',{}).values():
  font=ref.get_object()
  if id(font) in seen:continue
  seen.add(id(font));cmap=font.get('/ToUnicode')
  if not cmap:continue
  data=cmap.get_object().get_data()
  data=re.sub(rb'<([0-9A-Fa-f]{4})>\s*<0000>',lambda m:b'<'+m[1]+b'> <'+('%04X'%(0xe000+int(m[1],16))).encode()+b'>',data)
  new=DecodedStreamObject();new.set_data(data);font[NameObject('/ToUnicode')]=new
 for line in page.extract_text().splitlines():
  if not re.search('[\ue000-\uf8ff]',line):continue
  broken=line;fixed=line
  for glyph,replacement in ligatures.items():
   broken=broken.replace(chr(0xe000+glyph),' ');fixed=fixed.replace(chr(0xe000+glyph),replacement)
  assert not re.search('[\ue000-\uf8ff]',fixed)
  lines[normalize(broken)].add(normalize(fixed))
raw=Path(args.stored_text).read_text().split('\n');patches={};fixedlines=[]
for n,line in enumerate(raw,1):
 matches=lines.get(normalize(line))
 if matches and len(matches)==1:
  corrected=re.match(r'^\s*',line)[0]+next(iter(matches))
  assert all(ord(char)<=0xffff for char in line), 'Convert offsets to UTF-16 before storing this line'
  changes=[[a,b,line[a:b],corrected[c:d]] for op,a,b,c,d in difflib.SequenceMatcher(None,line,corrected,autojunk=False).get_opcodes() if op!='equal']
  if changes:patches[str(n)]={'sha256':hashlib.sha256(line.encode()).hexdigest(),'edits':changes}
  fixedlines.append(corrected)
 else:fixedlines.append(line)
out=Path('supabase/functions/_shared/source-repairs');out.mkdir(exist_ok=True)
(out/'dyson-ligatures.json').write_text(json.dumps({'sourceSha':sha,'lineCount':len(raw),'reason':'Verified PDF ToUnicode null mappings for EBGaramond ligatures; exact source line hashes guard repairs.','patches':patches},ensure_ascii=False,separators=(',',':'))+'\n')
if args.repaired_text:Path(args.repaired_text).write_text('\n'.join(fixedlines))
print('Patched lines',len(patches),'of',len(raw),'PDF damaged line variants',len(lines),'patch bytes',(out/'dyson-ligatures.json').stat().st_size)
for n in range(6796,6978):
 if re.search(r'intensi|quali|signi',raw[n-1]):print(n,repr(raw[n-1]),'->',repr(fixedlines[n-1]))
print('Guide repaired lines',sum(str(n) in patches for n in range(6796,6978)))
