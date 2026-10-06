from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
for entry in manifest['files']:
    path = (root / entry['path']).resolve()
    assert path.is_relative_to(root), entry['path']
    assert path.is_file(), entry['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], entry['path']
print(f"Verified {len(manifest['files'])} preserved source files.")
