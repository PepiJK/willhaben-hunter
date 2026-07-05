# Willhaben Hunter

A Node.js/TypeScript Command Line Interface (CLI) application to scrape items from [willhaben.at](https://willhaben.at).

Willhaben Hunter is designed to be highly interactive for human users while maintaining strict `stdout`/`stderr` separation to ensure it is completely pipeable and friendly for LLMs and automation scripts.

## Features

- **Interactive Mode**: Beautiful, interactive prompts (using Inquirer) to build your search if arguments are missing.
- **Stealth Scraping**: Uses Playwright and `puppeteer-extra-plugin-stealth` to bypass basic bot protections.
- **Pipeable Output**: Data goes to `stdout` (JSON by default) while UI elements like spinners and summaries go to `stderr`.
- **Configurable Formats**: Export data as JSON or CSV.
- **Flexible Destinations**: Output to the console or write directly to a file.

## Prerequisites

- Node.js (v18+ recommended)
- npm

## Installation

1. Clone the repository and install dependencies:

    ```bash
    npm install
    ```

2. Install Playwright browsers (if not already installed):
    ```bash
    npx playwright install chromium
    ```

## Usage

You can run the scraper interactively, or supply all arguments up front for automation.

```bash
# Interactive mode (prompts for missing options)
npm start search

# Non-interactive / Automation mode
npm start search -- -q "macbook" --limit 10
```

### Options

| Option                       | Short | Description                                                                              |
| ---------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `--query <string>`           | `-q`  | Search query (e.g., "iphone")                                                            |
| `--price-min <num>`          |       | Minimum price                                                                            |
| `--price-max <num>`          |       | Maximum price                                                                            |
| `--area <areas...>`          | `-a`  | Area (Bundesland) to search in (e.g., `wien`, `tirol`). Can be specified multiple times. |
| `--wien-districts <nums...>` |       | Vienna district numbers (1-23) to search in if Wien is selected.                         |
| `--limit <num>`              | `-l`  | Maximum number of items to scrape                                                        |
| `--format <type>`            | `-f`  | Output format: `json` or `csv`. Default: `json`                                          |
| `--output <path>`            | `-o`  | Output file path. If omitted, prints to console (`stdout`).                              |
| `--sort <order>`             | `-s`  | Sort order: `relevance`, `newest`, `price-asc`, `price-desc`. Default: `relevance`.      |
| `--skip-details`             |       | Skip fetching item detail pages (much faster, but omits description and attributes).     |
| `--quiet`                    |       | Suppress summary and spinner output. Only data is printed to `stdout`.                   |
| `--fail-on-empty`            |       | Exit with code `1` when no results are found.                                            |

## Automation & LLM Integration

The CLI is built with automation in mind. When piping the output, `stdout` is strictly reserved for the data payload, while `stderr` handles progress spinners and metadata.

> **💡 TIP:** When piping output to other commands (like `jq`), we highly recommend running the script natively via `npx ts-node src/index.ts` instead of `npm start`. The `npm` package manager natively injects its own startup banner into `stdout` which will break JSON parsers. If you must use `npm start` in a pipeline, you must add the `--silent` flag (`npm start --silent search -- ...`).

**Example: Piping JSON to `jq` directly**

```bash
npx ts-node src/index.ts search -q "sofa" --limit 5 | jq '.[].price'
```

**Example: Outputting CSV to a file without UI clutter**

```bash
npx ts-node src/index.ts search -q "sofa" -f csv -o results.csv --quiet
```

When not running in a TTY (e.g., inside a script or piped), the summary output on `stderr` switches from human-readable text to a structured JSON metadata object:

```json
{ "query": "sofa", "resultCount": 5, "format": "json", "outputPath": null, "durationSeconds": 2.45 }
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

**Please note:** This tool is for educational and private research purposes only. It is not affiliated with, authorized, maintained, or endorsed by Willhaben in any way.

Web scraping may violate Willhaben's Terms of Service (AGB). Using this tool to access their platform automated is at your own risk. The author is not responsible for any consequences resulting from the use of this software, including but not limited to IP bans, account suspension, or legal actions taken by the platform. Always respect `robots.txt` and rate limits to avoid causing service disruptions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
