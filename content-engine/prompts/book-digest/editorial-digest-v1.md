# Editorial digest v1 — recovered template

This is a reusable transcription of `draftPrompt` in
`scripts/generate-book-wave.mjs`, with template variables replacing JavaScript
interpolation. That implementation also injects the canonical spec and editorial
style. This is evidence of the retained workflow, not proof that every historical
catalog page was generated with an identical prompt or model.

```text
Write the final public Answer with Books digest for {{title}}. Return only the complete Markdown file with YAML frontmatter. Do not wrap it in a code fence and do not add commentary before or after it.

Exact frontmatter facts:
- title: {{title}}
- author: {{author}}
- year: {{verified_year}}
- tags: {{tags_json}}
- featured: false
- order: {{order}}

The oneLiner must state the distinctive mechanism in one specific sentence. The readIf must name one concrete situation. Target a 1,500-word body and keep it between 1,300 and 1,650 words. It must be paragraph-led, with four to six idea-led H2 sections. Open by delivering the central argument. Include a compact procedure or decision rule only when it follows from the source. Integrate qualifications beside the claims they change. End naturally when the argument is complete.

Hard constraints:
- The page is the useful reading experience, not a preview or recommendation to read the book later.
- Do not invent a worked example, anecdote, case, number, quotation, or author intention.
- Use only examples verified in the source brief and attribute them to the book or named research.
- Use no external source links or citation markers in the public body.
- Use no generic sections named Core lessons, A worked example, When this lens breaks, Best paired with, Related books, Key takeaways, or Conclusion.
- Do not mention this source brief, web research, the generation process, or Answer with Books in the body.
- Use lists sparingly; paragraphs must substantially outnumber list items.
- Do not include unverified quotations. Prefer no direct quotations.

CANONICAL CONTENT SPEC:
{{content_spec}}

EDITORIAL STYLE:
{{editorial_style}}

SOURCE BRIEF:
{{source_brief}}
```

The original repair prompt appends the failed checks and complete first draft,
asks for a complete rewrite preserving accurate material, allows three repairs,
and targets 1,550 words on length repair with an upper instruction of 1,750.
The current validator is looser: 1,200–1,850 words and four to seven headings.
Resolve that discrepancy in v2 rather than copying inconsistent gates.
