import { Browser, Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { WillhabenHunterJobsItem, WillhabenHunterJobsScrapeOptions } from "./scraper.interface";
import {
	WILLHABEN_HUNTER_JOBS_REGION_ID_MAP,
	WILLHABEN_HUNTER_JOBS_EMPLOYMENT_TYPE_MAP,
	WILLHABEN_HUNTER_JOBS_POSITION_MAP,
	WILLHABEN_HUNTER_JOBS_COMPANY_TYPE_MAP,
	WILLHABEN_HUNTER_JOBS_TIME_LIMIT_MAP,
	WillhabenHunterViennaDistrict,
} from "./scraper.const";
import { WillhabenHunterChunkArray } from "../utils/utils";

chromium.use(stealth());

/**
 * Scraper for willhaben.at Jobs.
 */
export class WillhabenHunterJobsScraper {
	/**
	 * Scrapes willhaben.at jobs based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns An array of Willhaben jobs items.
	 */
	public async scrape(
		options: WillhabenHunterJobsScrapeOptions,
	): Promise<WillhabenHunterJobsItem[]> {
		const browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		try {
			const baseUrl = this.buildUrl(options);
			return await this._fetchJobs(browser, baseUrl, options);
		} finally {
			await browser.close();
		}
	}

	/**
	 * Builds the search URL for willhaben.at jobs based on the provided options.
	 *
	 * @param options - The scrape options to use.
	 * @returns The generated Willhaben jobs search URL string.
	 */
	public buildUrl(options: WillhabenHunterJobsScrapeOptions): string {
		const params = new URLSearchParams();
		if (options.query) {
			params.append("keyword", options.query);
		}

		const employmentTypeIds =
			options.employmentType
				?.map((e) => WILLHABEN_HUNTER_JOBS_EMPLOYMENT_TYPE_MAP[e])
				.filter(Boolean) || [];
		this._appendArrayParam(params, "employment_type", employmentTypeIds);

		const positionIds =
			options.position?.map((p) => WILLHABEN_HUNTER_JOBS_POSITION_MAP[p]).filter(Boolean) ||
			[];
		this._appendArrayParam(params, "position", positionIds);

		const regionIds =
			options.area?.map((a) => WILLHABEN_HUNTER_JOBS_REGION_ID_MAP[a]).filter(Boolean) || [];
		this._appendArrayParam(params, "region", regionIds);

		if (options.wienDistricts && options.wienDistricts.length > 0) {
			for (const district of options.wienDistricts) {
				params.append("district", this._getWienDistrictId(district).toString());
			}
		}

		const companyTypeIds =
			options.companyType
				?.map((c) => WILLHABEN_HUNTER_JOBS_COMPANY_TYPE_MAP[c])
				.filter(Boolean) || [];
		this._appendArrayParam(params, "company_type", companyTypeIds);

		if (options.timeLimit) {
			const timeLimitId = WILLHABEN_HUNTER_JOBS_TIME_LIMIT_MAP[options.timeLimit];
			if (timeLimitId) {
				params.append("time_limit", timeLimitId);
			}
		}

		const queryString = params.toString();
		return `https://www.willhaben.at/jobs/suche${queryString ? "?" + queryString : ""}`;
	}

	private _appendArrayParam(params: URLSearchParams, key: string, values?: string[]): void {
		if (values && values.length > 0) {
			for (const val of values) {
				params.append(key, val);
			}
		}
	}

	private _getWienDistrictId(district: WillhabenHunterViennaDistrict): number {
		const match = district.match(/^(\d+)/);
		if (match && match[1]) {
			const num = parseInt(match[1], 10);
			// Jobs uses 1101 for 1st district, 1110 for 10th district, etc.
			return 1100 + num;
		}
		return 900;
	}

	private async _fetchJobs(
		browser: Browser,
		url: string,
		options: WillhabenHunterJobsScrapeOptions,
	): Promise<WillhabenHunterJobsItem[]> {
		const page = await browser.newPage();
		const limit = options.limit && options.limit > 0 ? options.limit : 100;
		const allItems: WillhabenHunterJobsItem[] = [];
		let currentPage = 1;

		try {
			while (allItems.length < limit) {
				const newItems = await this._fetchSinglePage(
					page,
					url,
					currentPage,
					allItems.length,
					limit,
					options,
				);

				if (newItems.length === 0) {
					break; // No more items
				}

				for (const item of newItems) {
					if (!allItems.some((existing) => existing.id === item.id)) {
						allItems.push(item);
					}
				}

				if (newItems.length < 20) {
					break; // Likely the last page
				}

				currentPage++;
			}
		} catch {
			// Silently ignore pagination failures to return what we have so far
		} finally {
			await page.close();
		}

		let items = allItems.slice(0, limit);

		if (!options.skipDetails) {
			items = await this._fetchAllItemDetails(browser, items, options);
		}

		return items;
	}

	private async _fetchSinglePage(
		page: Page,
		baseUrl: string,
		currentPage: number,
		currentCount: number,
		limit: number,
		options: WillhabenHunterJobsScrapeOptions,
	): Promise<WillhabenHunterJobsItem[]> {
		const pageUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${currentPage}`;
		if (options.onProgress) {
			options.onProgress(
				`Fetching page ${currentPage} (${currentCount}/${limit} items so far)...`,
			);
		}

		await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

		return await page.evaluate(() => {
			const nextDataEl = document.getElementById("__NEXT_DATA__");
			if (!nextDataEl) return [];

			try {
				const data = JSON.parse(nextDataEl.textContent || "{}");
				const entries = data?.props?.pageProps?.jobsSearchResultRoot?.data?.entries || [];

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return entries.map((entry: any) => {
					return {
						id: String(entry.id),
						title: entry.title || "",
						description: entry.description || "",
						company: entry.company?.title || entry.companyInfo?.name || "",
						location: entry.jobLocations?.[0]?.name || "",
						url: `https://www.willhaben.at/jobs/job/${entry.slugTitle ? entry.slugTitle + "/" : ""}${entry.id}`,
						payment: entry.salary
							? `${entry.salary} ${entry.salaryTimeFrame || ""}`.trim()
							: "",
						employmentType:
							entry.employmentModes
								?.map((m: { label: string }) => m.label)
								.join(", ") ||
							entry.position ||
							"",
						creationDate: entry.creationDate,
						firstPublishDate: entry.firstPublishDate,
						isTopJob: !!entry.topJob,
						isOverpay: !!entry.overpay,
					};
				});
			} catch {
				return [];
			}
		});
	}

	private async _fetchAllItemDetails(
		browser: Browser,
		items: WillhabenHunterJobsItem[],
		options: WillhabenHunterJobsScrapeOptions,
	): Promise<WillhabenHunterJobsItem[]> {
		if (options.onProgress) {
			options.onProgress(`Fetching details for ${items.length} jobs...`);
		}

		const detailChunks = WillhabenHunterChunkArray(items, 3);
		let processedCount = 0;

		for (const chunk of detailChunks) {
			await Promise.all(
				chunk.map(async (item) => {
					if (!item.url) return;
					try {
						const page = await browser.newPage();
						await page.goto(item.url, { waitUntil: "domcontentloaded" });
						const details = await page.evaluate(() => {
							const nextDataEl = document.getElementById("__NEXT_DATA__");
							if (!nextDataEl) return null;
							const data = JSON.parse(nextDataEl.textContent || "{}");
							const advert = data?.props?.pageProps?.jobAdvertDetailsRoot?.data;
							return advert
								? {
										description: advert.description || "",
										company: advert.company?.title || "",
										payment: advert.salary
											? `${advert.salary} ${advert.salaryTimeFrame || ""}`.trim()
											: "",
									}
								: null;
						});
						await page.close();
						if (details) {
							if (details.description) item.description = details.description;
							if (details.company) item.company = details.company;
							if (details.payment) item.payment = details.payment;
						}
					} catch {
						// Failed to fetch details for this item, continue with next
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
}
