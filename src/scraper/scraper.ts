/**
 * Web scraping module using Playwright and Stealth plugin.
 */
import { Browser } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { chunkArray } from "../utils/utils";
import { Area, areaIdMap, ViennaDistrict } from "./scraper.const";
import { ScrapeOptions, WillhabenItem } from "./scraper.interface";

// Register the stealth plugin
chromium.use(stealth());

/**
 * Class representing the Willhaben scraper.
 */
export class WillhabenScraper {
	/**
	 * Scrapes willhaben.at based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns An array of Willhaben items.
	 */
	public async scrape(options: ScrapeOptions): Promise<WillhabenItem[]> {
		// Launch browser in headless mode
		const browser = await chromium.launch({ headless: true });

		try {
			const baseUrl = this.buildUrl(options);

			// Scrape page 1
			const firstPageUrl = `${baseUrl}&page=1`;

			if (options.onProgress) {
				options.onProgress(`Scraping page 1...`);
			}

			const { items: firstPageItems, totalResultsText } = await this._scrapeSinglePage(
				browser,
				firstPageUrl,
			);
			let allItems = [...firstPageItems];

			// Determine total pages to fetch
			const totalResults = parseInt(totalResultsText, 10);
			if (isNaN(totalResults)) {
				throw new Error(
					"Could not determine total number of search results. Willhaben UI might have changed.",
				);
			}

			// Willhaben generally shows ~30 items per page
			const ITEMS_PER_PAGE = 30;
			const totalAvailablePages = Math.ceil(totalResults / ITEMS_PER_PAGE);

			let pagesToFetch = totalAvailablePages;
			if (options.limit !== undefined) {
				const maxPagesForLimit = Math.ceil(options.limit / ITEMS_PER_PAGE);
				pagesToFetch = Math.min(totalAvailablePages, maxPagesForLimit);
			} else {
				// No cap, fetch all available pages
				pagesToFetch = totalAvailablePages;
			}

			if (pagesToFetch > 1) {
				const remainingPages = [];
				for (let p = 2; p <= pagesToFetch; p++) {
					remainingPages.push(p);
				}

				// Chunk fetching to max 3 concurrent pages
				const CONCURRENCY_LIMIT = 3;
				const chunks = chunkArray(remainingPages, CONCURRENCY_LIMIT);

				for (const chunk of chunks) {
					if (options.onProgress) {
						options.onProgress(
							`Scraping pages ${chunk.join(", ")} of ${pagesToFetch}... (${allItems.length} items found so far)`,
						);
					}

					const promises = chunk.map((p) =>
						this._scrapeSinglePage(browser, `${baseUrl}&page=${p}`),
					);
					const results = await Promise.all(promises);

					for (const res of results) {
						allItems.push(...res.items);
					}

					// If we have hit or exceeded the limit, stop early
					if (options.limit !== undefined && allItems.length >= options.limit) {
						break;
					}

					// Short delay between chunks to be nice to the server
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			// Apply final limit if needed
			if (options.limit !== undefined && allItems.length > options.limit) {
				allItems = allItems.slice(0, options.limit);
			}

			return allItems;
		} finally {
			await browser.close();
		}
	}

	/**
	 * Builds the search URL for willhaben.at based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns The generated Willhaben search URL string.
	 */
	public buildUrl(options: ScrapeOptions): string {
		const params = new URLSearchParams();
		params.append("keyword", options.query);
		params.append("isNavigation", "true");

		if (options.priceMin !== undefined) {
			params.append("PRICE_FROM", options.priceMin.toString());
		}

		if (options.priceMax !== undefined) {
			params.append("PRICE_TO", options.priceMax.toString());
		}

		if (options.area && options.area.length > 0) {
			for (const a of options.area) {
				if (a === Area.WIEN && options.wienDistricts && options.wienDistricts.length > 0) {
					// Add specific district IDs instead of generic Wien ID
					for (const district of options.wienDistricts) {
						params.append("areaId", this._getWienDistrictId(district).toString());
					}
				} else {
					const id = areaIdMap[a];
					if (id !== undefined) {
						params.append("areaId", id.toString());
					}
				}
			}
		}

		return `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?${params.toString()}`;
	}

	/**
	 * Helper to scrape a single page.
	 *
	 * @param browser - The Playwright browser instance.
	 * @param url - The URL to scrape.
	 * @returns The scraped items and total results text.
	 */
	private async _scrapeSinglePage(
		browser: Browser,
		url: string,
	): Promise<{ items: WillhabenItem[]; totalResultsText: string }> {
		const page = await browser.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });

			// Try to accept didomi cookie notice to avoid overlay blocking
			try {
				await page.click('button[id="didomi-notice-agree-button"]', { timeout: 2000 });
			} catch {
				// ignore if not present
			}

			await page.waitForTimeout(200);

			// Smooth scroll down to force lazy load of all items
			// Faster scrolling: 8 iterations of 1000px with 200ms delay = 1.6s
			for (let i = 0; i < 8; i++) {
				await page.evaluate(() => window.scrollBy(0, 1000));
				await page.waitForTimeout(200);
			}

			// Look for total results text (only needed on first page, but we'll grab it anyway)
			const totalResultsText = await page.evaluate(() => {
				const titleEl = document.querySelector('h1[id="result-list-title"]');
				if (titleEl && titleEl.textContent) {
					const match = titleEl.textContent.match(/([\d.]+)/);
					if (match && match[1]) return match[1].replace(/\./g, "");
				}

				const match =
					document.body.innerText.match(/([\d.]+)\s*Anzeigen/i) ||
					document.body.innerText.match(/([\d.]+)\s*Angebote/i) ||
					document.body.innerText.match(/([\d.]+)\s*Treffer/i) ||
					document.body.innerText.match(/([\d.]+)\s*Ergebnisse/i);
				return match && match[1] ? match[1].replace(/\./g, "") : "";
			});

			// Extract items from DOM
			const items = await page.$$eval('a[id^="search-result-entry-header-"]', (elements) => {
				return elements.map((el) => {
					const idMatch = el.id.match(/search-result-entry-header-(\d+)/);
					const id = idMatch ? idMatch[1] : "";

					const url = el.getAttribute("href") || "";

					const h3 = el.querySelector("h3");
					let title = "";
					if (h3) {
						title = Array.from(h3.childNodes)
							.filter((node) => node.nodeType === 3)
							.map((node) => node.textContent?.trim())
							.join(" ")
							.trim();
						if (!title) {
							title = h3.innerText.replace(/\n/g, " ").trim();
						}
					}

					const priceEl = el.querySelector(`[data-testid^="search-result-entry-price-"]`);
					const price = priceEl ? (priceEl as HTMLElement).innerText.trim() : "";

					return {
						id,
						title,
						price,
						url: url ? `https://www.willhaben.at${url}` : "",
					};
				});
			});

			return {
				items: items.filter((item) => item.id && item.title) as WillhabenItem[],
				totalResultsText,
			};
		} finally {
			await page.close();
		}
	}

	/**
	 * Gets the ID for a given Vienna district.
	 *
	 * @param district - The Vienna district.
	 * @returns The district ID.
	 */
	private _getWienDistrictId(district: ViennaDistrict): number {
		const match = district.match(/^(\d+)\./);
		if (match && match[1]) {
			const num = parseInt(match[1], 10);
			// 1. Bezirk = 117223, 2. Bezirk = 117224, etc.
			return 117223 + num - 1;
		}
		return 900; // fallback to generic Wien
	}
}
