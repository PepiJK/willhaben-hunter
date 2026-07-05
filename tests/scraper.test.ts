import { describe, expect, it } from "vitest";
import { WillhabenHunterScraper } from "../src/scraper/scraper";

describe("Scraper Module", () => {
	it("should be defined", async () => {
		const scraper = new WillhabenHunterScraper();
		const results = await scraper.scrape({
			query: "test",
			limit: 1,
		});
		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
	}, 90000);
});
