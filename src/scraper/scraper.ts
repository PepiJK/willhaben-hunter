import { Browser, Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { chunkArray } from "../utils/utils";
import { CONCURRENCY_LIMIT, DETAIL_CONCURRENCY, ITEMS_PER_PAGE } from "../app.const";
import { Area, areaIdMap, sortParamMap, ViennaDistrict } from "./scraper.const";
import { ScrapeOptions, WillhabenItem } from "./scraper.interface";

// Register the stealth plugin
chromium.use(stealth());

/**
 * Class representing the Willhaben scraper.
 */
export class WillhabenHunterScraper {
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

			if (totalResults > 0 && firstPageItems.length === 0) {
				throw new Error(
					"No items extracted from the DOM despite search results being present. The Willhaben DOM structure might have changed.",
				);
			}

			// Willhaben generally shows ~30 items per page
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

				// Chunk fetching to max concurrent pages
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

			// Filter items by query (case insensitive)
			const queryLower = options.query.toLowerCase();
			allItems = allItems.filter((item) => item.title.toLowerCase().includes(queryLower));

			// Apply final limit if needed
			if (options.limit !== undefined && allItems.length > options.limit) {
				allItems = allItems.slice(0, options.limit);
			}

			// Fetch detail pages in parallel chunks
			if (!options.skipDetails && allItems.length > 0) {
				if (options.onProgress) {
					options.onProgress(`Fetching details for ${allItems.length} items...`);
				}

				const detailChunks = chunkArray(allItems, DETAIL_CONCURRENCY);

				let processedCount = 0;
				for (const chunk of detailChunks) {
					const promises = chunk.map(async (item) => {
						if (!item.url) return;
						const details = await this._scrapeItemDetails(browser, item.url);
						item.description = details.description;
						item.attributes = details.attributes;
					});
					await Promise.all(promises);
					processedCount += chunk.length;

					if (options.onProgress) {
						options.onProgress(
							`Fetching details... (${processedCount}/${allItems.length})`,
						);
					}

					// Small delay to be polite
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
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

		if (options.sort) {
			const sortValue = sortParamMap[options.sort];
			if (sortValue) {
				params.append("sort", sortValue);
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
			await this._acceptCookiesIfPresent(page);
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

	/**
	 * Scrapes the detail page of a single item.
	 *
	 * @param browser - The Playwright browser instance.
	 * @param url - The URL of the item.
	 * @returns An object containing the description and attributes.
	 */
	private async _scrapeItemDetails(
		browser: Browser,
		url: string,
	): Promise<{ description: string; attributes: string }> {
		const page = await browser.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });
			await this._acceptCookiesIfPresent(page);

			const details = await page.evaluate(() => {
				let description = "";
				let attributes = "";

				// Attempt to find standard description block
				const descEl = document.querySelector('[data-testid^="ad-description-"]');
				if (descEl) {
					description = (descEl as HTMLElement).innerText.trim();
				} else {
					// Fallback for description: try finding content by class or main content
					const possibleDesc = document.querySelector(
						'div[class*="description"], p[class*="description"]',
					);
					if (possibleDesc) {
						description = (possibleDesc as HTMLElement).innerText.trim();
					}
				}

				// Attempt to find standard attributes block
				const attrEls = document.querySelectorAll('[data-testid="attribute-item"]');
				if (attrEls.length > 0) {
					const attrTexts = Array.from(attrEls)
						.map((el) => {
							const titleEl = el.querySelector('[data-testid="attribute-title"]');
							const valEl = el.querySelector('[data-testid="attribute-value"]');
							if (titleEl && valEl) {
								return `${(titleEl as HTMLElement).innerText.trim()}: ${(valEl as HTMLElement).innerText.trim()}`;
							}
							return (el as HTMLElement).innerText.trim().replace(/\n/g, ": ");
						})
						.filter((t) => t.length > 0);
					attributes = attrTexts.join(" | ");
				} else {
					// Fallback
					const attrBlock = document.querySelector('[data-testid="ad-attributes"]');
					if (attrBlock) {
						attributes = (attrBlock as HTMLElement).innerText
							.replace(/\n/g, " | ")
							.trim();
					}
				}

				return { description, attributes };
			});

			return details;
		} catch (error) {
			throw new Error(
				`Failed to scrape item details for ${url}: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error },
			);
		} finally {
			await page.close();
		}
	}

	/**
	 * Helper to accept cookies if the notice overlay is present.
	 *
	 * @param page - The Playwright page instance.
	 */
	private async _acceptCookiesIfPresent(page: Page): Promise<void> {
		try {
			await page.click('button[id="didomi-notice-agree-button"]', { timeout: 2000 });
		} catch {
			// ignore if not present
		}
	}
}
