# Flash candidate: quality gate remains open

GLM-5.3 Flash is selected in the release candidate at the user's request. Production has not changed. The completed three-chapter sample was 38.23 seconds and an estimated $0.01237 in provider text usage, versus 32.66 seconds and $0.07156 for Mini. Those are pipeline completion measurements, not proof of factual quality.

## What the evidence currently establishes

- Offline pipeline suite: 62 passing software tests, including provider configuration, citation checks, bounded repairs, and evaluation report integrity. These use synthetic responses and do not measure LLM accuracy.
- Existing live Mini calibration: eight cited-claim cases and three synthesis-direction cases passed in the prior release. See `../book-completion-2026-10-08/`.
- New calibration set: 12 cited-claim cases plus three synthesis cases. Four additions cover the wagon group error and description-versus-instruction distinction, including positive controls. Live Mini results: **12/12 cited-claim cases and 3/3 synthesis cases passed**, with no unavailable grades. [Claims](mini-claims.json), [synthesis](mini-summary.json). Flash has not yet been run against this expanded calibration set.
- Source audit: the current Codex agent compared saved Flash output with the source and found errors that Flash's own reviewer accepted. See [exact claims and evidence](source-audit.json). This is Codex source inspection, not a human quality evaluation.
- Cross-model review: Mini accepted two of the three saved Flash sections and rejected one. It **missed the confirmed wagon error in Chapter III** and accepted the misattributed checklist. See [full reviewer results](flash-cross-review-mini.json). This demonstrates that passing short calibration cases does not guarantee reliable review in chapter context. Adding Mini as reviewer is not a demonstrated solution.
- Full-book Flash quality/reliability, diverse-book coverage, and practical skill-use evaluation are not complete.

## Reproduce without spending by default

```sh
node scripts/check-book-review-calibration.mjs --model accounts/fireworks/models/glm-5p3-flash
node scripts/check-book-summary-calibration.mjs --model accounts/fireworks/models/glm-5p3-flash
node scripts/review-book-benchmark.mjs --source smith-book-i-chapters-1-3.txt --benchmark glm-5.3-flash.json --model gpt-5.4-mini
```

For live calls, add `--run --output NEW_REPORT.json` and supply the corresponding authorized provider credential in the environment. The two calibration scripts make at most 12 and three requests; the saved three-chapter cross-review makes at most three. Each call is capped at 6,000 output tokens. No transport retries or source generation occur. Existing report paths cannot be overwritten. Unavailable or malformed grades never count as correct rejections. Expected fixture labels are not sent to the reviewer.

The cross-review uses a different model with the production source-support rubric. It is not a full independent evaluation: it does not re-check extraction completeness, judge synthesis against the original source, measure downstream skill usefulness, or replace human review. Evaluation requests and costs are separate from generation costs.

Before promoting Flash, repair the observed errors, pass repeated reviewer calibration and held-out generation tests, then complete a full-book run with sampled source verification. Keep original failed outputs and compare any improved candidate against them. Do not silently correct saved results or describe the existing sample as quality-passed.

## Billing status, checked October 9

A read-only production query returned null for `public.book_processing_prices` and `public.book_payment_reservations`, and false for the existence of `book_processing_jobs.billing_required`. The new book-charging migration has not been applied. Quote/hold/settlement behavior is implemented and tested locally in the draft PR; live Stripe top-up and new-book charge acceptance are not verified. No retail tariff has been approved or enabled.

## Review authorization and scope

The user explicitly approved the existing CrowdListen OpenAI credential for this bounded check. Exactly 18 calls completed: 15 calibration cases and three source reviews. No source regeneration or additional paid repair run was performed. The credential remained in process memory and was not saved in these artifacts. [Evaluation usage](evaluation-usage.json) is separate from the earlier Flash generation benchmark.
