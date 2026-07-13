---
title: Accelerate
author: Nicole Forsgren, Jez Humble, and Gene Kim
year: 2018
oneLiner: "Accelerate shows that software organizations get faster and more reliable by using global delivery outcomes to expose constraints, then removing those constraints through continuous delivery, loose coupling, lean management, and generative information flow."
readIf: "Your leadership team is deciding whether a legacy product can deploy more often without becoming less reliable."
tags: ["technology","operations","management","quality"]
featured: false
order: 37
---

*Accelerate* argues that software delivery is a measurable organizational capability, and that this capability predicts broader organizational performance. Its central claim challenges the familiar tradeoff between speed and stability. High-performing technology organizations do not move quickly by accepting more operational fragility. They tend to become better at both tempo and reliability because the same practices that shorten feedback loops also reduce batch size, rework, deployment pain, and recovery time.

That reframes the management problem. Many organizations ask development to deliver more features and operations to prevent disruption, then design incentives that put the two goals in conflict. The result is often large releases, late testing, handoffs, queues, change freezes, and risky deployment events. *Accelerate* says this is not a law of nature. When software matters to the organization’s mission, delivery capability is part of the operating model, not a local engineering preference.

## The four measures make delivery visible as one system

The book’s best-known contribution is a four-part measure of software delivery performance: delivery lead time, deployment frequency, time to restore service, and change failure rate. These are global outcome measures. They are meant to reveal how the whole delivery system works, rather than rewarding local activity such as velocity, utilization, ticket volume, or lines of code. A team can look busy while work waits in queues. A control function can reduce visible change while delaying learning. The four measures force attention onto the shared path from completed code to reliable service.

Delivery lead time and deployment frequency are the tempo measures. *Accelerate* defines delivery lead time narrowly: the time from code committed to code successfully running in production. It is not the full span from idea to customer value, because discovery work is uncertain and exploratory. Commit-to-production flow is more directly measurable as an operational system. Shorter delivery lead time means completed work gets feedback sooner, product direction can change sooner, and urgent fixes can use the normal path instead of a special emergency route.

Deployment frequency is a practical proxy for batch size. Software inventory is hard to see, but unreleased code still carries risk: merge conflicts, delayed feedback, hidden defects, and coordination overhead. More frequent deployment usually means smaller batches, though the book distinguishes deployment from release. A production or app-store deployment may contain multiple commits, and continuous delivery does not require every commit to be immediately exposed to users. The point is the ability to move change in small, routine increments.

Time to restore service and change failure rate are the stability measures. Time to restore service asks how long it typically takes to recover after an incident such as an unplanned outage or service impairment. Its premise is realistic: complex changing systems will fail, so resilience includes detection, diagnosis, and restoration. Change failure rate asks what percentage of production changes degrade service or require remediation such as a rollback, hotfix, fix-forward, or patch. Together, these measures prevent deployment speed from becoming a vanity metric.

## The metrics are symptoms, not targets

The book’s research used cluster analysis to identify high-, medium-, and low-performing groups from the data rather than assuming in advance what “good” meant. The important pattern is that high performers were not merely faster. They tended to perform well across both tempo and stability, undermining the assumption that rapid change must produce unreliable service. Later DORA work refined the model, including narrowing the older time-to-restore idea toward failed deployment recovery time and adding attention to rework. For the 2018 book, the original four measures remain the central lens.

The measures are easy to misuse. *Accelerate* does not argue that leaders should turn the four metrics into fear-based targets. In a bureaucratic or pathological culture, measurement can become a control system that teaches people to hide bad news. The metric should name a constraint in the delivery system, not a person to blame.

A compact decision rule follows from the book’s logic: treat a weak delivery metric as evidence of a missing capability.

- Long commit-to-production lead time points toward queues, handoffs, approval waits, integration delays, test bottlenecks, or deployment friction.
- Low deployment frequency points toward large batches and expensive release overhead.
- Long restoration time points toward weak observability, poor incident learning, risky rollback or fix-forward paths, or unclear operational ownership.
- High change failure rate points toward quality discovered too late, brittle architecture, insufficient automated checks, or overloaded teams.

The action is not to demand a better number. The action is to improve the system that produces the number.

## Continuous delivery makes release ordinary

In *Accelerate*, continuous delivery means keeping software deployable throughout its lifecycle so teams can release on demand in a low-risk way. It is not the same as continuous deployment, where every change is automatically pushed to production as soon as possible. That distinction matters for regulated environments, mobile apps, firmware, mainframes, and other contexts where releasing every commit may not be appropriate. Continuous delivery is the capability to release safely when the organization chooses.

The mechanism is smaller, better-tested, more reversible change. Version control, deployment automation, continuous integration, trunk-based development, automated tests, test data management, and earlier security work reduce the uncertain manual effort that often accumulates at the end of a release. Quality is built into the path instead of inspected through a late gate. Deployment becomes a normal business-hours activity rather than a rare event surrounded by freezes, meetings, and recovery plans.

This is why “deploy more often” is an incomplete reading of the book. Doing the old release process more frequently can increase failure rates and burnout if the process remains manual, tightly coupled, and opaque. More frequent deployment is useful evidence only when it reflects smaller batches, stronger automation, faster feedback, and safer architecture. The capability matters more than the calendar.

## Architecture decides whether autonomy is real

*Accelerate* treats architecture as an enabling constraint on delivery. The operational test is whether teams can make meaningful changes, test them, deploy them, and release them without fine-grained coordination or permission from many other teams. If not, the organization may use agile language while its architecture still forces large batches, shared queues, and synchronized release events.

This is not a claim that microservices are automatically good or that monoliths are automatically bad. The capability is loose coupling in the work system: independent testability, independent deployability, and team autonomy over the services or components being changed. A fashionable architecture can still fail if every change requires cross-team negotiation, shared test environments, coordinated data changes, or a central release group. Older platforms can still support strong delivery when teams can make and verify changes with limited external dependency.

The management implication is that procedural transformation is not enough. If architecture requires constant coordination, more ceremonies and dashboards will not create flow. Team boundaries, ownership, testing strategy, deployment paths, and system design must change together. The book links loosely coupled architecture with empowered teams because autonomy without technical ability is theater, while technical capability without decision rights still leaves work stuck in queues.

The book’s discussion of the US Digital Service and the GSA Technology Transformation Service supports this strategic view. These federal initiatives illustrate the argument that software central to an organization’s mission should often be brought closer to the core rather than treated as a commodity to outsource. The point is not that external vendors are always wrong. It is that an institution weakens itself when it loses the ability to change, learn from, and operate mission-critical software.

## Culture is information flow under stress

The book uses Ron Westrum’s typology to make culture observable through information flow. The important question is not whether a workplace sounds friendly. It is what happens when there is risk, failure, novelty, or bad news. Pathological cultures suppress or punish inconvenient information. Bureaucratic cultures route information through formal channels and protect turf. Generative cultures emphasize performance, cooperation, shared risk, inquiry into failure, bridging across boundaries, and the ability to implement new ideas.

This matters because software delivery is a learning system. Teams discover whether a change works by connecting signals from code, tests, production, users, incidents, and business decisions. If people hide failures, delay bad news, or need permission from distant authorities to act, feedback slows and risk accumulates. If failures prompt inquiry rather than blame, the organization can improve the conditions that made failure likely.

The culture claim is not soft advice added after the engineering mechanics. The research connects generative culture with software delivery and organizational performance, while also treating culture as something shaped by work practices. A team that can test, deploy, observe, and restore its own service experiences a different culture from a team that throws work over a wall and waits. Changing the path of work changes who talks to whom, what can be seen, how quickly truth arrives, and whether improvement can happen without political escalation.

## The evidence supports direction, not a universal recipe

The empirical base is unusually explicit for a technology management book. *Accelerate* draws on four years of State of DevOps-linked research, more than 23,000 survey responses, and more than 2,000 organizations across startups, large enterprises, regulated industries, greenfield systems, and legacy environments. The authors used survey instruments, cluster analysis, correlations, multiple regression, and partial least squares to identify relationships among delivery performance, capabilities, culture, and organizational outcomes.

The right interpretation is strong but bounded. The research finds statistically meaningful predictive relationships; it is not a randomized causal proof that installing a named practice will produce a precise result everywhere. The authors classify their analyses as descriptive, exploratory or classification-oriented, and inferential-predictive rather than fully causal and mechanistic. The book offers a better map of what tends to matter, not a universal implementation recipe.

The 2016 medium-performer anomaly shows why a simple maturity ladder is misleading. The book notes that medium performers did worse than low performers on change failure rate that year and discusses possible explanations such as rearchitecture, legacy transitions, and neglected rework. Transformation can expose hidden fragility, and organizations in the middle of architectural or process change may create new failure modes if they ignore quality.

The enterprise examples keep the argument broader than tool adoption. In the foreword, Nordstrom’s Courtney Kissler describes a retail technology transformation that moved from cost optimization toward speed, outcome-based team structures, value-stream awareness, smaller blast radius, unified backlogs, and leadership behavior change. ING Netherlands appears as a transformation case involving leadership, management, team practices, and organizational learning in a large bank. These examples show that the book’s unit of change is the operating model around software, not a single team’s deployment script.

The practical consequence is a different form of accountability. Leaders should stop asking teams to choose between rapid delivery and reliable service as if those were separate virtues owned by different departments. They should measure the delivery system with outcome metrics, read those metrics as signals of underlying capability, and invest in the technical, architectural, managerial, product, and cultural practices that make small safe change normal. Speed and stability improve together when the organization becomes better at learning from every change.
