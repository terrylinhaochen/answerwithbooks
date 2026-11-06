import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ocr_pdf', Path(__file__).with_name('ocr_pdf.py'))
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)

class OCRBoundary(unittest.TestCase):
    def run_ocr(self, results, pages=2, limit=100):
        calls=[]
        def invoke(args, **kwargs):
            calls.append((args, kwargs))
            return subprocess.CompletedProcess(args, 0, next(results) if args[0]=='tesseract' else '', '')
        with patch.object(ocr.shutil,'which',return_value='/usr/bin/tool'), patch.object(ocr.subprocess,'run',side_effect=invoke):
            result=ocr.extract_scanned_pdf('/tmp/input file.pdf',pages,limit)
        return result,calls
    def test_all_pages_and_provenance(self):
        result,calls=self.run_ocr(iter(['First page','Second page']))
        self.assertEqual(result['text'],'First page\n\nSecond page')
        self.assertEqual(result['ocrTextPages'],2)
        self.assertTrue(result['ocr'])
        self.assertEqual([c[0][2] for c in calls if c[0][0]=='pdftoppm'],['1','2'])
        self.assertTrue(all(c[1]['timeout']<=90 for c in calls))
        self.assertTrue(all(c[1].get('shell') is None for c in calls))
    def test_empty_source_rejected(self):
        with self.assertRaisesRegex(ValueError,'no readable text'):
            self.run_ocr(iter(['','']))
    def test_text_bound(self):
        with self.assertRaisesRegex(ValueError,'capacity'):
            self.run_ocr(iter(['x'*100]),pages=1,limit=10)
    def test_page_bound(self):
        with self.assertRaisesRegex(ValueError,'page count'):
            ocr.extract_scanned_pdf('/tmp/input.pdf',1501,100)
    def test_process_failure_propagates(self):
        with patch.object(ocr.shutil,'which',return_value='/usr/bin/tool'),patch.object(ocr.subprocess,'run',side_effect=subprocess.TimeoutExpired('pdftoppm',60)):
            with self.assertRaises(subprocess.TimeoutExpired):
                ocr.extract_scanned_pdf('/tmp/input.pdf',1,100)
if __name__=='__main__':unittest.main()
