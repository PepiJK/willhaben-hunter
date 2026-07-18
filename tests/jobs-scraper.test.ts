/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WillhabenHunterJobsScraper } from "../src/scraper/jobs-scraper";
import { chromium } from "playwright-extra";
import {
	WillhabenHunterArea,
	WillhabenHunterJobsEmploymentType,
	WillhabenHunterJobsPosition,
	WillhabenHunterJobsCompanyType,
	WillhabenHunterJobsTimeLimit,
} from "../src/scraper/scraper.const";

vi.mock("playwright-extra", () => ({
	chromium: {
		use: vi.fn(),
		launch: vi.fn(),
	},
}));

vi.mock("puppeteer-extra-plugin-stealth", () => ({
	default: vi.fn(() => ({})),
}));

describe("WillhabenHunterJobsScraper", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should build URL correctly with all parameters", () => {
		const scraper = new WillhabenHunterJobsScraper();
		const url = scraper.buildUrl({
			query: "software",
			employmentType: [
				WillhabenHunterJobsEmploymentType.VOLLZEIT,
				WillhabenHunterJobsEmploymentType.TEILZEIT,
			],
			position: [
				WillhabenHunterJobsPosition.GRUPPEN_TEAMLEITUNG,
				WillhabenHunterJobsPosition.LEHRE,
			],
			area: [WillhabenHunterArea.WIEN],
			companyType: [WillhabenHunterJobsCompanyType.PERSONALBERATUNG],
			timeLimit: WillhabenHunterJobsTimeLimit.LETZTE_24_STUNDEN,
		});

		expect(url).toContain("keyword=software");
		expect(url).toContain("employment_type=110");
		expect(url).toContain("employment_type=113");
		expect(url).toContain("position=13540");
		expect(url).toContain("position=13541");
		expect(url).toContain("region=14486");
		expect(url).toContain("company_type=agency");
		expect(url).toContain("time_limit=last_24_hours");
	});

	it("should scrape jobs correctly from __NEXT_DATA__", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cb) => {
				document.body.innerHTML = `
					<script id="__NEXT_DATA__" type="application/json">
					{
						"props": {
							"pageProps": {
								"jobsSearchResultRoot": {
									"data": {
										"entries": [
											{
												"id": 12345,
												"title": "Software Developer",
												"description": "Company A\\nGreat job",
												"companyInfo": { "name": "Company A" },
												"jobLocations": [{ "name": "Wien" }],
												"employmentModes": [{ "label": "Vollzeit" }]
											}
										]
									}
								}
							}
						}
					}
					</script>
				`;
				return cb();
			}),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterJobsScraper();
		const progressSpy = vi.fn();
		const items = await scraper.scrape({
			query: "software",
			limit: 50,
			onProgress: progressSpy,
		});

		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(
			expect.objectContaining({
				id: "12345",
				title: "Software Developer",
				company: "Company A",
				location: "Wien",
				url: "https://www.willhaben.at/jobs/job/12345",
				employmentType: "Vollzeit",
			}),
		);
		expect(progressSpy).toHaveBeenCalled();
	});

	it("should fetch item details if skipDetails is false", async () => {
		let evaluateCallCount = 0;
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cb) => {
				evaluateCallCount++;
				if (evaluateCallCount === 1) {
					// First call: search results
					document.body.innerHTML = `
						<script id="__NEXT_DATA__" type="application/json">
						{
							"props": {
								"pageProps": {
									"jobsSearchResultRoot": {
										"data": {
											"entries": [
												{
													"id": 1,
													"title": "Job 1",
													"slugTitle": "job-1"
												}
											]
										}
									}
								}
							}
						}
						</script>
					`;
				} else {
					// Second call: job details
					document.body.innerHTML = `
						<script id="__NEXT_DATA__" type="application/json">
						{
							"props": {
								"pageProps": {
									"jobAdvertDetailsRoot": {
										"data": {
											"description": "Detailed description",
											"company": { "title": "Detailed Company" },
											"salary": "4000",
											"salaryTimeFrame": "Monat"
										}
									}
								}
							}
						}
						</script>
					`;
				}
				return cb();
			}),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterJobsScraper();
		const items = await scraper.scrape({ query: "test", limit: 1, skipDetails: false });

		expect(items).toHaveLength(1);
		expect(items[0].description).toBe("Detailed description");
		expect(items[0].company).toBe("Detailed Company");
		expect(items[0].payment).toBe("4000 Monat");
	});

	it("should handle error during details fetch without throwing", async () => {
		let evaluateCallCount = 0;
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cb) => {
				evaluateCallCount++;
				if (evaluateCallCount === 1) {
					document.body.innerHTML = `
						<script id="__NEXT_DATA__" type="application/json">
						{
							"props": {
								"pageProps": {
									"jobsSearchResultRoot": {
										"data": {
											"entries": [
												{ "id": 1, "title": "Job 1" }
											]
										}
									}
								}
							}
						}
						</script>
					`;
					return cb();
				} else {
					throw new Error("Details fetch error");
				}
			}),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterJobsScraper();
		const items = await scraper.scrape({ query: "test", limit: 1, skipDetails: false });

		expect(items).toHaveLength(1);
		expect(items[0].title).toBe("Job 1");
	});

	it("should handle invalid JSON in search results gracefully", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cb) => {
				document.body.innerHTML = `
					<script id="__NEXT_DATA__" type="application/json">
					INVALID JSON
					</script>
				`;
				return cb();
			}),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterJobsScraper();
		const items = await scraper.scrape({ query: "test", limit: 1 });

		expect(items).toHaveLength(0);
	});
});
