import { describe, expect, it } from "vitest";
import { Area, scrapeWillhaben, ViennaDistrict } from "../src/scraper";

describe("Scraper E2E Suite", () => {
	// E2E test to verify pagination, parallel chunking, and Playwright DOM extraction
	it("should scrape 2 items using smooth scrolling and extract titles and prices", async () => {
		const results = await scrapeWillhaben({
			query: "iphone",
			limit: 2, // 2 items is enough to prove the array is returned and parsed correctly
			area: [Area.WIEN],
			wienDistricts: [ViennaDistrict.INNERE_STADT], // 1. Bezirk
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
	}, 60000); // 60 seconds timeout since it opens Playwright
});
