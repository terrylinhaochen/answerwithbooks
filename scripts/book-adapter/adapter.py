"""AWB boundary around unmodified, pinned book-to-skill code.

The browser calls fixed operations in a disposable virtual filesystem. Documents
are data: never executed, never passed to a shell, and never used as file paths.
"""
import contextlib
import io
import json
import sys
import tempfile
import zipfile
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENDOR = ROOT / 'vendor' / 'book-to-skill'
sys.path.insert(0, str(VENDOR))
sys.path.insert(0, str(VENDOR / 'tools'))
from book_to_skill.utils import (detect_structure, estimate_tokens, extract_single_file,
                                _chapter_number, _closed_fence_line_numbers)
from book_to_skill.sanitize import sanitize_extracted_text
from book_to_skill.parsers.epub import extract_with_zipfile
from book_to_skill.parsers.docx import extract_docx_with_zipfile
from book_to_skill.parsers.html import extract_html_file
from book_to_skill.parsers.rtf import extract_rtf
from book_to_skill.parsers.text import read_text_file
from validate_skill import audit
from scan_generated_skill import scan_generated_skill

LIMITS = json.loads((ROOT / 'supabase/functions/_shared/book-upload-limits.json').read_text())
MAX_BYTES = LIMITS['maxFileBytes']
MAX_TEXT = LIMITS['maxTextCharacters']
WEB_EXTENSIONS = {'.epub', '.docx', '.html', '.htm', '.xhtml', '.rtf',
                  '.txt', '.text', '.md', '.markdown', '.rst', '.adoc', '.asciidoc'}


def check_archive(path):
    """Bound decompression before upstream stdlib parsers allocate content."""
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 2000 or sum(e.file_size for e in entries) > LIMITS['maxArchiveExpandedBytes']:
            raise ValueError('This document archive is too large when expanded.')
        for entry in entries:
            if entry.flag_bits & 1:
                raise ValueError('Encrypted book archives are not supported.')
            if entry.file_size > 12 * 1024 * 1024:
                raise ValueError('A document component exceeds the extraction limit.')
            if entry.file_size > max(1, entry.compress_size) * 200 and entry.file_size > 1024 * 1024:
                raise ValueError('This document archive exceeds the decompression limit.')


def analyze(text, method='provided-text'):
    text, removed = sanitize_extracted_text(text)
    if len(text) > MAX_TEXT:
        raise ValueError('This source exceeds the 1.2 million character text limit. Split it into smaller documents.')
    if not text.strip() or '\x00' in text:
        raise ValueError('No usable text was found in this document.')
    # Match the server line normalization so citations and heading positions agree.
    lines = []
    for line in text.replace('\r\n', '\n').replace('\r', '\n').split('\n'):
        lines.extend([line[i:i+1000] for i in range(0, len(line), 1000)] or [''])
    text = '\n'.join(lines)
    headings = []
    fenced = _closed_fence_line_numbers(lines)
    previous = ''
    for i, line in enumerate(lines):
        if i in fenced or not line.strip():
            previous = ''
            continue
        if _chapter_number(line, previous) is not None:
            headings.append({'line': i+1, 'title': line.strip()})
        previous = line.strip()
    return {'text': text, 'extractor': 'book-to-skill/' + method,
            'upstreamCommit': 'c108d25b0cb58e1bdc361f3de02ed9f37075152f',
            'structure': detect_structure(text), 'headings': headings,
            'estimatedTokens': estimate_tokens(text), 'removedInvisible': removed}


def extract(path, browser=False):
    path = Path(path).resolve()
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f'Choose a source file up to {MAX_BYTES // 1024 // 1024} MB.')
    if path.suffix.lower() in {'.epub', '.docx'}:
        check_archive(path)
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        if not browser:
            result = extract_single_file(path, 'text', 'no')
            # Upstream extracts and sanitizes once; preserve its removal report.
            report = analyze(result['text'], result.get('extraction_method', 'native'))
            report['upstreamMetadata'] = {k:v for k,v in result.items() if k!='text'}
            return report
        ext = path.suffix.lower()
        if ext not in WEB_EXTENSIONS:
            raise ValueError('This format is not supported by the browser extractor.')
        if ext == '.epub':
            text, method = extract_with_zipfile(str(path)), 'zipfile-epub'
        elif ext == '.docx':
            text, method = extract_docx_with_zipfile(str(path)), 'zipfile-docx'
        elif ext in {'.html','.htm','.xhtml'}:
            text, method = extract_html_file(str(path)), 'html-stdlib'
        elif ext == '.rtf':
            text, method = extract_rtf(str(path))
        else:
            text, method = read_text_file(str(path)), 'text'
    if not text:
        raise ValueError('Could not extract readable text from this document.')
    return analyze(text, method)


def validate(files):
    if not isinstance(files, dict) or len(files)>100:
        raise ValueError('Invalid skill bundle.')
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name, content in files.items():
            rel = Path(name)
            if rel.is_absolute() or '..' in rel.parts or '\\' in name or not name.startswith('skill/'):
                continue
            if not isinstance(content, str) or len(content)>500_000:
                raise ValueError('Invalid skill reference.')
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8')
        if not (root/'skill/SKILL.md').is_file():
            return {'errors':['Missing skill/SKILL.md.'], 'warnings':[], 'findings':[],
                    'upstreamCommit':'c108d25b0cb58e1bdc361f3de02ed9f37075152f'}
        errors, warnings = audit(root/'skill/SKILL.md', lens='claude')
        findings = [asdict(f) for f in scan_generated_skill(root/'skill')]
        return {'errors':errors, 'warnings':warnings, 'findings':findings,
                'upstreamCommit':'c108d25b0cb58e1bdc361f3de02ed9f37075152f'}


if __name__ == '__main__':
    try:
        request = json.load(sys.stdin)
        operation = request.get('operation')
        if operation == 'extract':
            result = extract(request['path'])
        elif operation == 'analyze':
            result = analyze(request['text'])
        elif operation == 'validate':
            result = validate(request['files'])
        else:
            raise ValueError('Unknown adapter operation.')
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error':str(error)}))
        sys.exit(1)
