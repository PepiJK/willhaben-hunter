# Willhaben Hunter

## Project Context

- **Type:** Modern CLI Application
- **Runtime:** Node.js (LTS version)
- **Language:** TypeScript
- **CLI Framework:** `commander`, `enquirer`
- **CLI UX:** `ora` (spinners) and `picocolors` (colors)
- **Web Scraping:** `playwright` + `playwright-extra` + `puppeteer-extra-plugin-stealth`
- **CSV Export:** `csv-writer`
- **Testing:** `vitest`

## Core Functionality

- **Target:** Web scraper for `willhaben.at` items. German speakers.
- **Output:** Gathers items information and exports it to a `.csv` file for analysis by an agent LLM.

## Technical Guidelines

1. **TypeScript First:**
    - Ensure all code is strongly typed.
    - Avoid `any` types wherever possible.
    - Use strict compiler options in `tsconfig.json`.
    - Order first public and private.
    - private start with underscore.
    - All public and class, interfaces get /\*\* \*/ documentation in english.

2. **Modern CLI Tooling:**
    - Use modern and reliable packages for the CLI interface (e.g., `commander`, `yargs`, or `cac`).
    - Provide a great user experience using loaders/spinners (e.g., `ora`), colorful output (e.g., `chalk` or `picocolors`), and progress bars if applicable.
    - Design clean and intuitive command-line arguments and flags.

3. **Web Scraping:**
    - Respect rate limits and avoid overwhelming the target server.
    - Use modern Web scraper tools for SPA applications.
    - Willhaben has bot protection, keep this in mind.

4. **Data Handling & CSV Export:**
    - Use `csv-writer` for safely handling CSV creation, ensuring proper escaping of commas and quotes in product titles and descriptions.

5. **Code Architecture:**
    - **Separation of Concerns:** Keep the CLI parsing layer, scraping logic, data transformation logic, and file writing/CSV export logic isolated from one another.
    - Implement thorough error handling and provide meaningful error messages to the user without exposing raw stack traces unless in a verbose/debug mode.

6. **Development Practices:**
    - Use ESLint and Prettier for code formatting and linting.
    - Write tests first for every feature/bugfix before implementation.
    - **Testing Rules:**
        - All tests must be placed in the `tests/` directory. Do not place test scripts in the root directory.
        - Test files must use the `.test.ts` extension (e.g. `tests/scraper.e2e.test.ts`).
        - Use the `vitest` framework for writing tests (e.g., `import { describe, it, expect } from "vitest"`).
    - **Verification:** After every feature, bugfix, or major code change, YOU MUST verify the codebase by running the following commands:
        1. `npm run lint` (Ensures there are no logic/formatting errors)
        2. `npm test` (Ensures all vitest unit tests pass)
        3. `npm start search -- -q "test" --limit 1` (Ensures the CLI builds and runs successfully end-to-end)
