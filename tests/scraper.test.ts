import { describe, it, expect } from "vitest";
import { scrapeWillhaben, Area } from "../src/scraper";

describe("Scraper Module", () => {
	it("should be defined", async () => {
		const results = await scrapeWillhaben({
			query: "test",
			limit: 10,
			priceMin: 50,
			priceMax: 100,
			area: [Area.WIEN, Area.TIROL],
		});
		expect(results).toBeDefined();
	});
});
