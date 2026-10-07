FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    DOCLING_ARTIFACTS_PATH=/opt/docling-models \
    HF_HOME=/tmp/huggingface TMPDIR=/tmp QT_QPA_PLATFORM=offscreen \
    CALIBRE_CONFIG_DIRECTORY=/tmp/calibre-config XDG_CACHE_HOME=/tmp/cache XDG_CONFIG_HOME=/tmp/config
RUN apt-get update && apt-get install -y --no-install-recommends \
    calibre poppler-utils libgl1 libglib2.0-0 libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY scripts/native-book-worker/requirements.txt /app/scripts/native-book-worker/requirements.txt
RUN pip install --no-cache-dir -r scripts/native-book-worker/requirements.txt
# Fetch only the non-OCR PDF layout, table, code and formula pipeline models used by the pinned adapter.
RUN docling-tools models download layout tableformer tableformerv2 code_formula --output-dir /opt/docling-models
COPY vendor/book-to-skill /app/vendor/book-to-skill
COPY scripts/book-adapter /app/scripts/book-adapter
COPY scripts/native-book-worker /app/scripts/native-book-worker
COPY supabase/functions/_shared/book-upload-limits.json /app/supabase/functions/_shared/book-upload-limits.json
# Build must fail if any required model is missing. Runtime never downloads models.
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
RUN python scripts/native-book-worker/smoke_native.py --require-calibre \
    && useradd --uid 10001 --create-home nativeworker
USER 10001:10001
ENTRYPOINT ["python", "scripts/native-book-worker/worker.py"]
