/**
 * Web scraping module using Playwright and Stealth plugin.
 */
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

// Register the stealth plugin
chromium.use(stealth());

/**
 * Interface representing a scraped item from willhaben.
 */
export interface WillhabenItem {
	id: string;
	title: string;
	price: string;
	url: string;
}

/**
 * Enum representing all Austrian areas (Bundesländer).
 */
export enum Area {
	WIEN = "wien",
	NIEDEROESTERREICH = "niederösterreich",
	OBEROESTERREICH = "oberösterreich",
	SALZBURG = "salzburg",
	TIROL = "tirol",
	VORARLBERG = "vorarlberg",
	KAERNTEN = "kärnten",
	STEIERMARK = "steiermark",
	BURGENLAND = "burgenland",
}

/**
 * Enum representing Vienna districts.
 */
export enum ViennaDistrict {
	INNERE_STADT = "1. Bezirk (Innere Stadt)",
	LEOPOLDSTADT = "2. Bezirk (Leopoldstadt)",
	LANDSTRASSE = "3. Bezirk (Landstraße)",
	WIEDEN = "4. Bezirk (Wieden)",
	MARGARETEN = "5. Bezirk (Margareten)",
	MARIAHILF = "6. Bezirk (Mariahilf)",
	NEUBAU = "7. Bezirk (Neubau)",
	JOSEFSTADT = "8. Bezirk (Josefstadt)",
	ALSERGRUND = "9. Bezirk (Alsergrund)",
	FAVORITEN = "10. Bezirk (Favoriten)",
	SIMMERING = "11. Bezirk (Simmering)",
	MEIDLING = "12. Bezirk (Meidling)",
	HIETZING = "13. Bezirk (Hietzing)",
	PENZING = "14. Bezirk (Penzing)",
	RUDOLFSHEIM_FUNFHAUS = "15. Bezirk (Rudolfsheim-Fünfhaus)",
	OTTAKRING = "16. Bezirk (Ottakring)",
	HERNALS = "17. Bezirk (Hernals)",
	WAHRING = "18. Bezirk (Währing)",
	DOBLING = "19. Bezirk (Döbling)",
	BRIGITTENAU = "20. Bezirk (Brigittenau)",
	FLORIDSDORF = "21. Bezirk (Floridsdorf)",
	DONAUSTADT = "22. Bezirk (Donaustadt)",
	LIESING = "23. Bezirk (Liesing)",
}

/**
 * Options for scraping willhaben.
 */
export interface ScrapeOptions {
	query: string;
	limit?: number;
	priceMin?: number;
	priceMax?: number;
	area?: Area[];
	wienDistricts?: ViennaDistrict[];
}

const areaIdMap: Record<Area, number> = {
	[Area.BURGENLAND]: 1,
	[Area.KAERNTEN]: 2,
	[Area.NIEDEROESTERREICH]: 3,
	[Area.OBEROESTERREICH]: 4,
	[Area.SALZBURG]: 5,
	[Area.STEIERMARK]: 6,
	[Area.TIROL]: 7,
	[Area.VORARLBERG]: 8,
	[Area.WIEN]: 900,
};

const getWienDistrictId = (district: ViennaDistrict): number => {
	const match = district.match(/^(\d+)\./);
	if (match && match[1]) {
		const num = parseInt(match[1], 10);
		// 1. Bezirk = 117223, 2. Bezirk = 117224, etc.
		return 117223 + num - 1;
	}
	return 900; // fallback to generic Wien
};

function chunkArray<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

/**
 * Helper to scrape a single page.
 */
async function scrapeSinglePage(
	browser: import("playwright").Browser,
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
			const match =
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
 * Builds the search URL for willhaben.at based on the provided options.
 *
 * @param options - The scrape options to use.
 * @returns The generated Willhaben search URL string.
 */
export function buildWillhabenUrl(options: ScrapeOptions): string {
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
					params.append("areaId", getWienDistrictId(district).toString());
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
 * Scrapes willhaben.at for a specific query.
 *
 * @param options - The scrape options to use.
 * @returns An array of Willhaben items.
 */
export async function scrapeWillhaben(options: ScrapeOptions): Promise<WillhabenItem[]> {
	// Launch browser in headless mode
	const browser = await chromium.launch({ headless: true });

	try {
		const baseUrl = buildWillhabenUrl(options);

		// Scrape page 1
		const firstPageUrl = `${baseUrl}&page=1`;
		const { items: firstPageItems, totalResultsText } = await scrapeSinglePage(
			browser,
			firstPageUrl,
		);
		let allItems = [...firstPageItems];

		// Determine total pages to fetch
		let totalResults = parseInt(totalResultsText, 10);
		if (isNaN(totalResults)) {
			// Fallback: if we can't parse total results, assume we just fetch up to the limit using a large number
			// and break when a page returns 0 items.
			totalResults = 100000;
		}

		// Willhaben generally shows ~30 items per page
		const ITEMS_PER_PAGE = 30;
		const totalAvailablePages = Math.ceil(totalResults / ITEMS_PER_PAGE);

		let pagesToFetch = totalAvailablePages;
		if (options.limit !== undefined) {
			const maxPagesForLimit = Math.ceil(options.limit / ITEMS_PER_PAGE);
			pagesToFetch = Math.min(totalAvailablePages, maxPagesForLimit);
		} else {
			// Hard cap to avoid infinitely scraping if limit is omitted
			pagesToFetch = Math.min(totalAvailablePages, 50);
			console.warn(
				`\nWarning: No limit specified. Capping at ${pagesToFetch} pages to avoid bot protection.`,
			);
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
				const promises = chunk.map((p) =>
					scrapeSinglePage(browser, `${baseUrl}&page=${p}`),
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
