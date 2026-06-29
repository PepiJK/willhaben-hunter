import { describe, expect, it } from "vitest";
import { WillhabenScraper } from "../src/scraper/scraper";
import { Area, SortOrder, ViennaDistrict } from "../src/scraper/scraper.const";

describe("URL Builder Suite", () => {
	it("should build a basic url with only a keyword", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "iphone" });
		expect(url).toBe(
			"https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=iphone&isNavigation=true",
		);
	});

	it("should include min and max prices", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "macbook", priceMin: 500, priceMax: 1500 });
		expect(url).toContain("PRICE_FROM=500");
		expect(url).toContain("PRICE_TO=1500");
	});

	it("should include standard area IDs", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "bike", area: [Area.TIROL, Area.SALZBURG] });
		// Tirol is 7, Salzburg is 5
		expect(url).toContain("areaId=7");
		expect(url).toContain("areaId=5");
	});

	it("should include generic Wien area ID if no districts are specified", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "desk", area: [Area.WIEN] });
		expect(url).toContain("areaId=900");
	});

	it("should include specific Vienna district IDs and exclude generic Wien ID", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({
			query: "chair",
			area: [Area.WIEN],
			wienDistricts: [ViennaDistrict.INNERE_STADT, ViennaDistrict.LIESING],
		});

		// Innere Stadt (1st) = 117223
		// Liesing (23rd) = 117245
		expect(url).toContain("areaId=117223");
		expect(url).toContain("areaId=117245");
		expect(url).not.toContain("areaId=900");
	});

	it("should include sort parameter when specified", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "sofa", sort: SortOrder.PRICE_ASC });
		expect(url).toContain("sort=2");
	});

	it("should not include sort parameter for relevance (default)", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "sofa", sort: SortOrder.RELEVANCE });
		expect(url).not.toContain("sort=");
	});

	it("should not include sort parameter when sort is undefined", () => {
		const scraper = new WillhabenScraper();
		const url = scraper.buildUrl({ query: "sofa" });
		expect(url).not.toContain("sort=");
	});
});
