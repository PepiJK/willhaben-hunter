# Willhaben Jobs Scraper

The `jobs` command and `WillhabenHunterJobsScraper` class allow you to scrape job listings from [willhaben Jobs](https://www.willhaben.at/jobs/).

## CLI Usage

Use the `jobs` command to search for jobs.

```bash
npm start -- jobs -q "software developer" --employment-type vollzeit -a wien --limit 50 --format json
```

### Available Options

- `-q, --query <string>`: Search query (e.g., "software developer").
- `--employment-type <types...>`: Employment type (e.g., `vollzeit`, `teilzeit`).
- `--position <positions...>`: Position (e.g., `mitarbeiter:in`, `leitung/management`).
- `-a, --area <areas...>`: Filter by area/state (e.g., `wien`).
- `--wien-districts <nums...>`: Vienna district numbers (1–23).
- `--company-type <types...>`: Company type (e.g., 'personalberatung', 'direkter_arbeitgeber').
- `--time-limit <limit>`: Time limit (e.g., 'alle', 'letzte_24_stunden', 'letzte_72_stunden', 'letzte_woche').
- `-l, --limit <number>`: Maximum number of items to scrape.
- `-f, --format <type>`: Output format (`json` or `csv`).
- `-o, --output <path>`: Output file path (omit to print to console).
- `--skip-details`: Skip fetching individual item detail pages (much faster).
- `--quiet`: Suppress summary output.
- `--fail-on-empty`: Exit with code 1 if no results are found.
- `--non-interactive`: Force non-interactive mode.

## Library Usage

You can use the scraper programmatically:

```typescript
import { WillhabenHunterJobsScraper, WillhabenHunterArea } from "willhaben-hunter";

async function main() {
	const scraper = new WillhabenHunterJobsScraper();

	const jobs = await scraper.scrape({
		query: "software developer",
		limit: 10,
		area: [WillhabenHunterArea.WIEN],
	});

	console.log(jobs);
}

main();
```

## Architecture Notes

Unlike the marketplace, the Jobs scraper extracts data from the `__NEXT_DATA__` JSON object embedded within the Next.js page structure, providing richer and more reliable structured data than DOM extraction. Pagination is handled internally via looping pages while extracting Next.js data until the limit is reached.

When not using `--skip-details`, the scraper navigates to individual job detail pages to extract additional information like `description`, `company`, and `payment` from the detail page's `__NEXT_DATA__` object.
