# Personalized digest experience

## Product contract

Answer with Books has two layers with different jobs:

1. **Book digests are durable source material.** Each book page should stand alone as a thoughtful 1,200–1,800 word digest. A reader should understand the book's argument, mechanisms, useful models, limits, and a concrete way to apply it without opening an agent.
2. **Answers are agent-ready briefs.** An answer URL names a live problem, supplies an initial decision rule, and links the relevant book digests. It is not presented as the final personalized advice.
3. **The agent performs the last mile.** From a book page, the reader can send that digest into the AI that already knows them. From an answer page, they can send the problem brief and all linked books. The shared skill tells either agent how to combine the source material with context the harness already knows about the reader.

This restores the original product loop: **Ask → Synthesize → Apply**. CrowdListen helps identify recurring questions; books supply durable judgment; the user's harness supplies personal context.

## Book digest standard

A publishable digest should contain:

- the problem the book is trying to solve;
- the book's central argument and causal mechanism;
- three to five important ideas explained in prose, not takeaway bullets alone;
- examples only when they come from the book or another identified source;
- common misreadings or ways the advice becomes cargo cult;
- qualifications placed beside the claims they change;
- a natural ending once the argument and its practical consequence are complete.

Target length is 1,200–1,800 words, centered around 1,500. Length is a guardrail, not the definition of quality.

The full prose, structure, tone, illustration, and sourcing rules live in [the editorial style](./EDITORIAL_STYLE.md). In particular, digests should not use generic “worked example,” “When this lens breaks,” “Best paired with,” or “Related books” template sections.

Current migration baseline (2026-07-12): 6 of 21 book pages meet the 1,200-word minimum. *Zero to One* is the first full vertical slice built from supplied notes, external editorial references, selective quotations, a worked Answer with Books application, and explicit boundaries. The next highest-value upgrades are *Good Strategy Bad Strategy*, *The Lean Startup*, *Don't Make Me Think*, *Made to Stick*, *Deep Work*, and *Getting Things Done*. `npm run content:eval -- --collection=books` is the source of truth for this queue.

## Personalized handoff

Every book page puts **Connect this book to your experience** directly below the book header. The reader chooses ChatGPT, Claude, Gemini, or Grok through recognizable platform icons; the browser remembers that choice. ChatGPT, Claude, and Grok receive an encoded new-chat prompt link; clipboard remains a fallback and the primary path for providers without a reliable prompt-link contract. The handoff is deliberately thin: it names the book, supplies the canonical book URL and public CrowdListen `SKILL.md`, invokes the skill's **Book URL Contract**, and tells the agent to begin. Context use, relevance selection, clarification limits, response structure, and boundaries live in the skill rather than being duplicated in every link.

The provider link is an acceleration, not the only delivery mechanism: the same compact prompt is copied before the AI opens so the reader can paste it if a provider changes or ignores its prefill parameter. The status message tells the reader exactly what happened without exposing a large instruction block on the page.

Every answer page exposes a stable prompt that tells an installed agent to:

1. read the answer URL and the linked book digests;
2. use relevant memory and current conversational context before asking the reader to repeat it;
3. ask at most one clarifying question only when the missing fact would materially change the advice;
4. produce a personalized 900–1,500 word digest;
5. distinguish book-grounded claims from the agent's inference about the reader;
6. end with a decision rule, one next move, a boundary, and what evidence would change the recommendation.

The installed skill remains the portable behavior layer. The website's remembered provider preference reduces repeated choice without pretending that a browser can discover the operating system's "default AI."

## ChatGPT and Claude integration architecture

The next integration should be one remote, read-first MCP server rather than separate ChatGPT and Claude backends.

### Shared MCP contract

Start with three tools:

- `search_shelf(question)` returns strong published answer matches and honest gaps;
- `get_answer_brief(slug)` returns the editorial brief and canonical source-book URLs;
- `get_book_digest(slug)` returns the complete digest, metadata, and canonical URL.

Personalization should stay in the host model. The MCP server supplies trustworthy book material; ChatGPT or Claude applies the private conversation context it already has. Answer with Books should not collect or mirror that personal context merely to claim personalization. A later opt-in write tool such as `save_question_gap` can be added separately with explicit confirmation and authentication.

### ChatGPT

Package the existing skill and the MCP-backed app together as an Answer with Books plugin. OpenAI's current model makes the plugin the installable/distributable package and the app the MCP-backed capability inside it. The Apps SDK UI layer is optional; the first release does not need custom UI because tool results plus the host response complete the workflow. Test the remote server in ChatGPT developer mode, then package and submit it only after the tool contract is stable.

References: [Build an app](https://learn.chatgpt.com/docs/build-app), [Build plugins](https://learn.chatgpt.com/docs/build-plugins), and [Apps SDK](https://developers.openai.com/apps-sdk).

### Claude

Expose the same public Streamable HTTP MCP endpoint as a Claude custom connector. Paid Claude users can add a remote server from Settings > Connectors, and Anthropic's directory is the eventual discovery path. Claude supports tools, prompts, and resources from remote MCP servers, so no Claude-specific backend is required. A local Claude Desktop extension is only useful if Answer with Books later needs local files or offline/private shelf data.

References: [Custom connectors using remote MCP](https://support.anthropic.com/en/articles/11175166-about-custom-integrations-using-remote-mcp), [Building remote MCP connectors](https://support.anthropic.com/en/articles/11503834-building-custom-integrations-via-remote-mcp-servers), and [Connectors Directory](https://support.anthropic.com/en/articles/11596036-anthropic-connectors-directory-faq).

### Recommended release order

1. Ship the website handoff and measure whether readers actually request personalization.
2. Deploy the three-tool, authless, read-only MCP server and test the same prompts in ChatGPT and Claude.
3. Package the ChatGPT plugin with the existing skill; publish a direct Claude connector URL.
4. Add OAuth only when saved shelves, private notes, or gap capture become part of the user story.
5. Add custom in-chat UI only if testing shows that comparison or source inspection is materially worse in plain model responses.

## Quality test

The experience is complete when a user can:

- read a book page and find it useful without personalization;
- choose a preferred AI once, personalize a book in one action, and see exactly what was copied;
- open an answer and immediately understand the problem and source books;
- copy one prompt into an agent that already knows them;
- receive advice that clearly uses personal context rather than restating the generic brief;
- trace every important book claim back to a linked digest.
