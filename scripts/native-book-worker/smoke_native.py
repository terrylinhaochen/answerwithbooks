"""Real converters on an original synthetic fixture; no third-party book content."""
import json
import re
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def pdf_fixture(path):
    def label(x, y, size, value, font="F1"):
        escaped = value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        return f'BT /{font} {size} Tf {x} {y} Td ({escaped}) Tj ET\n'
    stream = label(72, 740, 22, 'Chapter 1: Evidence and Decisions')
    stream += label(72, 705, 11, 'Record a prediction before running a bounded experiment. Compare observed outcomes.')
    stream += label(72, 687, 11, 'Retain uncertainty and test alternative explanations before choosing the next action.')
    for x in (72, 230, 420):
        stream += f'{x} 550 m {x} 650 l S\n'
    for y in (550, 580, 615, 650):
        stream += f'72 {y} m 420 {y} l S\n'
    for x, y, value in [(82, 628, 'Method'), (240, 628, 'Outcome'), (82, 595, 'Bounded trial'),
                         (240, 595, 'Compare evidence'), (82, 560, 'Review'), (240, 560, 'Choose next action')]:
        stream += label(x, y, 11, value)
    stream += label(72, 523, 11, 'A single trial is not proof. Preserve the original observations for later comparison.')
    stream += label(72, 492, 11, 'The energy in this example is given by the following equation:')
    stream += label(246, 448, 20, 'E = m c', 'F3')
    stream += label(311, 459, 12, '2', 'F3')
    stream += label(526, 448, 11, '(1)')
    stream += label(72, 417, 11, 'Here m denotes mass and c denotes a constant speed.')
    stream += label(72, 384, 11, 'Python example: a reusable calculation')
    # A conventional, substantive code listing separate from its caption.
    stream += '0.96 g 68 155 480 214 re f 0 g\n0.7 G 0.5 w 68 155 480 214 re S 0 G\n'
    code = ['def squared(value):', '    return value ** 2', '',
            'def energy(mass, speed):', '    result = mass * squared(speed)',
            '    return result', '', 'for mass in [1, 2, 3]:',
            '    print(energy(mass, 3))', 'assert energy(2, 3) == 18']
    for line, value in enumerate(code):
        if value:
            stream += label(82, 345-line*18, 10, value, 'F2')
    data = stream.encode('ascii')
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 5 0 R >>',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
               b'<< /Length '+str(len(data)).encode()+b' >>\nstream\n'+data+b'endstream', b'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>', b'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>']
    output = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for n, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f'{n} 0 obj\n'.encode()+obj+b'\nendobj\n')
    start = len(output)
    output.extend(f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        output.extend(f'{offset:010d} 00000 n \n'.encode())
    output.extend(f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode())
    path.write_bytes(output)


def extract(path, mode):
    result = subprocess.run([sys.executable, str(ROOT/'scripts/book-adapter/adapter.py')],
        input=json.dumps({'operation':'extract','path':str(path),'extractionMode':mode}),
        text=True, capture_output=True, timeout=1200)
    if result.returncode:
        raise RuntimeError('Native adapter failed; converter/model provisioning is incomplete.')
    return json.loads(result.stdout)


def main():
    preserved = Path(os.environ['BOOK_NATIVE_SMOKE_FIXTURES']) if os.environ.get('BOOK_NATIVE_SMOKE_FIXTURES') else None
    if preserved:
        preserved.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='awb-converter-smoke-') as directory:
        root = Path(directory)
        pdf = root/'fixture.pdf'
        pdf_fixture(pdf)
        if preserved:
            shutil.copyfile(pdf, preserved/pdf.name)
        result = extract(pdf, 'technical')
        if os.environ.get('BOOK_NATIVE_SMOKE_REPORT'):
            Path(os.environ['BOOK_NATIVE_SMOKE_REPORT']).write_text(json.dumps(result,ensure_ascii=False,indent=2))
        assert 'docling' in result['extractor'], result['extractor']
        for term in ('Chapter 1', 'Bounded trial', 'Compare evidence', 'Choose next action'):
            assert term in result['text'], term
        assert '|' in result['text'], 'Docling did not retain the table as Markdown'
        assert 'def squared' in result['text'] and 'return value' in result['text'], 'Code content was lost'
        assert '```' in result['text'], 'Code block boundaries were lost'
        # LaTeX spacing is typographic; the equation and exponent must remain.
        formula_text = re.sub(r'\\[,;!:]|\\(?:quad|qquad)\b', ' ', result['text'])
        assert re.search(r'E\s*=\s*m\s*c\s*(?:\^\s*\{?\s*2|²)', formula_text), 'Equation content or exponent was lost'
        print(json.dumps({'code_preserved':True,'formula_preserved':True,'docling':'passed','table_preserved':True,'headings':len(result['headings']),'characters':len(result['text'])}))
        converter = shutil.which('ebook-convert')
        if not converter:
            if '--require-calibre' in sys.argv:
                raise RuntimeError('Calibre is required in the native worker image.')
            print(json.dumps({'calibre':'unavailable locally; not validated'}))
            return
        html = root/'fixture.html'
        html.write_text('<html><body><h1>Chapter 1: Evidence</h1><p>'+'Record predictions and compare evidence before the next bounded trial. '*8+'</p></body></html>')
        for extension in ('mobi','azw3'):
            book=root/('fixture.'+extension)
            conversion=subprocess.run([converter,str(html),str(book)],capture_output=True,timeout=120)
            assert conversion.returncode==0, 'Could not create synthetic Calibre fixture'
            if preserved:
                shutil.copyfile(book, preserved/book.name)
            report=extract(book,'text')
            assert 'Record predictions' in report['text']
            print(json.dumps({'calibre':extension,'result':'passed','characters':len(report['text'])}))


if __name__=='__main__':
    main()
