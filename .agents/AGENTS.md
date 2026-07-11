# Willhaben Hunter

**Target:** Node.js/TypeScript CLI web scraper for `willhaben.at` items (marketplace + real-estate). Outputs data as JSON (default) or CSV, stdout-first for LLM analysis and pipeability.
**Stack:** `commander`, `@inquirer/prompts`, `ora`, `picocolors`, `playwright-extra` (with `stealth` plugin), `csv-writer`, `vitest`, `husky`.

## Rules & Guidelines

1. **TypeScript & Code Style:** Strict typing (avoid `any`). Use Prettier/ESLint. Order: public first, then private. Private members start with `_`. English `/** */` docs for public methods, classes, and interfaces. Exported `const` are in SCREAMING_SNAKE_CASE. Every export needs to have the WillhabenHunter prefix. Use standard `//#region Region Name` and `//#endregion`.
2. **CLI & Architecture:** Single package, dual-export pattern. `src/index.ts` exposes the core programmatic API (`WillhabenHunterMarketplaceScraper`, `WillhabenHunterImmoScraper`). `src/cli.ts` handles the CLI UI with two subcommands: `marketplace` and `immo`. Maintain LLM/script compatibility: output data to `stdout` and logs/UI (spinners, summaries, errors) to `stderr`.
3. **Scraping & Data:** Handle CSV escaping via `csv-writer`. Respect rate limits and STRICTLY use the stealth plugin to bypass Willhaben's bot protection.
4. **Testing:** TDD approach. Tests go in `tests/` with `.test.ts` extension using `vitest`. Keep test coverage at 80% or above.
5. **Verification:** After changes, you MUST run:
    - `npm run lint`
    - `npm run test:cov`
    - `npm run build`
    - `npm start -s -- marketplace -q "iphone" --limit 1 --skip-details --fail-on-empty --non-interactive`
    - `npm start -s -- immo --type wohnung-mieten -a wien --limit 1 --skip-details --fail-on-empty --non-interactive`
