# Definition of Done

**CRITICAL RULE:** You are NOT finished with your task until you have completed all items in this checklist.

## 1. Code Quality & Testing

- [ ] **Format:** I have run `npm run format` and all code is formatted correctly.
- [ ] **Lint:** I have run `npm run lint` and there are no linting errors.
- [ ] **Test:** I have written tests for my changes. I have run `npm run test` and all tests pass with at least 80% coverage.
- [ ] **Build:** I have run `npm run build` and the build completes successfully without errors.

## 2. Documentation Updates

If you added a new feature, changed a CLI parameter, or modified the scraping logic/output, you **MUST** update the relevant documentation.

Check the following files and update them if necessary:

- [ ] `README.md` (Update if CLI commands, global behavior, or installation changed).
- [ ] `.agents/skills/willhaben-hunter/SKILL.md` (Update if CLI commands, global behavior, or installation changed).
- [ ] `docs/immo.md` (Update if Immo scraping logic, filters, or outputs changed).
- [ ] `docs/marketplace.md` (Update if Marketplace scraping logic, filters, or outputs changed).
- [ ] `docs/jobs.md` (Update if Jobs scraping logic, filters, or outputs changed).

## 3. Final Agent Check-in

In your final response to the user, you **MUST** explicitly state:

- "Definition of Done Checklist completed."
- "Documentation updated in [Filename(s)]" OR "No documentation updates were necessary because [Reason]".
