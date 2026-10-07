"""AWB boundary around unmodified, pinned book-to-skill code.

The browser calls fixed operations in a disposable virtual filesystem. Documents
are data: never executed, never passed to a shell, and never used as file paths.
"""
import contextlib
import io
import json
import re
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
                                _chapter_number, _closed_fence_line_numbers, _structural_chapter_headings)
from book_to_skill.sanitize import sanitize_extracted_text
from book_to_skill.parsers.epub import extract_with_zipfile
from book_to_skill.parsers.docx import extract_docx_with_zipfile
from book_to_skill.parsers.html import extract_html_file
from book_to_skill.parsers.rtf import extract_rtf
from book_to_skill.parsers.text import read_text_file
from book_to_skill.parsers.pdf import count_pages, looks_image_only
from validate_skill import audit
from scan_generated_skill import scan_generated_skill

LIMITS = json.loads((ROOT / 'supabase/functions/_shared/book-upload-limits.json').read_text())
MAX_BYTES = LIMITS['maxFileBytes']
MAX_TEXT = LIMITS['maxTextCharacters']
WEB_EXTENSIONS = {'.epub', '.docx', '.html', '.htm', '.xhtml', '.rtf',
                  '.txt', '.text', '.md', '.markdown', '.rst', '.adoc', '.asciidoc'}


def roman_headings(lines, fenced):
    """Conservative support for a numeral followed by a separate display title.

    Require a sequence and substantive body text, so a TOC, code example or
    isolated page number does not become a chapter. Labels remain provisional.
    """
    def roman(number):
        result = ''
        for value, symbol in [(100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
                              (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]:
            while number >= value:
                result += symbol
                number -= value
        return result
    numbers = {roman(n): n for n in range(1, 101)}
    candidates = []
    for i, line in enumerate(lines):
        label = line.strip()
        if i in fenced or label not in numbers or (i and lines[i-1].strip()):
            continue
        following = next((j for j in range(i+1, min(i+5, len(lines))) if lines[j].strip()), None)
        if following is None or following in fenced:
            continue
        title = lines[following].strip()
        if not 3 <= len(title) <= 120 or title in numbers or title.endswith(('.', ';', ':')):
            continue
        if not title[0].isupper() or not (title.isupper() or title.istitle()):
            continue
        candidates.append({'line': i+1, 'title': label, 'displayTitle': label+' — '+title,
                           'number': numbers[label], 'method': 'inferred-roman-title'})
    useful = [h for i, h in enumerate(candidates)
              if len('\n'.join(lines[h['line']:candidates[i+1]['line']-1 if i+1<len(candidates) else len(lines)])) >= 200]
    runs, run = [], []
    for heading in useful:
        if run and heading['number'] != run[-1]['number']+1:
            if len(run) >= 3: runs.extend(run)
            run = []
        run.append(heading)
    if len(run) >= 3: runs.extend(run)
    return runs


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
        raise ValueError('This source exceeds the current six-million-character processing capacity. Your original file has not been changed.')
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
    if detect_structure(text)['chapters_method'] == 'structural':
        structural = set(_structural_chapter_headings(text))
        headings = [{'line': i+1, 'title': line.strip()} for i, line in enumerate(lines)
                    if i not in fenced and line.strip() in structural]
    seen = {h['line'] for h in headings}
    headings.extend(h for h in roman_headings(lines, fenced) if h['line'] not in seen)
    headings.sort(key=lambda h: h['line'])
    chapter_map = [{'id': f'chapter-{i+1}', 'title': h.get('displayTitle', h['title']),
                    'startLine': h['line'],
                    'endLine': headings[i+1]['line']-1 if i+1<len(headings) else len(lines),
                    'method': h.get('method', 'upstream-detected'), 'verified': False}
                   for i, h in enumerate(headings)]
    return {'text': text, 'extractor': 'book-to-skill/' + method,
            'upstreamCommit': 'e180fc46365e8c1aab0120778cc8a40b9515324b',
            'structure': detect_structure(text), 'headings': headings, 'chapterMap': chapter_map,
            'estimatedTokens': estimate_tokens(text), 'removedInvisible': removed}


def extract(path, browser=False, extraction_mode='text'):
    if extraction_mode not in {'text', 'technical'}:
        raise ValueError('Choose text or technical extraction.')
    path = Path(path).resolve()
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f'Choose a source file up to {MAX_BYTES // 1024 // 1024} MB.')
    if path.suffix.lower() in {'.epub', '.docx'}:
        check_archive(path)
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        if not browser:
            if path.suffix.lower() == '.pdf' and count_pages(str(path)) > LIMITS['maxPdfPages']:
                raise ValueError('This PDF exceeds the processing page capacity.')
            if extraction_mode == 'technical' and path.suffix.lower() == '.pdf':
                if looks_image_only(str(path)):
                    raise ValueError('Scanned PDFs need OCR before extraction.')
                result = {'text': extract_technical_pdf(path), 'extraction_method': 'docling',
                          'pages': count_pages(str(path)), 'codeEnrichment': True, 'formulaEnrichment': True}
                if not result['text']:
                    raise ValueError('Technical extraction failed. Text fallback was not accepted.')
            else:
                # Upstream's command entry point creates OUTPUT_DIR before the
                # Calibre parser runs. Our direct dispatcher needs the same
                # boundary, with a private, cleaned directory per extraction.
                from book_to_skill.parsers import calibre
                previous_workdir = calibre.OUTPUT_DIR
                with tempfile.TemporaryDirectory(prefix='awb-conversion-') as directory:
                    try:
                        calibre.OUTPUT_DIR = Path(directory)
                        result = extract_single_file(path, extraction_mode, 'no')
                    finally:
                        calibre.OUTPUT_DIR = previous_workdir
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


def extract_technical_pdf(path):
    """Adapt the pinned upstream Docling configuration to retain code/formulas.

    The upstream parser is unchanged. Unlike its optional fallback, this explicit
    hosted mode reports missing models/dependencies instead of flattening tables.
    """
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.datamodel.base_models import InputFormat
        options = PdfPipelineOptions()
        options.do_ocr = False
        options.do_table_structure = True
        options.do_code_enrichment = True
        options.do_formula_enrichment = True
        converter = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)})
        result = converter.convert(str(path), max_num_pages=LIMITS['maxPdfPages'])
        return result.document.export_to_markdown()
    except Exception as error:
        raise ValueError('Technical PDF extraction could not finish with Docling. Check the native worker and its model cache, then retry; no text fallback was used.') from error


def validate(files):
    # A 512-section book can have more than 100 references. Keep the upstream
    # scanner's 1,000-file / 20-MiB generated-note bounds; source has its own cap.
    if not isinstance(files, dict) or len(files)>1100:
        raise ValueError('Invalid skill bundle.')
    note_bytes = 0
    note_files = 0
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name, content in files.items():
            rel = Path(name)
            if rel.is_absolute() or '..' in rel.parts or '\\' in name or not name.startswith('skill/'):
                continue
            if not isinstance(content, str):
                raise ValueError('Invalid skill reference.')
            size = len(content.encode('utf-8'))
            if name == 'skill/source.txt':
                if len(content)>MAX_TEXT or size>LIMITS['maxTextBytes']:
                    raise ValueError('Bundled source exceeds the source capacity.')
            else:
                note_files += 1
                note_bytes += size
                if size>2*1024*1024 or note_bytes>20*1024*1024 or note_files>1000:
                    raise ValueError('Generated skill references exceed the package capacity.')
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8')
        if not (root/'skill/SKILL.md').is_file():
            return {'errors':['Missing skill/SKILL.md.'], 'warnings':[], 'findings':[],
                    'upstreamCommit':'e180fc46365e8c1aab0120778cc8a40b9515324b'}
        errors, warnings = audit(root/'skill/SKILL.md', lens='claude')
        findings = [asdict(f) for f in scan_generated_skill(root/'skill')]
        return {'errors':errors, 'warnings':warnings, 'findings':findings,
                'upstreamCommit':'e180fc46365e8c1aab0120778cc8a40b9515324b'}


if __name__ == '__main__':
    try:
        request = json.load(sys.stdin)
        operation = request.get('operation')
        if operation == 'extract':
            result = extract(request['path'], extraction_mode=request.get('extractionMode', 'text'))
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
