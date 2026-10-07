#!/usr/bin/env python3
"""Fetch the dedicated worker credential without writing or logging it."""
import json
import os
from pathlib import Path
import subprocess
import sys

try:
    result = subprocess.run(['aws', 'ssm', 'get-parameter', '--region', 'us-east-2', '--name',
        '/answerwithbooks/native-worker/config', '--with-decryption', '--output', 'json'],
        capture_output=True, text=True, timeout=45, check=True)
    config = json.loads(json.loads(result.stdout)['Parameter']['Value'])
    endpoint, secret = config['endpoint'], config['workerSecret']
    if not endpoint.startswith('https://') or not isinstance(secret, str) or len(secret) < 32:
        raise ValueError('Invalid worker configuration')
    os.environ.update(BOOK_NATIVE_ENDPOINT=endpoint, BOOK_NATIVE_WORKER_SECRET=secret)
except Exception:
    print('Could not load dedicated native worker configuration.', file=sys.stderr)
    sys.exit(1)
root = Path(__file__).resolve().parents[2]
os.execv(sys.executable, [sys.executable, str(root/'scripts/native-book-worker/worker.py')])
