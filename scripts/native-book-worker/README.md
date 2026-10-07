# Native extraction worker

This worker polls `book-native` for private original files, invokes the pinned book adapter in a subprocess, and returns verified text to the existing book queue. It supports technical PDF extraction with Docling and unencrypted MOBI/AZW/AZW3 conversion with Calibre. DRM removal is not implemented. The host needs only the dedicated worker secret; it never receives a Supabase service-role key or user credential.

## Protocol

User/CLI bearer actions:

- `prepare`: `{name,size,sha,extractionMode,options,parentId?,revisionKind?}`. Returns `{job,upload}` for the original file only. `revisionKind` is `append` or `replace`. Cached or already queued jobs may return without `upload`; clients should open that job and poll existing book status.
- Upload original bytes to `upload.signedUrl` using PUT and `Content-Type: application/octet-stream`.
- `finalize`: `{id}` verifies original byte count and SHA-256 before marking extraction queued.
- `retry`: `{id}` resets a failed native extraction after its original was verified. Do not use provider-queue retry for native failures.
- `health` is public and reports configured and online separately. Online means an authenticated worker poll or heartbeat arrived within 180 seconds; it does not prove a particular document can extract.

Worker-secret bearer actions:

- `claim` returns `{idle:true}` or `{job:{id,userId,leaseToken,name,sourceSha,sourceBytes,extractionMode},downloadUrl,upload,leaseSeconds}`.
- `heartbeat`: `{id,leaseToken}` refreshes a 15-minute lease; the worker sends it every 90 seconds.
- `complete`: `{id,leaseToken,textSha,textBytes,headings,metadata}`. The server downloads the attempt-specific text object, checks integrity and limits, finalizes source/revision coordinates, and wakes the provider queue. Retrying a completed lease is idempotent.
- `fail`: `{id,leaseToken,code}` stores only a fixed safe error message, with exponential delay and at most three attempts. Native retry failures do not enter the provider queue.

Native jobs remain `run_state=staging`, with `source_import.kind=native` and `state=awaiting_upload|queued|processing`, until extraction completes. SQL shares the existing four-global/two-per-owner lease capacity with provider workers. Claimed source URLs and upload URLs are signed by private Storage; the worker rejects redirects, other hosts, unsigned URLs, or paths for another job. Stale workers get separate flat upload objects and cannot commit another attempt's text. Source bytes are checked on the server and native host. Extracted sources are limited to 24 MB and six million UTF-16 characters. Temporary original files and subprocess output are deleted after success or failure.

## Docker deployment

Run from the web project root:

```sh
docker build -f scripts/native-book-worker/Dockerfile -t awb-native-worker .
docker run --read-only --tmpfs /tmp:rw,nosuid,size=1g \
  --memory=8g --cpus=2 --pids-limit=256 \
  --env-file /secure/path/native-worker.env awb-native-worker
```

The env file contains `BOOK_NATIVE_ENDPOINT=https://PROJECT.supabase.co/functions/v1/book-native` and `BOOK_NATIVE_WORKER_SECRET`. Provision the same worker secret in the Edge function. Keep it out of command-line arguments, build arguments, repository files, and logs. Deploy the migration and Edge function with gateway JWT verification disabled; the function itself authenticates users or the dedicated worker secret.

The image uses Python 3.12, system Calibre/Poppler, and pinned Docling. It preloads the layout and table models and runs a real synthetic PDF/table plus MOBI/AZW3 smoke check at image-build time. Runtime model downloads are disabled. The worker runs as a non-root user and writes document data only under `/tmp`.

## Native systemd host alternative

Install Python 3.12 and `calibre poppler-utils libgl1 libglib2.0-0 libgomp1 ca-certificates`; create a virtualenv and install `requirements.txt`. Copy the pinned `vendor/book-to-skill`, `scripts/book-adapter`, `scripts/native-book-worker`, and `supabase/functions/_shared/book-upload-limits.json`, preserving their paths beneath one application root.

```sh
/path/to/venv/bin/docling-tools models download layout tableformer tableformerv2 code_formula --output-dir /opt/docling-models
DOCLING_ARTIFACTS_PATH=/opt/docling-models HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
  /path/to/venv/bin/python scripts/native-book-worker/smoke_native.py --require-calibre
```

Run `/path/to/venv/bin/python /app/scripts/native-book-worker/worker.py` as an unprivileged service with a private temporary directory. Set `DOCLING_ARTIFACTS_PATH=/opt/docling-models`, `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, `QT_QPA_PLATFORM=offscreen`, `OMP_NUM_THREADS=2`, and `MKL_NUM_THREADS=2`, plus the endpoint and secret above. Model provisioning and smoke validation must finish before starting the poller; preflight rejects missing converters/models or an unpinned Docling version. Recommended systemd settings: `Restart=on-failure`, `RestartSec=15`, `PrivateTmp=true`, `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=true`, `MemoryMax=7G`, `TasksMax=256`, and a service timeout allowing subprocess cleanup. Do not expose an inbound worker port; all traffic is outbound HTTPS.

## Validation

```sh
python3 -m unittest discover -s scripts/native-book-worker -p 'test_worker.py' -v
deno run --allow-env --allow-read scripts/native-book-worker/test_http.ts
python3 scripts/native-book-worker/test_queue_db.py
DOCLING_ARTIFACTS_PATH=/opt/docling-models python scripts/native-book-worker/smoke_native.py --require-calibre
```

The HTTP suite executes the real Edge handler against intercepted Auth/DB/Storage responses. The Python suite uses a local HTTP server and real subprocesses. The SQL suite starts isolated local PostgreSQL and tests concurrent claims and shared capacity. The converter smoke uses original synthetic content and asserts a Docling table survives as Markdown; Calibre is separately required when validating the deployable runtime. `--once` processes at most one claim for operational smoke tests. Local protocol tests may explicitly enable loopback HTTP with `BOOK_NATIVE_ALLOW_LOCALHOST=1`; production requires HTTPS.
