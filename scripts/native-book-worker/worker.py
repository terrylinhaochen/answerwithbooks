#!/usr/bin/env python3
"""Native extraction transport. The host gets a scoped worker secret, never DB keys."""
from __future__ import annotations
import hashlib
import importlib.metadata
import shutil
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
LIMITS = json.loads((ROOT / 'supabase/functions/_shared/book-upload-limits.json').read_text())
ADAPTER = ROOT / 'scripts/book-adapter/adapter.py'


class WorkerError(Exception):
    def __init__(self, code='transfer'):
        self.code = code
        super().__init__(code)  # Never include URLs, headers, subprocess output, or documents.


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise WorkerError('transfer')


class Worker:
    def __init__(self, endpoint, secret, *, allow_local=False, adapter=ADAPTER,
                 timeout=1200, heartbeat_seconds=90, opener=None, temp_root=None):
        parsed = urllib.parse.urlsplit(endpoint)
        local = allow_local and parsed.hostname in ('127.0.0.1', 'localhost', '::1')
        if parsed.scheme != 'https' and not (parsed.scheme == 'http' and local):
            raise ValueError('Worker endpoint must use HTTPS.')
        if parsed.username or parsed.password or parsed.query or parsed.fragment or not secret:
            raise ValueError('Invalid worker configuration.')
        self.endpoint, self.secret = endpoint, secret
        self.origin = (parsed.scheme, parsed.netloc)
        self.adapter, self.timeout = Path(adapter), timeout
        self.heartbeat_seconds = heartbeat_seconds
        self.opener = opener or urllib.request.build_opener(NoRedirect)
        self.temp_root = temp_root

    def api(self, action, **values):
        request = urllib.request.Request(self.endpoint, data=json.dumps({'action': action, **values}, ensure_ascii=False).encode(),
            headers={'Authorization': 'Bearer ' + self.secret, 'Content-Type': 'application/json'}, method='POST')
        try:
            with self.opener.open(request, timeout=120) as response:
                data = response.read(2_100_001)
                if len(data) > 2_100_000:
                    raise WorkerError('limit')
                return json.loads(data)
        except urllib.error.HTTPError as error:
            if error.code in (401, 403, 409):
                raise WorkerError('lease') from None
            raise WorkerError('transfer') from None
        except (OSError, ValueError, urllib.error.URLError):
            raise WorkerError('transfer') from None

    def signed_url(self, url, job, *, upload=False):
        if not isinstance(url, str):
            raise WorkerError('transfer')
        parsed = urllib.parse.urlsplit(url)
        prefix = '/storage/v1/object/upload/sign/private-books/' if upload else '/storage/v1/object/sign/private-books/'
        suffix = f"{job['userId']}/{job['id']}/native-{job['leaseToken']}-extracted-source.txt" if upload else f"{job['userId']}/{job['id']}/source"
        if ((parsed.scheme, parsed.netloc) != self.origin or parsed.username or parsed.password
                or parsed.fragment or urllib.parse.unquote(parsed.path) != prefix + suffix
                or not urllib.parse.parse_qs(parsed.query).get('token')):
            raise WorkerError('transfer')
        return url

    def download(self, url, job, target):
        expected = job.get('sourceBytes')
        if not isinstance(expected, int) or not 0 < expected <= LIMITS['maxFileBytes']:
            raise WorkerError('limit')
        digest, count = hashlib.sha256(), 0
        try:
            with self.opener.open(self.signed_url(url, job), timeout=120) as response, target.open('wb') as output:
                declared = response.headers.get('Content-Length')
                if declared and int(declared) != expected:
                    raise WorkerError('integrity')
                while block := response.read(1024 * 1024):
                    count += len(block)
                    if count > expected:
                        raise WorkerError('integrity')
                    digest.update(block)
                    output.write(block)
        except (OSError, ValueError, urllib.error.URLError):
            raise WorkerError('transfer') from None
        if count != expected or digest.hexdigest() != job.get('sourceSha'):
            raise WorkerError('integrity')

    def extract(self, source, mode, lost):
        request = json.dumps({'operation': 'extract', 'path': str(source), 'extractionMode': mode}).encode()
        # File-backed stdout bounds memory and is removed with the per-job directory.
        child_env = {key:value for key,value in os.environ.items() if key not in (
            'BOOK_NATIVE_WORKER_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY',
            'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN')}
        with (source.parent / 'adapter-result.json').open('w+b') as output:
            process = subprocess.Popen([sys.executable, str(self.adapter)], stdin=subprocess.PIPE,
                stdout=output, stderr=subprocess.DEVNULL, start_new_session=True,
                cwd=str(source.parent), env={**child_env, 'TMPDIR':str(source.parent),
                    'CALIBRE_CONFIG_DIRECTORY':str(source.parent/'calibre-config'),
                    'XDG_CACHE_HOME':str(source.parent/'cache'), 'XDG_CONFIG_HOME':str(source.parent/'config')})
            try:
                process.stdin.write(request)
                process.stdin.close()
                started = time.monotonic()
                while process.poll() is None:
                    if lost.is_set():
                        raise WorkerError('lease')
                    if time.monotonic() - started > self.timeout:
                        raise WorkerError('timeout')
                    if os.fstat(output.fileno()).st_size > 64_000_000:
                        raise WorkerError('limit')
                    time.sleep(0.1)
                if process.returncode:
                    raise WorkerError('extraction')
                if os.fstat(output.fileno()).st_size > 64_000_000:
                    raise WorkerError('limit')
                output.seek(0)
                try:
                    result = json.load(output)
                except (ValueError, UnicodeError):
                    raise WorkerError('extraction') from None
            finally:
                # Kill converter descendants even if the adapter exited early.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
        text = result.get('text')
        if not isinstance(text, str) or len(text) < 100:
            raise WorkerError('extraction')
        encoded = text.encode('utf-8')
        if len(encoded) > LIMITS['maxTextBytes'] or len(text.encode('utf-16-le')) // 2 > LIMITS['maxTextCharacters']:
            raise WorkerError('limit')
        headings = result.get('headings', [])
        if not isinstance(headings, list) or len(headings) > LIMITS['maxSourceHeadings']:
            raise WorkerError('limit')
        line_count = text.count('\n') + 1
        if any(not isinstance(h, dict) or not isinstance(h.get('line'), int) or
               not 1 <= h['line'] <= line_count or not isinstance(h.get('title'), str) or
               len(h['title']) > 1000 for h in headings):
            raise WorkerError('extraction')
        metadata = {k: result[k] for k in ('extractor', 'upstreamCommit', 'structure', 'estimatedTokens',
                    'removedInvisible', 'upstreamMetadata') if k in result}
        if len(json.dumps(metadata, ensure_ascii=False)) > 64000:
            raise WorkerError('limit')
        return encoded, headings, metadata

    def upload(self, url, job, text):
        request = urllib.request.Request(self.signed_url(url, job, upload=True), data=text,
            headers={'Content-Type': 'application/octet-stream', 'x-upsert': 'true'}, method='PUT')
        try:
            with self.opener.open(request, timeout=120) as response:
                response.read(4096)
        except (OSError, urllib.error.URLError):
            raise WorkerError('transfer') from None

    def process(self, claim):
        job = claim['job']
        fields = {'id': job['id'], 'leaseToken': job['leaseToken']}
        stop, lost = threading.Event(), threading.Event()
        lease_seconds = min(900, max(120, int(claim.get('leaseSeconds', 900))))
        def heartbeat():
            confirmed = time.monotonic()
            while not stop.wait(self.heartbeat_seconds):
                try:
                    self.api('heartbeat', **fields)
                    confirmed = time.monotonic()
                except WorkerError as error:
                    if error.code == 'lease' or time.monotonic() - confirmed > lease_seconds * 0.7:
                        lost.set()
                        return
        thread = threading.Thread(target=heartbeat, daemon=True)
        thread.start()
        try:
            extension = Path(job['name']).suffix.lower()
            mode = job.get('extractionMode')
            if not (extension == '.pdf' and mode == 'technical' or extension in ('.mobi', '.azw', '.azw3') and mode == 'text'):
                raise WorkerError('unsupported')
            with tempfile.TemporaryDirectory(prefix='awb-native-', dir=self.temp_root) as directory:
                # Names from documents never become local paths.
                source = Path(directory) / ('source' + extension)
                self.download(claim['downloadUrl'], job, source)
                text, headings, metadata = self.extract(source, mode, lost)
                if lost.is_set():
                    raise WorkerError('lease')
                self.upload(claim['upload']['signedUrl'], job, text)
                payload = {**fields, 'textSha': hashlib.sha256(text).hexdigest(), 'textBytes': len(text),
                           'headings': headings, 'metadata': metadata}
                # Completion is idempotent if the successful response was lost.
                for attempt in range(3):
                    try:
                        result = self.api('complete', **payload)
                        if not result.get('completed'):
                            raise WorkerError('transfer')
                        return True
                    except WorkerError as error:
                        if error.code == 'lease' or attempt == 2:
                            raise
                        stop.wait(2 ** attempt)
        except WorkerError as error:
            if error.code != 'lease':
                try:
                    self.api('fail', **fields, code=error.code)
                except WorkerError:
                    pass  # The lease expires; queue attempts cap crash/reclaim loops.
            print(json.dumps({'event': 'extraction_failed', 'id': job.get('id'), 'code': error.code}), flush=True)
            return False
        except (KeyError, TypeError, ValueError, OSError):
            try:
                self.api('fail', **fields, code='extraction')
            except WorkerError:
                pass
            print(json.dumps({'event': 'extraction_failed', 'id': job.get('id'), 'code': 'extraction'}), flush=True)
            return False
        finally:
            stop.set()
            thread.join(timeout=125)

    def run_once(self):
        claim = self.api('claim')
        if claim.get('idle'):
            return None
        return self.process(claim)


def preflight():
    models = Path(os.environ.get('DOCLING_ARTIFACTS_PATH', '/opt/docling-models'))
    if not shutil.which('ebook-convert') or not shutil.which('pdfinfo') or not models.is_dir() or not any(models.iterdir()):
        raise ValueError('Native converters and model artifacts must be provisioned before polling.')
    try:
        version = importlib.metadata.version('docling')
    except importlib.metadata.PackageNotFoundError:
        raise ValueError('Install the pinned native runtime before polling.') from None
    if version != '2.134.0':
        raise ValueError('Install the pinned native runtime before polling.')


def main():
    def terminate(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, terminate)
    preflight()
    worker = Worker(os.environ.get('BOOK_NATIVE_ENDPOINT', ''), os.environ.get('BOOK_NATIVE_WORKER_SECRET', ''),
                    allow_local=os.environ.get('BOOK_NATIVE_ALLOW_LOCALHOST') == '1',
                    timeout=min(3600, max(60, int(os.environ.get('BOOK_NATIVE_TIMEOUT_SECONDS', '1200')))))
    failures = 0
    while True:
        try:
            result = worker.run_once()
            failures = 0
            if '--once' in sys.argv:
                return 0 if result is not False else 1
            if result is None:
                time.sleep(15)
        except (WorkerError, OSError, ValueError, KeyError, TypeError):
            failures += 1
            print(json.dumps({'event': 'worker_connection_retry', 'attempt': failures}), flush=True)
            if '--once' in sys.argv:
                return 1
            time.sleep(min(60, 2 ** min(failures, 6)))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
    except (ValueError, KeyError):
        print('Invalid native worker configuration.', file=sys.stderr)
        sys.exit(2)
