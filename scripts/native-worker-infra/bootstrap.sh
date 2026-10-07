#!/bin/bash
set -euo pipefail
umask 022
exec > >(tee -a /var/log/awb-native-bootstrap.log) 2>&1
trap 'echo "Native worker bootstrap failed at line ${LINENO}; poller remains disabled."' ERR
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y --no-install-recommends python3.12-venv curl unzip calibre poppler-utils libgl1 libglib2.0-0 libgomp1 ca-certificates
if ! command -v aws >/dev/null 2>&1; then
 curl -fsSL --proto '=https' --tlsv1.2 https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.33.6.zip -o /tmp/awb-awscli.zip
 unzip -q /tmp/awb-awscli.zip -d /tmp/awb-awscli
 /tmp/awb-awscli/aws/install
 rm -rf /tmp/awb-awscli /tmp/awb-awscli.zip
fi
if ! id awb >/dev/null 2>&1; then useradd --system --create-home --home-dir /var/lib/awb --shell /usr/sbin/nologin awb; fi
install -d -m 755 /opt/awb-native/app /opt/docling-models
aws s3 cp 's3://__BUCKET__/releases/__SHA__.tar.gz' /opt/awb-native/release.tar.gz --region us-east-2 --only-show-errors
printf '%s  %s\n' '__SHA__' /opt/awb-native/release.tar.gz | sha256sum --check --status
tar -xzf /opt/awb-native/release.tar.gz -C /opt/awb-native/app
python3.12 -m venv /opt/awb-native/venv
/opt/awb-native/venv/bin/pip install --no-cache-dir --upgrade pip
# CPU wheels avoid installing a CUDA runtime on this CPU-only host.
/opt/awb-native/venv/bin/pip install --no-cache-dir torch==2.14.1 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cpu
/opt/awb-native/venv/bin/pip install --no-cache-dir --prefer-binary -r /opt/awb-native/app/scripts/native-book-worker/requirements.txt
/opt/awb-native/venv/bin/pip freeze > /opt/awb-native/runtime-freeze.txt
/opt/awb-native/venv/bin/docling-tools models download layout tableformer tableformerv2 code_formula --output-dir /opt/docling-models
find -L /opt/docling-models -type f -print0 | sort -z | xargs -0 sha256sum > /opt/awb-native/model-sha256.txt
chmod -R a+rX /opt/awb-native /opt/docling-models
# Run under the same identity and offline settings as the service. No polling before this gate.
runuser -u awb -- env BOOK_NATIVE_SMOKE_FIXTURES=/tmp/awb-native-fixtures BOOK_NATIVE_SMOKE_REPORT=/tmp/awb-native-synthetic-report.json DOCLING_ARTIFACTS_PATH=/opt/docling-models HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 QT_QPA_PLATFORM=offscreen OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 HF_HOME=/tmp/awb-smoke-hf XDG_CACHE_HOME=/tmp/awb-smoke-cache CALIBRE_CONFIG_DIRECTORY=/tmp/awb-smoke-calibre /opt/awb-native/venv/bin/python /opt/awb-native/app/scripts/native-book-worker/smoke_native.py --require-calibre | tee /opt/awb-native/converter-smoke.log
printf '{"artifactSha256":"__SHA__","calibreRequired":true,"passed":true}\n' > /opt/awb-native/smoke-passed.json
cp /opt/awb-native/app/scripts/native-worker-infra/answerwithbooks-native-worker.service /etc/systemd/system/answerwithbooks-native-worker.service
systemctl daemon-reload
systemctl enable --now answerwithbooks-native-worker.service
systemctl is-active answerwithbooks-native-worker.service
printf 'Native worker bootstrap complete; artifact __SHA__.\n'
