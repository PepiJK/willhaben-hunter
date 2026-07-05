# Willhaben Hunter

[![CI](https://github.com/PepiJK/willhaben-hunter/actions/workflows/ci.yml/badge.svg)](https://github.com/PepiJK/willhaben-hunter/actions/workflows/ci.yml)

A Node.js/TypeScript CLI scraper and library for [willhaben.at](https://willhaben.at) marketplace items.

- **As a CLI tool**, it outputs data as JSON (default) or CSV, with strict `stdout`/`stderr` separation for easy piping, LLM analysis, and automation.
- **As an NPM library**, you can import the core scraping API directly into your Node.js backend to fetch and parse items programmatically.

## Features

- **Interactive Mode** — Beautiful prompts (Inquirer) fill in any missing search parameters.
- **Non-Interactive Mode** — Supply all arguments up front and add `--non-interactive` for fully automated runs.
- **Stealth Scraping** — Uses `playwright-extra` with the `puppeteer-extra-plugin-stealth` plugin to bypass Willhaben's bot protection.
- **Pipeable Output** — Data goes to `stdout`; spinners, summaries, and errors go to `stderr`.
- **Flexible Export** — JSON or CSV, to console or directly to a file.
- **Detail Fetching** — Optionally visits each item's detail page to grab description and attributes.
- **Region Filtering** — Filter by Austrian Bundesland and even specific Vienna districts (1–23).

## Prerequisites

- Node.js (v22+ recommended)
- npm

## Installation

To use the CLI globally, install the package:

```bash
npm install -g willhaben-hunter
```

Install Playwright browsers (Chromium is required by the stealth scraper):

```bash
npx playwright install chromium
```

## Usage

```bash
# Interactive — prompts for any missing options
willhaben-hunter search

# Non-interactive — all arguments supplied, no prompts
willhaben-hunter search -q "macbook" --limit 10 --non-interactive
```

### `search` Command Options

| Option                       | Short | Description                                                                                                                                            |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--query <string>`           | `-q`  | Search query (e.g., `"iphone"`). **Required** in non-interactive mode.                                                                                 |
| `--price-min <number>`       |       | Minimum price filter.                                                                                                                                  |
| `--price-max <number>`       |       | Maximum price filter.                                                                                                                                  |
| `--area <areas...>`          | `-a`  | Bundesland to search in. Can be specified multiple times. See [valid areas](#valid-areas) below.                                                       |
| `--wien-districts <nums...>` |       | Vienna district numbers (1–23). Only effective when `wien` is selected as an area.                                                                     |
| `--limit <number>`           | `-l`  | Maximum number of items to return.                                                                                                                     |
| `--format <type>`            | `-f`  | Output format: `json` or `csv`. Default: `json`.                                                                                                       |
| `--output <path>`            | `-o`  | Write output to a file instead of `stdout`.                                                                                                            |
| `--sort <order>`             | `-s`  | WillhabenHunterSort order: `relevance`, `newest`, `price-asc`, `price-desc`. Omitting this uses willhaben's default sort.                              |
| `--skip-details`             |       | Skip fetching individual item detail pages (much faster, but `description` and `attributes` will be empty).                                            |
| `--quiet`                    |       | Suppress the summary block on `stderr`. Only the data payload is printed.                                                                              |
| `--fail-on-empty`            |       | Exit with code `1` when no results are found (useful for CI/monitoring scripts).                                                                       |
| `--non-interactive`          |       | Disable interactive prompts. The CLI will error instead of prompting for missing values. **Use this flag in scripts, pipelines, and agent workflows.** |

### Valid Areas

Pass these values (case-insensitive) to `--area`:

`wien`, `niederösterreich`, `oberösterreich`, `salzburg`, `tirol`, `vorarlberg`, `kärnten`, `steiermark`, `burgenland`

### Output Schema

Each scraped item is a JSON object with the following fields:

| Field         | Type      | Description                                                                              |
| ------------- | --------- | ---------------------------------------------------------------------------------------- |
| `id`          | `string`  | Willhaben internal ad ID.                                                                |
| `title`       | `string`  | The item listing title.                                                                  |
| `price`       | `string`  | Price as displayed (e.g., `"€ 250"`).                                                    |
| `url`         | `string`  | Direct link to the item on willhaben.at.                                                 |
| `description` | `string?` | Full description text (only populated when detail pages are fetched).                    |
| `attributes`  | `string?` | Pipe-separated attribute key-value pairs (only populated when detail pages are fetched). |

## Automation & LLM Integration

The CLI cleanly separates data (`stdout`) from UI (`stderr`). This makes it ideal for piping into tools like `jq`, feeding to LLMs, or integrating into automation scripts.

### Example: Pipe JSON to `jq`

```bash
willhaben-hunter search -q "sofa" --limit 5 --non-interactive | jq '.[].price'
```

### Example: Export CSV to a file (no UI clutter)

```bash
willhaben-hunter search -q "sofa" -f csv -o results.csv --quiet --non-interactive
```

### Example: Search in specific Vienna districts

```bash
willhaben-hunter search -q "fahrrad" -a wien --wien-districts 10 15 20 --non-interactive
```

### Non-TTY Summary Output

When the CLI is not running in a TTY (e.g., piped or inside a script), the summary on `stderr` switches from human-readable colored text to structured JSON:

```json
{ "query": "sofa", "resultCount": 5, "format": "json", "outputPath": null, "durationSeconds": 2.45 }
```

## AI Agent Skill

This project includes a skill definition for AI coding agents (e.g., Antigravity / Gemini agents) at [`.agents/skills/willhaben-hunter/SKILL.md`](.agents/skills/willhaben-hunter/SKILL.md).

The skill teaches agents how to correctly invoke the CLI as a background task. Key rules for agents:

1. **Always use `--non-interactive`** — Without it, the CLI will hang waiting for user input in non-TTY environments.
2. **Avoid npm start** — Run the built CLI (`willhaben-hunter search`) or use `npx ts-node src/cli.ts search` if working within the local source code repository. Using `npm start` injects banners that corrupt JSON stdout.
3. **Use `-o <path>` for large results** — Write output to a file and read it via file tools, instead of flooding the conversation context with large `stdout` payloads.

## Programmatic Usage (Core API)

You can also install this package and use the core scraping logic directly in your Node.js application, without the CLI overhead:

```typescript
import { WillhabenHunterScraper } from "willhaben-hunter";

const scraper = new WillhabenHunterScraper();
const results = await scraper.scrape({ query: "Toaster", limit: 5 });
console.log(results);
```

## Development

The project uses TypeScript, ESLint, Prettier, and Vitest.

```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## Disclaimer

**This tool is for educational and private research purposes only.** It is not affiliated with, authorized, maintained, or endorsed by Willhaben in any way.

Web scraping may violate Willhaben's Terms of Service (AGB). Using this tool for automated access is at your own risk. The author is not responsible for any consequences resulting from the use of this software, including but not limited to IP bans, account suspension, or legal actions taken by the platform. Always respect `robots.txt` and rate limits.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
