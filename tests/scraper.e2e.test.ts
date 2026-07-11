import { describe, expect, it } from "vitest";
import { WillhabenHunterImmoScraper } from "../src/scraper/immo-scraper";
import { WillhabenHunterMarketplaceScraper } from "../src/scraper/marketplace-scraper";
import {
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterViennaDistrict,
} from "../src/scraper/scraper.const";

describe("Marketplace Scraper E2E Suite", () => {
	// E2E test to verify pagination, parallel chunking, and Playwright DOM extraction
	it("should scrape 2 items using smooth scrolling and extract titles and prices", async () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const results = await scraper.scrape({
			query: "iphone",
			limit: 2, // 2 items is enough to prove the array is returned and parsed correctly
			area: [WillhabenHunterArea.WIEN],
			wienDistricts: [WillhabenHunterViennaDistrict.INNERE_STADT], // 1. Bezirk
		});

		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThanOrEqual(2);

		const firstItem = results[0];
		expect(firstItem?.id).toBeDefined();
		expect(firstItem?.title).toBeDefined();
		expect(firstItem?.price).toBeDefined();
		expect(firstItem?.url).toBeDefined();
		expect(firstItem?.url).toMatch(/^https:\/\/www\.willhaben\.at\//);
	}, 90000); // 90 seconds timeout since it opens Playwright
});

describe("Immo Scraper E2E Suite", () => {
	it("should scrape 2 immo items and extract properties", async () => {
		const scraper = new WillhabenHunterImmoScraper();
		const results = await scraper.scrape({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			limit: 2,
			area: [WillhabenHunterArea.WIEN],
		});

		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThanOrEqual(2);

		const firstItem = results[0];
		expect(firstItem?.id).toBeDefined();
		expect(firstItem?.title).toBeDefined();
		expect(firstItem?.price).toBeDefined();
		expect(firstItem?.url).toBeDefined();
		expect(firstItem?.url).toMatch(/^https:\/\/www\.willhaben\.at\//);
	}, 90000);
});
