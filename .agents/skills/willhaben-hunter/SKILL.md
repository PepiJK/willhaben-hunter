---
name: willhaben-hunter
description: Instructions for executing and interacting with the Willhaben Hunter Node.js/TypeScript CLI scraper.
---

# Willhaben Hunter CLI Skill

This skill provides instructions for utilizing the `willhaben-hunter` CLI scraper efficiently inside agent workflows.

## Critical Guidelines for Agents

### 1. Always Use `--non-interactive` in Background Tasks

When executing the CLI as a background task (e.g., via `run_command`), **you must supply the `--non-interactive` flag** if any search parameters (like query) are missing or if the program runs in a non-TTY environment. Without it, the CLI will prompt for missing values (like `priceMin` or `limit`) via `@inquirer/prompts` and hang indefinitely waiting for input.

### 2. Use `npm start -s --`

Do not run the tool using just `npm start` because `npm` injects its own startup banner into `stdout`, which breaks JSON output and `jq` parsers. Always append `-s --` to silence npm and pass arguments.

- **If developing locally:** `npm start -s -- marketplace ...` / `npm start -s -- immo ...`
- **If globally installed:** `willhaben-hunter marketplace ...` / `willhaben-hunter immo ...`

### 3. Save Output to Files for Large Results

If the query is expected to return more than a few results, use the `-o <path>` option to output the payload directly to a temporary JSON or CSV file (e.g., `-o output_temp.json`). Reading the file with a file-viewer tool avoids filling the conversation context with large stdout text.

---

## Command Reference

### Base Command

```bash
npm start -s -- <command> [options]
```

---

### `marketplace` Command — Kaufen & Verkaufen listings

```bash
npm start -s -- marketplace [options]
```

#### Key Options

- **`-q, --query <string>`**: Search keyword (e.g., `-q "laufband"`). **Required** in non-interactive mode.
- **`-a, --area <areas...>`**: Specify the Bundesland (e.g., `wien`, `niederösterreich`). Can be specified multiple times.
- **`--wien-districts <districts...>`**: List of Vienna district numbers (1-23).
- **`--price-max <number>`** / **`--price-min <number>`**: Price boundaries.
- **`-l, --limit <number>`**: Max items to fetch.
- **`-s, --sort <order>`**: Sort order (`relevance`, `newest`, `price-asc`, `price-desc`).
- **`-f, --format <json|csv>`**: Output format (default is `json`).
- **`-o, --output <path>`**: File path to write the output to.
- **`--skip-details`**: Skip fetching item detail pages (faster, no description/attributes).
- **`--non-interactive`**: Prevents terminal prompting and fails if required parameters are missing.
- **`--quiet`**: Suppresses summary statistics (only data payload is printed to stdout).
- **`--fail-on-empty`**: Exit with code 1 when no results are found.

---

### `immo` Command — Immobilien (real-estate) listings

```bash
npm start -s -- immo [options]
```

#### Key Options

- **`--type <type>`**: Property listing type. **Required** in non-interactive mode. Valid values:
    - `wohnung-mieten` — Mietwohnungen
    - `wohnung-kaufen` — Eigentumswohnungen
    - `haus-mieten` — Häuser mieten
    - `haus-kaufen` — Häuser kaufen
    - `grundstueck-kaufen` — Grundstücke kaufen
- **`-q, --query <string>`**: Optional keyword to search within listings.
- **`--price-min <number>`** / **`--price-max <number>`**: Price boundaries.
- **`--rooms <number>`**: Minimum number of rooms (e.g. `3` means 3+ rooms).
- **`--size-min <number>`** / **`--size-max <number>`**: Living area range in m².
- **`-a, --area <areas...>`**: Bundesland filter.
- **`--wien-districts <districts...>`**: Vienna district numbers (1-23).
- **`-l, --limit <number>`**: Max listings to fetch.
- **`-f, --format <json|csv>`**: Output format (default is `json`). CSV includes extra columns: ROOMS, LIVING_AREA, PROPERTY_TYPE.
- **`-o, --output <path>`**: File path to write the output to.
- **`--skip-details`**: Skip fetching listing detail pages (faster, no Objektinformationen).
- **`--non-interactive`**: Prevents terminal prompting; requires `--type`.
- **`--quiet`**: Suppresses summary statistics.
- **`--fail-on-empty`**: Exit with code 1 when no results are found.

---

## Example Usage

### Marketplace: Scrape and Export to CSV

```bash
npm start -s -- marketplace -q "laufband" -a wien --price-max 250 -f csv -o output/laufband.csv --non-interactive
```

### Marketplace: Pipe JSON directly to `jq`

```bash
npm start -s -- marketplace -q "sofa" -l 5 --non-interactive | jq '.[].title'
```

### Immo: Search for Mietwohnungen in Wien

```bash
npm start -s -- immo --type wohnung-mieten -a wien --price-max 1200 --rooms 2 --non-interactive
```

### Immo: Export Kaufwohnungen to CSV with all details

```bash
npm start -s -- immo --type wohnung-kaufen -q "altbau" --rooms 3 --size-min 60 -f csv -o output/wohnungen.csv --non-interactive
```
