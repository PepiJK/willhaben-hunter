import { Browser, Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import {
	WILLHABEN_HUNTER_CONCURRENCY_LIMIT,
	WILLHABEN_HUNTER_DETAIL_CONCURRENCY,
} from "../app.const";
import { WillhabenHunterChunkArray } from "../utils/utils";
import {
	WILLHABEN_HUNTER_AREA_ID_MAP,
	WILLHABEN_HUNTER_SORT_PARAM_MAP,
	WillhabenHunterArea,
	WillhabenHunterViennaDistrict,
} from "./scraper.const";
import { WillhabenHunterItem, WillhabenHunterMarketplaceScrapeOptions } from "./scraper.interface";

// Register the stealth plugin
chromium.use(stealth());

/**
 * Scraper for willhaben.at marketplace listings (Kaufen & Verkaufen).
 */
export class WillhabenHunterMarketplaceScraper {
	/**
	 * Scrapes willhaben.at marketplace based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns An array of Willhaben marketplace items.
	 */
	public async scrape(
		options: WillhabenHunterMarketplaceScrapeOptions,
	): Promise<WillhabenHunterItem[]> {
		const browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		try {
			const baseUrl = this.buildUrl(options);
			let allItems = await this._fetchPaginatedItems(browser, baseUrl, options);

			if (!options.skipDetails && allItems.length > 0) {
				allItems = await this._fetchAllItemDetails(browser, allItems, options);
			}

			return allItems;
		} finally {
			await browser.close();
		}
	}

	/**
	 * Builds the search URL for willhaben.at marketplace based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns The generated Willhaben marketplace search URL string.
	 */
	public buildUrl(options: WillhabenHunterMarketplaceScrapeOptions): string {
		const params = new URLSearchParams();
		params.append("keyword", options.query);
		params.append("isNavigation", "true");

		if (options.priceMin !== undefined) {
			params.append("PRICE_FROM", options.priceMin.toString());
		}

		if (options.priceMax !== undefined) {
			params.append("PRICE_TO", options.priceMax.toString());
		}

		this._appendAreaParams(params, options.area, options.wienDistricts);

		if (options.sort) {
			const sortValue = WILLHABEN_HUNTER_SORT_PARAM_MAP[options.sort];
			if (sortValue) {
				params.append("sort", sortValue);
			}
		}

		return `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?${params.toString()}`;
	}

	/**
	 * Fetches all paginated list pages and returns the collected items, respecting the limit.
	 */
	private async _fetchPaginatedItems(
		browser: Browser,
		baseUrl: string,
		options: WillhabenHunterMarketplaceScrapeOptions,
	): Promise<WillhabenHunterItem[]> {
		if (options.onProgress) {
			options.onProgress(`Scraping page 1...`);
		}

		const { items: firstPageItems, totalResultsText } = await this._scrapeSinglePage(
			browser,
			`${baseUrl}&page=1`,
		);

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

		const itemsPerPage = firstPageItems.length > 0 ? firstPageItems.length : 30;
		const totalAvailablePages = Math.ceil(totalResults / itemsPerPage);
		const pagesToFetch =
			options.limit !== undefined
				? Math.min(totalAvailablePages, Math.ceil(options.limit / itemsPerPage))
				: totalAvailablePages;

		let allItems = [...firstPageItems];
		allItems = await this._fetchRemainingPages(
			browser,
			baseUrl,
			pagesToFetch,
			allItems,
			options,
		);

		if (options.limit !== undefined && allItems.length > options.limit) {
			allItems = allItems.slice(0, options.limit);
		}

		return allItems;
	}

	/**
	 * Fetches pages 2..N in concurrent chunks and appends them to the existing items array.
	 */
	private async _fetchRemainingPages(
		browser: Browser,
		baseUrl: string,
		pagesToFetch: number,
		initialItems: WillhabenHunterItem[],
		options: WillhabenHunterMarketplaceScrapeOptions,
	): Promise<WillhabenHunterItem[]> {
		if (pagesToFetch <= 1) return initialItems;

		const remainingPages: number[] = [];
		for (let p = 2; p <= pagesToFetch; p++) {
			remainingPages.push(p);
		}

		const chunks = WillhabenHunterChunkArray(
			remainingPages,
			WILLHABEN_HUNTER_CONCURRENCY_LIMIT,
		);
		const allItems = [...initialItems];

		for (const chunk of chunks) {
			if (options.onProgress) {
				options.onProgress(
					`Scraping pages ${chunk.join(", ")} of ${pagesToFetch}... (${allItems.length} items found so far)`,
				);
			}

			const results = await Promise.all(
				chunk.map((p) => this._scrapeSinglePage(browser, `${baseUrl}&page=${p}`)),
			);

			for (const res of results) {
				allItems.push(...res.items);
			}

			if (options.limit !== undefined && allItems.length >= options.limit) {
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return allItems;
	}

	/**
	 * Fetches detail pages for all items in parallel chunks and enriches them.
	 */
	private async _fetchAllItemDetails(
		browser: Browser,
		items: WillhabenHunterItem[],
		options: WillhabenHunterMarketplaceScrapeOptions,
	): Promise<WillhabenHunterItem[]> {
		if (options.onProgress) {
			options.onProgress(`Fetching details for ${items.length} items...`);
		}

		const detailChunks = WillhabenHunterChunkArray(items, WILLHABEN_HUNTER_DETAIL_CONCURRENCY);
		let processedCount = 0;

		for (const chunk of detailChunks) {
			await Promise.all(
				chunk.map(async (item) => {
					if (!item.url) return;
					try {
						const details = await this._scrapeItemDetails(browser, item.url);
						item.description = details.description;
						item.attributes = details.attributes;
					} catch (error) {
						const msg = error instanceof Error ? error.message : String(error);
						console.warn(`\n⚠️ Warning: ${msg}`);
					}
				}),
			);

			processedCount += chunk.length;

			if (options.onProgress) {
				options.onProgress(`Fetching details... (${processedCount}/${items.length})`);
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		return items;
	}

	/**
	 * Helper to scrape a single marketplace listing page.
	 *
	 * @param browser - The Playwright browser instance.
	 * @param url - The URL to scrape.
	 * @returns The scraped items and total results text.
	 */
	private async _scrapeSinglePage(
		browser: Browser,
		url: string,
	): Promise<{ items: WillhabenHunterItem[]; totalResultsText: string }> {
		const page = await browser.newPage();

		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });
			await this._acceptCookiesIfPresent(page);

			// Wait for the result list title to appear before scraping
			await page.waitForSelector('[data-testid="result-list-title"]', { timeout: 15000 });

			// Smooth scroll down to force lazy load of all items
			for (let i = 0; i < 8; i++) {
				await page.evaluate(() => window.scrollBy(0, 1000));
				await page.waitForTimeout(200);
			}

			const totalResultsText = await page.evaluate(() => {
				const titleEl = document.querySelector('h1[id="result-list-title"]');
				if (titleEl && titleEl.textContent) {
					// Use anchored digit pattern to avoid catastrophic backtracking
					const match = titleEl.textContent.match(/(\d[\d.]*)/);
					if (match && match[1]) return match[1].replace(/\./g, "");
				}

				const bodyText = document.body?.innerText ?? "";
				const match =
					// eslint-disable-next-line sonarjs/super-linear-regex
					bodyText.match(/(\d[\d.]*)\s*Anzeigen/i) ||
					// eslint-disable-next-line sonarjs/super-linear-regex
					bodyText.match(/(\d[\d.]*)\s*Angebote/i) ||
					// eslint-disable-next-line sonarjs/super-linear-regex
					bodyText.match(/(\d[\d.]*)\s*Treffer/i) ||
					// eslint-disable-next-line sonarjs/super-linear-regex
					bodyText.match(/(\d[\d.]*)\s*Ergebnisse/i);
				return match && match[1] ? match[1].replace(/\./g, "") : "";
			});

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
				items: items.filter((item) => item.id && item.title) as WillhabenHunterItem[],
				totalResultsText,
			};
		} finally {
			await page.close();
		}
	}

	/**
	 * Appends area/district query parameters to a URLSearchParams instance.
	 *
	 * @param params - The URLSearchParams to append to.
	 * @param area - Optional list of Bundesland areas.
	 * @param wienDistricts - Optional list of Vienna districts.
	 */
	private _appendAreaParams(
		params: URLSearchParams,
		area: WillhabenHunterArea[] | undefined,
		wienDistricts: WillhabenHunterViennaDistrict[] | undefined,
	): void {
		if (!area || area.length === 0) return;

		for (const a of area) {
			if (a === WillhabenHunterArea.WIEN && wienDistricts && wienDistricts.length > 0) {
				for (const district of wienDistricts) {
					params.append("areaId", this._getWienDistrictId(district).toString());
				}
			} else {
				const id = WILLHABEN_HUNTER_AREA_ID_MAP[a];
				if (id !== undefined) {
					params.append("areaId", id.toString());
				}
			}
		}
	}

	/**
	 * Gets the ID for a given Vienna district.
	 *
	 * @param district - The Vienna district.
	 * @returns The district ID.
	 */
	private _getWienDistrictId(district: WillhabenHunterViennaDistrict): number {
		const match = district.match(/^(\d+)/);
		if (match && match[1]) {
			const num = parseInt(match[1], 10);
			// 1. Bezirk = 117223, 2. Bezirk = 117224, etc.
			return 117223 + num - 1;
		}
		return 900; // fallback to generic Wien
	}

	/**
	 * Scrapes the detail page of a single marketplace item.
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
			await page.goto(url, { waitUntil: "commit", timeout: 60000 });
			await this._acceptCookiesIfPresent(page);

			return await page.evaluate(() => {
				let description = "";
				let attributes = "";

				const descEl = document.querySelector('[data-testid^="ad-description-"]');
				if (descEl) {
					description = (descEl as HTMLElement).innerText.trim();
				} else {
					const possibleDesc = document.querySelector(
						'div[class*="description"], p[class*="description"]',
					);
					if (possibleDesc) {
						description = (possibleDesc as HTMLElement).innerText.trim();
					}
				}

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
					const attrBlock = document.querySelector('[data-testid="ad-attributes"]');
					if (attrBlock) {
						attributes = (attrBlock as HTMLElement).innerText
							.replace(/\n/g, " | ")
							.trim();
					}
				}

				return { description, attributes };
			});
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
