Adapt the preserved Answer with Books research-skills directory into the appropriate CrowdListen surface.

Start here:
/Users/terry/Desktop/crowdlisten_files/integrations/crowdlisten-skills-directory/README.md

The source snapshot and SHA-256 manifest are in that same directory. Run `python3 verify.py`, then read the original tools page, catalog, dialogs, setup/auth modules, and implementation notes under `source/`.

Target workspace: /Users/terry/Desktop/crowdlisten_files. Discover the current repository boundaries and read their AGENTS.md instructions before editing. Identify the frontend and Skills API that own the current capability/workflow experience. Reuse the GitHub research, X discourse, audience research, and product-feedback content and useful search/filter/detail/agent-setup behavior. Port it to the existing framework and fit it into CrowdListen's current navigation, workspace, authentication, workflows, approvals, revisions, and saved results. Keep the book capability as an optional Answer with Books integration.

Audit endpoint availability, commands, schemas, workspace permissions, and every AWB-specific URL or signup callback before wiring them up. These managed capabilities were private preview: do not introduce billing, imply working execution without evidence, or expose credentials. Preserve unrelated work. Build and test the adapted experience, including authenticated execution and result handoff where existing access permits. Report the exact files, tests, and any unverified integrations. Prepare a reviewable local change; do not deploy unless I ask.
