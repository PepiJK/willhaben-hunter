import { describe, it, expect } from "vitest";
import { scrapeWillhaben } from "../src/scraper";

describe("Scraper Module", () => {
	it("should be defined", async () => {
		const results = await scrapeWillhaben({
			query: "test",
			limit: 1,
		});
		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
	}, 30000);
});
