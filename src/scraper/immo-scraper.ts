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
	WILLHABEN_HUNTER_IMMO_ROOMS_BUCKET_MAP,
	WILLHABEN_HUNTER_IMMO_URL_PATH_MAP,
	WillhabenHunterArea,
	WillhabenHunterViennaDistrict,
} from "./scraper.const";
import { WillhabenHunterImmoItem, WillhabenHunterImmoScrapeOptions } from "./scraper.interface";

// Register the stealth plugin (safe to call multiple times; playwright-extra deduplicates)
chromium.use(stealth());

/** Return type for immo detail page extraction. */
interface ImmoDetails {
	description: string;
	attributes: string;
	rooms: string;
	livingArea: string;
	propertyType: string;
	priceInformation: string;
	titlePrice: string;
	location: string;
	areaDescription: string;
	additionalInformation: string;
	priceAndDetailInformation: string;
}

/**
 * Scraper for willhaben.at Immobilien (real-estate) listings.
 */
export class WillhabenHunterImmoScraper {
	/**
	 * Scrapes willhaben.at Immobilien based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns An array of Willhaben immo items.
	 */
	public async scrape(
		options: WillhabenHunterImmoScrapeOptions,
	): Promise<WillhabenHunterImmoItem[]> {
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
	 * Builds the search URL for willhaben.at Immobilien based on the provided options.
	 *
	 * @param options - The immo scrape options.
	 * @returns The generated URL string.
	 */
	public buildUrl(options: WillhabenHunterImmoScrapeOptions): string {
		const params = new URLSearchParams();
		params.append("isNavigation", "true");

		if (options.query) {
			params.append("keyword", options.query);
		}

		if (options.priceMin !== undefined) {
			params.append("PRICE_FROM", options.priceMin.toString());
		}

		if (options.priceMax !== undefined) {
			params.append("PRICE_TO", options.priceMax.toString());
		}

		if (options.rooms !== undefined) {
			const bucket = WILLHABEN_HUNTER_IMMO_ROOMS_BUCKET_MAP[options.rooms];
			if (bucket) {
				params.append("NO_OF_ROOMS_BUCKET", bucket);
			}
		}

		if (options.sizeMin !== undefined) {
			params.append("ESTATE_SIZE%2FLIVING_AREA_FROM", options.sizeMin.toString());
		}

		if (options.sizeMax !== undefined) {
			params.append("ESTATE_SIZE%2FLIVING_AREA_TO", options.sizeMax.toString());
		}

		this._appendAreaParams(params, options.area, options.wienDistricts);

		const path = WILLHABEN_HUNTER_IMMO_URL_PATH_MAP[options.type];
		return `https://www.willhaben.at/iad/immobilien/${path}?${params.toString()}`;
	}

	/**
	 * Fetches all paginated list pages and returns the collected items, respecting the limit.
	 */
	private async _fetchPaginatedItems(
		browser: Browser,
		baseUrl: string,
		options: WillhabenHunterImmoScrapeOptions,
	): Promise<WillhabenHunterImmoItem[]> {
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
				"Could not determine total number of immo results. Willhaben UI might have changed.",
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

		let allItems = await this._fetchRemainingPages(
			browser,
			baseUrl,
			pagesToFetch,
			firstPageItems,
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
		initialItems: WillhabenHunterImmoItem[],
		options: WillhabenHunterImmoScrapeOptions,
	): Promise<WillhabenHunterImmoItem[]> {
		if (pagesToFetch <= 1) return [...initialItems];

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
	 * Fetches detail pages for all items in parallel chunks and enriches them with immo fields.
	 */
	private async _fetchAllItemDetails(
		browser: Browser,
		items: WillhabenHunterImmoItem[],
		options: WillhabenHunterImmoScrapeOptions,
	): Promise<WillhabenHunterImmoItem[]> {
		if (options.onProgress) {
			options.onProgress(`Fetching details for ${items.length} immo listings...`);
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
						item.rooms = details.rooms;
						item.livingArea = details.livingArea;
						item.propertyType = details.propertyType;
						item.priceInformation = details.priceInformation;
						if (details.location) {
							item.location = details.location;
						}
						if (details.areaDescription) {
							item.areaDescription = details.areaDescription;
						}
						if (details.additionalInformation) {
							item.additionalInformation = details.additionalInformation;
						}
						if (details.priceAndDetailInformation) {
							item.priceAndDetailInformation = details.priceAndDetailInformation;
						} // Overwrite the list price with the title price if the list price was per m²
						if (details.titlePrice && item.price !== details.titlePrice) {
							item.price = details.titlePrice;
						}
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
	 * Scrapes a single immo listing page.
	 *
	 * @param browser - The Playwright browser instance.
	 * @param url - The URL to scrape.
	 * @returns The scraped immo items and total results text.
	 */
	private async _scrapeSinglePage(
		browser: Browser,
		url: string,
	): Promise<{ items: WillhabenHunterImmoItem[]; totalResultsText: string }> {
		const page = await browser.newPage();

		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });
			await this._acceptCookiesIfPresent(page);

			await page.waitForSelector('[data-testid="result-list-title"]', { timeout: 15000 });

			// Scroll to trigger lazy-loaded content
			for (let i = 0; i < 8; i++) {
				await page.evaluate(() => window.scrollBy(0, 1000));
				await page.waitForTimeout(200);
			}

			const totalResultsText = await page.evaluate(() => {
				const titleEl = document.querySelector('h1[id="result-list-title"]');
				if (titleEl && titleEl.textContent) {
					// Anchored digit pattern to avoid catastrophic backtracking
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
				items: items.filter((item) => item.id && item.title) as WillhabenHunterImmoItem[],
				totalResultsText,
			};
		} finally {
			await page.close();
		}
	}

	/**
	 * Scrapes the detail page of a single immo listing.
	 * Extracts description, attributes (Eckdaten), and Objektinformationen fields.
	 *
	 * @param browser - The Playwright browser instance.
	 * @param url - The URL of the immo listing.
	 * @returns Parsed detail fields.
	 */
	private async _scrapeItemDetails(browser: Browser, url: string): Promise<ImmoDetails> {
		const page = await browser.newPage();

		try {
			await page.goto(url, { waitUntil: "commit", timeout: 60000 });
			await this._acceptCookiesIfPresent(page);

			// eslint-disable-next-line sonarjs/cognitive-complexity
			return await page.evaluate(() => {
				const result = {
					description: "",
					attributes: "",
					rooms: "",
					livingArea: "",
					propertyType: "",
					priceInformation: "",
					titlePrice: "",
					location: "",
					areaDescription: "",
					additionalInformation: "",
					priceAndDetailInformation: "",
				};

				//#region Description
				const descEl = document.querySelector('[data-testid^="ad-description-"]');
				if (descEl) {
					result.description = (descEl as HTMLElement).innerText.trim();
				} else {
					const possibleDesc = document.querySelector(
						'div[class*="description"], p[class*="description"]',
					);
					if (possibleDesc) {
						result.description = (possibleDesc as HTMLElement).innerText.trim();
					}
				}

				//#endregion

				//#region Attributes (Eckdaten / general key-value pairs)
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
					result.attributes = attrTexts.join(" | ");
				} else {
					const attrBlock = document.querySelector('[data-testid="ad-attributes"]');
					if (attrBlock) {
						result.attributes = (attrBlock as HTMLElement).innerText
							.replace(/\n/g, " | ")
							.trim();
					}
				}

				//#endregion

				//#region Objektinformationen
				attrEls.forEach((el) => {
					const titleEl = el.querySelector('[data-testid="attribute-title"]');
					const valEl = el.querySelector('[data-testid="attribute-value"]');
					if (!titleEl || !valEl) return;
					const key = (titleEl as HTMLElement).innerText.trim().toLowerCase();
					const val = (valEl as HTMLElement).innerText.trim();
					if (/zimmer|rooms/i.test(key)) {
						result.rooms = val;
					} else if (/wohnfl[äa]che|living area|nutzfl[äa]che/i.test(key)) {
						result.livingArea = val;
					} else if (/objekttyp|immobilientyp|property type/i.test(key)) {
						result.propertyType = val;
					}
				});

				// Fallback: scan a dedicated Objektinformationen section
				if (!result.rooms || !result.livingArea) {
					const objInfoSection = Array.from(
						document.querySelectorAll("section, div"),
					).find((el) => el.textContent?.includes("Objektinformationen"));
					if (objInfoSection) {
						const rows = objInfoSection.querySelectorAll("dt, th, td, li");
						rows.forEach((row, idx, arr) => {
							const text = (row as HTMLElement).innerText.trim();
							if (/zimmer/i.test(text) && idx + 1 < arr.length && !result.rooms) {
								result.rooms = (arr[idx + 1] as HTMLElement).innerText.trim();
							}
							if (
								/wohnfl/i.test(text) &&
								idx + 1 < arr.length &&
								!result.livingArea
							) {
								result.livingArea = (arr[idx + 1] as HTMLElement).innerText.trim();
							}
						});
					}
				}

				//#endregion

				//#region Price Information
				const priceEl = document.querySelector(
					'[data-testid="contact-box-price-box-price-value-0"]',
				);
				if (priceEl) {
					result.titlePrice = (priceEl as HTMLElement).innerText.trim();
				}

				const h2s = Array.from(document.querySelectorAll("h2, h3, h4"));
				const preisInfoH2 = h2s.find(
					(el) =>
						el.textContent?.trim() === "Preisinformation" ||
						el.textContent?.trim() === "Preisdetail",
				);

				if (preisInfoH2 && preisInfoH2.parentElement) {
					const container =
						preisInfoH2.closest('div[class*="Box"], section') ||
						preisInfoH2.parentElement;
					result.priceInformation = (container as HTMLElement).innerText
						.trim()
						.replace(/\n+/g, " | ")
						.replace(/([a-zA-Z)])(€)/g, "$1 $2");
				}
				//#endregion

				//#region Objektstandort
				const locEl = document.querySelector(
					'[data-testid="ad-detail-teaser-location"], [data-testid="object-location-address"]',
				);
				if (locEl) {
					result.location = (locEl as HTMLElement).innerText.trim();
				} else {
					const standortH2 = h2s.find(
						(el) =>
							el.textContent?.trim() === "Objektstandort" ||
							el.textContent?.trim() === "Standort" ||
							el.textContent?.includes("Objektstandort"),
					);
					if (standortH2 && standortH2.parentElement) {
						const container =
							standortH2.closest('div[class*="Box"], section') ||
							standortH2.parentElement;

						// Try to find the first text-containing div immediately after the header to avoid map noise
						const addressDiv = container.querySelector('div[class*="Box"]');
						if (addressDiv && addressDiv.textContent) {
							result.location = (addressDiv as HTMLElement).innerText.trim();
						} else {
							let text = (container as HTMLElement).innerText
								.trim()
								.replace(/\n+/g, " | ");
							text = text.replace(/^Objektstandort \|\s*/i, "");
							// Clean up map widget noise
							text = text.split(" | Leaflet |")[0] || "";
							text = text.split(" | Karte öffnen |")[0] || "";
							text = text.split(" | Jetzt Lichtverhältnisse")[0] || "";
							result.location = text.trim();
						}
					}
				}
				//#endregion

				//#region New Generic Sections (Lage, Zusatzinformationen, Preis und Detailinformationen)
				const findSection = (keywords: string[]) => {
					let el: Element | undefined;
					for (const h of h2s) {
						const text = h.textContent?.trim().toLowerCase() || "";
						let match = false;
						for (const k of keywords) {
							if (text.includes(k.toLowerCase())) {
								match = true;
								break;
							}
						}
						if (match) {
							el = h;
							break;
						}
					}

					if (el && el.parentElement) {
						const container =
							el.closest('div[class*="Box"], section') || el.parentElement;
						let text = (container as HTMLElement).innerText
							.trim()
							.replace(/\n+/g, " | ");
						const headerText = el.textContent?.trim() || "";
						if (headerText) {
							// Escape special regex characters in the header text
							const escapedHeader = headerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
							text = text.replace(
								new RegExp(`^${escapedHeader}\\s*\\|\\s*`, "i"),
								"",
							);
						}
						text = text.replace(/([a-zA-Z)])(€)/g, "$1 $2");
						return text
							.replace(/ \| Mehr anzeigen \+$/, "")
							.replace(/Mehr anzeigen \+$/, "")
							.trim();
					}
					return "";
				};

				result.areaDescription = findSection(["Lage"]);
				result.additionalInformation = findSection(["Zusatzinformation"]);
				result.priceAndDetailInformation = findSection([
					"Preis und Detail",
					"Preis- und Detail",
					"Preis - Detail",
				]);
				//#endregion

				return result;
			});
		} catch (error) {
			throw new Error(
				`Failed to scrape immo details for ${url}: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error },
			);
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
	 * Gets the numeric ID for a given Vienna district.
	 *
	 * @param district - The Vienna district.
	 * @returns The district ID.
	 */
	private _getWienDistrictId(district: WillhabenHunterViennaDistrict): number {
		const match = district.match(/^(\d+)/);
		if (match && match[1]) {
			const num = parseInt(match[1], 10);
			return 117223 + num - 1;
		}
		return 900;
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
