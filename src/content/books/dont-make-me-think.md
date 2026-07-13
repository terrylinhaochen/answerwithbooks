---
title: "Don't Make Me Think"
author: "Steve Krug"
year: 2000
oneLiner: "Web usability improves when each page makes its purpose, structure, choices, and next action evident without unnecessary interpretation."
readIf: "Your page looks polished but users still hesitate, bounce, or ask what they are supposed to do."
tags: ["design", "usability", "web"]
featured: false
order: 8
---

Steve Krug’s first law of usability is the title: **don’t make me think**. He does not mean that a website should contain no ideas or that every task must be effortless. He means an interface should not spend a user’s attention on questions the design could have answered: Is this clickable? Which label contains what I need? Am I still in the same site? What happens if I continue?

Every unresolved question adds cognitive friction. One small ambiguity may not matter, but pages often contain dozens. Users compensate by guessing, ignoring, and choosing the first plausible path. A usable design removes unnecessary interpretation so attention remains available for the user’s actual goal.

*Don’t Make Me Think* is built on observation rather than a comprehensive theory of human-computer interaction. People scan, satisfice, muddle through, rely on conventions, and leave when the cost of figuring out a page exceeds the expected value. Design should support that real behavior instead of the careful behavior a team imagines.

## People scan pages and choose the first plausible path

Designers often picture a user taking in the whole page, comparing options, and selecting the best match. Krug observes something closer to driving past a billboard. People scan for words and shapes related to the task, ignore much of the rest, and click something that seems likely to work.

They do this for rational reasons. Web use is usually a means to an end. The cost of a wrong click is often low because the back button exists. Reading everything is slower than trying a reasonable path. Users are also under time pressure, distracted, or unfamiliar with the organization’s internal categories.

This behavior is called **satisficing**: choosing the first option that appears good enough rather than optimizing across all options. The design implication is not to make every item visually loud. It is to establish a clear hierarchy in which the page’s purpose, major sections, current location, and primary action can be recognized while scanning.

Good visual hierarchy reflects conceptual hierarchy. More important elements are more prominent, related elements look related, and nested elements are visually contained. When everything has equal weight, the user must reconstruct the structure by reading. When every element competes for attention, nothing reliably wins.

## Self-evident is best; self-explanatory is the fallback

Krug distinguishes a self-evident interface from one that is merely self-explanatory. A self-evident control behaves as expected without instruction. A self-explanatory design may require a brief moment of thought, but the answer becomes clear from the page itself.

Not every novel product can be immediately obvious. The practical standard is to remove avoidable questions and make the remaining learning proportional to the value of the interaction. A specialized tool may justify new concepts. A checkout button or navigation menu usually does not.

Conventions are valuable because they transfer learning from other sites. Logos link home, underlined text behaves like a link, familiar icons carry familiar actions, and common page regions create expectations. Breaking a convention can be worthwhile when the alternative is markedly clearer, but novelty has a comprehension cost that must be earned.

Names matter for the same reason. A clever label forces the user to translate from the organization’s language into their own. The best label is usually the one people already look for. Consistency helps only after clarity; consistently using an opaque term makes confusion predictable rather than usable.

## Each page should answer the navigation questions

Navigation is not only transportation. It tells the user what the site contains, how it is organized, and where the current page sits within that structure. Krug compares web navigation to finding something in a physical store, except a website lacks the persistent spatial cues of aisles, floors, and distance.

Persistent navigation compensates by keeping core landmarks stable: site identity, major sections, utilities, search, and a route home. Page titles, selected states, and breadcrumbs tell the user where they are. These elements should agree. If the navigation highlights one section while the heading uses a different conceptual label, the user must reconcile the organization’s model.

Krug’s **trunk test** imagines being dropped onto an interior page as if blindfolded and placed in the trunk of a car. On opening the page, can you quickly identify the site, the page, the major sections, the current section, and the available next steps? The test matters because search and shared links often bypass the homepage.

The homepage has an additional burden. It must establish identity and mission, reveal the site hierarchy, expose important paths, and create confidence that the user has arrived in the right place. Internal arguments about homepage territory often produce clutter because every group wants representation. The result can communicate the organization’s politics more clearly than the user’s options.

<figure class="digest-illustration">
  <svg viewBox="0 0 760 180" role="img" aria-labelledby="scan-title scan-desc">
    <title id="scan-title">How users encounter a page</title>
    <desc id="scan-desc">Users scan the visual hierarchy, recognize a plausible path, act, and correct if necessary rather than reading and optimizing every option.</desc>
    <defs><marker id="scan-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="currentColor"></path></marker></defs>
    <g fill="none" stroke="currentColor" stroke-width="2"><rect x="25" y="50" width="150" height="70" rx="11"></rect><rect x="215" y="50" width="150" height="70" rx="11"></rect><rect x="405" y="50" width="150" height="70" rx="11"></rect><rect x="595" y="50" width="140" height="70" rx="11"></rect><path d="M175 85h30M365 85h30M555 85h30" marker-end="url(#scan-arrow)"></path><path d="M665 132c0 35-375 35-375 0" marker-end="url(#scan-arrow)"></path></g>
    <g fill="currentColor" text-anchor="middle" font-family="inherit"><text x="100" y="80" font-size="16" font-weight="700">Scan</text><text x="100" y="101" font-size="12">notice hierarchy</text><text x="290" y="80" font-size="16" font-weight="700">Recognize</text><text x="290" y="101" font-size="12">first plausible path</text><text x="480" y="80" font-size="16" font-weight="700">Act</text><text x="480" y="101" font-size="12">follow the scent</text><text x="665" y="80" font-size="16" font-weight="700">Correct</text><text x="665" y="101" font-size="12">backtrack if needed</text></g>
  </svg>
  <figcaption>Interfaces should support scanning and recovery, not depend on exhaustive reading.</figcaption>
</figure>

## Omit words that do not help a user decide

Krug advises removing half the words on a page and then trying to remove half of what remains. The numbers are deliberately provocative. The underlying standard is that copy should earn its space by helping someone understand, choose, or act.

Happy talk—welcoming prose that says little—and instructions for interactions that should be obvious are common targets. Removing them reduces noise, shortens the page, and raises the relative prominence of useful content. If a control needs a paragraph of instructions, first ask whether the control can be redesigned.

Conciseness does not mean deleting necessary explanation. Complex decisions may require substantial content. The design task is to structure it so people can find the level of detail they need: clear headings, short introductory claims, meaningful labels, and progressive disclosure. The enemy is not length itself but undifferentiated effort.

## Testing resolves arguments that opinion cannot

Teams often debate what “the average user” will understand. Krug’s answer is to watch people use the product. A small number of participants will reveal major problems because usability issues are usually specific and observable: a label is misread, a path is not seen, a button does not appear clickable, or the page’s purpose is inferred incorrectly.

His lightweight test asks a participant to think aloud while trying realistic tasks. The facilitator does not teach, defend, or rescue the design too quickly. The gap between what the team intended and what the participant does is the evidence.

Krug prefers frequent small tests over rare elaborate studies. Testing three people early can identify enough high-value changes for the next iteration. Another round with a revised design discovers whether the fix worked and what became visible afterward. The aim is not statistical estimation; it is finding and removing serious friction while change is still cheap.

Choosing tasks matters. “Explore the site” produces diffuse feedback. A realistic prompt gives the participant a goal without telling them which interface language to follow. The team should focus first on problems that cause failure, repeated hesitation, or a fundamentally wrong model of the page, rather than polishing every preference expressed during the session.

## Usability includes goodwill and access

Krug describes a “reservoir of goodwill” that rises and falls during use. Hiding information people need, asking for unnecessary data, punishing common mistakes, or making support difficult drains it. Clear options, easy recovery, honest defaults, and useful help refill it. The metaphor recognizes that usability is also a relationship: each interaction communicates whose time and goals the design respects.

Accessibility belongs inside this standard, not after it. A page that depends on vision, precise pointing, or a particular device excludes people and often becomes more fragile for everyone. Semantic structure, keyboard access, readable contrast, descriptive labels, and alternatives for non-text content reduce avoidable interpretation across a wider range of contexts.

The title should not be used to justify flattening every interface or removing productive difficulty from learning. Some tasks require thought. The book asks designers to distinguish thought inherent in the user’s goal from thought created by the interface. Understanding a financial tradeoff may be difficult; discovering which control reveals the fees should not be.

The durable method is empirical. Make the page’s identity, hierarchy, current location, and primary choices visible. Use conventions unless a better pattern earns its learning cost. Cut copy that does not improve a decision. Then watch people try to use the page without explanation. Every hesitation is not automatically a defect, but it is evidence about where the design is asking the user to do work the interface might do instead.
