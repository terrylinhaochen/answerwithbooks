# Source brief: *Accelerate* — Nicole Forsgren, Jez Humble, Gene Kim

## Central argument

*Accelerate* argues that software delivery is not a vague craft capability or a local engineering concern; it is a measurable organizational capability that predicts broader organizational performance. The book’s central tension is the industry’s assumed tradeoff between speed and stability: many organizations manage development for throughput and operations for control, creating incentives that slow delivery while not reliably improving quality. Forsgren, Humble, and Kim claim their multi-year research shows the opposite pattern: high-performing technology organizations tend to be better on both tempo and stability, because the same capabilities that shorten feedback loops also reduce risk, rework, deployment pain, and recovery time. The publisher frames the book as an attempt to measure software delivery performance and identify what drives it using rigorous statistical methods; the excerpt shows the authors explicitly rejecting local output measures such as velocity or utilization in favor of global outcome measures. ([itrevolution.com](https://itrevolution.com/product/accelerate/))

The thesis is not “deploy more often” in isolation. It is that organizations can improve value delivery by investing in mutually reinforcing technical, architectural, product, management, and cultural capabilities: continuous delivery practices, loosely coupled architecture and teams, lean product/process practices, lean management/monitoring, and a generative culture. The book reports four years of State of DevOps-linked research, with more than 23,000 survey responses and more than 2,000 organizations across startups, large enterprises, regulated industries, greenfield systems, and legacy environments. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

## Mechanisms and frameworks

### Delivery performance measures

The book’s delivery-performance framework uses four measures: delivery lead time, deployment frequency, time to restore service, and change failure rate. These are chosen because they are global outcome measures, not local activity metrics. They require development, operations, security, product, and management to improve the system together, rather than optimizing one function at another’s expense. The authors treat lead time and deployment frequency as “tempo” measures, and time to restore plus change failure rate as “stability” measures. Cluster analysis was used to identify high-, medium-, and low-performing groups from the data rather than pre-labeling what “good” meant. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Lead time

Lead time has a Lean lineage, but *Accelerate* narrows it for software delivery. The book distinguishes the uncertain design/discovery period from the more measurable delivery period. For the delivery metric, the clock runs from code committed to code successfully running in production. This matters because shorter delivery lead times create faster feedback, make product course correction easier, and allow urgent fixes to move through the normal path with confidence. The digest should avoid collapsing this into total product-development time from idea to value; the book’s operational measure is specifically commit-to-production. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Deployment frequency

Deployment frequency is the book’s practical proxy for batch size. Because software inventory is hard to see, deployment frequency gives a comparable signal of how often changes move into production or an app store. Higher deployment frequency usually means smaller batches, which reduces variability, risk, overhead, and delayed feedback. The book distinguishes deployment from release: a production deployment or app-store deployment may contain multiple commits; only in continuous deployment does each commit become releasable to production. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Recovery time

The book calls this “time to restore service” or MTTR: how long it typically takes to restore service after an incident such as an unplanned outage or service impairment. Its logic is that failures in complex, changing systems are inevitable, so resilience is better judged by restoration capability than by pretending failures can be eliminated. Later DORA material refined this metric: the older MTTR/time-to-restore concept was renamed and narrowed to “failed deployment recovery time” to focus on restoration after a production change causes impairment, rather than all possible outages. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Change failure rate

Change failure rate is the percentage of production changes that degrade service or require remediation, such as a hotfix, rollback, fix-forward, or patch. It is the quality/stability counterweight to deployment tempo. The key finding is not that every team should chase a universal number, but that high performers in the research generally performed well across speed and stability, undermining the assumption that faster delivery necessarily means more fragility. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Continuous delivery

Continuous delivery in this framework means keeping software deployable throughout its lifecycle so teams can release on demand in a low-risk way. It is not identical to continuous deployment, where every change is pushed to production as soon as possible. DORA’s official capability page reinforces this distinction and notes that CD can apply to firmware, mainframe systems, mobile apps, and regulated environments, even where continuous deployment is not appropriate. The driving practices include version control, deployment automation, continuous integration, trunk-based development, test automation, test data management, and shifting security left. ([dora.dev](https://dora.dev/capabilities/continuous-delivery/))

A critical causal relationship: CD is not a tooling project. DORA warns that doing the old release process more often, without architectural and process change, can increase failure rates and burnout. CD works by creating fast feedback, reducing batch size, automating repeatable work, building quality into the process, and making deployment a routine business-hours activity. ([dora.dev](https://dora.dev/capabilities/continuous-delivery/))

### Architecture

Architecture is treated as an enabling constraint on delivery. The book’s quick reference lists two architecture capabilities: loosely coupled architecture and empowered teams. Official DORA material explains the operational test: teams should be able to make large-scale design changes, complete work, test, deploy, and release without fine-grained coordination or permission from external teams. This is not a simplistic “microservices good, monoliths bad” claim. DORA explicitly says teams can fail with trendy technologies and can succeed with older platforms if the architecture supports independent testing, deployment, and change. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

### Westrum culture

The book uses Ron Westrum’s typology to operationalize culture as information flow. DORA’s official description classifies cultures as pathological, bureaucratic, or generative. Generative cultures are high-trust, performance-oriented cultures where cooperation is high, risks are shared, bridging is encouraged, failures prompt inquiry, and new ideas can be implemented. The causal claim is that culture predicts software delivery and organizational performance, but culture is also shaped by work practices: changing how teams collaborate, test, deploy, and learn changes what people experience as “culture.” ([dora.dev](https://dora.dev/capabilities/generative-organizational-culture/))

### Research limitations

The study is strong for industry research but should not be presented as a randomized causal proof. The authors used cross-sectional survey research, snowball sampling through mailing lists/social media, Likert-type instruments, cluster analysis, correlations, multiple regression, and partial least squares. They explicitly say their analyses fall into descriptive, exploratory/classification, and inferential-predictive categories, not full causal or mechanistic analysis. Therefore, the digest can say the research finds statistically meaningful predictive relationships, but should avoid saying the book proves exact causation or gives a universal implementation recipe. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

## Book-grounded examples

- **Nordstrom / Courtney Kissler foreword:** Kissler describes a retail technology transformation that shifted from cost optimization toward speed, outcome-based team structures, value-stream awareness, smaller blast radius, unified backlogs, and leadership behavior change. This example demonstrates that the book’s capabilities are intended as transformation practices, not merely metrics dashboards. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))  
- **US Digital Service and GSA Technology Transformation Service:** The book uses these federal initiatives to illustrate the argument that software strategically central to an organization’s mission should often be brought closer to the core rather than outsourced as a commodity. This supports the thesis that delivery capability can be a strategic advantage. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))  
- **ING Netherlands in Chapter 16:** The excerpt identifies ING Netherlands as the Part III transformation case, used to discuss leadership, management, team practices, and organizational learning in a large bank. This demonstrates that the book extends beyond team-level DevOps into enterprise transformation. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))  
- **2016 medium-performer anomaly:** The book notes that medium performers did worse than low performers on change fail rate in 2016 and offers possible explanations around rearchitecture, legacy transitions, and neglected rework. This is useful because it shows the authors do not present a frictionless maturity ladder. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

## Qualifications and common misreadings

Do not reduce the book to “the four metrics.” The metrics are outcome signals; the prescription is to build capabilities that improve the system. Do not use the metrics as fear-based targets: the authors warn that in pathological or bureaucratic cultures, measurement becomes control and people hide bad news. ([nicolefv.com](https://nicolefv.com/s/accelerate-book-excerpt.pdf))

Do not equate continuous delivery with continuous deployment. CD means deployable on demand; continuous deployment is one possible practice for some contexts. ([dora.dev](https://dora.dev/capabilities/continuous-delivery/))

Do not claim architecture means microservices. The framework values independent testability, deployability, and team autonomy; those outcomes may or may not be achieved with microservices. ([dora.dev](https://dora.dev/capabilities/loosely-coupled-teams/))

Do not treat 2018 metric definitions as frozen. DORA later moved from the original four-key framing toward a five-metric model, renaming/redefining MTTR as failed deployment recovery time and adding deployment rework rate in 2024. For a digest of the 2018 book, keep the four original measures central, but note later evolution. ([dora.dev](https://dora.dev/insights/dora-metrics-history/))

## Metadata check

- **Title:** *Accelerate: The Science of Lean Software and DevOps: Building and Scaling High Performing Technology Organizations* on the current IT Revolution and Simon & Schuster pages. Some records/excerpts show subtitle variants such as *The Science Behind DevOps* or shorter bibliographic titles; these appear to be edition/listing differences rather than a different book. ([itrevolution.com](https://itrevolution.com/product/accelerate/))  
- **Authors:** Nicole Forsgren, PhD; Jez Humble; Gene Kim. ([itrevolution.com](https://itrevolution.com/product/accelerate/))  
- **Original publication:** IT Revolution, March 27, 2018. Official page lists 288 pages; Google Books/O’Reilly listings vary in page count because of format/front matter. ([itrevolution.com](https://itrevolution.com/product/accelerate/))

## Sources

- [IT Revolution official book page](https://itrevolution.com/product/accelerate/) — Supports title, authorship, publication date, publisher framing, research purpose, and downloadable official extras.  
- [Official book excerpt PDF hosted by Nicole Forsgren](https://nicolefv.com/s/accelerate-book-excerpt.pdf) — Primary source for the forewords, table of contents, quick-reference capabilities, metric definitions, sample description, methods discussion, and limitations.  
- [Simon & Schuster official publisher page](https://www.simonandschuster.com/books/Accelerate/Nicole-Forsgren-PhD/9781942788331) — Confirms publisher/distributor metadata and external positioning of the book.  
- [O’Reilly book listing](https://www.oreilly.com/library/view/accelerate/9781457191435/) — Confirms book structure, research chapters, and publication metadata.  
- [DORA: Continuous delivery capability](https://dora.dev/capabilities/continuous-delivery/) — Supports current official DORA explanation of CD, distinction from continuous deployment, benefits, and pitfalls.  
- [DORA: Loosely coupled teams](https://dora.dev/capabilities/loosely-coupled-teams/) — Supports the architecture mechanism: independent testing, deployment, change, and team autonomy.  
- [DORA: Generative organizational culture](https://dora.dev/capabilities/generative-organizational-culture/) — Supports Westrum culture definitions and how DORA connects information flow to delivery and organizational performance.  
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/) — Supports current DORA definitions and cautions about applying metrics in context.  
- [DORA: History of DORA’s software delivery metrics](https://dora.dev/insights/dora-metrics-history/) — Supports later revisions from the original four metrics to the current five-metric model.  
- [InfoQ interview with Jez Humble and Dave Farley on Continuous Delivery](https://www.infoq.com/articles/humble-farley-continuous-delivery/) — Supports the CD background: production readiness, deployment pipeline, automation, feedback loops, and applicability beyond one methodology.

## Retrieved source record

- [https://itrevolution.com/product/accelerate/](https://itrevolution.com/product/accelerate/)
- [https://books.google.com/books/about/Accelerate.html?id=TK4PuAEACAAJ](https://books.google.com/books/about/Accelerate.html?id=TK4PuAEACAAJ)
- [https://books.google.com/books/about/Accelerate.html?id=85XHAQAACAAJ](https://books.google.com/books/about/Accelerate.html?id=85XHAQAACAAJ)
- [https://books.google.com/books/about/Accelerate.html?id=W3ZbEQAAQBAJ](https://books.google.com/books/about/Accelerate.html?id=W3ZbEQAAQBAJ)
- [https://itrevolution.com/books/](https://itrevolution.com/books/)
- [https://www.simonandschuster.com/books/Accelerate/Nicole-Forsgren-PhD/9781942788331](https://www.simonandschuster.com/books/Accelerate/Nicole-Forsgren-PhD/9781942788331)
- [https://www.zhuk.fi/books/accelerate-book/](https://www.zhuk.fi/books/accelerate-book/)
- [https://www.prnewswire.com/news-releases/it-revolution-announces-publication-of-its-newest-book-accelerate-the-science-of-devops--building-and-scaling-high-performing-technology-organizations-300608845.html](https://www.prnewswire.com/news-releases/it-revolution-announces-publication-of-its-newest-book-accelerate-the-science-of-devops--building-and-scaling-high-performing-technology-organizations-300608845.html)
- [https://www.oreilly.com/library/view/accelerate/9781457191435/04-copyright.xhtml](https://www.oreilly.com/library/view/accelerate/9781457191435/04-copyright.xhtml)
- [https://www.oreilly.com/library/view/accelerate/9781457191435/](https://www.oreilly.com/library/view/accelerate/9781457191435/)
- [https://www.prnewswire.com/news-releases/it-revolution-announces-accelerate-book-wins-shingo-publication-award-300858995.html](https://www.prnewswire.com/news-releases/it-revolution-announces-accelerate-book-wins-shingo-publication-award-300858995.html)
- [https://juststartwith.com/en/organizing-for-flow/accelerate/](https://juststartwith.com/en/organizing-for-flow/accelerate/)
- [https://ebook.app.hcu.edu.gh/wp-content/uploads/2024/08/Christian-Ciceri-Dave-Farley-Neal-Ford-Andrew-Harmel-Law-Michael-Keeling-Carola-Lilienthal-Joao-Rosa-Alexander-von-Zitzewitz-Rene-Weiss-Eoin-Woods-Software-Architecture-Metrics_-Case-Studie.pdf](https://ebook.app.hcu.edu.gh/wp-content/uploads/2024/08/Christian-Ciceri-Dave-Farley-Neal-Ford-Andrew-Harmel-Law-Michael-Keeling-Carola-Lilienthal-Joao-Rosa-Alexander-von-Zitzewitz-Rene-Weiss-Eoin-Woods-Software-Architecture-Metrics_-Case-Studie.pdf)
- [https://www.usenix.org/system/files/login/articles/login_fall18_15_books.pdf](https://www.usenix.org/system/files/login/articles/login_fall18_15_books.pdf)
- [https://blog.innovamat.com/wp-content/uploads/2021/09/book.pdf](https://blog.innovamat.com/wp-content/uploads/2021/09/book.pdf)
- [https://itrevolution.com/wp-content/uploads/2022/06/ACON_audio-companion_031020_r1.pdf](https://itrevolution.com/wp-content/uploads/2022/06/ACON_audio-companion_031020_r1.pdf)
- [https://nicolefv.com/s/accelerate-book-excerpt.pdf](https://nicolefv.com/s/accelerate-book-excerpt.pdf)
- [https://itrevolution.com/wp-content/uploads/2024/06/UTE_Audio-Companion_r1.pdf](https://itrevolution.com/wp-content/uploads/2024/06/UTE_Audio-Companion_r1.pdf)
- [https://arxiv.org/abs/2206.04615](https://arxiv.org/abs/2206.04615)
- [https://arxiv.org/abs/2205.05749](https://arxiv.org/abs/2205.05749)
- [https://arxiv.org/abs/2101.11104](https://arxiv.org/abs/2101.11104)
- [https://arxiv.org/abs/1808.08796](https://arxiv.org/abs/1808.08796)
- [https://dora.dev/capabilities/generative-organizational-culture/](https://dora.dev/capabilities/generative-organizational-culture/)
- [https://dora.dev/guides/dora-metrics/](https://dora.dev/guides/dora-metrics/)
- [https://dora.dev/insights/dora-metrics-history/](https://dora.dev/insights/dora-metrics-history/)
- [https://dora.dev/capabilities/](https://dora.dev/capabilities/)
- [https://aws.amazon.com/blogs/devops/balance-deployment-speed-and-stability-with-dora-metrics/](https://aws.amazon.com/blogs/devops/balance-deployment-speed-and-stability-with-dora-metrics/)
- [https://dora.dev/research/2021/dora-report/](https://dora.dev/research/2021/dora-report/)
- [https://www.infoq.com/podcasts/jez-humble](https://www.infoq.com/podcasts/jez-humble)
- [https://dora.dev/capabilities/continuous-delivery/](https://dora.dev/capabilities/continuous-delivery/)
- [https://continuousdelivery.com/about/](https://continuousdelivery.com/about/)
- [https://dora.dev/research/2023/dora-report/2023-dora-accelerate-state-of-devops-report.pdf](https://dora.dev/research/2023/dora-report/2023-dora-accelerate-state-of-devops-report.pdf)
- [https://leanmagazine.net/lean/jez-humble-continuous-delivery/](https://leanmagazine.net/lean/jez-humble-continuous-delivery/)
- [https://www.infoq.com/articles/humble-farley-continuous-delivery/](https://www.infoq.com/articles/humble-farley-continuous-delivery/)
- [https://speakerdeck.com/jezhumble/architecting-for-continuous-delivery](https://speakerdeck.com/jezhumble/architecting-for-continuous-delivery)
- [https://dora.dev/research/2019/dora-report/2019-dora-accelerate-state-of-devops-report.pdf](https://dora.dev/research/2019/dora-report/2019-dora-accelerate-state-of-devops-report.pdf)
- [https://dodcio.defense.gov/Portals/0/Documents/Library/DevSecOpsFundamentalsPlaybook.pdf](https://dodcio.defense.gov/Portals/0/Documents/Library/DevSecOpsFundamentalsPlaybook.pdf)
- [https://arxiv.org/abs/2604.26256](https://arxiv.org/abs/2604.26256)
- [https://ctoconnection-prod.s3.amazonaws.com/pdf_presentations/2022-12-13-operationalizing-dora-metrics-from-theory-to-practice.pdf](https://ctoconnection-prod.s3.amazonaws.com/pdf_presentations/2022-12-13-operationalizing-dora-metrics-from-theory-to-practice.pdf)
- [https://repositorio.iscte-iul.pt/bitstream/10071/34641/1/phd_ricardo_duarte_amaro.pdf](https://repositorio.iscte-iul.pt/bitstream/10071/34641/1/phd_ricardo_duarte_amaro.pdf)
- [https://arxiv.org/abs/2108.09571](https://arxiv.org/abs/2108.09571)
- [https://arxiv.org/abs/1810.10855](https://arxiv.org/abs/1810.10855)
- [DORA | Capabilities: Loosely coupled teams](https://dora.dev/capabilities/loosely-coupled-teams/)
