import { describe, it, expect } from "vitest";
import { Area, ViennaDistrict, buildWillhabenUrl } from "../src/scraper";

describe("URL Builder Suite", () => {
	it("should build a basic url with only a keyword", () => {
		const url = buildWillhabenUrl({ query: "iphone" });
		expect(url).toBe(
			"https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=iphone&isNavigation=true",
		);
	});

	it("should include min and max prices", () => {
		const url = buildWillhabenUrl({ query: "macbook", priceMin: 500, priceMax: 1500 });
		expect(url).toContain("PRICE_FROM=500");
		expect(url).toContain("PRICE_TO=1500");
	});

	it("should include standard area IDs", () => {
		const url = buildWillhabenUrl({ query: "bike", area: [Area.TIROL, Area.SALZBURG] });
		// Tirol is 7, Salzburg is 5
		expect(url).toContain("areaId=7");
		expect(url).toContain("areaId=5");
	});

	it("should include generic Wien area ID if no districts are specified", () => {
		const url = buildWillhabenUrl({ query: "desk", area: [Area.WIEN] });
		expect(url).toContain("areaId=900");
	});

	it("should include specific Vienna district IDs and exclude generic Wien ID", () => {
		const url = buildWillhabenUrl({
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
});
