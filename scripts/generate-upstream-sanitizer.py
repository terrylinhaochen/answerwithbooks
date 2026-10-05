"""Generate the worker's Unicode filter from upstream's single source of truth."""
import hashlib
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'vendor/book-to-skill'))
from book_to_skill.sanitize import is_invisible_codepoint
points=[n for n in range(0x110000) if is_invisible_codepoint(n)]
ranges=[]
for n in points:
    if ranges and n==ranges[-1][1]+1:
        ranges[-1][1]=n
    else:
        ranges.append([n,n])
source=root/'vendor/book-to-skill/book_to_skill/sanitize.py'
out=root/'supabase/functions/_shared/upstream-sanitize.mjs'
out.write_text('// Generated from book-to-skill sanitize.py; MIT, Copyright (c) 2025 virgiliojr94.\n'
               '// Source SHA-256: '+hashlib.sha256(source.read_bytes()).hexdigest()+'\n'
               'const ranges='+str(ranges)+';\n'
               'export const sanitizeSource=text=>Array.from(text).filter(c=>!ranges.some(([a,b])=>{const n=c.codePointAt(0);return n>=a&&n<=b;})).join(\'\');\n')
