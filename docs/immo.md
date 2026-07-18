# Willhaben Immobilien (Immo) Scraper

The `immo` command and `WillhabenHunterImmoScraper` class allow you to scrape real estate listings from [willhaben Immobilien](https://www.willhaben.at/iad/immobilien/).

## CLI Usage

Use the `immo` command to search for real estate listings.

```bash
npm start -- immo --type wohnung-mieten -a wien --wien-districts 1 2 3 --price-max 1200 --rooms 3 --limit 50 --format json
```

### Available Options

- `--type <type>`: Property listing type (`wohnung-mieten`, `wohnung-kaufen`, `haus-mieten`, `haus-kaufen`, `grundstueck-kaufen`).
- `-q, --query <string>`: Optional keyword to search within listings.
- `--price-min <number>`: Minimum price.
- `--price-max <number>`: Maximum price.
- `--rooms <number>`: Minimum number of rooms (e.g., 3 means 3+ rooms).
- `--size-min <number>`: Minimum living area in m².
- `--size-max <number>`: Maximum living area in m².
- `-a, --area <areas...>`: Filter by Bundesland (e.g., `wien`).
- `--wien-districts <districts...>`: Vienna district numbers (1-23).
- `-l, --limit <number>`: Maximum number of listings to scrape.
- `-f, --format <type>`: Output format (`json` or `csv`).
- `-o, --output <path>`: Output file path (omit to print to console).
- `--skip-details`: Skip fetching listing detail pages (faster).
- `--quiet`: Suppress summary output.
- `--fail-on-empty`: Exit with code 1 if no results are found.
- `--non-interactive`: Force non-interactive mode.

## Library Usage

You can use the scraper programmatically:

```typescript
import {
	WillhabenHunterImmoScraper,
	WillhabenHunterImmoType,
	WillhabenHunterArea,
} from "willhaben-hunter";

async function main() {
	const scraper = new WillhabenHunterImmoScraper();

	const listings = await scraper.scrape({
		type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
		limit: 10,
		area: [WillhabenHunterArea.WIEN],
		priceMax: 1200,
		rooms: 2,
	});

	console.log(listings);
}

main();
```

## Architecture Notes

- **Stealth is Mandatory**: Willhaben uses aggressive bot protection. Always load Playwright with `puppeteer-extra-plugin-stealth`.
- **Data Extraction**: Look for the `<script id="__NEXT_DATA__" type="application/json">` tag in the DOM. It contains the fully hydrated JSON state of the search results. This is significantly more robust than parsing HTML elements. Fallback is to parse `.Box-sc-...` or `[data-testid="search-result-entry"]` elements via Playwright selectors.
- **Detail Extraction**: When not using `--skip-details`, the scraper navigates to detail pages to extract extended information like `description`, `attributes` (Eckdaten), `Objektinformationen` (rooms, livingArea, propertyType), `location`, `priceInformation`, `areaDescription` (Lage), `additionalInformation` (Zusatzinformationen), and `priceAndDetailInformation`.
