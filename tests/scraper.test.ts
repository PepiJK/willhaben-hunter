import { describe, expect, it } from "vitest";
import { WillhabenScraper } from "../src/scraper/scraper";

describe("Scraper Module", () => {
	it("should be defined", async () => {
		const scraper = new WillhabenScraper();
		const results = await scraper.scrape({
			query: "test",
			limit: 1,
		});
		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
	}, 30000);
});
