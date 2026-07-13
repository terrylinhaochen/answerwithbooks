# Source brief: *The Design of Everyday Things* — Don Norman

## Central argument

Norman’s core thesis is that everyday “user error” is often evidence of a mismatch between human psychology and the design of artifacts, interfaces, procedures, and organizations. The book reframes frustrating objects—doors, stoves, switches, shower controls, televisions, computers, phones—not as tests of user intelligence but as communication failures between designer and user. Good design makes possible actions discoverable, helps users form useful expectations, connects controls to outcomes, and gives perceptible evidence of what happened. Basic Books’ description emphasizes this tension directly: people feel inept using ordinary objects, but the cause is commonly hidden controls, arbitrary control–function relationships, lack of feedback, and unreasonable memory demands. ([hachettebookgroup.com](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books))

The tension the book resolves is between **technical possibility** and **human usability**. Modern products gain features and power, but that same complexity can make use opaque unless designers account for perception, cognition, memory, emotion, culture, and action. Norman’s revised-edition note says the underlying psychology remains stable even as technologies change; the 2013 edition updates examples, adds signifiers, and expands design/business/error discussions. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))

## Mechanisms and frameworks

### Affordances and signifiers

Affordances are possibilities for action created by the relationship between an actor and an object or environment. A chair affords support for a person who can sit, stand, or lean on it; a handle affords pulling for a user capable of grasping it. Norman later clarified that, in design, the important issue is often **perceived affordance**: what the user can tell is possible, not only what is physically possible. ([jnd.org](https://jnd.org/affordances-and-design/))

Signifiers are the perceivable cues that tell people where and how to act. They can be deliberate, like labels, arrows, handles, highlighted regions, or grayed-out menu items; or incidental, like a trail through grass or a crowded platform indicating train status. Norman introduced signifiers partly to correct the design community’s overuse of “affordance”: on a touchscreen, nearly every pixel affords touching, but only some visual cues signify where touching is meaningful. ([jnd.org](https://jnd.org/signifiers-not-affordances/))

**Do not collapse them:** affordance = what actions are possible; signifier = how the user discovers or interprets those possibilities. A design can have real affordances with poor signifiers, misleading signifiers for unavailable actions, or strong signifiers that depend on cultural convention.

### Mapping

Mapping is the relationship between controls and their effects. A good mapping lets users infer which control affects which function, especially through spatial, analogical, or culturally familiar relationships. Basic Books summarizes Norman’s rule as exploiting “natural relationships” between function and control; Oxford’s HCI textbook explains mapping as the user’s translation from psychological goals into system states and then into control manipulations. ([hachettebookgroup.com](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books))

Mapping is not the same as signification. A label may identify a control, but mapping concerns the structure of correspondence: which burner a stove knob controls, which light a switch controls, which screen action corresponds to a gesture. Natural mappings can vary by culture, a point Norman flags in the revised preface. ([jnd.org](https://jnd.org/preface-design-of-everyday-things-revised-edition/))

### Constraints

Constraints reduce the set of possible actions, making correct action easier and error less likely. Norman’s revised table of contents distinguishes physical, cultural, semantic, and logical constraints, and also covers forcing functions, interlocks, lock-ins, and lock-outs. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))

A physical constraint makes some actions impossible; a cultural constraint relies on learned conventions; a semantic constraint depends on the meaning of the situation; a logical constraint follows from relationships among parts. Constraints are not merely restrictions: they move knowledge from the user’s memory into the world, guiding action and simplifying decisions.

### Feedback

Feedback is the system’s response that lets users perceive what action occurred and whether it moved them toward the goal. It helps bridge the gulf of evaluation: the user must be able to tell what changed, interpret that change, and compare it with the intended result. Basic Books identifies lack of feedback as a core cause of unusable products, and Oxford’s discussion treats feedback and cues as central to shared interaction context. ([hachettebookgroup.com](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books))

Feedback should be timely, informative, and proportional. Mere noise, blinking, or animation may attract attention without explaining state or outcome. Good feedback supports learning because users can connect action to consequence.

### Conceptual models

A conceptual model is the user’s simplified explanation of how something works. Norman distinguishes the designer’s model, the user’s model, and the **system image**: the product, interface, labels, documentation, and behavior through which the designer communicates. If the system image is coherent, users can form a useful model; if not, they memorize steps without understanding and struggle when something goes wrong. ([jnd.org](https://jnd.org/design-as-communication/))

Conceptual models connect the other mechanisms. Signifiers show possibilities, mappings structure relationships, constraints shape feasible action, and feedback updates the user’s model after action. Norman’s shower example in “Design as Communication” shows context doing conceptual-model work: a soap dish, towels, grab bars, showerhead, and tub make sense because the user knows the story of taking a shower. ([jnd.org](https://jnd.org/design-as-communication/))

### Gulfs of execution and evaluation

The gulf of execution is the gap between a user’s goal/intention and the available actions the system makes apparent. The gulf of evaluation is the gap between the system’s actual state and the user’s ability to perceive and interpret whether the goal was achieved. Norman’s book page places these gulfs in chapter 2, and Oxford describes the left side of the seven-stage model as execution and the right side as evaluation. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))

Design bridges execution through discoverability, signifiers, constraints, mapping, and conceptual models. It bridges evaluation through feedback, visible system state, interpretable results, and conceptual models.

### Seven stages of action

The seven stages decompose goal-directed action: form a goal; form an intention; specify actions; execute actions; perceive the system state; interpret the state; evaluate the outcome. Oxford’s textbook summarizes Norman’s model this way and notes that it became a foundation for interface evaluation and cognitive walkthroughs. ([academic.oup.com](https://academic.oup.com/book/60808/chapter/529001009))

For editors, the key is not to present the stages as a rigid conscious checklist. Norman’s framework is diagnostic: each stage asks where a design can fail. Can users know what actions are possible? Can they translate intention into action? Can they see what happened? Can they interpret it correctly? Can they decide whether they are done?

### Human error as design evidence

The book’s error framework treats slips, mistakes, lapses, and violations as data about design rather than occasions for blame. The revised edition’s chapter 5 is titled “Human Error? No, Bad Design,” and Norman says the revision updates error classification, relates error to the seven-stage action model, and adds resilience engineering and automation concerns. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))

Human error still exists, but the design question is: what conditions made the error likely, hard to notice, hard to recover from, or institutionally normalized? Norman’s later essay argues that many “human errors” result from inappropriate equipment or procedures, shifting attention from blame to root causes, reporting, constraints, recovery, and resilient systems. ([jnd.org](https://jnd.org/human-error-no-bad-design/?utm_source=openai))

## Book-grounded examples

- **Doors:** Verified on the official first-edition page and revised TOC. Doors demonstrate affordances/signifiers and the push–pull problem: a door may physically afford pushing or pulling, but bad handles, plates, or labels can communicate the wrong action. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-1st-ed/))  
- **Light switches and stove/oven burners:** Verified in the publisher and author descriptions. These illustrate mapping: users must infer which control affects which light or burner; poor spatial correspondence forces memorization or trial and error. ([hachettebookgroup.com](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books))  
- **Hotel shower controls:** Verified by MIT Press’s book description and Norman’s “Design as Communication.” The example demonstrates conceptual models, signifiers, and context: bathroom components communicate intended use through placement, material, and familiar shower-taking scripts. ([mitpress.mit.edu](https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/))  
- **Home thermostat:** Verified in Norman’s revised TOC. Use this for conceptual models: users often act from an incorrect model of how thermostats work, so better design must communicate the system’s actual control logic. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
- **Destination-control elevators:** Verified in the revised TOC and preface. This example demonstrates cultural conventions and the disruption caused when a system changes a familiar action sequence, even if the new system is more efficient. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
- **Faucet case history and sound as signifier:** Verified in the revised TOC. These can support discussion of signifiers beyond visual labels, but details should be checked in the book before writing beyond that. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
- **Wrong turn on a highway; closing the wrong window:** Verified in the revised TOC. These belong in the error chapter: use them to illustrate slips/mistakes, feedback, confirmation, undo, and designing for recovery. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
- **Toyota jidoka, poka-yoke, NASA Aviation Safety Reporting System, Swiss cheese model:** Verified in the revised TOC. These support the broader error argument: systems should detect, report, block, and recover from error rather than merely blame individuals. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  

## Qualifications and common misreadings

1. **“Affordance” is often used too broadly.** Norman later said he should have emphasized perceived affordances and introduced signifiers because designers need cues that make possibilities discoverable. Avoid writing “this button affords clicking” when the real point is that visual traits signify clickability. ([jnd.org](https://jnd.org/signifiers-not-affordances/))  
2. **“Intuitive” often means learned convention.** Natural mappings and cultural constraints can vary; what feels obvious to one group may not be universal. ([jnd.org](https://jnd.org/preface-design-of-everyday-things-revised-edition/))  
3. **Good design is not only simplicity.** The brief should not reduce Norman to “make everything simple.” The official TOC includes “Complexity Is Good; It Is Confusion That Is Bad,” implying the target is understandable complexity, not feature elimination at all costs. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
4. **The seven stages are a design aid, not a literal conscious sequence every time.** Oxford notes later criticism that Norman’s model is somewhat linear and does not fully capture exploration, learning, and embodied interaction. ([academic.oup.com](https://academic.oup.com/book/60808/chapter/529001009))  
5. **Human error is not denied.** Norman’s point is that error should trigger investigation into equipment, procedures, constraints, feedback, institutional pressures, and recovery paths. The revised edition explicitly includes cases where people really are at fault, but treats blame as insufficient for design improvement. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  
6. **Edition differences matter.** Signifiers, emotion, updated error taxonomy, design thinking, business constraints, and many examples are emphasized or added in the 2013 revised edition; a digest based on the 1988 book should note the later terminology rather than implying all wording appeared identically in 1988. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/))  

## Metadata check

- **Original title/year:** *The Psychology of Everyday Things*, Donald A. Norman, published in 1988 by Basic Books; later paperback retitled *The Design of Everyday Things*. Norman’s official first-edition page states the hardback and retitled version are essentially the same book except for title/preface/introduction. ([jnd.org](https://jnd.org/books/the-design-of-everyday-things-1st-ed/))  
- **Current common edition:** *The Design of Everyday Things: Revised and Expanded Edition*, by Don Norman, Basic Books, on sale November 5, 2013, 368 pages, ISBN 9780465050659. ([hachettebookgroup.com](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books))  
- **UK edition:** MIT Press publishes the UK edition; MIT lists a 2014 revised-and-expanded paperback and describes the book as updating timeless psychology for new technologies. ([mitpress.mit.edu](https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/))  
- **Authorship:** Don Norman / Donald A. Norman; official and publisher pages use both forms depending on edition/context. ([hachettebookgroup.com](https://www.hachettebookgroup.com/contributor/don-norman/?lens=basic-books))  

## Sources

- [Don Norman, official page for *The Design of Everyday Things, Revised and Expanded Edition*](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/) — Supports edition differences, chapter structure, concepts covered, and verified book examples.  
- [Don Norman, “Preface. Design of Everyday Things, Revised Edition”](https://jnd.org/preface-design-of-everyday-things-revised-edition/) — Supports what changed in the 2013 edition, especially signifiers, emotion, error taxonomy, and design thinking.  
- [Don Norman, official page for *The Design of Everyday Things* first edition](https://jnd.org/books/the-design-of-everyday-things-1st-ed/) — Supports original publication history, earlier title, and examples such as doors, switches, burners, cars, computers, and telephones.  
- [Basic Books / Hachette, *The Design of Everyday Things*](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books) — Supports current metadata, publisher description, central thesis, and simple design rules.  
- [MIT Press, *The Design of Everyday Things*](https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/) — Supports UK-edition metadata and publisher framing of the book’s argument and examples.  
- [Don Norman, “Signifiers, not affordances”](https://jnd.org/signifiers-not-affordances/) — Supports the distinction between affordances, perceived affordances, and signifiers, including social/incidental signifiers.  
- [Don Norman, “Affordances and Design”](https://jnd.org/affordances-and-design/) — Supports Norman’s later correction that designers care especially about perceived affordances.  
- [Don Norman, “Design as Communication”](https://jnd.org/design-as-communication/) — Supports conceptual models, system image, designer/user communication, and the hotel-shower example.  
- [Don Norman, “Human Error? No, Bad Design”](https://jnd.org/human-error-no-bad-design/) — Supports the error-as-design-evidence framing and Norman’s later articulation of blame versus root cause.  
- [UC San Diego Design Lab history](https://designlab.ucsd.edu/about/history.html) — Supports Norman’s UCSD/design-lab connection and institutional framing of the book’s influence in UX and human-centered design.  
- [Oxford Academic, *Introduction to Human–Computer Interaction*, chapter on dialogue](https://academic.oup.com/book/60808/chapter/529001009) — Supports the seven stages of action, gulfs of execution/evaluation, mapping, feedback, and later caveats about the model’s linearity.

## Retrieved source record

- [https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/](https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/)
- [https://www.shortform.com/blog/seven-stages-of-action/](https://www.shortform.com/blog/seven-stages-of-action/)
- [https://www.sharritt.com/CISHCIExam/norman.html](https://www.sharritt.com/CISHCIExam/norman.html)
- [https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/)
- [https://ixdf.org/literature/publisher/basic-books](https://ixdf.org/literature/publisher/basic-books)
- [https://www.gamedeveloper.com/design/usability-evaluation-for-video-games-gulfs-of-execution-evaluation](https://www.gamedeveloper.com/design/usability-evaluation-for-video-games-gulfs-of-execution-evaluation)
- [https://principles.design/examples/don-norman-s-principles-of-design](https://principles.design/examples/don-norman-s-principles-of-design)
- [https://www.collectionscanada.ca/obj/thesescanada/vol2/BVAU/TC-BVAU-29559.pdf](https://www.collectionscanada.ca/obj/thesescanada/vol2/BVAU/TC-BVAU-29559.pdf)
- [https://www.project2061.org/publications/rsl/online/TRADEBKS/ORDER/EVERYDAY.HTM](https://www.project2061.org/publications/rsl/online/TRADEBKS/ORDER/EVERYDAY.HTM)
- [https://jnd.org/books/](https://jnd.org/books/)
- [https://media.aanda.psu.edu/sites/media/aa/files/documents/norman_design-of-everyday-things.pdf](https://media.aanda.psu.edu/sites/media/aa/files/documents/norman_design-of-everyday-things.pdf)
- [https://macropraxis.org/sources/the-design-of-everyday-things-don-norman](https://macropraxis.org/sources/the-design-of-everyday-things-don-norman)
- [https://learnline.cdu.edu.au/units/hit381/resources/popups/normantheoryofaction.html](https://learnline.cdu.edu.au/units/hit381/resources/popups/normantheoryofaction.html)
- [https://prg.inf.unibe.ch/wp-content/uploads/2023/07/BA_TunahanOzsoy.pdf](https://prg.inf.unibe.ch/wp-content/uploads/2023/07/BA_TunahanOzsoy.pdf)
- [https://www.interaction-design.org/literature/book/the-glossary-of-human-computer-interaction/gulf-of-evaluation-and-gulf-of-execution](https://www.interaction-design.org/literature/book/the-glossary-of-human-computer-interaction/gulf-of-evaluation-and-gulf-of-execution)
- [https://nordisk.pp.ru/on-line/files/%2Bblog/1405B1EF-9778-4BEE-8934-B4CD55DFEF39/ddo_article_whatisinteraction.pdf](https://nordisk.pp.ru/on-line/files/%2Bblog/1405B1EF-9778-4BEE-8934-B4CD55DFEF39/ddo_article_whatisinteraction.pdf)
- [https://kawilliams.github.io/teaching/hci/papers/the-design-of-everyday-things-norman.pdf](https://kawilliams.github.io/teaching/hci/papers/the-design-of-everyday-things-norman.pdf)
- [https://www.sci.brooklyn.cuny.edu/~sklar/teaching/s12/cisc3650/notes/lecI.2-notes.pdf](https://www.sci.brooklyn.cuny.edu/~sklar/teaching/s12/cisc3650/notes/lecI.2-notes.pdf)
- [https://arxiv.org/abs/2304.02822](https://arxiv.org/abs/2304.02822)
- [https://arxiv.org/abs/2309.14459](https://arxiv.org/abs/2309.14459)
- [https://arxiv.org/abs/1411.5340](https://arxiv.org/abs/1411.5340)
- [https://arxiv.org/abs/2111.04165](https://arxiv.org/abs/2111.04165)
- [https://jnd.org/signifiers-not-affordances/](https://jnd.org/signifiers-not-affordances/)
- [https://jnd.org/preface-design-of-everyday-things-revised-edition/](https://jnd.org/preface-design-of-everyday-things-revised-edition/)
- [https://jnd.org/affordances-and-design/](https://jnd.org/affordances-and-design/)
- [https://jnd.org/affordance-conventions-and-design-part-2/](https://jnd.org/affordance-conventions-and-design-part-2/)
- [https://jnd.org/opportunities-and-challenges-for-touch-and-gesture-based-systems/](https://jnd.org/opportunities-and-challenges-for-touch-and-gesture-based-systems/)
- [https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/](https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/)
- [https://jnd.org/human-error-no-bad-design/](https://jnd.org/human-error-no-bad-design/)
- [https://jnd.org/books/the-design-of-everyday-things-1st-ed/](https://jnd.org/books/the-design-of-everyday-things-1st-ed/)
- [https://jnd.org/error-messages-are-evil/](https://jnd.org/error-messages-are-evil/)
- [https://jnd.org/design-as-communication/](https://jnd.org/design-as-communication/)
- [https://jnd.org/wp-content/uploads/2024/01/Don-Norman-Curriculum-Vitae.pdf](https://jnd.org/wp-content/uploads/2024/01/Don-Norman-Curriculum-Vitae.pdf)
- [https://designlab.ucsd.edu/about/history.html](https://designlab.ucsd.edu/about/history.html)
- [https://designlab.ucsd.edu/about/index.html](https://designlab.ucsd.edu/about/index.html)
- [https://ucsd.academia.edu/DNorman](https://ucsd.academia.edu/DNorman)
- [https://jacobs.ucsd.edu/people/profile/donald-norman](https://jacobs.ucsd.edu/people/profile/donald-norman)
- [https://catalog.ucsd.edu/courses/DSGN.html](https://catalog.ucsd.edu/courses/DSGN.html)
- [https://pages.ucsd.edu/~dnorman/](https://pages.ucsd.edu/~dnorman/)
- [https://pages.ucsd.edu/~dnorman/CV.html](https://pages.ucsd.edu/~dnorman/CV.html)
- [https://www.hachettebookgroup.com/wp-content/uploads/2017/08/BasicBooks-catalog-S19.pdf](https://www.hachettebookgroup.com/wp-content/uploads/2017/08/BasicBooks-catalog-S19.pdf)
- [https://catalog.ucsd.edu/curric/DSGN.html](https://catalog.ucsd.edu/curric/DSGN.html)
- [https://imp.dayawisesa.com/wp-content/uploads/2023/07/The-Design-of-Everyd.-by-Don-Norman.pdf](https://imp.dayawisesa.com/wp-content/uploads/2023/07/The-Design-of-Everyd.-by-Don-Norman.pdf)
- [https://www.hachettebookgroup.com/wp-content/uploads/2017/08/BasicBooks-catalog-S21__.pdf](https://www.hachettebookgroup.com/wp-content/uploads/2017/08/BasicBooks-catalog-S21__.pdf)
- [https://jacobsinstitute.berkeley.edu/news/watch-don-norman-on-the-san-diego-design-lab/](https://jacobsinstitute.berkeley.edu/news/watch-don-norman-on-the-san-diego-design-lab/)
- [https://designlab.ucsd.edu/people/faculty.html](https://designlab.ucsd.edu/people/faculty.html)
- [https://www.hachettebookgroup.com/wp-content/uploads/2017/08/basicbooks-catalog-fall2017.pdf](https://www.hachettebookgroup.com/wp-content/uploads/2017/08/basicbooks-catalog-fall2017.pdf)
- [https://www.interaction-design.org/literature/topics/affordances](https://www.interaction-design.org/literature/topics/affordances)
- [https://s3.us-west-2.amazonaws.com/course-syllabi.ucsd.edu/syllabi/SP17/902965.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQJOAIALT3422W2MX%2F20260601%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260601T052130Z&X-Amz-Expires=86400&X-Amz-Signature=b25efd3f6a488ea4f6bc954660dd3b59ee7276c66c71618ddeb01ae7360da30c&X-Amz-SignedHeaders=host](https://s3.us-west-2.amazonaws.com/course-syllabi.ucsd.edu/syllabi/SP17/902965.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQJOAIALT3422W2MX%2F20260601%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260601T052130Z&X-Amz-Expires=86400&X-Amz-Signature=b25efd3f6a488ea4f6bc954660dd3b59ee7276c66c71618ddeb01ae7360da30c&X-Amz-SignedHeaders=host)
- [https://arxiv.org/abs/2003.02307](https://arxiv.org/abs/2003.02307)
- [https://arxiv.org/abs/2302.06970](https://arxiv.org/abs/2302.06970)
- [https://arxiv.org/abs/2204.01691](https://arxiv.org/abs/2204.01691)
- [https://gistbok-ltb.ucgis.org/current/concept/CV-05-013](https://gistbok-ltb.ucgis.org/current/concept/CV-05-013)
- [https://www.lawsonblake.com/design-of-everyday-things-don-norman/](https://www.lawsonblake.com/design-of-everyday-things-don-norman/)
- [https://www.youonai.ai/fieldguide/med/seven_stages_of_action](https://www.youonai.ai/fieldguide/med/seven_stages_of_action)
- [https://www.cs.auckland.ac.nz/courses/compsci345s1c/lectures/2006/Lecture%2010%20The%20Interaction.pdf](https://www.cs.auckland.ac.nz/courses/compsci345s1c/lectures/2006/Lecture%2010%20The%20Interaction.pdf)
- [https://www.cs.cmu.edu/~./bam/uicourse/05631fall2022/SSUI-13-eval.pdf](https://www.cs.cmu.edu/~./bam/uicourse/05631fall2022/SSUI-13-eval.pdf)
- [https://academic.oup.com/book/60808/chapter/529001009](https://academic.oup.com/book/60808/chapter/529001009)
- [https://cio-wiki.org//wiki/Seven_Stages_of_Action](https://cio-wiki.org//wiki/Seven_Stages_of_Action)
- [https://citeseerx.ist.psu.edu/document?doi=127e8766afb8a60f643f8710f2509b4b0ea24915&repid=rep1&type=pdf](https://citeseerx.ist.psu.edu/document?doi=127e8766afb8a60f643f8710f2509b4b0ea24915&repid=rep1&type=pdf)
- [https://escholarship.org/content/qt7p12r63s/qt7p12r63s.pdf](https://escholarship.org/content/qt7p12r63s/qt7p12r63s.pdf)
- [https://csis.pace.edu/~marchese/cs615sp/L6New/SeL6new.html](https://csis.pace.edu/~marchese/cs615sp/L6New/SeL6new.html)
- [https://www.w3.org/People/Bos/DesignGuide/simplicity.html](https://www.w3.org/People/Bos/DesignGuide/simplicity.html)
- [https://www.educative.io/answers/what-are-normans-seven-stages-of-action](https://www.educative.io/answers/what-are-normans-seven-stages-of-action)
- [https://uvicnotes.github.io/SENG-310/2016-01-14/](https://uvicnotes.github.io/SENG-310/2016-01-14/)
- [https://arxiv.org/abs/2111.05974](https://arxiv.org/abs/2111.05974)
- [https://arxiv.org/abs/2111.04880](https://arxiv.org/abs/2111.04880)
- [https://arxiv.org/abs/2108.01737](https://arxiv.org/abs/2108.01737)
- [https://media.nngroup.com/media/reports/free/Intranet_Design_Annual_2015.pdf](https://media.nngroup.com/media/reports/free/Intranet_Design_Annual_2015.pdf)
- [https://media.nngroup.com/media/reports/free/iPad_App_and_Website_Usability_1st_Edition.pdf](https://media.nngroup.com/media/reports/free/iPad_App_and_Website_Usability_1st_Edition.pdf)
- [https://media.nngroup.com/media/reports/free/Designing_for_Young_Adults_3rd_Edition.pdf](https://media.nngroup.com/media/reports/free/Designing_for_Young_Adults_3rd_Edition.pdf)
- [https://media.nngroup.com/media/reports/free/Application_Design_Showcase_2nd_edition.pdf](https://media.nngroup.com/media/reports/free/Application_Design_Showcase_2nd_edition.pdf)
- [https://media.nngroup.com/media/reports/free/Application_Design_Showcase_1st_edition.pdf](https://media.nngroup.com/media/reports/free/Application_Design_Showcase_1st_edition.pdf)
- [https://www.nngroup.com/articles/?ad=semD&am=exact&an=msn_s&askid=d8463518-f41e-4070-8750-f77a17f2cc19-0-ab_mse&l=sem&o=23777&page=79&q=usability+nielsen&qsrc=999&vpage=4](https://www.nngroup.com/articles/?ad=semD&am=exact&an=msn_s&askid=d8463518-f41e-4070-8750-f77a17f2cc19-0-ab_mse&l=sem&o=23777&page=79&q=usability+nielsen&qsrc=999&vpage=4)
- [https://www.nngroup.com/videos/analyzing-figmas-shortcut/?lm=logo-placement-brand-recall&pt=article](https://www.nngroup.com/videos/analyzing-figmas-shortcut/?lm=logo-placement-brand-recall&pt=article)
- [https://www.nngroup.com/articles/?ad=semD&am=exact&an=msn_s&askid=d8463518-f41e-4070-8750-f77a17f2cc19-0-ab_mse&l=sem&o=23777&page=243&q=usability+nielsen&qsrc=999&vpage=1](https://www.nngroup.com/articles/?ad=semD&am=exact&an=msn_s&askid=d8463518-f41e-4070-8750-f77a17f2cc19-0-ab_mse&l=sem&o=23777&page=243&q=usability+nielsen&qsrc=999&vpage=1)
- [https://www.nngroup.com/articles/?apage=8&page=10&vpage=8](https://www.nngroup.com/articles/?apage=8&page=10&vpage=8)
- [https://www.nngroup.com/articles/?asset=publications&page=22](https://www.nngroup.com/articles/?asset=publications&page=22)
- [https://www.nngroup.com/articles/animation-usability/?lm=animation-purpose-ux&pt=article](https://www.nngroup.com/articles/animation-usability/?lm=animation-purpose-ux&pt=article)
- [https://www.nngroup.com/articles/?apage=6&page=224&vpage=7](https://www.nngroup.com/articles/?apage=6&page=224&vpage=7)
- [https://www.nngroup.com/articles/?page=45&source=post_page---------------------------](https://www.nngroup.com/articles/?page=45&source=post_page---------------------------)
- [https://www.nngroup.com/reports/make-decisions/?lm=plain-language-for-experts&pt=youtubevideo](https://www.nngroup.com/reports/make-decisions/?lm=plain-language-for-experts&pt=youtubevideo)
- [https://www.nngroup.com/videos/mobile-images/?lm=supporting-multiple-location-users&pt=article](https://www.nngroup.com/videos/mobile-images/?lm=supporting-multiple-location-users&pt=article)
- [https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/?lm=plain-language-for-experts&pt=youtubevideo](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/?lm=plain-language-for-experts&pt=youtubevideo)
- [https://www.nngroup.com/articles/be-succinct-writing-for-the-web/?trk=article-ssr-frontend-pulse_little-text-block](https://www.nngroup.com/articles/be-succinct-writing-for-the-web/?trk=article-ssr-frontend-pulse_little-text-block)
- [https://www.hachettebookgroup.com/contributor/don-norman/?lens=basic-books](https://www.hachettebookgroup.com/contributor/don-norman/?lens=basic-books)
- [https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=qBfRDQAAQBAJ](https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=qBfRDQAAQBAJ)
- [https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=ScxrlwEACAAJ](https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=ScxrlwEACAAJ)
- [https://lib.ccsdetroit.edu/cgi-bin/koha/opac-detail.pl?biblionumber=55955](https://lib.ccsdetroit.edu/cgi-bin/koha/opac-detail.pl?biblionumber=55955)
- [https://openlibrary.org/books/OL25726927M/The_Design_of_Everyday_Things?show_page_status=1](https://openlibrary.org/books/OL25726927M/The_Design_of_Everyday_Things?show_page_status=1)
- [https://www.hachettebookgroup.com/titles/donald-a-norman/emotional-design/9780465051366/?lens=basic-books](https://www.hachettebookgroup.com/titles/donald-a-norman/emotional-design/9780465051366/?lens=basic-books)
- [https://www.goodreads.com/work/editions/18518-the-psychology-of-everyday-things](https://www.goodreads.com/work/editions/18518-the-psychology-of-everyday-things)
- [https://s3-us-west-2.amazonaws.com/gae-supplemental-media/lesson-1-notespdf/Lesson-1-Notes.pdf](https://s3-us-west-2.amazonaws.com/gae-supplemental-media/lesson-1-notespdf/Lesson-1-Notes.pdf)
- [https://mitpress.mit.edu/9780262640374/the-design-of-everyday-things/](https://mitpress.mit.edu/9780262640374/the-design-of-everyday-things/)
- [https://catalog.freelibrary.org/Record/1944197](https://catalog.freelibrary.org/Record/1944197)
- [https://www.hachette.com.au/don-norman/the-design-of-everyday-things-revised-and-expanded-edition](https://www.hachette.com.au/don-norman/the-design-of-everyday-things-revised-and-expanded-edition)
- [https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=nVQPAAAAQBAJ](https://books.google.com/books/about/The_Design_of_Everyday_Things.html?id=nVQPAAAAQBAJ)
- [https://catalog.monocolibraries.org/bib/110088](https://catalog.monocolibraries.org/bib/110088)
- [https://www.api.motion.ac.in/lpramptj/E6S0330/tordirz/E8S3679193/the_design_of_everyday-things-revised_and-expanded_edition.pdf](https://www.api.motion.ac.in/lpramptj/E6S0330/tordirz/E8S3679193/the_design_of_everyday-things-revised_and-expanded_edition.pdf)
- [https://www.hachettebookgroup.com/wp-content/uploads/2025/11/Basic75_Cvr_Interior_150dpi.pdf](https://www.hachettebookgroup.com/wp-content/uploads/2025/11/Basic75_Cvr_Interior_150dpi.pdf)
- [https://arxiv.org/abs/2009.13919](https://arxiv.org/abs/2009.13919)
- [https://arxiv.org/abs/0708.1725](https://arxiv.org/abs/0708.1725)
- [https://arxiv.org/abs/2003.05530](https://arxiv.org/abs/2003.05530)
- [https://arxiv.org/abs/1901.06525](https://arxiv.org/abs/1901.06525)
- [https://sites.psu.edu/meganbecker/2021/01/21/don-norman-blog-post-assignment/](https://sites.psu.edu/meganbecker/2021/01/21/don-norman-blog-post-assignment/)
- [https://www.productbookshelf.com/2014/11/the-design-of-everyday-things/](https://www.productbookshelf.com/2014/11/the-design-of-everyday-things/)
- [https://web.cs.ndsu.nodak.edu/~slator/html/CS488/lectures/norman.html](https://web.cs.ndsu.nodak.edu/~slator/html/CS488/lectures/norman.html)
- [https://www.textbookofusability.com/glossary/norman-design-principles.html](https://www.textbookofusability.com/glossary/norman-design-principles.html)
- [https://www.thebookclubproject.org/wp-content/uploads/2015/09/Book-Summary-The-Design-of-Everyday-Things-by-Don-Norman.pdf](https://www.thebookclubproject.org/wp-content/uploads/2015/09/Book-Summary-The-Design-of-Everyday-Things-by-Don-Norman.pdf)
- [https://www.techbookofthemonth.com/books/oct19](https://www.techbookofthemonth.com/books/oct19)
- [https://sites.psu.edu/gitasblog/2021/05/23/the-design-of-everyday-things/](https://sites.psu.edu/gitasblog/2021/05/23/the-design-of-everyday-things/)
- [https://inigomedina.co/library/work/norman-design-of-everyday-things](https://inigomedina.co/library/work/norman-design-of-everyday-things)
- [https://figr.design/blog/the-design-of-everyday-things](https://figr.design/blog/the-design-of-everyday-things)
- [https://artdesignideas.com/design-of-everyday-things-ai/](https://artdesignideas.com/design-of-everyday-things-ai/)
- [https://arxiv.org/abs/1804.03080](https://arxiv.org/abs/1804.03080)
- [https://arxiv.org/abs/2402.02726](https://arxiv.org/abs/2402.02726)
- [https://arxiv.org/abs/2006.15085](https://arxiv.org/abs/2006.15085)
- [The Design of Everyday Things by Don Norman | Hachette Book Group](https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books)
- [Human Error? No, Bad Design – Don Norman's JND.org](https://jnd.org/human-error-no-bad-design/?utm_source=openai)
