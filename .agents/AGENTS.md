# Willhaben Hunter

- Target: Node.js/TypeScript CLI scraper/library for willhaben.at
- Output: JSON (default)/CSV to stdout. Logs/UI to stderr.

## Stack

- Env: Node.js >=24.18.0, npm >=11.16.0, CommonJS
- Core: typescript, playwright-extra, puppeteer-extra-plugin-stealth, csv-writer
- CLI: commander, @inquirer/prompts, ora, picocolors
- Tooling: eslint (sonarjs), prettier, vitest, @vitest/coverage-v8, husky, lint-staged
- Language: English

## Rules

### Knowledge Base

- **Immo**: Read `docs/immo.md` for real estate structure, filters, and scraping logic.
- **Marketplace**: Read `docs/marketplace.md` for marketplace search and scraping logic.
- **Jobs**: Read `docs/jobs.md` for jobs search and scraping logic.
- _You MUST always consult these files before implementing scraping logic or adding filters._

### Architecture & CLI

- API: src/index.ts (WillhabenHunterMarketplaceScraper, WillhabenHunterImmoScraper)
- CLI: src/cli.ts (subcommands: marketplace, immo)
- Output: Pure data to stdout. UI/Logs/Errors to stderr.
- Parameter Values: All CLI parameter values MUST be in German, exactly like the value they have on willhaben.

### Style

- Typing: Strict. No any. Use readonly.
- Lint/Format: Prettier/ESLint (npm run format, npm run lint).
- Constants: SCREAMING_SNAKE_CASE
- Exports: Prefix with WillhabenHunter
- Private members: Prefix with \_
- Structure: Public first, then private. Use //#region //#endregion.
- Docs: English /\*\* \*/ JSDoc for public API.

### Scraping

- Stealth: MUST use Playwright stealth plugin.
- Rate Limits: Respect limits to avoid bans.
- Data: Escape CSV via csv-writer.

### Testing

- Workflow: MUST use TDD, write tests first than implement.
- Framework: vitest
- Location: tests/*.test.ts
- Coverage: >= 80%. Run npm run test (generates badges).
- Clean Output: Silently swallow commander's internal stderr/stdout output during CLI tests (e.g., `program.configureOutput({ writeOut: () => {}, writeErr: () => {} })`) to prevent terminal spam.

### REQUIRED VERIFICATION

Before you finalize any task, you **MUST** read `docs/definition-of-done.md`. You are strictly forbidden from considering a task complete until every item in that checklist (including documentation updates) has been addressed.
