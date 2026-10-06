# AWB Skills: task-first catalog, managed execution, and billing

Date: 2026-09-12
Status: design proposal, not an implemented or deployed feature.

## Product decision

Keep **Books · Guides · Skills** as the three discovery surfaces:

- Books explain useful ideas.
- Guides show how to do a task.
- Skills do a bounded task and return an inspectable result to the customer's agent.

The Skills promise is **“Browse and hire skills on demand.”** Supporting copy: “Find expertise for your next task. Get useful results in the agent you already use.” A skill is the unit customers choose and buy; its APIs, model, instructions, and workflow are implementation dependencies.

Do not claim that an instruction file alone establishes a working connection. Keep preview labels until a new customer can authenticate, invoke the hosted service, retrieve a persisted result, and see correct billing.

## What exists today

This is a source and configuration audit, plus a local connectivity check. No paid research task, authenticated CrowdListen analysis, or payment was executed during this review.

| Area | Observed state | Gap |
| --- | --- | --- |
| AWB catalog | `/tools/` is labeled Skills. Four cards: GitHub research, X discourse, audience enrichment, book-backed answers. | No job-function filtering, inline dependency lists, or CrowdListen card. |
| Research service | Independent Capability Lab has authenticated HTTP endpoints, specialist execution, persisted runs, source-backed results, and CSV exports. | Bound to loopback; local port 4318 refused connections during review. No hosted execution connection was found in AWB's production configuration. |
| Routing | The caller supplies `github-leads`, `x-discourse`, or `tinker-audience`. The server dispatches that selection. | No automatic server-side expert router. The user's agent must select a supported capability and have an actual HTTP execution mechanism. |
| Account bridge | Backend account/key routes and frontend access helpers exist. | Frontend helper is not wired into the current page; production workflow does not configure a research API URL. AWB login is not proof of research access. |
| Audience enrichment | GitHub + Exa pipeline exists. | It is currently Tinker/Cookbook-specific, not arbitrary-list enrichment. |
| Book-backed answers | Separate book skill runs in the customer's harness. | It is not a Capability Lab `/v1/run` expert. Keep this execution distinction visible. |
| CrowdListen | Its code exposes research/analysis and source-recall mechanisms. | No AWB capability adapter or verified shared-workspace handoff yet. |
| Billing | Research runs record metering-only units and `chargedUsd: 0`. | No payment collection, customer wallet, credit reservation, or creator payout system. Provider charges are separate from this zero customer charge. |

Relevant code: AWB `src/pages/tools.astro`, `src/lib/tool-catalog.mjs`, `src/lib/tool-account-access.ts`, `src/lib/tool-access-client.mjs`, `.github/workflows/deploy.yml`; Capability Lab `src/server.ts`, `src/contracts.ts`, `src/agents.ts`, `src/store.ts`; CrowdListen harness `src/harness-v2.ts` and backend `agents/api/analysis.py`.

## Catalog and card design

### Page hierarchy

1. Headline and one short supporting sentence.
2. Search by task, desired result, or tool.
3. Job-function filters: **All · GTM Engineer · Account Executive · Product Manager · Designer · FDE**. Expand FDE to Forward Deployed Engineer in its accessible label/help.
4. Task-first skill grid, at most six cards per page.
5. Small “How hiring works” explanation: connect your agent, choose a skill, receive a result.

Role filters are discovery metadata, not permissions or backend routing rules. Each skill can serve multiple roles. Combine role filtering with search, reset pagination on filter changes, preserve the selected filter in the URL, and use a truthful empty state rather than inventing role-specific capabilities.

### Card hierarchy

```text
CrowdListen                                      Preview

Turn product feedback into prioritized next steps

Get an evidence-backed problem shortlist,
customer quotes, and recommended follow-up actions.

Uses  [CrowdListen icon] CrowdListen analysis
      [Source icon] Feedback source library

Product Manager · Designer · FDE

[View skill →]
```

Use a task verb as the large title; publisher identity is secondary. Show the deliverable before implementation details. Render dependency icons with text labels, not an unexplained logo wall. Separate tool dependencies from any model disclosure; do not repeat a large “powered by” block. A versioned model can be disclosed in skill details and run receipts without making the catalog model-first.

Use one primary action per card. `View skill` is valid today. `Use in my agent` becomes available only after the relevant execution and account integration are real. If authorization or source access is missing, explain the specific missing connection rather than displaying a false “ready” state.

### Initial inventory

| Task title | Deliverable | Inline dependencies | Primary roles | Release constraint |
| --- | --- | --- | --- | --- |
| Find relevant GitHub leads | Qualified shortlist with profiles, projects, evidence of fit, and qualification gaps | GitHub | GTM Engineer, Account Executive | Existing local expert; production connection required. |
| Understand a conversation on X | Sourced themes, disagreements, first-hand feedback, and sample limits | X | Product Manager, GTM Engineer, Designer | Existing local expert; recent-search scope must remain explicit. |
| Enrich a GitHub-interest audience | Identity-checked audience table with supporting sources and CSV export | GitHub · Exa | GTM Engineer, Account Executive | Label Tinker/Cookbook scope until the backend accepts and validates arbitrary audiences. |
| Turn product feedback into prioritized next steps | Prioritized problems, representative quotes, conflicting evidence, and next actions | CrowdListen analysis · Feedback source library | Product Manager, Designer, FDE | Proposed adapter; not yet callable from AWB. |
| Apply book ideas to a decision | Decision brief with useful lenses, boundaries, and a practical next step | AWB shelf | Product Manager, Designer, FDE | Runs in the customer's agent today; do not imply managed execution or identical billing. |

Do not add Slack, Zendesk, Linear, Figma, Google Sheets, or Notion logos merely because a customer might use those products. List a dependency only if this skill version actually calls it. A CSV export is not a live Google Sheets integration.

### Skill details

Order the page or drawer as follows:

1. Task, deliverable, publisher, and real availability.
2. Sample output and required input.
3. **Copy task for your agent** as the primary task handoff; concise connection action if needed.
4. **Read the full guide** as a quieter text link.
5. Tools used, source permissions, processing location, sample/time limits, and data retention.
6. Price and completion policy once billing is implemented.

Keep API/CLI documentation out of the main customer flow. Maintain a separate technical reference for agent installers and integrators. Hiding technical documentation must not hide a missing integration.

## CrowdListen: first executable slice

Publisher: CrowdListen. Proposed capability ID: `product-feedback-analysis` (not an existing endpoint).

**Input:** one product question plus a bounded batch of feedback the customer is authorized to use. Start with pasted/exported feedback; add selecting existing CrowdListen workspace/source IDs after delegated workspace access is implemented.

**Result:** three to five evidence-backed product problems, exact source references and representative quotes, affected workflows, conflicting evidence, sample limitations, and recommended research or product next steps. A small sample cannot establish prevalence, revenue impact, or the roadmap automatically.

Keep customer feedback, market context, first-party marketing, demand signals, and generic reaction distinct. Separate observed evidence from the model's interpretation. Missing evidence should remain missing, not become invented customer context.

Reuse CrowdListen's existing analysis/source services behind an AWB adapter. Its harness already calls `/agent/v1/analysis/run` and research-job endpoints. Do not rebuild it as an unrelated summarization prompt or require the customer to operate CrowdListen's infrastructure.

AWB workspace identity must map to authorized CrowdListen scope through an explicit service-to-service contract. Do not forward an AWB session token blindly or give every customer access through one unrestricted CrowdListen administrator identity. Results and source references must remain isolated by workspace.

Return a durable report ID, status, artifact URL, source references, limitations, and proposed next action. The receiving agent can summarize or continue from that artifact. No automatic ticket creation, outreach, public sharing, or roadmap modification in the first slice.

## Execution, routing, and handoff

```text
Customer's agent
  └─ selects a skill from its installed catalog and user context
       └─ authenticated AWB request
            └─ deterministic dispatcher selects the skill version
                 └─ specialist model calls its allowed tools
                      └─ persisted result + source evidence + run receipt
                           └─ customer's agent receives and uses the result
```

There are three different choices here:

1. **Which skill?** The customer's agent chooses. Users can pin a skill, edit selection instructions, or request a different one. AWB does not silently reroute an explicit selection.
2. **Which implementation?** AWB resolves the selected ID and version to the registered worker, schemas, tool allowlist, and execution limits.
3. **Which tool next?** The specialist's LLM decides among its allowed tools while completing the task. Server-side adapters make real authenticated provider API calls and return their data to that model.

Currently specialist behavior is defined by code: system instructions, tool functions, configured model, step limits, and a structured output contract. A `SKILL.md` describes how an external agent should use the service; it does not contain the server runtime or provider access.

The existing research contract is `GET /v1/capabilities`, `POST /v1/run`, and `GET /v1/runs/:id`, with an idempotency key on creation. A run returns asynchronously; progress and available intermediate artifacts are checkpoints, not an interactive pause/resume protocol. Changed inputs require a new run today. Preserve those distinctions in the redesigned handoff.

### Connection that customers can actually use

1. Customer signs in to AWB and opens “Connect your agent.”
2. Selects their agent and authorizes access to their AWB workspace.
3. A supported adapter installs the skill catalog and configures a scoped, revocable credential without exposing AWB's upstream provider secrets.
4. A free connection check verifies identity and available capabilities.
5. The agent can invoke an approved task and return the saved artifact.

First prove this with a tool-capable harness such as Codex or Claude Code. A hosted chat product does not gain HTTP tool execution by reading a URL or receiving pasted instructions. Its integration may require a supported connector/action and OAuth flow. Add such adapters only after verifying actual invocation; an optional adapter transport does not need to replace the core HTTP API.

Customers use AWB-managed provider accounts and model execution; they do not configure X, Exa, or server-side model keys. They receive their own AWB authorization, never the operator's master key. Calls that access a customer's private workspace still need that customer's data authorization.

This is a managed remote-agent service, not currently a reinforcement-learning environment or a per-customer virtual machine. The first API-only skills do not require arbitrary code execution. Isolated sandboxes become relevant if third-party skills later execute untrusted code.

## Billing page and charging policy

Place **Billing** in the signed-in account menu, with a small balance indicator where useful. Do not turn the public Skills catalog into a provider billing dashboard.

```text
Billing                              [Add funds]
Available balance | In progress | Spent this month

Usage        Transactions        Receipts
Date | Skill / task | Status | Charge | View result

Payment method                       [Manage]
```

Borrow Monid's one-balance mental model, not its raw-endpoint pricing unit. Recommend one prepaid, currency-denominated AWB workspace balance, charged per **bounded skill run**. No fabricated prices or balances; calibrate prices from observed provider/model costs before enabling paid usage.

- Define a skill version's input/sample limit, promised artifact, price, and accepted completion conditions.
- Agree to price before execution. Reserve that amount atomically; settle it once an acceptable artifact is persisted. Release the hold on failure or cancellation before completion.
- Failed provider calls can still cost AWB money. Under the initial customer-friendly policy, AWB absorbs that failure cost rather than billing for no accepted result.
- A sourced negative finding can be a valid result if the agreed task is answered; a provider outage or empty report is not. Publish this distinction.
- Polling, downloading an existing result, and replaying the same idempotent request do not create new charges. A changed/new task is a new run.
- Keep provider costs separate from the customer charge. The price covers tools, specialist model execution, infrastructure, payment costs, and operating margin. The customer's own ChatGPT/Claude/harness subscription remains separate.
- Show balance, reserved funds, run charges, top-ups, refunds, and receipts. Use real states for insufficient funds and disabled billing. Auto top-up should be off by default.

### Payment and ledger requirements

Use hosted Stripe Checkout for top-ups and the customer portal where applicable. Credit the wallet only after a verified server-side payment event, never solely because the browser returned to a success page. Handle duplicate webhooks, delayed payments, refunds, and reconciliation.

Store an immutable workspace-scoped ledger, integer currency amounts, unique payment-event IDs, and at most one settlement per run. Protect concurrent reservations against double-spending. Track provider usage/costs separately so margin is observable even on failed runs. Before launch, confirm that upstream service terms allow the intended managed/resale usage.

Creator revenue sharing is a later feature. Keep publisher identity and skill ownership in the registry now, but do not claim third-party payouts exist or introduce marketplace settlement complexity before the first paid skill works.

## Shared skill registry

Make one versioned registry the source for catalog cards, agent discovery, dispatch, and billing scope. Proposed fields:

`id`, `version`, `publisher`, `taskTitle`, `deliverable`, `jobFunctions`, `tags`, `inputSchema`, `outputSchema`, `toolDependencies`, `executionMode`, `availability`, `requiredPermissions`, `guideUrl`, `exampleTask`, `pricingPolicy`, `completionPolicy`.

Resolve the runtime worker from a server-controlled ID, not an arbitrary customer-provided URL. Keep secrets out of the manifest. The displayed dependency list should derive from the same declared allowlist used for execution. Availability must distinguish draft, private preview, and available; connection status is a separate customer-specific state.

## Delivery sequence and release gates

1. **Catalog coherence:** task/outcome-first cards, role filters, inline tool labels, details hierarchy, and a clearly preview-labeled CrowdListen entry. Preserve Books and Guides; avoid another top-level navigation rewrite.
2. **Real remote execution:** deploy the research API at an authorized HTTPS address, replace single-process/local-only durability with a hosted worker and durable run store, wire AWB identity and scoped keys, and prove an actual external-agent request. Do not infer success from a copied setup prompt.
3. **CrowdListen vertical slice:** add the adapter, input/result schemas, workspace authorization, frozen feedback fixtures, provenance checks, and durable report handoff. Prove the customer's original source IDs survive the full path.
4. **Billing:** implement wallet/ledger/Checkout and billing UI, verify the entire flow in test mode, establish prices from cost measurements, then explicitly enable paid availability.

Acceptance tests before public paid release:

- A new user signs in, connects a supported agent, selects a skill, submits authorized input, and receives a persisted artifact that remains accessible after reload.
- Role filtering and search show the correct skills, pagination is stable, and cards/details are keyboard-accessible on desktop and mobile.
- The CrowdListen report preserves evidence and distinguishes customer feedback from non-customer context; it cannot read another workspace's sources.
- Every documented dependency corresponds to an actual allowed tool. Unsupported provider/agent setups remain honestly unavailable.
- Revoked credentials fail; queued jobs survive worker restarts; result and CSV endpoints enforce ownership.
- One accepted run produces one charge. Duplicate create requests and payment events do not double-charge or double-credit. Concurrent runs cannot overspend.
- Failed or canceled-before-completion runs release reservations; a declined/unfinished top-up adds no funds; refunds and reconciliation are testable.
- No customer credential contains an upstream provider key. No outreach, public artifact sharing, or external record write happens without the appropriate authorization.

## Reference research and limits

- [Monid: how it works](https://monid.ai/docs/guide/how-it-works): discover/inspect/run, one wallet, and pay-as-you-go usage.
- [Monid: proxy integration](https://monid.ai/docs/integrations/proxy): an operator can put its own authenticated, billed application in front of provider access. This is an architectural reference, not a proposal to add Monid as a dependency.
- [Monid: wallet balance](https://monid.ai/docs/api/wallet/balance) and [wallet activities](https://monid.ai/docs/api/wallet/activities): available/held funds and transaction history; run charges have a separate run record.
- [Stripe webhooks](https://docs.stripe.com/webhooks): signed events, asynchronous delivery, and duplicate-event handling.

The Monid browser session reached account creation, not an authenticated billing dashboard. Billing observations above use public official documentation and the user's supplied screenshots; no private billing screen, account balance, or payment behavior was tested.

This review changed only this design document. It did not connect providers, run paid tasks, change authentication, create billing resources, or deploy application changes.
