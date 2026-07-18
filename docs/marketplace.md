# Willhaben Marktplatz (Marketplace) Scraper

The `marketplace` command and `WillhabenHunterMarketplaceScraper` class allow you to scrape items from the general [willhaben Marktplatz](https://www.willhaben.at/iad/kaufen-und-verkaufen/).

## CLI Usage

Use the `marketplace` command to search for items.

```bash
npm start -- marketplace -q "iphone" --price-max 500 -a wien --limit 50 --format json
```

### Available Options

- `-q, --query <string>`: Search query (e.g., "iphone").
- `--price-min <number>`: Minimum price.
- `--price-max <number>`: Maximum price.
- `-a, --area <areas...>`: Filter by Bundesland (e.g., `wien`).
- `--wien-districts <districts...>`: Vienna district numbers (1-23).
- `-l, --limit <number>`: Maximum number of items to scrape.
- `-f, --format <type>`: Output format (`json` or `csv`).
- `-o, --output <path>`: Output file path (omit to print to console).
- `-s, --sort <order>`: Sort order for results (`relevanz`, `neueste`, `preis-aufsteigend`, `preis-absteigend`).
- `--skip-details`: Skip fetching item detail pages (faster).
- `--quiet`: Suppress summary output.
- `--fail-on-empty`: Exit with code 1 if no results are found.
- `--non-interactive`: Force non-interactive mode.

## Library Usage

You can use the scraper programmatically:

```typescript
import { WillhabenHunterMarketplaceScraper, WillhabenHunterArea } from "willhaben-hunter";

async function main() {
	const scraper = new WillhabenHunterMarketplaceScraper();

	const items = await scraper.scrape({
		query: "iphone",
		limit: 10,
		area: [WillhabenHunterArea.WIEN],
		priceMax: 500,
	});

	console.log(items);
}

main();
```

## Architecture Notes

- **Stealth is Mandatory**: Playwright with `puppeteer-extra-plugin-stealth` is strictly required to avoid headless detection.
- **Data Extraction**: Extracts title, price, location, and listing ID primarily from Willhaben's Next.js state (`__NEXT_DATA__`) for reliability, with DOM selector fallbacks if necessary.
- **Detail Pages (`--skip-details`)**: By default, search results might just be the summary. Fetching detail pages adds additional network requests. Use `--skip-details` to omit visiting each individual listing's page, which speeds up the process significantly.
