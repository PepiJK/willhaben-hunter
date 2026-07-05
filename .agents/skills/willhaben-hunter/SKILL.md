---
name: willhaben-hunter
description: Instructions for executing and interacting with the Willhaben Hunter Node.js/TypeScript CLI scraper.
---

# Willhaben Hunter CLI Skill

This skill provides instructions for utilizing the `willhaben-hunter` CLI scraper efficiently inside agent workflows.

## Critical Guidelines for Agents

### 1. Always Use `--non-interactive` in Background Tasks

When executing the CLI as a background task (e.g., via `run_command`), **you must supply the `--non-interactive` flag** if any search parameters (like query) are missing or if the program runs in a non-TTY environment. Without it, the CLI will prompt for missing values (like `priceMin` or `limit`) via `@inquirer/prompts` and hang indefinitely waiting for input.

### 2. Avoid `npm start`

Do not run the tool using `npm start` because `npm` injects its own startup banner into `stdout`, which breaks JSON output and `jq` parsers.

- **If developing locally:** `npx ts-node src/cli.ts search ...`
- **If globally installed:** `willhaben-hunter search ...`

### 3. Save Output to Files for Large Results

If the query is expected to return more than a few results, use the `-o <path>` option to output the payload directly to a temporary JSON or CSV file (e.g., `-o output_temp.json`). Reading the file with a file-viewer tool avoids filling the conversation context with large stdout text.

---

## Command Reference

### Base Command

```bash
npx ts-node src/cli.ts search [options]
```

### Key Options

- **`-q, --query <string>`**: Search keyword (e.g., `-q "laufband"`). **Required** in non-interactive mode.
- **`-a, --area <areas...>`**: Specify the Bundesland (e.g., `wien`, `niederösterreich`). Can be specified multiple times.
- **`--wien-districts <districts...>`**: List of Vienna district numbers (1-23).
- **`--price-max <number>`** / **`--price-min <number>`**: Price boundaries.
- **`-l, --limit <number>`**: Max items to fetch.
- **`-f, --format <json|csv>`**: Output format (default is `json`).
- **`-o, --output <path>`**: File path to write the output to.
- **`--non-interactive`**: Prevents terminal prompting and fails if required parameters are missing.
- **`--quiet`**: Suppresses summary statistics (only data payload is printed to stdout).

---

## Example Usage

### Scrape and Export to CSV:

```bash
npx ts-node src/cli.ts search -q "laufband" -a wien --price-max 250 -f csv -o output/laufband.csv --non-interactive
```

### Pipe JSON directly to `jq`:

```bash
npx ts-node src/cli.ts search -q "sofa" -l 5 --non-interactive | jq '.[].title'
```
