# Answer with Books content generation spec

This is the canonical production contract for every public book digest and answer brief. It mirrors `docs/EDITORIAL_STYLE.md` and `docs/ANSWER_EDITORIAL_WORKFLOW.md`; generated drafts are not publishable until they pass the same editorial review and automated gates as hand-edited pages.

## Shared standard

- Deliver the insight on the page. Never preview a book or a later personalized answer.
- Begin from one important, non-obvious question or tension and answer it directly.
- Develop the reasoning through paragraphs: claim, mechanism, source evidence or attributed example, and implication.
- Use lists only for genuinely sequential procedures, exact questions, or compact comparisons. Paragraphs must substantially outnumber list items.
- Use examples only when they come from the book, the demand packet, or another named source. Never invent a worked example.
- Use quotations only when the source wording has been verified; keep them short and paraphrase by default.
- Put qualifications beside the claims they change. Do not append generic `When this lens breaks`, `Best paired with`, or `Related books` sections.
- Add a simple accessible line illustration only when a causal chain, hierarchy, tradeoff, or sequence is clearer visually.
- Preserve descriptive links to every source book used.
- Finish when the central argument and its practical consequence are complete.

## Book digest contract

Each book page is a self-contained explanation of the book's useful argument, normally 1,200–1,800 words.

Frontmatter:

- `title`, `author`, and `year`
- `oneLiner`: a specific, page-level description suitable for cards and search snippets
- `readIf`: one concrete situation where the book is useful
- `tags`, `featured`, and `order`

Body:

1. Open with the book's central claim and why it matters. Do not praise the book or tell the reader what it will teach later.
2. Use four to six idea-led sections. Preserve the mechanisms connecting the ideas rather than summarizing chapters.
3. Attribute any example to the book or its named source and explain what the example proves.
4. Include a procedure or decision rule only when it follows from the book's argument.
5. Integrate misreadings and limitations where they affect a claim.
6. End naturally. Catalog relationships belong in the surrounding interface.

Search intent:

- The page title targets `{book title} summary` without keyword stuffing.
- The description combines the distinctive one-line argument with the title and author.
- The visible digest must satisfy the query without requiring another search.

## Answer brief contract

Each answer page solves one recurring practical problem using one to three catalog books, normally in 900–1,400 words.

Frontmatter:

- `question`: the natural-language search intent and visible H1
- `description`: an 80–200 character, page-specific summary of the diagnosis or decision rule
- `books`, `date`, `featured`, and `tags`

Body:

1. Establish the reader's concrete symptom and pending decision in the opening.
2. State a direct answer that is specific enough to exclude plausible alternatives.
3. Use four to six idea-led sections to explain the diagnosis, mechanism, source evidence, decision consequence, and next move.
4. Link the catalog book exactly where its idea enters the reasoning.
5. Separate a book's claim from editorial inference.
6. Use one short checklist, script, or sequence only when the material is inherently procedural.
7. End with an update condition or next move that follows from the diagnosis, not a generic summary.

Search intent:

- Lead the title and H1 with the exact reader question.
- Make the description unique and concrete enough to distinguish this answer from adjacent questions.
- Answer the question in the opening and use descriptive internal anchors to supporting book pages.

## Background engine record

For high-priority answers, keep a `content-engine/content-packets/*.json` packet containing the demand signal, published path, source-book roles, triage schema, and agent use cases. The packet is the evidence record; the Markdown is the reader artifact.

## Required verification

Run all of the following before publication:

```text
npm run content:eval -- --collection=<books|answers> --ids=<slug> --strict
npm run build:local
npm run test:ui
npm run audit:seo
```

Passing automation is necessary but not sufficient. The editor must still verify source fidelity, originality, usefulness, and rendered readability.
