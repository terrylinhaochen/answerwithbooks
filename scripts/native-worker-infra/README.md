# Dedicated native worker deployment

This deployment uses one tagged `m7i.large` instance (2 fixed vCPUs, 8 GiB memory) in `us-east-2`, a 30 GB encrypted gp3 root volume, a private SSE-S3 artifact bucket, and a Standard encrypted SSM parameter. It never selects or modifies the existing CrowdListen instance. There are no inbound security-group rules or SSH keys. Access is through AWS Systems Manager; outbound HTTP/HTTPS and DNS support system packages and model provisioning. IMDSv2 is required. Fixed CPU capacity avoids the burst-credit throttling observed during repeated technical-PDF inference on the initial `t3.large` host.

Run from the web directory using the authorized AWS account:

```sh
python3 scripts/deploy-native-worker.py prepare --config /private/tmp/awb-native-deploy-config.json
python3 scripts/deploy-native-worker.py launch --native-validated
python3 scripts/deploy-native-worker.py status
```

The private config must be mode 0600 and contain `endpoint` and `workerSecret`. The script reads it without printing it, uploads it as `/answerwithbooks/native-worker/config` using SSM SecureString, and stores only non-secret deployment evidence in `/private/tmp/awb-native-deploy-state.json`. Never pass the secret on a command line. The instance role has AmazonSSMManagedInstanceCore plus read access to this artifact prefix and this one configuration parameter. An explicit deny removes the managed policy’s otherwise broad parameter-read access for every other parameter. The unprivileged service retrieves the configuration directly into memory when it starts.

`prepare` builds an archive with fixed ordering/timestamps and an immutable SHA-256 object key. Existing objects must have matching metadata. `launch` finds existing tagged instances and refuses duplicates or mismatched artifacts; the client token makes a retried first launch idempotent. After reviewing the new artifact, `prepare` followed by `update --native-validated` runs an explicit SSM update on the same tagged host. The update stops polling and removes the smoke marker until the new artifact passes its converter smoke test.

Bootstrap installs Python 3.12, Calibre, Poppler, pinned Docling, and CPU-only PyTorch. Ubuntu 24.04 lacks an awscli apt candidate; the bootstrap installs AWS CLI 2.33.6 from the official AWS Linux x86-64 ZIP. It requires the validated CPU pair Torch 2.14.1 and Torchvision 0.29.1 and records the final complete environment in `/opt/awb-native/runtime-freeze.txt`. It downloads layout, table, and code/formula models, then records every model SHA-256 in `/opt/awb-native/model-sha256.txt`. Upstream model downloads currently follow upstream revisions, so these checksums record the actual provisioned content rather than claiming a hermetic model lock.

The required synthetic converter smoke runs as `awb`, offline, before a success marker is written or the poller is enabled. PDF text, a Markdown table, a code block, an equation exponent, MOBI, and AZW3 must pass. Bootstrap logs are `/var/log/awb-native-bootstrap.log`; converter results are `/opt/awb-native/converter-smoke.log`. The service has no inbound port and runs with a private temporary directory, read-only system files, no privilege escalation, a 7 GB memory cap, and a 256-task cap. Its dedicated secret never appears in userdata or service logs.

Use SSM to inspect `cloud-init status --long`, bootstrap-log tails, `systemctl status answerwithbooks-native-worker`, and journal messages. Do not print process environments, SSM parameter values, or config files. API health is online only after a fresh authenticated poll; that status is separate from conversion success on an actual uploaded source.

## Fidelity boundary observed during release

The first synthetic PDF placed a tiny two-line Courier snippet directly below a prose caption and a short display equation close to a heading. Docling preserved the table and text but classified the code as a paragraph and the equation as a heading, flattening the code boundaries and superscript. That fixture failed the strict smoke gate; the service was not enabled. The representative fixture uses a substantive bordered monospaced listing and a separated conventional display equation, and retains every code/table/exponent assertion. Passing that fixture does not imply universal layout recognition: readers still need to check technical details against the original source.
