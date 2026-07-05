# Willhaben Hunter

**Target:** Node.js/TypeScript CLI web scraper for `willhaben.at` items. Outputs data as JSON (default) or CSV, stdout-first for LLM analysis and pipeability.
**Stack:** `commander`, `@inquirer/prompts`, `ora`, `picocolors`, `playwright-extra` (with `stealth` plugin), `csv-writer`, `vitest`.

## Rules & Guidelines

1. **TypeScript & Code Style:** Strict typing (avoid `any`). Use Prettier/ESLint. Order: public first, then private. Private members start with `_`. English `/** */` docs for public methods, classes, and interfaces. Exported `const` are in SCREAMING_SNAKE_CASE. Every export has the WillhabenHunter prefix.
2. **CLI & Architecture:** Single package, dual-export pattern. `src/index.ts` exposes the core programmatic API (`WillhabenHunterScraper`). `src/cli.ts` handles the CLI UI. Maintain LLM/script compatibility: output data to `stdout` and logs/UI (spinners, summaries, errors) to `stderr` (use `npx ts-node src/cli.ts` instead of `npm start` to avoid npm banner noise corrupting JSON). Meaningful error handling without raw stack traces.
3. **Scraping & Data:** Handle CSV escaping via `csv-writer`. Respect rate limits and STRICTLY use the stealth plugin to bypass Willhaben's bot protection.
4. **Testing:** TDD approach. Tests go in `tests/` with `.test.ts` extension using `vitest`.
5. **Verification:** After changes, you MUST run:
    - `npm run build`
    - `npm run lint`
    - `npm test`
    - `npx ts-node src/cli.ts search -q "iphone" --limit 1 --skip-details --fail-on-empty --non-interactive`
