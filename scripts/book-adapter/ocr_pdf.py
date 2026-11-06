"""Bounded English OCR for image-only PDFs on the hosted native worker.

The uploaded original is never changed. Text is OCR output, not model rewriting.
"""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile


def extract_scanned_pdf(path, pages, max_characters):
    if not 1 <= pages <= 1500:
        raise ValueError('Invalid PDF page count for OCR.')
    if not shutil.which('pdftoppm') or not shutil.which('tesseract'):
        raise ValueError('Scanned PDFs need the hosted OCR runtime.')
    chunks, total, text_pages = [], 0, 0
    environment = {**os.environ, 'OMP_THREAD_LIMIT': '1'}
    with tempfile.TemporaryDirectory(prefix='awb-ocr-') as directory:
        prefix = str(Path(directory) / 'page')
        for page in range(1, pages + 1):
            # Bound raster size and process one page at a time, not the full book.
            subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page),
                            '-r', '240', '-scale-to', '3500', '-gray', '-png',
                            '-singlefile', str(Path(path).resolve()), prefix],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           timeout=60, env=environment)
            result = subprocess.run(['tesseract', prefix + '.png', 'stdout',
                                     '-l', 'eng', '--psm', '3'],
                                    check=True, capture_output=True, text=True,
                                    encoding='utf-8', errors='replace', timeout=90,
                                    env=environment)
            text = result.stdout.strip()
            total += len(text) + 2
            if total > max_characters:
                raise ValueError('OCR text exceeds the processing capacity.')
            if text:
                text_pages += 1
            chunks.append(text)
            Path(prefix + '.png').unlink(missing_ok=True)
    text = '\n\n'.join(chunks)
    if not text.strip():
        raise ValueError('OCR found no readable text.')
    return {'text': text, 'extraction_method': 'tesseract-ocr', 'pages': pages,
            'ocr': True, 'ocrLanguage': 'eng', 'ocrTextPages': text_pages,
            'ocrMaxRasterDimension': 3500}
