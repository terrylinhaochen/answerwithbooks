import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from unittest.mock import patch
from pathlib import Path
import tempfile
import threading
import unittest

spec = importlib.util.spec_from_file_location('worker', Path(__file__).with_name('worker.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ProtocolTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.work = self.root / 'work'
        self.work.mkdir()
        self.original = b'Unencrypted synthetic ebook fixture, not a real copyrighted book.'
        self.text = '# A test chapter\n' + 'Compare predictions with observations and preserve uncertainty.\n' * 4
        self.events = []
        self.uploaded = None
        self.download_auth = None
        self.upload_auth = None
        self.corrupt = False
        self.redirect = False
        self.fail_complete_once = False
        self.completed = False
        self.expire = False
        self.job = dict(id='00000000-0000-4000-8000-000000000001',
                        userId='00000000-0000-4000-8000-000000000002',
                        leaseToken='00000000-0000-4000-8000-000000000003',
                        name='../../unsafe.mobi', sourceSha=hashlib.sha256(self.original).hexdigest(),
                        sourceBytes=len(self.original), extractionMode='text')
        fixture = self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def send(self, data, status=200):
                body = json.dumps(data).encode()
                self.send_response(status)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            def do_POST(self):
                assert self.headers.get('Authorization') == 'Bearer synthetic-secret'
                body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                fixture.events.append(body)
                action = body['action']
                if action == 'claim':
                    prefix = f"{fixture.job['userId']}/{fixture.job['id']}"
                    self.send(dict(job=fixture.job, leaseSeconds=900,
                        downloadUrl=fixture.base + '/storage/v1/object/sign/private-books/' + prefix + '/source?token=synthetic',
                        upload=dict(signedUrl=fixture.base + '/storage/v1/object/upload/sign/private-books/' + prefix + '/native-' + fixture.job['leaseToken'] + '-extracted-source.txt?token=synthetic')))
                elif action == 'complete':
                    assert body['textSha'] == hashlib.sha256(fixture.uploaded).hexdigest()
                    assert body['textBytes'] == len(fixture.uploaded)
                    assert body['headings'][0]['line'] == 1
                    fixture.completed = True
                    if fixture.fail_complete_once:
                        fixture.fail_complete_once = False
                        self.send({'error': 'response lost'}, 500)
                    else:
                        self.send({'completed': True})
                elif action == 'heartbeat':
                    self.send({'leaseSeconds': 900} if not fixture.expire else {'error': 'expired'}, 200 if not fixture.expire else 409)
                else:
                    self.send({'retrying': True})
            def do_GET(self):
                fixture.download_auth = self.headers.get('Authorization')
                if fixture.redirect:
                    self.send_response(302)
                    self.send_header('Location', 'http://127.0.0.1:9/not-authorized')
                    self.end_headers()
                    return
                data = b'wrong' if fixture.corrupt else fixture.original
                self.send_response(200)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            def do_PUT(self):
                fixture.upload_auth = self.headers.get('Authorization')
                fixture.uploaded = self.rfile.read(int(self.headers['Content-Length']))
                self.send({'Key': 'synthetic'})
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'
        self.adapter = self.root / 'adapter.py'
        self.adapter.write_text('import sys,json,time\nfrom pathlib import Path\nr=json.load(sys.stdin)\nassert Path(r["path"]).name=="source.mobi"\nassert r["extractionMode"]=="text"\ntime.sleep(0.3)\nprint(json.dumps(' + repr(dict(text=self.text, headings=[dict(line=1, title='A test chapter')], extractor='fixture', structure={'chapters': 1})) + '))\n')
        self.client = worker.Worker(self.base + '/functions/v1/book-native', 'synthetic-secret',
                                   allow_local=True, adapter=self.adapter, heartbeat_seconds=0.03,
                                   timeout=30, temp_root=self.work)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.tmp.cleanup()

    def test_signed_transfer_extraction_heartbeat_completion_and_cleanup(self):
        self.assertTrue(self.client.run_once())
        self.assertEqual(self.uploaded, self.text.encode())
        self.assertTrue(self.completed)
        self.assertIsNone(self.download_auth)
        self.assertIsNone(self.upload_auth)
        self.assertIn('heartbeat', [e['action'] for e in self.events])
        self.assertEqual(list(self.work.iterdir()), [])

    def test_corrupt_download_never_runs_converter_or_uploads(self):
        self.corrupt = True
        self.assertFalse(self.client.run_once())
        self.assertIsNone(self.uploaded)
        self.assertEqual([e for e in self.events if e['action'] == 'fail'][-1]['code'], 'integrity')
        self.assertEqual(list(self.work.iterdir()), [])

    def test_external_unsigned_or_other_job_urls_rejected(self):
        for url in ['https://elsewhere.invalid/source', self.base + '/private/source?token=x',
                    self.base + '/storage/v1/object/sign/private-books/other/source?token=x',
                    self.base + '/storage/v1/object/sign/private-books/a/source']:
            with self.assertRaises(worker.WorkerError):
                self.client.signed_url(url, self.job)

    def test_storage_redirect_is_not_followed(self):
        self.redirect = True
        self.assertFalse(self.client.run_once())
        self.assertIsNone(self.uploaded)
        self.assertEqual([e for e in self.events if e['action'] == 'fail'][-1]['code'], 'transfer')

    def test_converter_does_not_inherit_credentials(self):
        self.adapter.write_text("import os\nassert 'BOOK_NATIVE_WORKER_SECRET' not in os.environ\nassert 'AWS_SECRET_ACCESS_KEY' not in os.environ\n" + self.adapter.read_text())
        with patch.dict(os.environ, {'BOOK_NATIVE_WORKER_SECRET':'synthetic-private', 'AWS_SECRET_ACCESS_KEY':'synthetic-private'}):
            self.assertTrue(self.client.run_once())
        self.assertEqual(list(self.work.iterdir()), [])

    def test_timeout_kills_converter_and_reports_safe_code(self):
        self.adapter.write_text('import time\ntime.sleep(10)\n')
        self.client.timeout = 0.2
        self.assertFalse(self.client.run_once())
        self.assertEqual([e for e in self.events if e['action'] == 'fail'][-1]['code'], 'timeout')
        self.assertEqual(list(self.work.iterdir()), [])

    def test_lost_lease_stops_converter_and_does_not_fail_new_attempt(self):
        self.adapter.write_text('import time\ntime.sleep(10)\n')
        self.expire = True
        self.assertFalse(self.client.run_once())
        self.assertNotIn('fail', [e['action'] for e in self.events])
        self.assertEqual(list(self.work.iterdir()), [])

    def test_completion_retry_is_idempotent(self):
        self.fail_complete_once = True
        self.assertTrue(self.client.run_once())
        self.assertEqual(len([e for e in self.events if e['action'] == 'complete']), 2)
        self.assertNotIn('fail', [e['action'] for e in self.events])

    def test_text_limits_fail_before_upload(self):
        previous = worker.LIMITS['maxTextCharacters']
        worker.LIMITS['maxTextCharacters'] = 100
        try:
            self.assertFalse(self.client.run_once())
            self.assertIsNone(self.uploaded)
            self.assertEqual([e for e in self.events if e['action'] == 'fail'][-1]['code'], 'limit')
        finally:
            worker.LIMITS['maxTextCharacters'] = previous


if __name__ == '__main__':
    unittest.main()
