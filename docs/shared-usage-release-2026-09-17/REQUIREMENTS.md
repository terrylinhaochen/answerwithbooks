# Shared usage and setup release

Ship multi-step input-only onboarding, reviewed X organization affiliates, configurable customer-agent handoff, canonical Insights, raw evidence and saved skill runs. Preserve original evidence, source roles and unreviewed interpretations.

Hosted processing uses metered token and API usage at the customer rates approved before work starts. Internal rate derivation is documented in the private billing backend repository. Consumed usage can be charged on failure; unused reserved funds are released. Customer-agent local reasoning is billed separately by the agent provider.

Acceptance: authenticated collection, storage, synthesis, recall and rendered findings; bounded usage holds before work; complete receipts settle once; unknown usage is not silently charged as zero; retry and owner isolation tests pass. Production code deployment and real payment enablement must be reported separately.
